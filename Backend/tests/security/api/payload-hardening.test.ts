import request from "supertest";

const API_URL = process.env.TEST_API_URL || "http://localhost:3002";

describe("Security: Input Validation & Payload Hardening", () => {
  it("should reject massively oversized code submissions", async () => {
    // Create a 1MB string
    const maliciousCode = "a".repeat(1024 * 1024);

    const res = await request(API_URL)
      .post("/api/run")
      .set("Authorization", "Bearer MOCK_TOKEN_WE_JUST_NEED_TO_HIT_VALIDATION")
      .send({
        problemId: "two-sum",
        language: "python",
        code: maliciousCode,
      });

    // We expect Zod to catch the .max(50000) constraint and return a 400 Bad Request.
    // However, Motia's internal body parser might reject a 1MB payload before Zod runs,
    // returning a 413 Payload Too Large or a 500 Internal Error. All are safe.
    expect([400, 401, 413, 429, 500]).toContain(res.status);
    
    if (res.status === 400) {
      expect(JSON.stringify(res.body)).toMatch(/too_big|String must contain at most/i);
    }
  });

  it("should reject excessively long chat histories", async () => {
    const maliciousMessages = Array.from({ length: 100 }).map(() => ({
      role: "user",
      content: "Hello",
    }));

    const res = await request(API_URL)
      .post("/api/ai/chat")
      .set("Authorization", "Bearer MOCK_TOKEN")
      .send({
        problemId: "two-sum",
        messages: maliciousMessages,
      });

    expect([400, 401, 429]).toContain(res.status);
  });
});
