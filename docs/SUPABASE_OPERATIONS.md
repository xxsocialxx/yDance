# Supabase Operations Guide

This document outlines the process for interacting with Supabase to update database schema and populate data programmatically.

## Table of Contents
- [Authentication & Keys](#authentication--keys)
- [Database Schema Updates](#database-schema-updates)
- [Data Population](#data-population)
- [Troubleshooting](#troubleshooting)
- [Lessons Learned](#lessons-learned)

---

## Authentication & Keys

### Working Service Role Key Format

The project uses the Supabase publishable key for both client-side operations and programmatic database management:

```
sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ
```

**Important Notes:**
- This key format (`sb_publishable_sk...`) works for both frontend client operations and service role operations when used with Supabase CLI
- The key is stored in `script.js` as `CONFIG.supabaseKey`
- For scripts, use the same key as `SUPABASE_SERVICE_KEY`

**Project URL:**
```
https://rymcfymmigomaytblqml.supabase.co
```

### Key Usage

**Client-side (browser):**
```javascript
const supabase = createClient(SUPABASE_URL, CONFIG.supabaseKey);
```

**Server-side scripts:**
```javascript
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
```

---

## Database Schema Updates

### Method 1: Supabase CLI (Recommended)

The **Supabase CLI** is the recommended way to create and modify database schema.

#### Prerequisites
1. Install Supabase CLI: `brew install supabase/tap/supabase`
2. Link project: `supabase link --project-ref rymcfymmigomaytblqml`

#### Creating Migrations

1. **Create migration files in** `supabase/migrations/`
   - Naming pattern: `YYYYMMDDHHMMSS_description.sql`
   - Example: `20241102200000_create_dj_editorial_tables.sql`

2. **Write SQL migration:**
```sql
-- Example migration
CREATE TABLE IF NOT EXISTS dj_editorial_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dj_name TEXT NOT NULL UNIQUE,
    -- ... columns
);

-- Always enable RLS
ALTER TABLE dj_editorial_attributes ENABLE ROW LEVEL SECURITY;

-- Create policies (SELECT, INSERT, UPDATE as needed)
CREATE POLICY "dj_editorial_attributes_select" ON dj_editorial_attributes
    FOR SELECT USING (true);

CREATE POLICY "dj_editorial_attributes_insert" ON dj_editorial_attributes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "dj_editorial_attributes_update" ON dj_editorial_attributes
    FOR UPDATE USING (true) WITH CHECK (true);
```

3. **Push migration:**
```bash
cd /Users/601ere/yDance
supabase db push --include-all
```

**Note:** Migrations are applied in timestamp order. The CLI will prompt for confirmation before applying new migrations.

### Method 2: execute_sql RPC Function

For programmatic SQL execution via API, use the `execute_sql` function.

#### Setup (One-Time)

Create the function via migration or SQL Editor:

```sql
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

GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
```

#### Usage

**Via HTTP API:**
```javascript
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({ sql: 'SELECT 1;' })
});
```

**Via Supabase Client:**
```javascript
const { error } = await supabase.rpc('execute_sql', { sql: 'CREATE TABLE ...' });
```

---

## Data Population

### Using Scripts

1. **Update service key in script:**
   ```javascript
   const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';
   ```

2. **Run population script:**
   ```bash
   node scripts/populate_dj_editorial.js
   ```

3. **Or use full automated setup:**
   ```bash
   node scripts/full_automated_setup.js
   ```

### Row Level Security (RLS)

**Critical:** When creating tables, ensure RLS policies allow the operations you need:

- **SELECT** (read): Usually public
- **INSERT** (create): Required for data population scripts
- **UPDATE** (modify): Required for upsert operations

**Example policy setup:**
```sql
-- Allow public read
CREATE POLICY "table_select" ON my_table
    FOR SELECT USING (true);

-- Allow service role to insert/update
CREATE POLICY "table_insert" ON my_table
    FOR INSERT WITH CHECK (true);

CREATE POLICY "table_update" ON my_table
    FOR UPDATE USING (true) WITH CHECK (true);
```

---

## Troubleshooting

### Common Issues

#### 1. "Invalid API key" errors

**Problem:** Service role key not recognized.

**Solution:** 
- Use the format: `sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ`
- Ensure key is correctly set in scripts
- Verify project URL matches

#### 2. "function not found" errors

**Problem:** `execute_sql` or other RPC functions don't exist.

**Solution:**
- Create the function via migration first
- Check function name and parameter names match
- Verify grants are set correctly

#### 3. "new row violates row-level security policy"

**Problem:** RLS policies don't allow INSERT/UPDATE operations.

**Solution:**
- Add INSERT and UPDATE policies to your tables
- Use migration: `supabase/migrations/20241102200001_fix_rls_policies.sql` as reference
- Or temporarily disable RLS for service role operations (not recommended)

#### 4. Migration file naming errors

**Problem:** `Skipping migration X... file name must match pattern`

**Solution:**
- Rename file to: `YYYYMMDDHHMMSS_name.sql`
- Use: `mv old_name.sql 20241102200000_new_name.sql`

### Debugging Steps

1. **Check Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard/project/rymcfymmigomaytblqml
   - Verify tables exist in Table Editor
   - Check SQL Editor for any errors

2. **Test connection:**
   ```bash
   node scripts/test_key.js
   ```

3. **Verify function exists:**
   ```javascript
   const { data, error } = await supabase.rpc('execute_sql', { sql: 'SELECT 1' });
   console.log(error); // Should be null if function exists
   ```

4. **Check RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'your_table';
   ```

---

## Lessons Learned

### Key Takeaways from Today's Session

1. **Supabase CLI is the Best Approach**
   - Migration files are version-controlled
   - Applied in correct order automatically
   - Can be reviewed before applying
   - Better than direct SQL execution via API

2. **RLS Policies Must Be Complete**
   - Don't just create SELECT policies
   - Always include INSERT and UPDATE policies if you need to write data
   - Service role key still respects RLS policies

3. **Migration File Naming is Strict**
   - Pattern: `YYYYMMDDHHMMSS_description.sql`
   - Use `--include-all` flag for migrations that predate existing ones
   - Timestamps determine execution order

4. **execute_sql Function Setup**
   - One-time setup required
   - Created via migration: `20241202200000_create_execute_sql_function.sql`
   - Useful for programmatic operations, but CLI is preferred for schema changes

5. **Service Key Format**
   - The publishable key (`sb_publishable_sk...`) works for both client and service operations
   - No separate JWT token needed when using CLI
   - Same key used throughout the project

6. **Testing Process**
   - Always verify tables exist after creation
   - Test RLS policies with actual operations
   - Use `SELECT id LIMIT 1` to verify table accessibility
   - Check error codes: `PGRST116` = not found, `42501` = RLS violation

### Best Practices

1. **Always create migrations** instead of direct SQL execution
2. **Test RLS policies** before deploying
3. **Use transactions** in migrations where possible (BEGIN/COMMIT)
4. **Document policy purposes** in comments
5. **Keep migration files** in `supabase/migrations/` for version control
6. **Run migrations locally first** if you have local Supabase setup
7. **Backup data** before destructive migrations

### Migration Workflow

```
1. Create migration file: supabase/migrations/YYYYMMDDHHMMSS_name.sql
2. Write SQL with proper RLS policies
3. Test locally (if available) or review carefully
4. Push: supabase db push --include-all
5. Verify in Supabase Dashboard
6. Commit migration file to git
```

---

## Quick Reference

### Project Details
- **URL:** https://rymcfymmigomaytblqml.supabase.co
- **Service Key:** `sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ`
- **CLI Link:** `supabase link --project-ref rymcfymmigomaytblqml`

### Common Commands

```bash
# Link project
supabase link --project-ref rymcfymmigomaytblqml

# Push migrations
supabase db push --include-all

# Check migration status
supabase migration list

# Create new migration
supabase migration new name_of_migration
```

### Script Locations

- **Migrations:** `supabase/migrations/`
- **Population scripts:** `scripts/populate_*.js`
- **Setup scripts:** `scripts/full_automated_setup.js`
- **Testing:** `scripts/test_key.js`

---

## Additional Resources

- [Supabase CLI Documentation](https://supabase.com/docs/reference/cli)
- [Supabase Migrations Guide](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Dashboard](https://supabase.com/dashboard/project/rymcfymmigomaytblqml)

---

*Last updated: November 2, 2024*
*Based on DJ Editorial Attributes setup session*

