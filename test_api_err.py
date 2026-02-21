import subprocess
import json

payload = '{"email":"test_compiler@example.com","password":"password123","name":"Test"}'
res = subprocess.run(["curl", "-s", "-X", "POST", "http://localhost:3002/api/auth/login", "-H", "Content-Type: application/json", "-d", payload], capture_output=True, text=True)
token = json.loads(res.stdout).get("token")

res = subprocess.run(["curl", "-s", "http://localhost:3002/api/problems"], capture_output=True, text=True)
prob_id = json.loads(res.stdout)["problems"][0]["id"]

# SYNTAX ERROR CODE
code = """
class Solution:
    def twoSum(self, nums, target) # missing colon
        return [0, 0]
"""
payload = {"problemId": prob_id, "language": "python", "code": code}

headers = ["-H", "Content-Type: application/json", "-H", f"Authorization: Bearer {token}"]
args = ["curl", "-s", "-X", "POST", "http://localhost:3002/api/run"] + headers + ["-d", json.dumps(payload)]
res = subprocess.run(args, capture_output=True, text=True)
print("--- RUN CODE RESULT ---")
print(json.dumps(json.loads(res.stdout), indent=2))
