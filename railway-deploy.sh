#!/bin/bash

# Railway Deployment Script for Sorted.fund Backend
# Run this script after logging in: railway login

set -e  # Exit on error

echo "🚀 Deploying Sorted.fund Backend to Railway..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/backend"

echo "📁 Current directory: $(pwd)"
echo ""

# Check if logged in
echo "✓ Checking Railway authentication..."
railway whoami || {
  echo "❌ Not logged in to Railway"
  echo "Please run: railway login"
  exit 1
}

echo "✓ Logged in to Railway"
echo ""

# Initialize or link project
if [ ! -f ".railway" ]; then
  echo "📦 Creating new Railway project..."
  railway init
else
  echo "✓ Railway project already linked"
fi

echo ""

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ Deployment started!"
echo ""
echo "Next steps:"
echo "1. Add PostgreSQL: railway add --plugin postgresql"
echo "2. Set environment variables in Railway dashboard"
echo "3. Run migrations: railway run npm run migrate"
echo ""
echo "Check status: railway status"
echo "View logs: railway logs"
echo "Open dashboard: railway open"
