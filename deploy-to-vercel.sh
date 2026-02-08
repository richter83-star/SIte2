#!/bin/bash

# Dracanus Platform - Quick Deploy to Vercel Script

echo "🚀 Dracanus Platform - Quick Deploy to Vercel"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Please run from /home/user/dracanus-platform"
  exit 1
fi

echo "📦 Step 1: Installing Vercel CLI..."
npm install -g vercel

echo ""
echo "🔑 Step 2: Login to Vercel..."
echo "A browser window will open. Please login."
vercel login

echo ""
echo "📊 Step 3: Create production database..."
echo ""
echo "⚠️  ACTION REQUIRED:"
echo "1. Open https://neon.tech in your browser"
echo "2. Sign up / Login"
echo "3. Create a new project named 'dracanus-production'"
echo "4. Copy the connection string (it looks like: postgresql://user:pass@host/db)"
echo ""
read -p "Press Enter when you have your connection string ready..."
echo ""

read -p "Paste your Neon database connection string: " DATABASE_URL

echo ""
echo "🔧 Step 4: Migrating database schema..."
export DATABASE_URL="$DATABASE_URL"
npx prisma generate
npx prisma db push

echo ""
echo "🌱 Step 5: Seeding database with AI agents..."
npx tsx prisma/seed.ts

echo ""
echo "🔐 Step 6: Generating secrets..."
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "Generated NEXTAUTH_SECRET: $NEXTAUTH_SECRET"

echo ""
echo "🚀 Step 7: Deploying to Vercel..."
vercel --prod

echo ""
echo "🔑 Step 8: Setting environment variables..."
echo ""
echo "Setting DATABASE_URL..."
echo "$DATABASE_URL" | vercel env add DATABASE_URL production

echo ""
echo "Setting NEXTAUTH_SECRET..."
echo "$NEXTAUTH_SECRET" | vercel env add NEXTAUTH_SECRET production

echo ""
read -p "Enter your final domain (e.g., https://yourdomain.com): " NEXTAUTH_URL
echo "$NEXTAUTH_URL" | vercel env add NEXTAUTH_URL production

echo ""
echo "🔄 Step 9: Redeploying with environment variables..."
vercel --prod

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Your site is live at the URL shown above"
echo "2. Add your custom domain in Vercel dashboard"
echo "3. Update Namecheap DNS settings:"
echo "   - A Record: @ → 76.76.21.21"
echo "   - CNAME Record: www → cname.vercel-dns.com"
echo ""
echo "📄 Full instructions: /home/user/DEPLOYMENT-TO-NAMECHEAP.md"
echo ""
echo "🎉 Your Dracanus AI Platform is now live!"
