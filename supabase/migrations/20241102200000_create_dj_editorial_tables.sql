-- ============================================================================
-- DJ EDITORIAL ATTRIBUTES EXTENSION TABLES
-- Created: 2024-12-XX
-- Purpose: Store editorial/curated DJ attributes, ratings, and review aggregates
-- ============================================================================

-- Table: dj_editorial_attributes
-- Stores editorial/curated attributes about DJs (Tribe, Genres, Style, Rating, Pricing)
CREATE TABLE IF NOT EXISTS dj_editorial_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dj_name TEXT NOT NULL UNIQUE,  -- References dj_profiles.name
    tribe TEXT,  -- Main movement: "Techno", "House", "Bass", "Ambient", etc.
    genres TEXT[],  -- Versatility genres: ["Dubstep", "House", "Garage"]
    style_tags TEXT[],  -- Performance characteristics: ["busy", "show", "minimal", "energetic"]
    editorial_rating NUMERIC(3,1) CHECK (editorial_rating >= 0 AND editorial_rating <= 5),  -- Decimal rating: 2.5, 4.7, etc.
    price_range_min INTEGER,  -- USD minimum
    price_range_max INTEGER,  -- USD maximum
    currency TEXT DEFAULT 'USD',
    notes TEXT,  -- Editorial notes about rating/pricing methodology
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT price_range_check CHECK (
        price_range_max >= price_range_min OR 
        (price_range_min IS NULL AND price_range_max IS NULL)
    )
);

-- Table: dj_reviews_aggregate
-- Aggregated review statistics (review average rating, count)
-- This is a cache/aggregate table - actual reviews would be in a separate reviews table
CREATE TABLE IF NOT EXISTS dj_reviews_aggregate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dj_name TEXT NOT NULL UNIQUE,  -- References dj_profiles.name
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    average_rating NUMERIC(3,1) CHECK (average_rating >= 0 AND average_rating <= 5),
    last_review_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_dj_editorial_dj_name ON dj_editorial_attributes(dj_name);
CREATE INDEX IF NOT EXISTS idx_dj_reviews_dj_name ON dj_reviews_aggregate(dj_name);

-- Enable RLS (Row Level Security)
ALTER TABLE dj_editorial_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_reviews_aggregate ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read, allow service role writes
CREATE POLICY "dj_editorial_attributes_select" ON dj_editorial_attributes
    FOR SELECT USING (true);

CREATE POLICY "dj_editorial_attributes_insert" ON dj_editorial_attributes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "dj_editorial_attributes_update" ON dj_editorial_attributes
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "dj_reviews_aggregate_select" ON dj_reviews_aggregate
    FOR SELECT USING (true);

CREATE POLICY "dj_reviews_aggregate_insert" ON dj_reviews_aggregate
    FOR INSERT WITH CHECK (true);

CREATE POLICY "dj_reviews_aggregate_update" ON dj_reviews_aggregate
    FOR UPDATE USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON dj_editorial_attributes TO anon, authenticated;
GRANT SELECT ON dj_reviews_aggregate TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE dj_editorial_attributes IS 'Editorial/curated DJ attributes including tribe, genres, style tags, rating, and pricing';
COMMENT ON COLUMN dj_editorial_attributes.tribe IS 'Main musical movement/category (e.g., Techno, House, Bass)';
COMMENT ON COLUMN dj_editorial_attributes.genres IS 'Array of genres DJ plays, showing versatility';
COMMENT ON COLUMN dj_editorial_attributes.style_tags IS 'Performance characteristics (busy, show, minimal, energetic, etc.)';
COMMENT ON COLUMN dj_editorial_attributes.editorial_rating IS 'Editorial rating 0-5, can be decimal (e.g., 2.5, 4.7)';
COMMENT ON COLUMN dj_editorial_attributes.price_range_min IS 'Minimum booking price in USD';
COMMENT ON COLUMN dj_editorial_attributes.price_range_max IS 'Maximum booking price in USD';

COMMENT ON TABLE dj_reviews_aggregate IS 'Aggregated review statistics per DJ';
COMMENT ON COLUMN dj_reviews_aggregate.average_rating IS 'Average rating from user reviews (0-5, can be decimal)';
COMMENT ON COLUMN dj_reviews_aggregate.review_count IS 'Total number of reviews';

