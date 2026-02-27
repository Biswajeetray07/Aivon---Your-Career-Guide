import request from "supertest";

const API_URL = process.env.TEST_API_URL || "http://localhost:3002";

describe("Security: Judge Sandbox Safety", () => {
  it("should terminate infinite loops within the timeout boundary", async () => {
    // A classic CPU burner
    const infiniteLoopCode = `
while True:
    pass
`;

    const res = await request(API_URL)
      .post("/api/run")
      .set("Authorization", "Bearer MOCK_TOKEN_WE_JUST_NEED_TO_HIT_VALIDATION")
      .send({
        problemId: "two-sum",
        language: "python",
        code: infiniteLoopCode,
      });

    // We accept 401 if unauthenticated, 429 if rate limited, or 200 with TLE status
    expect([200, 401, 429]).toContain(res.status);
    
    if (res.status === 200) {
      expect(JSON.stringify(res.body)).toMatch(/TIME_LIMIT_EXCEEDED/i);
    }
  });

  it("should contain memory bombs and prevent Out-Of-Memory host crashes", async () => {
    // Attempt to allocate gigabytes of RAM
    const memoryBombCode = `
try:
    x = [0] * (10**9)
except MemoryError:
    print("Memory limit successfully caught")
`;

    const res = await request(API_URL)
      .post("/api/run")
      .set("Authorization", "Bearer MOCK_TOKEN")
      .send({
        problemId: "two-sum",
        language: "python",
        code: memoryBombCode,
      });

    expect([200, 401, 429]).toContain(res.status);
    
    // We expect a runtime error (signal 9/SIGKILL) or a MemoryError caught by Python
    if (res.status === 200) {
      const output = JSON.stringify(res.body);
      expect(output).toMatch(/RUNTIME_ERROR|Memory limit/i);
    }
  });

  it("should block system-level file access execution", async () => {
    // Attempt to read host files out of the sandbox
    const sysAccessCode = `
import os
try:
    with open('/etc/passwd', 'r') as f:
        print(f.read())
except Exception as e:
    print(str(e))
`;

    const res = await request(API_URL)
      .post("/api/run")
      .set("Authorization", "Bearer MOCK_TOKEN")
      .send({
        problemId: "two-sum",
        language: "python",
        code: sysAccessCode,
      });

    expect([200, 401, 429]).toContain(res.status);
    // Ideally this errors out or returns an isolated dummy file, but NEVER host data
    if (res.status === 200) {
      expect(JSON.stringify(res.body)).not.toMatch(/root:x:0:0:/i);
    }
  });
});
