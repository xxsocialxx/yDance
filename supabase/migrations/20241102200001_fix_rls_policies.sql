-- Fix RLS policies to allow INSERT/UPDATE for service role
-- This migration adds INSERT and UPDATE policies that were missing

CREATE POLICY "dj_editorial_attributes_insert" ON dj_editorial_attributes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "dj_editorial_attributes_update" ON dj_editorial_attributes
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "dj_reviews_aggregate_insert" ON dj_reviews_aggregate
    FOR INSERT WITH CHECK (true);

CREATE POLICY "dj_reviews_aggregate_update" ON dj_reviews_aggregate
    FOR UPDATE USING (true) WITH CHECK (true);

