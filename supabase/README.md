# Supabase Setup

Apply migrations using one of the options below.

## Option A: Supabase SQL Editor (quickest)
1. Open Supabase project → SQL Editor
2. Paste contents of `migrations/20251029_000001_core_tables.sql`
3. Run → verify objects:
   - Tables: `raw_events`, `normalized_events`, `review_queue`
   - View: `normalized_events_latest`
   - RLS enabled on tables; `anon` can select from the view only

## Option B: Supabase CLI
```
# Requires SUPABASE_ACCESS_TOKEN and project linked
supabase db push
```

## Notes
- UI should read only from `normalized_events_latest` (anon key).
- Writes go to `raw_events` via server/edge jobs using the service role.
- Policies are deny-all by default on tables; the view is granted select to `anon`.
