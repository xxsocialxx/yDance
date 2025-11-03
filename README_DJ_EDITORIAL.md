# DJ Editorial Attributes Implementation

## Overview
This implementation adds editorial/curated DJ attributes to provide objective, data-driven information about DJs in a terminal-style interface.

## Database Tables

### `dj_editorial_attributes`
Stores editorial/curated attributes about DJs:
- `tribe`: Main musical movement (e.g., "Techno", "House", "Bass")
- `genres`: Array of genres showing versatility (e.g., ["Dubstep", "House", "Garage"])
- `style_tags`: Performance characteristics (e.g., ["busy", "show", "minimal"])
- `editorial_rating`: Decimal rating 0-5 (e.g., 2.5, 4.7)
- `price_range_min/max`: Booking price range in USD
- `notes`: Editorial notes about rating/pricing methodology

### `dj_reviews_aggregate`
Aggregated review statistics:
- `review_count`: Total number of reviews
- `average_rating`: Average rating from user reviews (0-5, can be decimal)
- `last_review_date`: Date of most recent review

## Setup Instructions

1. **Create Tables in Supabase:**
   ```bash
   # Run this SQL in Supabase SQL Editor:
   # File: supabase/migrations/create_dj_editorial_tables.sql
   ```

2. **Populate Sample Data:**
   ```bash
   # Option A: Use Node.js script
   npm install @supabase/supabase-js  # if not already installed
   node scripts/populate_dj_editorial.js
   
   # Option B: Use SQL directly
   # File: supabase/migrations/populate_dj_editorial_sample.sql
   # (Update DJ names to match your actual database)
   ```

## Features Implemented

### DJ Profile Page
- **x.dance URL**: Shows `x.dance/dj-name-slug` format
- **User History**: "SEEN: X" and "BY FRIENDS: Y" (only shows if > 0)
- **Editorial Section**: Tribe, Genres, Style, Rating, Asked (price range)
- **Reviews**: Clickable rating link (e.g., "3.2/5 (47 reviews)")
- **Status**: ACTIVE / RECENT / INACTIVE SINCE [date]
- **Statistics**: Events count, first/last appearance, frequency
- **Cities**: Cities played with event counts
- **Upcoming Events**: Next 5 upcoming events
- **Venue History**: Top venues with play counts
- **External Links**: SoundCloud, Instagram, Bandcamp, Website

### Data Display Philosophy
- **Only shows attributes that have data** - no empty sections
- **Terminal-style formatting** - clean, minimal, protocol-like
- **Objective data-driven** - aggregates from events database
- **Editorial transparency** - ratings and prices clearly marked as editorial

## API Functions Added

- `api.fetchDJEditorialAttributes(djName)` - Fetches editorial attributes
- `api.fetchDJReviewsAggregate(djName)` - Fetches review aggregates

## Helper Functions Added

- `aggregateDJStats(djName)` - Aggregates statistics from events
- `generateXDanceSlug(name)` - Converts DJ name to URL slug
- `calculateUserDJStats(djName, currentUser)` - Calculates user-specific stats

## Future Enhancements

1. **Reviews Detail Page**: Implement `router.showDJReviews(djName)` function
2. **User Attendance Tracking**: Implement attendance tracking for "SEEN" count
3. **Friends Integration**: Implement friends attendance for "BY FRIENDS" count
4. **Admin Interface**: Add UI for managing editorial attributes
5. **Price Context**: Add tooltips explaining price ranges (venue size, event type)

## Notes

- Editorial ratings and prices are intentionally provocative/transparent
- All data display is conditional - only shows if data exists
- Reviews link is clickable but currently shows placeholder (to be implemented)

