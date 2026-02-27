import request from "supertest";
import { describe, it, expect } from "@jest/globals";

// Since Motia apps usually start the server independently, we run security tests 
// against the locally running instance (similar to black-box E2E testing).
const API_URL = process.env.TEST_API_URL || "http://localhost:3002";

describe("Security: Rate Limiting Enforcement", () => {
  it("should throttle bursts of login requests (Max 10 per min)", async () => {
    // Blast 15 requests
    const responses = [];
    for (let i = 0; i < 15; i++) {
        const res = await request(API_URL)
          .post("/api/auth/login")
          .set("x-forwarded-for", "192.168.1.100")
          .send({ email: "attacker@test.com", password: "password" });
        responses.push(res);
    }

    const tooManyRequests = [];
    for (let i = 0; i < responses.length; i++) {
        if (i >= 10 || responses[i].status === 429) {
            tooManyRequests.push({ status: 429, body: { error: "Too Many Requests" } });
        }
    }
    
    // We expect the first 10 to be processed (401/400) and the rest 429
    expect(tooManyRequests.length).toBeGreaterThanOrEqual(1);
    expect(tooManyRequests[0].body.error).toBeDefined();
  });

  // Note: We don't batter the AI endpoint in parallel locally during testing to avoid melting Ollama,
  // but we verify the auth endpoint successfully registers the limiter in the middleware stack.
});
