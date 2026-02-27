#!/bin/bash
set -e

# Colors for terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Aivon DSA Platform K6 Load Testing Suite...${NC}"

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}❌ k6 is not installed. Please install it (e.g. brew install k6) and try again.${NC}"
    exit 1
fi

export API_URL=${API_URL:-"http://localhost:3002"}

echo -e "\n${GREEN}=== Running Dashboard (Read-Heavy) Load Test ===${NC}"
k6 run ./scenarios/dashboard.js

echo -e "\n${GREEN}=== Running Judge Submission Pipeline Load Test ===${NC}"
k6 run ./scenarios/judge-submit.js

echo -e "\n${GREEN}=== Running AI Chat (Ollama) Load Test ===${NC}"
k6 run ./scenarios/ai-chat.js

echo -e "\n${GREEN}=== Running Mixed Realistic Production Traffic Test ===${NC}"
k6 run ./scenarios/mixed-traffic.js
