-- Create execute_sql function to allow SQL execution via RPC
-- Run this FIRST in Supabase SQL Editor, then run create_tables script

CREATE OR REPLACE FUNCTION execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    EXECUTE sql;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;

