#!/bin/bash

echo "🚀 Setting up Sales System Backend Development Environment"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not installed. Please install MongoDB or use Docker."
    echo "   Docker command: docker run -d -p 27017:27017 --name mongodb mongo:latest"
else
    if pgrep -x "mongod" > /dev/null; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB is installed but not running. Starting MongoDB..."
        mongod --fork --logpath /tmp/mongod.log
        echo "✅ MongoDB started"
    fi
fi

# Check if Redis is running
if ! command -v redis-server &> /dev/null; then
    echo "⚠️  Redis is not installed. Please install Redis or use Docker."
    echo "   Docker command: docker run -d -p 6379:6379 --name redis redis:latest"
else
    if pgrep -x "redis-server" > /dev/null; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is installed but not running. Starting Redis..."
        redis-server --daemonize yes
        echo "✅ Redis started"
    fi
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating .env file from template..."
    cp env.example .env
    echo "✅ .env file created. Please edit it with your configuration."
else
    echo "✅ .env file already exists"
fi

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads

# Run tests to ensure everything is working
echo "🧪 Running tests..."
npm test

echo ""
echo "🎉 Setup complete! You can now:"
echo "  1. Edit .env file with your configuration"
echo "  2. Start the development server: npm run dev"
echo "  3. Access the API at: http://localhost:3000"
echo "  4. View API docs at: http://localhost:3000/docs"
echo ""
echo "Happy coding! 🚀"
