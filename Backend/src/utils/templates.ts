/**
 * Judge Template Registry
 *
 * Templates are stored as TypeScript string constants and injected at runtime.
 * Placeholders:
 *   ###USERCODE###    → replaced with the user's submitted code
 *   ###ENTRYPOINT###  → replaced with the function name to call
 *
 * Output protocol:
 *   1. Any user print()/console.log() appears first on stdout
 *   2. We print "###AIVON_RES###\n" as a separator
 *   3. Then we print the JSON-serialised return value
 *
 * stdin protocol: one JSON-encoded argument per line.
 */

// ─── Python Templates ──────────────────────────────────────────────────────────

export const PYTHON_ARRAY = `from typing import *
import sys, json, math, collections, heapq, bisect, itertools, functools, traceback

###USERCODE###

def __serialize(v):
    """Recursively convert value to a JSON-serializable form."""
    if v is None:
        return None
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return v
    if isinstance(v, str):
        return v
    if isinstance(v, (list, tuple)):
        return [__serialize(x) for x in v]
    if isinstance(v, dict):
        return {str(k): __serialize(val) for k, val in v.items()}
    return str(v)

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    args = []
    for line in lines:
        try:
            val = json.loads(line)
        except Exception:
            val = line
        args.append(val)
    try:
        if 'Solution' in globals() and hasattr(Solution, '###ENTRYPOINT###'):
            result = getattr(Solution(), '###ENTRYPOINT###')(*args)
        else:
            result = globals()['###ENTRYPOINT###'](*args)
        print("###AIVON_RES###", flush=True)
        print(json.dumps(__serialize(result), ensure_ascii=False), flush=True)
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.stderr.flush()
        sys.exit(1)
`;

export const PYTHON_BINARY_TREE = `from typing import *
import sys, json, collections, traceback

###USERCODE###

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val; self.left = left; self.right = right

def __build_tree(vals):
    if not vals or vals[0] is None: return None
    root = TreeNode(vals[0])
    q = collections.deque([root]); i = 1
    while q and i < len(vals):
        node = q.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i]); q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i]); q.append(node.right)
        i += 1
    return root

def __serialize_tree(root):
    if not root: return None
    res = []; q = collections.deque([root])
    while q:
        n = q.popleft()
        if n: res.append(n.val); q.append(n.left); q.append(n.right)
        else: res.append(None)
    while res and res[-1] is None: res.pop()
    return res

def __serialize(v):
    if isinstance(v, TreeNode): return __serialize_tree(v)
    if isinstance(v, bool): return v
    if isinstance(v, (int, float, str, type(None))): return v
    if isinstance(v, (list, tuple)): return [__serialize(x) for x in v]
    return str(v)

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    args = []
    for line in lines:
        try:
            val = json.loads(line)
        except Exception:
            val = line
        if isinstance(val, list) and (len(val) == 0 or val[0] is None or isinstance(val[0], (int, float, type(None)))):
            args.append(__build_tree(val))
        else:
            args.append(val)
    try:
        if 'Solution' in globals() and hasattr(Solution, '###ENTRYPOINT###'):
            result = getattr(Solution(), '###ENTRYPOINT###')(*args)
        else:
            result = globals()['###ENTRYPOINT###'](*args)
        print("###AIVON_RES###", flush=True)
        print(json.dumps(__serialize(result), ensure_ascii=False), flush=True)
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.stderr.flush()
        sys.exit(1)
`;

export const PYTHON_LINKED_LIST = `from typing import *
import sys, json, traceback

###USERCODE###

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val; self.next = next

def __build_list(vals):
    if not vals: return None
    dummy = ListNode(0); cur = dummy
    for v in vals: cur.next = ListNode(v); cur = cur.next
    return dummy.next

def __serialize_list(head):
    res = []; seen = set()
    while head:
        if id(head) in seen: res.append("cycle"); break
        seen.add(id(head)); res.append(head.val); head = head.next
    return res

def __serialize(v):
    if isinstance(v, ListNode): return __serialize_list(v)
    if isinstance(v, bool): return v
    if isinstance(v, (int, float, str, type(None))): return v
    if isinstance(v, (list, tuple)): return [__serialize(x) for x in v]
    return str(v)

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    args = []
    for line in lines:
        try:
            val = json.loads(line)
        except Exception:
            val = line
        if isinstance(val, list) and all(isinstance(x, (int, float)) for x in val):
            args.append(__build_list(val))
        else:
            args.append(val)
    try:
        if 'Solution' in globals() and hasattr(Solution, '###ENTRYPOINT###'):
            result = getattr(Solution(), '###ENTRYPOINT###')(*args)
        else:
            result = globals()['###ENTRYPOINT###'](*args)
        print("###AIVON_RES###", flush=True)
        print(json.dumps(__serialize(result), ensure_ascii=False), flush=True)
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.stderr.flush()
        sys.exit(1)
`;

export const PYTHON_MATRIX = `from typing import *
import sys, json, math, collections, heapq, bisect, itertools, functools, traceback

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def __build_list(arr):
    if not arr: return None
    head = ListNode(arr[0])
    curr = head
    for val in arr[1:]:
        curr.next = ListNode(val)
        curr = curr.next
    return head

def __serialize_list(head):
    res = []
    while head:
        res.append(head.val)
        head = head.next
    return res

def __serialize(v):
    if isinstance(v, ListNode): return __serialize_list(v)
    if isinstance(v, bool): return v
    if isinstance(v, (int, float, str, type(None))): return v
    if isinstance(v, (list, tuple)): return [__serialize(x) for x in v]
    return str(v)

###USERCODE###

def _validate_matrix_and_word(board, word):
    if not isinstance(board, list) or not board:
        raise ValueError("Board must be a non-empty 2D list")
    row_length = None
    for row in board:
        if not isinstance(row, list): raise ValueError("Board rows must be lists")
        if row_length is None: row_length = len(row)
        elif len(row) != row_length: raise ValueError("Board must be rectangular")
        for cell in row:
            if not isinstance(cell, str) or len(cell) != 1:
                raise ValueError("Board cells must be single-character strings")
    if word is not None:
        if not isinstance(word, str): raise ValueError("Word must be a string")
        if len(word) == 0: raise ValueError("Word cannot be empty")
    return board, word

def normalize_matrix_problem_input(input_data):
    # CASE 1: dict with direct keys
    if isinstance(input_data, dict):
        if "board" in input_data and "word" in input_data:
            return _validate_matrix_and_word(input_data["board"], input_data["word"])
        # Some matrix problems might not have 'word' (e.g. Number of Islands)
        if "board" in input_data and "word" not in input_data:
            board, _ = _validate_matrix_and_word(input_data["board"], None)
            return (board,)
        if "matrix" in input_data:
            board, _ = _validate_matrix_and_word(input_data["matrix"], None)
            return (board,)
            
        # CASE 2: nested args
        if "args" in input_data and isinstance(input_data["args"], dict):
            args = input_data["args"]
            if "board" in args and "word" in args:
                return _validate_matrix_and_word(args["board"], args["word"])
            if "board" in args:
                board, _ = _validate_matrix_and_word(args["board"], None)
                return (board,)
            if "matrix" in args:
                board, _ = _validate_matrix_and_word(args["matrix"], None)
                return (board,)

    # CASE 3: positional list/tuple (already unpacked or in array format)
    if isinstance(input_data, (list, tuple)):
        # If the outer array has length 2 and the first is a 2D array, it's [board, word]
        if len(input_data) == 2 and isinstance(input_data[0], list) and (len(input_data[0])==0 or isinstance(input_data[0][0], list)):
            return _validate_matrix_and_word(input_data[0], input_data[1])
        # If it's a 1-element tuple of a 2D array, or just the 2D array itself
        if len(input_data) == 1 and isinstance(input_data[0], list) and (len(input_data[0])==0 or isinstance(input_data[0][0], list)):
            board, _ = _validate_matrix_and_word(input_data[0], None)
            return (board,)
        # If it's just the 2D array directly (e.g. [[1,2],[3,4]])
        if isinstance(input_data[0], list):
            board, _ = _validate_matrix_and_word(input_data, None)
            return (board,)

    raise ValueError("Invalid input format for matrix problem.")

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    args = []
    
    # 1. Parse raw stdin lines
    for line in lines:
        try:
            val = json.loads(line)
        except Exception:
            val = line
        args.append(val)
        
    # 2. Universal Matrix Normalization
    try:
        if len(args) == 1:
            norm_args = normalize_matrix_problem_input(args[0])
            args = list(norm_args)
        elif len(args) == 2:
            norm_args = normalize_matrix_problem_input(args)
            args = list(norm_args)
    except Exception as e:
        sys.stderr.write(f"Adapter Error: {str(e)}\\n")
        sys.stderr.flush()
        sys.exit(1)

    # 3. Execution
    try:
        if 'Solution' in globals() and hasattr(Solution, '###ENTRYPOINT###'):
            result = getattr(Solution(), '###ENTRYPOINT###')(*args)
        else:
            result = globals()['###ENTRYPOINT###'](*args)
        print("###AIVON_RES###", flush=True)
        print(json.dumps(__serialize(result), ensure_ascii=False), flush=True)
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.stderr.flush()
        sys.exit(1)
`;

export const PYTHON_GRAPH = PYTHON_ARRAY;  // graph problems use adjacency lists (plain arrays)

// ─── JavaScript Templates ──────────────────────────────────────────────────────

export const JS_ARRAY = `###USERCODE###

(function __main() {
  const lines = require('fs').readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);
  const args = lines.map(line => {
    try { return JSON.parse(line); } catch(e) { return line; }
  });
  function __serialize(r) {
    if (r === null || r === undefined) return null;
    if (typeof r === 'boolean' || typeof r === 'number' || typeof r === 'string') return r;
    if (Array.isArray(r)) return r.map(__serialize);
    if (typeof r === 'object') {
      const out = {};
      for (const k of Object.keys(r)) out[k] = __serialize(r[k]);
      return out;
    }
    return String(r);
  }
  try {
    const result = new Solution().###ENTRYPOINT###(...args);
    process.stdout.write('###AIVON_RES###\\n');
    process.stdout.write(JSON.stringify(__serialize(result)) + '\\n');
  } catch(e) {
    process.stderr.write((e && e.stack ? e.stack : String(e)) + '\\n');
    process.exit(1);
  }
})();
`;

export const JS_BINARY_TREE = `###USERCODE###

class TreeNode {
  constructor(val=0,left=null,right=null){this.val=val;this.left=left;this.right=right;}
}
function __buildTree(vals) {
  if (!vals||!vals.length||vals[0]===null) return null;
  const root=new TreeNode(vals[0]),q=[root];let i=1;
  while(q.length&&i<vals.length){
    const n=q.shift();
    if(i<vals.length&&vals[i]!==null){n.left=new TreeNode(vals[i]);q.push(n.left);}i++;
    if(i<vals.length&&vals[i]!==null){n.right=new TreeNode(vals[i]);q.push(n.right);}i++;
  }
  return root;
}
function __serializeTree(root) {
  if(!root) return null;
  const res=[],q=[root];
  while(q.length){const n=q.shift();if(n){res.push(n.val);q.push(n.left);q.push(n.right);}else{res.push(null);}}
  while(res.length&&res[res.length-1]===null) res.pop();
  return res;
}
function __serialize(r) {
  if(r===null||r===undefined) return null;
  if(r instanceof TreeNode) return __serializeTree(r);
  if(Array.isArray(r)) return r.map(__serialize);
  if(typeof r==='boolean'||typeof r==='number'||typeof r==='string') return r;
  if(typeof r==='object'){const o={};for(const k of Object.keys(r))o[k]=__serialize(r[k]);return o;}
  return String(r);
}
(function __main() {
  const lines=require('fs').readFileSync(0,'utf-8').trim().split('\\n').filter(Boolean);
  const args=lines.map(line=>{
    try{const v=JSON.parse(line);return Array.isArray(v)?__buildTree(v):v;}catch(e){return line;}
  });
  try{
    const result=new Solution().###ENTRYPOINT###(...args);
    process.stdout.write('###AIVON_RES###\\n');
    process.stdout.write(JSON.stringify(__serialize(result))+'\\n');
  }catch(e){process.stderr.write((e&&e.stack?e.stack:String(e))+'\\n');process.exit(1);}
})();
`;

export const JS_LINKED_LIST = `###USERCODE###

class ListNode {
  constructor(val=0,next=null){this.val=val;this.next=next;}
}
function __buildList(vals) {
  if(!vals||!vals.length) return null;
  const dummy=new ListNode(0);let cur=dummy;
  for(const v of vals){cur.next=new ListNode(v);cur=cur.next;}
  return dummy.next;
}
function __serializeList(head) {
  const res=[],seen=new Set();
  while(head){if(seen.has(head)){res.push('cycle');break;}seen.add(head);res.push(head.val);head=head.next;}
  return res;
}
function __serialize(r) {
  if(r===null||r===undefined) return null;
  if(r instanceof ListNode) return __serializeList(r);
  if(Array.isArray(r)) return r.map(__serialize);
  if(typeof r==='boolean'||typeof r==='number'||typeof r==='string') return r;
  return String(r);
}
(function __main() {
  const lines=require('fs').readFileSync(0,'utf-8').trim().split('\\n').filter(Boolean);
  const args=lines.map(line=>{
    try{const v=JSON.parse(line);return(Array.isArray(v)&&v.every(x=>typeof x==='number'))?__buildList(v):v;}catch(e){return line;}
  });
  try{
    const result=new Solution().###ENTRYPOINT###(...args);
    process.stdout.write('###AIVON_RES###\\n');
    process.stdout.write(JSON.stringify(__serialize(result))+'\\n');
  }catch(e){process.stderr.write((e&&e.stack?e.stack:String(e))+'\\n');process.exit(1);}
})();
`;

export const JS_MATRIX = JS_ARRAY;
export const JS_GRAPH = JS_ARRAY;

// ─── Template registry ─────────────────────────────────────────────────────────

type LangKey = "python" | "javascript";
type TypeKey = "array" | "string" | "binary_tree" | "linked_list" | "matrix" | "graph";

const TEMPLATES: Record<LangKey, Record<TypeKey, string>> = {
  python: {
    array: PYTHON_ARRAY,
    string: PYTHON_ARRAY,
    binary_tree: PYTHON_BINARY_TREE,
    linked_list: PYTHON_LINKED_LIST,
    matrix: PYTHON_MATRIX,
    graph: PYTHON_GRAPH,
  },
  javascript: {
    array: JS_ARRAY,
    string: JS_ARRAY,
    binary_tree: JS_BINARY_TREE,
    linked_list: JS_LINKED_LIST,
    matrix: JS_MATRIX,
    graph: JS_GRAPH,
  },
};

export function getTemplate(language: string, problemType: string): string {
  const lang = normLang(language);
  const type = normType(problemType);
  return TEMPLATES[lang]?.[type] ?? TEMPLATES[lang]?.["array"] ?? PYTHON_ARRAY;
}

export function normLang(language: string): LangKey {
  const l = language.toLowerCase();
  if (l === "python" || l === "python3") return "python";
  return "javascript";
}

export function normType(problemType: string): TypeKey {
  return ((problemType || "array").toLowerCase().replace(/-/g, "_")) as TypeKey;
}
