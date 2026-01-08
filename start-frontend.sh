#!/bin/bash

echo ""
echo "🎮 Starting Sorted.fund Terminal Frontend..."
echo ""

# Check if backend is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "⚠️  Backend not running!"
    echo ""
    echo "Start the backend first:"
    echo "  cd backend && npm run dev"
    echo ""
    exit 1
fi

echo "✓ Backend detected on http://localhost:3000"
echo ""

# Start frontend server
cd frontend

# Check if port 8080 is available
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✓ Frontend already running on http://localhost:8080"
else
    echo "Starting HTTP server on port 8080..."
    python3 -m http.server 8080 > /dev/null 2>&1 &
    sleep 1
    echo "✓ Frontend started"
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "🌐 Open your browser and navigate to:"
echo ""
echo "   🌟 Value Prop Demo:  http://localhost:8080/demo.html"
echo "   🔧 Technical Demo:   http://localhost:8080/live.html"
echo "   📺 Replay Demo:      http://localhost:8080/index.html"
echo ""
echo "═══════════════════════════════════════════════════"
echo ""
