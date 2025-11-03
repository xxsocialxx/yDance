-- ============================================================================
-- REVIEWS TABLES
-- Created: 2024-11-03
-- Purpose: Store user reviews for DJs
-- Note: User authentication integration to be implemented later
-- ============================================================================

-- Table: reviews
-- Individual reviews submitted by users for DJs
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dj_name TEXT NOT NULL,  -- References dj_profiles.name
    user_id TEXT,  -- Will reference user table when authentication is implemented
    user_name TEXT,  -- Display name (temporary until user system)
    rating NUMERIC(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 5),
    comment TEXT,  -- Review text/comment
    event_title TEXT,  -- Optional: which event was reviewed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5)
);

-- Table: sample_users
-- Temporary sample users for reviews (before real user system)
CREATE TABLE IF NOT EXISTS sample_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_dj_name ON reviews(dj_name);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sample_users_username ON sample_users(username);

-- Enable RLS (Row Level Security)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow public read, restrict writes (will add user policies later)
CREATE POLICY "reviews_select" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "reviews_insert" ON reviews
    FOR INSERT WITH CHECK (true);

CREATE POLICY "reviews_update" ON reviews
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "sample_users_select" ON sample_users
    FOR SELECT USING (true);

CREATE POLICY "sample_users_insert" ON sample_users
    FOR INSERT WITH CHECK (true);

-- Update dj_reviews_aggregate trigger function (if needed)
-- Note: This table already exists, but we may want to add a trigger to update it

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON reviews TO anon, authenticated;
GRANT SELECT, INSERT ON sample_users TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE reviews IS 'Individual user reviews for DJs';
COMMENT ON COLUMN reviews.user_id IS 'Will reference user table when authentication is implemented';
COMMENT ON COLUMN reviews.user_name IS 'Display name - temporary until user system';
COMMENT ON COLUMN reviews.rating IS 'Rating 0-5 (can be decimal: 2.5, 4.7, etc.)';
COMMENT ON TABLE sample_users IS 'Temporary sample users for reviews (before real user authentication)';

