// k6 configuration thresholds for Aivon DSA Platform

export const thresholds = {
    // Fast Read APIs (Dashboard, Leaderboard)
    "http_req_duration{type:api}": ["p(95)<500", "p(99)<1000"],

    // AI Inference (Ollama)
    "http_req_duration{type:ai}": ["p(50)<2000", "p(95)<6000"],

    // Judge0 Execution Pipeline
    "http_req_duration{type:judge}": ["p(95)<3000"],

    // Global Error Budget (< 1%)
    "http_req_failed": ["rate<0.01"],
};

export const defaultHeaders = {
    "Content-Type": "application/json",
    "Authorization": "Bearer TEST_LOAD_TOKEN_IGNORE_AUTH"
};
