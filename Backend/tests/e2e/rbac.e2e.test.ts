import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { generateMockSessionCookie } from '../utils/authHelpers';
import { clearDatabase } from '../utils/dbTeardown';

const API_URL = 'http://localhost:3002'; // Fast local API proxy

describe('Role-Based Access Control (RBAC)', () => {
  beforeAll(async () => await clearDatabase());
  afterAll(async () => await clearDatabase());

  test('Guest (No Token) is rejected from Submission APIs', async () => {
    const res = await fetch(`${API_URL}/api/submissions`, { method: 'POST', body: JSON.stringify({}) });
    expect(res.status).toBe(401); 
  });

  test('Standard USER cannot access ADMIN-only analytical endpoints', async () => {
    const { headers } = await generateMockSessionCookie({ role: 'USER' });
    
    // Simulating access to a dashboard/management endpoint
    const res = await fetch(`${API_URL}/api/admin/system/metrics`, { headers });
    
    // Our role validation should block this 
    expect(res.status).toBe(403); 
    const data = await res.json();
    expect(data.error).toMatch(/forbidden|permission/i);
  });

  test('Standard USER can submit code to open problems', async () => {
    const { headers } = await generateMockSessionCookie({ role: 'USER' });
    
    const res = await fetch(`${API_URL}/api/submissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ problemId: 'two-sum', language: 'python', code: 'print("hello")' })
    });
    
    // We expect 200/201 creation or 400 Bad Request if the Problem ID doesn't exist in our DB wipe
    // But we strictly do NOT expect 401/403
    expect([200, 201, 400]).toContain(res.status);
  });

});
