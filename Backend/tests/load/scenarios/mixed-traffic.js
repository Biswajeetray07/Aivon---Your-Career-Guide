import { sleep } from 'k6';
import aiChat from './ai-chat.js';
import judgeSubmit from './judge-submit.js';
import dashboard from './dashboard.js';
import { thresholds } from '../config/thresholds.js';

// Realistic Production Traffic Mix
// 60% Casual Readers (Dashboard)
// 30% Active Solvers (Judge Submits)
// 10% Power Users (AI Chat)

export const options = {
    scenarios: {
        dashboard_readers: {
            executor: 'ramping-vus',
            exec: 'runDashboard',
            stages: [
                { duration: '1m', target: 600 }, // Warmup to normal load
                { duration: '3m', target: 600 }, // Sustained load
                { duration: '1m', target: 1200 }, // Spike 
                { duration: '1m', target: 0 },
            ],
        },
        active_solvers: {
            executor: 'ramping-vus',
            exec: 'runJudge',
            stages: [
                { duration: '1m', target: 300 }, // Corresponds to the 30% split
                { duration: '3m', target: 300 },
                { duration: '1m', target: 600 },
                { duration: '1m', target: 0 },
            ],
        },
        power_users: {
            executor: 'ramping-vus',
            exec: 'runAi',
            stages: [
                { duration: '1m', target: 100 }, // 10% split
                { duration: '3m', target: 100 },
                { duration: '1m', target: 200 },
                { duration: '1m', target: 0 },
            ],
        },
    },
    thresholds,
};

export function runDashboard() {
    dashboard();
}

export function runJudge() {
    judgeSubmit();
}

export function runAi() {
    aiChat();
}
