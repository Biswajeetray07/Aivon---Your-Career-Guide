#!/bin/bash

# Navigate to project root
cd "$(dirname "$0")" || exit

# Kill any existing processes on the relevant ports (3000, 3002, 8000)
lsof -ti:3000,3002,8000 | xargs kill -9 2>/dev/null

echo "Starting Aivon DSA Platform..."

# Start the Python FastAPI Chatbot Service in the background
echo "-> Booting Local Ollama Chatbot Service on Port 8000..."
cd ./chatbot || exit
uvicorn chatbot_backend:app --host 0.0.0.0 --port 8000 &
cd ..

# Start the Node.js Backend
echo "-> Booting Node.js Backend on Port 3002..."
cd Backend || exit
npm run dev &
cd ..

# Start the Next.js Frontend
echo "-> Booting Next.js Frontend on Port 3000..."
cd frontend || exit
npm run dev &
cd ..

echo "All services are booting! Access the app at http://localhost:3000"

# Wait for all background processes
wait
