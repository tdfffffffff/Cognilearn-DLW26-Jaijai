#!/bin/bash

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting CogniLearn Backend..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/Backend' && source venv/bin/activate && uvicorn mindmap.app:app --reload --host 0.0.0.0 --port 8000\""

echo "Starting CogniLearn Frontend..."
osascript -e "tell application \"Terminal\" to do script \"cd '$ROOT/Frontend' && npm run dev\""

echo ""
echo "Both servers are starting in separate Terminal windows."
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Frontend: http://localhost:8080"
