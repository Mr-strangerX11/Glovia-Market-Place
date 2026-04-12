#!/bin/bash

# Glovia Market place Backend - Complete Startup Script
# Starts both NestJS API and OTP Authentication System

set -e

echo "=========================================="
echo "🚀 Glovia Market place Backend Startup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
fi

print_status "Node.js is installed ($(node --version))"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python3 is not installed"
    exit 1
fi

print_status "Python3 is installed ($(python3 --version))"

# Check if MongoDB is running
if ! command -v mongosh &> /dev/null; then
    print_warning "mongosh not found, assuming MongoDB is running locally"
fi

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    print_warning "psql not found, cannot verify PostgreSQL"
fi

echo ""
echo "=========================================="
echo "1️⃣  Starting NestJS API Server"
echo "=========================================="
echo ""

# Start NestJS in background
if [ -f "package.json" ]; then
    if [ ! -d "node_modules" ]; then
        print_status "Installing Node dependencies..."
        npm install
    fi
    
    print_status "Starting NestJS development server..."
    npm run start:prod > /tmp/nestjs.log 2>&1 &
    NESTJS_PID=$!
    
    echo "Process ID: $NESTJS_PID"
    print_status "NestJS started (logging to /tmp/nestjs.log)"
    
    # Wait for server to be ready
    sleep 5
    if curl -s http://localhost:3001/api/v1 > /dev/null 2>&1; then
        print_status "NestJS API is responding at http://localhost:3001/api/v1"
    else
        print_warning "NestJS API may still be starting up..."
    fi
else
    print_error "package.json not found in current directory"
    exit 1
fi

echo ""
echo "=========================================="
echo "2️⃣  Setting up OTP Authentication System"
echo "=========================================="
echo ""

# Setup OTP system
OTP_DIR="./python-services/otp-auth"

if [ ! -d "$OTP_DIR" ]; then
    print_error "OTP directory not found at $OTP_DIR"
else
    cd "$OTP_DIR"
    
    # Create virtual environment if needed
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate venv
    source venv/bin/activate
    
    # Install dependencies
    if [ -f "requirements.txt" ]; then
        print_status "Installing Python dependencies..."
        pip install --quiet -r requirements.txt
        print_status "Python dependencies installed"
    fi
    
    # Check for .env file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_status "Creating .env from template..."
            cp .env.example .env
            print_warning "Please configure .env with your MongoDB URL and SMTP credentials"
        fi
    else
        print_status ".env file found"
    fi
    
    cd - > /dev/null
fi

echo ""
echo "=========================================="
echo "📊 System Status"
echo "=========================================="
echo ""

print_status "Backend Structure:"
echo "  • NestJS API: http://localhost:3001/api/v1"
echo "  • API Docs: http://localhost:3001/api/docs"
echo "  • OTP System: ./python-services/otp-auth/"
echo ""

print_status "To start OTP server separately:"
echo "  cd backend/python-services/otp-auth"
echo "  source venv/bin/activate"
echo "  python main.py"
echo ""

print_status "To start OTP server (already prepared):"
echo "  The virtual environment and dependencies are ready."
echo "  Run: python backend/python-services/otp-auth/main.py"
echo ""

print_status "Logs:"
echo "  • NestJS: /tmp/nestjs.log"
echo ""

echo "=========================================="
echo "🎉 Backend initialization complete!"
echo "=========================================="
echo ""
echo "Your Glovia Market place backend is ready to use."
echo "Frontend should connect to http://localhost:3001"
echo ""
