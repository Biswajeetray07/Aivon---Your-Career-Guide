import http from 'k6/http';
import { check, sleep } from 'k6';
import { thresholds, defaultHeaders } from '../config/thresholds.js';

export const options = {
    stages: [
        { duration: '15s', target: 20 },  // Warmup
        { duration: '1m', target: 200 },  // 200 concurrent active solvers clicking "Run"
        { duration: '15s', target: 0 },   // Cool down
    ],
    thresholds,
};

const API_URL = __ENV.API_URL || 'http://localhost:3002';

export default function () {
    const payload = JSON.stringify({
        problemId: "two-sum",
        language: "python",
        code: "def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n    return []\n"
    });

    // Users rapidly click run/submit
    const res = http.post(`${API_URL}/api/run`, payload, {
        headers: defaultHeaders,
        tags: { type: 'judge' }
    });

    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    // Small delay: "Active Solver" frantically debugging
    sleep(Math.random() * 2 + 1);
}
