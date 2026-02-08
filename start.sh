#!/bin/bash

# Dracanus Platform - Quick Start Script

echo "🚀 Starting Dracanus Platform Setup..."
echo ""

cd /home/user/dracanus-platform

# Step 1: Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found"
  echo "Creating .env from template..."
  cp .env.example .env
  echo "✅ Created .env file"
  echo "⚠️  Please update DATABASE_URL and other variables in .env"
  echo ""
fi

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 3: Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Step 4: Push database schema
echo "🗄️  Pushing database schema..."
npx prisma db push --skip-generate
echo "✅ Database schema created"
echo ""

# Step 5: Seed database with agents
echo "🌱 Seeding database with 24 AI agents..."
npm run prisma:seed
echo "✅ Database seeded"
echo ""

# Step 6: Start development server
echo "🚀 Starting development server..."
echo ""
echo "✨ Dracanus Platform is ready!"
echo "📍 Open http://localhost:3000"
echo ""
echo "🔐 Create an account to get started"
echo ""

npm run dev
