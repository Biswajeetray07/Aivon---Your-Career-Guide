import axios from "axios";

async function testOllama() {
  try {
    const res = await axios.post("http://localhost:11434/api/generate", {
      model: "qwen2.5-coder:7b",
      prompt: "Reply with JSON: { \"status\": \"ok\" }",
      stream: false,
      format: "json",
      options: { num_predict: -1 }
    });
    console.log("SUCCESS -1:", res.status);
  } catch (err: any) {
    console.error("ERROR -1:", err.response?.data || err.message);
  }
  
  try {
    const res = await axios.post("http://localhost:11434/api/generate", {
      model: "qwen2.5-coder:7b",
      prompt: "Reply with JSON: { \"status\": \"ok\" }",
      stream: false,
      format: "json",
      options: { num_predict: 220 }
    });
    console.log("SUCCESS 220:", res.status);
  } catch (err: any) {
    console.error("ERROR 220:", err.response?.data || err.message);
  }
}

testOllama();
