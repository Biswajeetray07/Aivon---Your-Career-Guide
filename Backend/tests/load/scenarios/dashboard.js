import http from 'k6/http';
import { check, sleep } from 'k6';
import { thresholds, defaultHeaders } from '../config/thresholds.js';

export const options = {
    stages: [
        { duration: '30s', target: 50 },  // Ramp to 50 users
        { duration: '2m', target: 500 },  // 500 casual readers browsing
        { duration: '30s', target: 0 },   // Cool down
    ],
    thresholds,
};

const API_URL = __ENV.API_URL || 'http://localhost:3002';

export default function () {
    // Simulate opening dashboard and fetching user session + problems list
    const sessionRes = http.get(`${API_URL}/api/auth/session`, {
        headers: defaultHeaders, tags: { type: 'api' }
    });

    const problemsRes = http.get(`${API_URL}/api/problems?limit=50&page=1`, {
        headers: defaultHeaders, tags: { type: 'api' }
    });

    check(sessionRes, { 'session OK': (r) => r.status === 200 || r.status === 401 });
    check(problemsRes, { 'problems OK': (r) => r.status === 200 });

    // Casual users browse for a while (10 - 20 seconds) before clicking something else
    sleep(Math.random() * 10 + 10);

    // Click on the leaderboard
    const leaderRes = http.get(`${API_URL}/api/leaderboard`, {
        headers: defaultHeaders, tags: { type: 'api' }
    });

    check(leaderRes, { 'leaderboard OK': (r) => r.status === 200 });

    // Read leaderboard
    sleep(5);
}
