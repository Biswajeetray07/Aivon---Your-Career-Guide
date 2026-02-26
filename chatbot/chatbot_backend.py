from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import uvicorn
import asyncio
import threading
import os
import aiosqlite
import requests
import re
from dotenv import load_dotenv

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langchain_ollama import ChatOllama
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_core.tools import tool, BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient
from typing import TypedDict, Annotated

# --- 1. Initialization & Config ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(os.path.dirname(BASE_DIR), "Backend", ".env"))

app = FastAPI(title="Aivon Chatbot Nexus API")

# Enable CORS for the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dedicated async loop for background AI processes
_ASYNC_LOOP = asyncio.new_event_loop()
_ASYNC_THREAD = threading.Thread(target=_ASYNC_LOOP.run_forever, daemon=True)
_ASYNC_THREAD.start()

def run_async(coro):
    return asyncio.run_coroutine_threadsafe(coro, _ASYNC_LOOP).result()

# --- 2. AI Tools Setup ---
search_tool = DuckDuckGoSearchRun(region="us-en")

@tool
def get_stock_price(symbol: str) -> dict:
    """Fetch latest stock price for a given symbol (e.g. 'AAPL', 'TSLA')."""
    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey=C9PE94QUEW9VWGFM"
    r = requests.get(url)
    return r.json()

client = MultiServerMCPClient({
    "arith": {
        "transport": "stdio",
        "command": "python3",
        "args": ["/Users/nitish/Desktop/mcp-math-server/main.py"],
    },
    "expense": {
        "transport": "streamable_http",
        "url": "https://splendid-gold-dingo.fastmcp.app/mcp"
    }
})

def load_mcp_tools() -> list[BaseTool]:
    try:
        return run_async(client.get_tools())
    except Exception:
        return []

mcp_tools = load_mcp_tools()
tools = [search_tool, get_stock_price, *mcp_tools]

# --- 3. LangGraph & Ollama Architecture ---
llm = ChatOllama(model="qwen2.5-coder:7b", num_ctx=32768)
llm_with_tools = llm.bind_tools(tools) if tools else llm

class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]

async def chat_node(state: ChatState, config: dict):
    """LLM node that may answer or request a tool call."""
    messages = state["messages"]
    thread_id = config.get("configurable", {}).get("thread_id", "")
    
    from langchain_core.messages import SystemMessage
    sys_msgs = [m for m in messages if isinstance(m, SystemMessage)]
    human_ai_msgs = [m for m in messages if not isinstance(m, SystemMessage)]
    
    # --- Token Budget & Sliding Window Manager ---
    N = 16 # Keep last 8 pairs (user/ai docs) in raw verbatim buffer
    recent_msgs = human_ai_msgs[-N:] if len(human_ai_msgs) > N else human_ai_msgs
    old_msgs = human_ai_msgs[:-N] if len(human_ai_msgs) > N else []
    
    db_path = os.path.join(BASE_DIR, "chatbot.db")
    memory_summary = ""
    compressed_count = 0
    
    async with aiosqlite.connect(database=db_path) as db:
        cursor = await db.execute("SELECT compressed_summary, compressed_msg_count FROM threads_memory WHERE thread_id = ?", (thread_id,))
        row = await cursor.fetchone()
        if row:
            memory_summary, compressed_count = row[0] or "", row[1] or 0
            
    # Trigger background compression if enough new old messages fell out of window
    if len(old_msgs) > compressed_count:
        msgs_to_compress = old_msgs[compressed_count:]
        asyncio.create_task(compress_memory_layer(thread_id, msgs_to_compress, memory_summary, len(old_msgs)))
        
    # --- Prompt Assembler ---
    sys_content = sys_msgs[-1].content if sys_msgs else "You are an AI assistant."
    if memory_summary:
        sys_content += f"\n\n[COMPRESSED MEMORY (Older Context)]\n{memory_summary}"
        
    final_sys_msg = SystemMessage(content=sys_content, id="sync_sys_prompt")
    invoke_msgs = [final_sys_msg] + recent_msgs
    
    response = await llm_with_tools.ainvoke(invoke_msgs)
    return {"messages": [response]}

tool_node = ToolNode(tools) if tools else None

async def _init_checkpointer():
    db_path = os.path.join(BASE_DIR, "chatbot.db")
    conn = await aiosqlite.connect(database=db_path)
    
    # Phase 14 Schema: Thread Metadata
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS threads_metadata (
            thread_id TEXT PRIMARY KEY,
            title TEXT,
            title_confidence REAL,
            title_source TEXT,
            is_frozen BOOLEAN DEFAULT 0,
            last_evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Phase 17 Schema: Thread Memory
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS threads_memory (
            thread_id TEXT PRIMARY KEY,
            long_term_facts TEXT DEFAULT '',
            compressed_summary TEXT DEFAULT '',
            compressed_msg_count INTEGER DEFAULT 0,
            last_compressed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    await conn.commit()
    return AsyncSqliteSaver(conn)

checkpointer = run_async(_init_checkpointer())

graph = StateGraph(ChatState)
graph.add_node("chat_node", chat_node)
graph.add_edge(START, "chat_node")

if tool_node:
    graph.add_node("tools", tool_node)
    graph.add_conditional_edges("chat_node", tools_condition)
    graph.add_edge("tools", "chat_node")
else:
    graph.add_edge("chat_node", END)

chatbot = graph.compile(checkpointer=checkpointer)

async def _alist_threads():
    all_threads = set()
    async for checkpoint in checkpointer.alist(None):
        all_threads.add(checkpoint.config["configurable"]["thread_id"])
        
    db_path = os.path.join(BASE_DIR, "chatbot.db")
    async with aiosqlite.connect(database=db_path) as db:
        cursor = await db.execute("SELECT thread_id, title FROM threads_metadata")
        rows = await cursor.fetchall()
        meta_dict = {row[0]: row[1] for row in rows}
        
    # Return array of dicts instead of just strings
    result_threads = []
    # Sort for consistent returned order if needed, but basically wrap keys
    for tid in all_threads:
        result_threads.append({
            "id": tid,
            "title": meta_dict.get(tid, None)
        })
        
    return result_threads

def retrieve_all_threads():
    return run_async(_alist_threads())

# --- 4. FastAPI Routes ---

from fastapi import HTTPException

class ChatRequest(BaseModel):
    message: str
    thread_id: str
    model: str = "nexus-core"

class TitleUpdateRequest(BaseModel):
    title: str

@app.get("/threads")
async def get_threads():
    threads = retrieve_all_threads()
    return {"threads": threads}

@app.put("/threads/{thread_id}/title")
async def update_thread_title(thread_id: str, req: TitleUpdateRequest):
    try:
        db_path = os.path.join(BASE_DIR, "chatbot.db")
        async with aiosqlite.connect(database=db_path) as db:
            await db.execute("""
                INSERT INTO threads_metadata (thread_id, title, title_confidence, title_source, is_frozen)
                VALUES (?, ?, 1.0, 'user', 1)
                ON CONFLICT(thread_id) DO UPDATE SET
                title = excluded.title, is_frozen = 1, title_source = 'user', title_confidence = 1.0, last_evaluated_at = CURRENT_TIMESTAMP
            """, (thread_id, req.title))
            await db.commit()
            return {"status": "success", "title": req.title}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/history/{thread_id}")
async def get_history(thread_id: str):
    state = chatbot.get_state(config={"configurable": {"thread_id": thread_id}})
    messages = state.values.get("messages", [])
    
    # Filter out SystemMessages and tool calls for the raw UI history
    formatted_messages = []
    for msg in messages:
        if isinstance(msg, HumanMessage):
            formatted_messages.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage) and msg.content:
            formatted_messages.append({"role": "assistant", "content": msg.content})
            
    return {"messages": formatted_messages}

# --- 5. Intent Router ---

def classify_intent(user_message: str) -> str:
    """Classifies the user message into one of the Spec Modes."""
    msg = user_message.lower()
    
    if any(kw in msg for kw in ["error", "bug", "broken", "fix", "doesn't work", "exception", "fail"]):
        return "DEBUG"
    elif any(kw in msg for kw in ["explain", "how does", "what is", "concept", "why"]):
        return "EXPLAIN"
    elif any(kw in msg for kw in ["solution", "code for", "solve", "answer", "implement"]):
        return "SOLUTION"
    elif any(kw in msg for kw in ["hint", "stuck", "help me", "clue", "guide"]):
        return "HINT"
    else:
        return "CHAT"

def get_dynamic_prompt(mode: str) -> str:
    base_prompt = """You are Aivon Nexus Oracle, an elite software engineering mentor and AI assistant natively integrated into the Aivon DSA Platform.
Your goal is to guide the user towards mastering Data Structures and Algorithms, debugging code, and understanding complex systems.
Maintain context memory over the session. Use a calm, expert, 'hacker-like' persona. 
Never sound overly robotic or use rigid templates. Use natural transitions and vary sentence lengths.
If you need to use a tool to fetch information, do so silently and incorporate the results naturally into your response."""

    mode_prompts = {
        "CHAT": "\n[MODE: CHAT] The user is casually conversing. Keep it friendly, short, and professional. No rigid code sections unless asked.",
        "HINT": "\n[MODE: HINT] The user needs a hint, not the full solution. Guide them conceptually. Encourage their thinking process without revealing the complete answer immediately.",
        "SOLUTION": "\n[MODE: SOLUTION] The user explicitly requested the answer. Provide clean, production-quality code. Keep explanations concise but clear.",
        "DEBUG": "\n[MODE: DEBUG] The user has broken code or an error. Identify the root cause first, explain the failure clearly, provide corrected code, and suggest prevention tips.",
        "EXPLAIN": "\n[MODE: EXPLAIN] The user wants to learn a concept. Provide a layered explanation (simple -> deeper -> advanced). Use clear examples."
    }
    
    return base_prompt + mode_prompts.get(mode, mode_prompts["CHAT"])

# --- 6. Conversation Memory Compression Layer ---

def classify_message_importance(msg_content: str) -> str:
    msg = str(msg_content).lower()
    if len(msg) < 15 and msg in ["ok", "thanks", "thank you", "hello", "hi", "yes", "no", "cool", "done", "got it"]:
        return "EPHEMERAL"
    if "```" in msg or "error" in msg or "exception" in msg or "bug" in msg or "traceback" in msg or "concept" in msg:
        return "CRITICAL"
    return "SUPPORTING"

async def compress_memory_layer(thread_id: str, msgs_to_compress: list, current_summary: str, new_total: int):
    try:
        meaningful = []
        for m in msgs_to_compress:
            if isinstance(m, HumanMessage):
                if classify_message_importance(m.content) != "EPHEMERAL":
                    meaningful.append(f"User: {m.content}")
            elif isinstance(m, AIMessage) and m.content:
                meaningful.append(f"AI: {m.content}")
                
        db_path = os.path.join(BASE_DIR, "chatbot.db")
        if not meaningful:
            async with aiosqlite.connect(database=db_path) as db:
                await db.execute("INSERT INTO threads_memory (thread_id, compressed_msg_count) VALUES (?, ?) ON CONFLICT(thread_id) DO UPDATE SET compressed_msg_count = excluded.compressed_msg_count", (thread_id, new_total))
                await db.commit()
            return
            
        transcript = "\n".join(meaningful)
        prompt = f"""You are a memory compression agent for an elite code mentor.
Current Memory Summary: {current_summary or "None"}
New Conversation Context to Merge:
{transcript}

Task: Update the memory summary to incorporate critical facts, user goals, and current progress from the new context. Be extremely concise (max 4 sentences). Key constraints: Output JSON or conversational text. NO, JUST PLAINTEXT. Keep it objective."""
        ai_msg = await llm.ainvoke([HumanMessage(content=prompt)])
        new_summary = ai_msg.content.strip() if ai_msg.content else current_summary
        
        async with aiosqlite.connect(database=db_path) as db:
            await db.execute("""
                INSERT INTO threads_memory (thread_id, compressed_summary, compressed_msg_count)
                VALUES (?, ?, ?)
                ON CONFLICT(thread_id) DO UPDATE SET
                compressed_summary = excluded.compressed_summary, compressed_msg_count = excluded.compressed_msg_count, last_compressed_at = CURRENT_TIMESTAMP
            """, (thread_id, new_summary, new_total))
            await db.commit()
    except Exception as e:
        print("Async Compression Error:", e)

# --- 7. Smart Naming Pipeline ---

def deterministic_title_extraction(user_msg: str) -> dict:
    msg = user_msg.lower()
    topic = "Conversation"
    topics = ["binary search", "linked list", "knapsack", "dynamic programming", "dp", "trees", "graph", "bfs", "dfs", "array", "string", "sql", "react", "python", "node", "index error", "recursion", "memoization"]
    
    for t in topics:
        if t in msg:
            topic = t.title()
            break
            
    lang = ""
    langs = ["c++", "java", "python", "javascript", "ts", "typescript", "go", "rust"]
    for l in langs:
        if l in msg:
            lang = l.capitalize()
            if l == "c++": lang = "C++"
            if l in ["ts"]: lang = "TypeScript"
            break
            
    if any(k in msg for k in ["debug", "fix", "error", "broken", "why doesn't"]):
        action = "Debug"
    elif any(k in msg for k in ["explain", "understanding", "what", "how", "concept"]):
        action = "Understanding"
    elif any(k in msg for k in ["implement", "build", "code", "write"]):
        action = "Implement"
    else:
        action = "Discuss"
        
    if action == "Debug":
        title = f"Debug {topic}" + (f" ({lang})" if lang else "")
    elif action == "Understanding":
        title = f"Understanding {topic}"
    elif action == "Implement":
        title = f"Implement {topic}" + (f" ({lang})" if lang else "")
    elif "help" in msg or "hint" in msg:
        title = f"{topic} Help"
    else:
        title = f"{topic} Discussion"
        
    if topic == "Conversation":
        words = user_msg.split()[:4]
        title = " ".join(words).title() + "..."
        confidence = 0.4
    else:
        confidence = 0.9

    if len(user_msg.split()) <= 2 and user_msg.lower() in ["hi", "hello", "hey", "test", "yo"]:
        title = "New Chat"
        confidence = 1.0
        
    return {"title": title, "confidence": confidence, "source": "deterministic"}

async def generate_and_save_title(thread_id: str, user_message: str):
    try:
        db_path = os.path.join(BASE_DIR, "chatbot.db")
        async with aiosqlite.connect(database=db_path) as db:
            cursor = await db.execute("SELECT is_frozen, title_confidence FROM threads_metadata WHERE thread_id = ?", (thread_id,))
            row = await cursor.fetchone()
            
            if row and row[0]: # is_frozen == True
                return
                
            result = deterministic_title_extraction(user_message)
            title = result["title"]
            conf = result["confidence"]
            source = result["source"]
            
            # AI Refinement if confidence is low
            if conf < 0.6 and title != "New Chat":
                try:
                    prompt = f"Summarize this intent in max 6 words (Title Case, no quotes, no punctuation). Input: {user_message}"
                    from langchain_core.messages import HumanMessage
                    ai_msg = await llm.ainvoke([HumanMessage(content=prompt)])
                    if ai_msg.content:
                        clean_title = ai_msg.content.strip(' "\'.')
                        if len(clean_title.split()) <= 6:
                            title = clean_title
                            conf = 0.85
                            source = "ai"
                except Exception as e:
                    print("AI Refinement Error:", e)
            
            await db.execute("""
                INSERT INTO threads_metadata (thread_id, title, title_confidence, title_source)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(thread_id) DO UPDATE SET
                title = excluded.title, title_confidence = excluded.title_confidence, title_source = excluded.title_source, last_evaluated_at = CURRENT_TIMESTAMP
            """, (thread_id, title, conf, source))
            await db.commit()
    except Exception as e:
        print("Title Pipeline Error:", e)

class ChatRequest(BaseModel):
    message: str
    thread_id: str
    model: str = "nexus-core"

@app.post("/chat")
async def chat_stream(request: ChatRequest):
    async def generate():
        CONFIG = {
            "configurable": {"thread_id": request.thread_id},
            "metadata": {"thread_id": request.thread_id},
            "run_name": "chat_turn",
        }
        
        try:
            from langchain_core.messages import SystemMessage
            
            # Intent Classification and Dynamic Tone
            current_mode = classify_intent(request.message)
            dynamic_content = get_dynamic_prompt(current_mode)
            
            # Using an ID replaces the system prompt rather than accumulating duplicates
            system_prompt = SystemMessage(content=dynamic_content, id="sync_sys_prompt")
            messages_to_send = [system_prompt, HumanMessage(content=request.message)]
            
            # Trigger Background Title Naming if early in conversation
            state = chatbot.get_state(CONFIG)
            msg_count = len(state.values.get("messages", [])) if state and hasattr(state, "values") else 0
            if msg_count <= 2:
                asyncio.create_task(generate_and_save_title(request.thread_id, request.message))
                
            async for message_chunk, metadata in chatbot.astream(
                {"messages": messages_to_send},
                config=CONFIG,
                stream_mode="messages",
            ):
                if isinstance(message_chunk, ToolMessage):
                    tool_name = getattr(message_chunk, "name", "tool")
                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool_name})}\n\n"
                    
                elif isinstance(message_chunk, AIMessage) and message_chunk.content:
                    text_content = message_chunk.content.strip()
                    
                    # 1. Block lone JSON dicts at the start or lone dicts
                    is_raw_json = text_content.startswith('{"name":') or text_content.startswith("{'name':") or ('"arguments"' in text_content and text_content.startswith("{"))
                    
                    if not is_raw_json:
                        # 2. Regex out JSON objects that look like tool calls embedded anywhere in the text
                        cleaned = re.sub(r'\{[^{]*?["\']name["\']\s*:\s*["\']\w+["\'][^}]*?\}', '', message_chunk.content)
                        # 3. Regex out Action: tool_name
                        cleaned = re.sub(r'Action:\s*\w+\s*(?:Action Input:.*)?', '', cleaned)
                        # 4. Regex out Markdown JSON blocks containing tool names
                        cleaned = re.sub(r'```json\s*\{[^{]*?["\']name["\']\s*:.*?\s*\}\s*```', '', cleaned, flags=re.DOTALL)
                        
                        if cleaned.strip():
                            yield f"data: {json.dumps({'type': 'message_chunk', 'content': cleaned})}\n\n"

            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

@app.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str):
    """Deletes a thread and all its checkpoints from the SQLite database."""
    try:
        async with aiosqlite.connect("chatbot.db") as db:
            await db.execute("DELETE FROM checkpoints WHERE thread_id = ?", (thread_id,))
            await db.execute("DELETE FROM checkpoint_blobs WHERE thread_id = ?", (thread_id,))
            await db.execute("DELETE FROM checkpoint_writes WHERE thread_id = ?", (thread_id,))
            await db.execute("DELETE FROM threads_metadata WHERE thread_id = ?", (thread_id,))
            await db.execute("DELETE FROM threads_memory WHERE thread_id = ?", (thread_id,))
            await db.commit()
            return {"status": "success", "message": f"Thread {thread_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
