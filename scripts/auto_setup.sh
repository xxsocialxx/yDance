#!/bin/bash
# Auto-setup script for DJ Editorial tables
# This script provides instructions and runs data population after tables are created

echo "🚀 DJ Editorial Setup Script"
echo "=============================="
echo ""

# Check if Supabase CLI is installed
if command -v supabase &> /dev/null; then
    echo "✅ Supabase CLI found"
    echo "📝 Running migrations via CLI..."
    # supabase db push
    echo "⚠️  Please ensure you're linked to your project first:"
    echo "   supabase link --project-ref rymcfymmigomaytblqml"
    echo ""
else
    echo "⚠️  Supabase CLI not installed"
    echo "📝 To install: npm install -g supabase"
    echo ""
fi

echo "📋 STEP 1: Create Tables"
echo "   Run the SQL migration in Supabase Dashboard:"
echo "   1. Go to: https://supabase.com/dashboard/project/rymcfymmigomaytblqml/sql/new"
echo "   2. Open: supabase/migrations/create_dj_editorial_tables.sql"
echo "   3. Copy and paste into SQL Editor"
echo "   4. Click 'Run'"
echo ""

read -p "Have you created the tables? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📝 STEP 2: Populating Sample Data..."
    node scripts/populate_dj_editorial.js
else
    echo ""
    echo "⚠️  Please create the tables first, then run:"
    echo "   node scripts/populate_dj_editorial.js"
fi

