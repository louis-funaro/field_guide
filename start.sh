#!/bin/bash
# Start both service and web-ui in parallel

echo "🌿 Starting Field Guide..."
echo ""

# Service
(cd service && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8000) &
SERVICE_PID=$!

# Frontend
(cd web-ui && npm install --silent && npm run dev) &
WEB_UI_PID=$!

echo "Service:  http://localhost:8000"
echo "API docs: http://localhost:8000/docs"
echo "Web UI: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both."

trap "kill $SERVICE_PID $WEB_UI_PID 2>/dev/null; exit" INT TERM
wait
