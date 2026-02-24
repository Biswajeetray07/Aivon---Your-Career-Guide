import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
    scenarios: {
        smoke_test: {
            executor: "shared-iterations",
            vus: 5,
            iterations: 10,
            maxDuration: "30s",
        },
        burst_test: {
            executor: "ramping-arrival-rate",
            startRate: 10,
            timeUnit: "1s",
            preAllocatedVUs: 50,
            maxVUs: 200,
            stages: [
                { target: 50, duration: "30s" },
                { target: 200, duration: "30s" },
                { target: 0, duration: "30s" }
            ],
            startTime: "30s" // Start after smoke test
        }
    },
    thresholds: {
        http_req_failed: ["rate<0.01"], // Allow < 1% errors
        http_req_duration: ["p(95)<2000"] // 95% of requests must complete below 2s
    }
};

const payload = JSON.stringify({
    problemId: "cfba7d4a-aa84-468f-9a1c-5ea14b30e461", // Example ID, assumes this exists or is patched at runtime
    language: "python",
    code: "class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]"
});

export default function () {
    // We assume there's a bearer token for load testing, or the test runs against a bypassed local route.
    // Using the /api/run endpoint to simulate code execution load without bloating the DB.
    const res = http.post(
        "http://localhost:3002/api/run",
        payload,
        {
            headers: {
                "Content-Type": "application/json",
                // "Authorization": "Bearer TEST_TOKEN" 
            }
        }
    );

    check(res, {
        "status is 200": r => r.status === 200,
        "no internal error": r => {
            try {
                const body = JSON.parse(r.body);
                return body.status !== "INTERNAL_ERROR" && body.error === undefined;
            } catch {
                return false;
            }
        }
    });

    sleep(0.1);
}
