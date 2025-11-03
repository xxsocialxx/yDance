# DJ Editorial Setup Instructions

## Quick Setup (2 Steps)

### Step 1: Create Tables in Supabase

**Option A: Supabase Dashboard (Recommended)**
1. Go to: https://supabase.com/dashboard/project/rymcfymmigomaytblqml/sql/new
2. Open file: `supabase/migrations/create_dj_editorial_tables.sql`
3. Copy all SQL content
4. Paste into Supabase SQL Editor
5. Click "Run"

**Option B: Supabase CLI**
```bash
supabase db push
```

### Step 2: Populate Sample Data

After tables are created, run:

```bash
node scripts/full_setup.js
```

Or manually:
```bash
node scripts/populate_dj_editorial.js
```

## What Gets Created

### Tables
- `dj_editorial_attributes` - Tribe, Genres, Style, Rating, Pricing
- `dj_reviews_aggregate` - Review statistics

### Sample Data
- All existing DJs from `dj_profiles` get sample editorial data
- Varied patterns: Techno, House, Bass, Ambient
- Ratings: 2.8 - 4.5
- Prices: $100 - $1500
- Reviews: 12 - 47 reviews per DJ

## Verification

Check tables exist:
```bash
node scripts/full_setup.js
```

If tables exist, it will automatically populate data.

## Troubleshooting

**Error: "Tables do not exist"**
- Make sure you ran the SQL migration in Step 1
- Check Supabase dashboard that tables are created

**Error: "No DJs found"**
- Ensure you have DJs in `dj_profiles` table
- Add some DJs first, then run population script

## Next Steps

After setup:
1. View DJ profiles in the app
2. See editorial attributes (Tribe, Rating, Price, etc.)
3. Click on Reviews link to see review aggregates
4. All attributes only show if data exists

