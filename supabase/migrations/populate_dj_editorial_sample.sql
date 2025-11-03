-- ============================================================================
-- SAMPLE DATA POPULATION SCRIPT
-- Purpose: Populate dj_editorial_attributes and dj_reviews_aggregate with sample data
-- Note: This uses existing DJ names from dj_profiles table
-- ============================================================================

-- First, let's see what DJs exist (this is a template - run separately to see actual DJs)
-- SELECT name FROM dj_profiles ORDER BY name LIMIT 10;

-- Sample data patterns - adjust DJ names to match your actual database
-- Using generic examples that should be replaced with real DJ names

-- Example 1: Techno-focused, high rating, expensive
INSERT INTO dj_editorial_attributes (
    dj_name, 
    tribe, 
    genres, 
    style_tags, 
    editorial_rating, 
    price_range_min, 
    price_range_max,
    currency,
    notes
) VALUES (
    'DJ Techno Master',  -- REPLACE with actual DJ name from your database
    'Techno',
    ARRAY['Techno', 'Minimal', 'Industrial'],
    ARRAY['busy', 'energetic'],
    4.5,
    500,
    1500,
    'USD',
    'Established techno artist, high energy sets, plays major venues'
) ON CONFLICT (dj_name) DO UPDATE SET
    tribe = EXCLUDED.tribe,
    genres = EXCLUDED.genres,
    style_tags = EXCLUDED.style_tags,
    editorial_rating = EXCLUDED.editorial_rating,
    price_range_min = EXCLUDED.price_range_min,
    price_range_max = EXCLUDED.price_range_max,
    currency = EXCLUDED.currency,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Example 2: Versatile House DJ, moderate rating, mid-range
INSERT INTO dj_editorial_attributes (
    dj_name,
    tribe,
    genres,
    style_tags,
    editorial_rating,
    price_range_min,
    price_range_max,
    currency,
    notes
) VALUES (
    'DJ Versatile',  -- REPLACE with actual DJ name
    'House',
    ARRAY['Dubstep', 'House', 'Garage', 'Drum & Bass'],
    ARRAY['show', 'energetic'],
    3.2,
    200,
    600,
    'USD',
    'Versatile across multiple genres, crowd-pleaser style'
) ON CONFLICT (dj_name) DO UPDATE SET
    tribe = EXCLUDED.tribe,
    genres = EXCLUDED.genres,
    style_tags = EXCLUDED.style_tags,
    editorial_rating = EXCLUDED.editorial_rating,
    price_range_min = EXCLUDED.price_range_min,
    price_range_max = EXCLUDED.price_range_max,
    currency = EXCLUDED.currency,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Example 3: Minimalist, lower rating, affordable
INSERT INTO dj_editorial_attributes (
    dj_name,
    tribe,
    genres,
    style_tags,
    editorial_rating,
    price_range_min,
    price_range_max,
    currency,
    notes
) VALUES (
    'DJ Minimal',  -- REPLACE with actual DJ name
    'Techno',
    ARRAY['Minimal', 'Deep House'],
    ARRAY['minimal', 'busy'],
    2.8,
    100,
    300,
    'USD',
    'Minimalist approach, growing artist, underground scene'
) ON CONFLICT (dj_name) DO UPDATE SET
    tribe = EXCLUDED.tribe,
    genres = EXCLUDED.genres,
    style_tags = EXCLUDED.style_tags,
    editorial_rating = EXCLUDED.editorial_rating,
    price_range_min = EXCLUDED.price_range_min,
    price_range_max = EXCLUDED.price_range_max,
    currency = EXCLUDED.currency,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Example 4: Bass-focused, show style
INSERT INTO dj_editorial_attributes (
    dj_name,
    tribe,
    genres,
    style_tags,
    editorial_rating,
    price_range_min,
    price_range_max,
    currency
) VALUES (
    'DJ Bass Head',  -- REPLACE with actual DJ name
    'Bass',
    ARRAY['Dubstep', 'Bass', 'Trap', 'Future Bass'],
    ARRAY['show', 'energetic', 'busy'],
    3.8,
    300,
    800,
    'USD'
) ON CONFLICT (dj_name) DO UPDATE SET
    tribe = EXCLUDED.tribe,
    genres = EXCLUDED.genres,
    style_tags = EXCLUDED.style_tags,
    editorial_rating = EXCLUDED.editorial_rating,
    price_range_min = EXCLUDED.price_range_min,
    price_range_max = EXCLUDED.price_range_max,
    currency = EXCLUDED.currency,
    updated_at = NOW();

-- Sample review aggregates
INSERT INTO dj_reviews_aggregate (
    dj_name,
    review_count,
    average_rating,
    last_review_date
) VALUES 
    ('DJ Techno Master', 47, 4.3, NOW() - INTERVAL '2 days'),
    ('DJ Versatile', 23, 3.5, NOW() - INTERVAL '5 days'),
    ('DJ Minimal', 12, 2.9, NOW() - INTERVAL '10 days'),
    ('DJ Bass Head', 31, 3.9, NOW() - INTERVAL '1 day')
ON CONFLICT (dj_name) DO UPDATE SET
    review_count = EXCLUDED.review_count,
    average_rating = EXCLUDED.average_rating,
    last_review_date = EXCLUDED.last_review_date,
    updated_at = NOW();

-- Note: After running this, update the DJ names above to match actual DJs in your dj_profiles table

