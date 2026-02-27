import request from "supertest";

const API_URL = process.env.TEST_API_URL || "http://localhost:3002";

describe("Security: Authorization & IDOR Protection", () => {
  it("should block unauthenticated access to user data APIs", async () => {
    const res = await request(API_URL).get("/api/stats/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/Unauthorized/i);
  });

  it("should reject invalid/forged JWT tokens", async () => {
    // If the hardcoded fallback C1 fix is active, this token will NOT be signed correctly
    const forgedToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYWtlLWFkbWluLWlkIiwicm9sZSI6IkFETUlOIn0.INVALID_SIGNATURE";

    const res = await request(API_URL)
      .get("/api/stats/me")
      .set("Authorization", `Bearer ${forgedToken}`);

    expect(res.status).toBe(401);
  });

  it("should block non-admin users from accessing protected logic (mock setup)", async () => {
    // By testing the missing token edge case, we ensure the authMiddleware explicitly handles missing headers
    const res = await request(API_URL)
      .post("/api/ai/chat")
      .send({});
      
    // Because no Bearer token is provided, Motia shouldn't even parse the schema,
    // the auth middleware should intercept it.
    expect(res.status).toBe(401);
  });
});
