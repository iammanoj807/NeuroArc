#!/bin/bash

# NeuroArc - Start Script
# Starts both backend and frontend servers
# Auto-kills existing processes on ports 8000 and 5173

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ports used by the application
BACKEND_PORT=8000
FRONTEND_PORT=5173

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         🚀 NeuroArc Launcher              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}⚠️  Port $port is in use by PID $pid. Killing...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
        echo -e "${GREEN}✓ Port $port is now free${NC}"
    else
        echo -e "${GREEN}✓ Port $port is available${NC}"
    fi
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down NeuroArc...${NC}"
    
    # Kill backend and frontend processes
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✓ Backend stopped${NC}"
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✓ Frontend stopped${NC}"
    fi
    
    # Also kill any remaining processes on our ports
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    
    echo -e "${GREEN}👋 Goodbye!${NC}"
    exit 0
}

# Set up trap to cleanup on Ctrl+C or script exit
trap cleanup SIGINT SIGTERM EXIT

# Kill any existing processes on our ports
echo -e "${BLUE}📋 Checking ports...${NC}"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
echo ""

# Backend setup
echo -e "${BLUE}📦 Setting up Backend...${NC}"
cd "$SCRIPT_DIR/backend"

# Recreate the virtual environment if it was created at another path
# (e.g. the project folder was moved/renamed) - its scripts would point to the old location
if [ -d "venv" ] && ! grep -qF "$SCRIPT_DIR/backend/venv" venv/bin/activate 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Virtual environment was created at a different path. Recreating...${NC}"
    rm -rf venv
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "  Installing Python dependencies..."
python -m pip install -r requirements.txt --quiet

# Copy .env.example to .env if .env doesn't exist
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Created .env from .env.example${NC}"
        echo -e "${YELLOW}   Please add your API keys to backend/.env${NC}"
    fi
fi

# Check if GROQ_API_KEY is set
if ! grep -q "^GROQ_API_KEY=gsk_" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  GROQ_API_KEY not configured - AI features will be limited${NC}"
fi

# Start backend with auto-reload
echo -e "${GREEN}✅ Starting FastAPI Backend (http://localhost:$BACKEND_PORT)${NC}"
python -m uvicorn main:app --reload --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!

# Wait a moment for backend to start


# Frontend setup
echo ""
echo -e "${BLUE}📦 Setting up Frontend...${NC}"
cd "$SCRIPT_DIR/frontend"

# Install npm dependencies if node_modules doesn't exist or package.json changed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo "  Installing Node.js dependencies..."
    npm install --silent
fi

# Start frontend with hot reload
echo -e "${GREEN}✅ Starting React Frontend (http://localhost:$FRONTEND_PORT)${NC}"
npm run dev -- --host &
FRONTEND_PID=$!

# Wait for frontend to start


# Print success message
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       🎉 NeuroArc is running!             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "   ${BLUE}Frontend:${NC}  http://localhost:$FRONTEND_PORT"
echo -e "   ${BLUE}Backend:${NC}   http://localhost:$BACKEND_PORT"
echo -e "   ${BLUE}API Docs:${NC}  http://localhost:$BACKEND_PORT/docs"
echo ""
echo -e "${YELLOW}📝 Both servers have hot-reload enabled.${NC}"
echo -e "${YELLOW}   Edit files and changes will apply automatically!${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop all servers"
echo ""

# Keep script running and wait for processes
wait $BACKEND_PID $FRONTEND_PID
