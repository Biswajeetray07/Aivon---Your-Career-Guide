curl -s -v -X POST http://127.0.0.1:3002/api/ai/explain -H "Content-Type: application/json" -H "Authorization: Bearer mock" -d '{"problemId": "not-a-real-id"}'
