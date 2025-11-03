# Setup Instructions - Read This First

## One-Time Setup (Required)

Before running any scripts, you need to create the `execute_sql` function in Supabase. This is a one-time setup.

### Step 1: Create execute_sql Function

1. Go to: https://supabase.com/dashboard/project/rymcfymmigomaytblqml/sql/new
2. Copy and paste the SQL from: `scripts/create_execute_sql_function.sql`
3. Click "Run"
4. You should see "Success. No rows returned"

### Step 2: Run Automated Setup

After the function is created, run:

```bash
node scripts/setup_complete_automated.js
```

This will:
- Verify the function exists
- Create the DJ editorial tables
- Populate sample data for all existing DJs

## Alternative: If execute_sql Already Exists

If you already have an SQL execution function with a different name, please share:
- The function name
- The parameter name (sql, query, etc.)

Then I can update the script to use your existing function.

