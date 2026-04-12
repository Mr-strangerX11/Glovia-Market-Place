#!/bin/bash

# Start Only OTP Authentication System

set -e

OTP_DIR="./python-services/otp-auth"

echo "🚀 Starting OTP Authentication System"
echo "Path: $OTP_DIR"
echo ""

cd "$OTP_DIR"

# Create virtual environment if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies if needed
if [ ! -d "venv/lib" ] || [ -z "$(pip list | grep fastapi)" ]; then
    echo "📦 Installing Python dependencies..."
    pip install --quiet -r requirements.txt
fi

# Check for .env
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📝 Creating .env from template..."
        cp .env.example .env
        echo "⚠️  Please configure .env with your settings before running the server"
    fi
fi

echo ""
echo "🔧 Configuration:"
echo "  MongoDB: $MONGODB_URL (from .env)"
echo "  Frontend: $FRONTEND_URL (from .env)"
echo ""

# Start server
echo "✅ Starting FastAPI server..."
python main.py
