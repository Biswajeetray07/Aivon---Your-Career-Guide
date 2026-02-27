import http from 'k6/http';
import { check, sleep } from 'k6';
import { thresholds, defaultHeaders } from '../config/thresholds.js';

export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Ramp up to 10 users (warmup)
        { duration: '1m', target: 50 },   // Spike to 50 concurrent AI requests
        { duration: '30s', target: 0 },   // Cool down
    ],
    thresholds,
};

const API_URL = __ENV.API_URL || 'http://localhost:3002';

export default function () {
    const payload = JSON.stringify({
        problemId: "two-sum",
        messages: [{ role: "user", content: "Explain how to solve two sum using a hash map in Python. Keep it under 2 paragraphs." }]
    });

    const res = http.post(`${API_URL}/api/ai/chat`, payload, {
        headers: defaultHeaders,
        tags: { type: 'ai' } // Tag for thresholds
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
        'response has reply': (r) => {
            try { return JSON.parse(r.body).reply !== undefined; } catch (e) { return false; }
        }
    });

    // Power user think time - they read the response before asking again
    sleep(Math.random() * 5 + 5);
}
