import axios from 'axios';

async function run() {
  console.log("🚀 Testing Rate Limiter (Max 10 per minute on Login)...");
  let i = 1;
  while (true) {
    try {
      const start = Date.now();
      await axios.post('http://localhost:3000/api/auth/login', {
        email: "test@example.com",
        password: "password123"
      });
      console.log(`[${i}] Success (${Date.now() - start}ms)`);
      i++;
      
      if (i > 15) {
        console.log("❌ Test failed: Rate limiter did not engage after 15 requests.");
        break;
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        console.log(`✅ [${i}] CORRECTLY BLOCKED BY RATE LIMITER (429 Too Many Requests)`);
      } else {
        console.error(`[${i}] Error: ${err.message}`);
      }
      break;
    }
  }
}

run();
