# Session Summary: January 6, 2025
## Supabase Access Patterns, Table Structures & Workflow Decisions

---

## 🎯 Objectives Accomplished

1. **Fixed Custom Date Selector UI Issues**
   - Menu closing prematurely when clicking CUSTOM option
   - Limited date range (only 60 days)
   - Styling too prominent for large screens

2. **GitHub Pages Deployment Troubleshooting**
   - Identified and fixed broken git submodule causing build failures
   - Configured proper static site deployment

3. **Documented Supabase Architecture & Access Patterns**
   - Table structures and relationships
   - API access patterns and workflow choices
   - Migration strategies and RLS policies

---

## 🗄️ Supabase Architecture & Access Patterns

### Database Structure

#### Core Tables

**1. `normalized_events` (Versioned Event Storage)**
- **Purpose:** Stores all event data with versioning support
- **Key Fields:**
  - `event_uid` (TEXT, unique identifier)
  - `version` (INTEGER, for versioning)
  - `normalized_json` (JSONB, complete event data)
  - `dedupe_key` (TEXT, unique constraint)
- **Access Pattern:** Read from `normalized_events_latest` view (shows latest version per event)
- **RLS:** Public read via view, service role write
- **Migration:** `20241102200001_fix_rls_policies.sql`

**2. `event_operators` (Junction Table)**
- **Purpose:** Links events to operators with their roles
- **Key Fields:**
  - `event_uid` (TEXT, FK to events)
  - `operator_name` (TEXT, FK to operators)
  - `operator_type` (TEXT, CHECK constraint: 'curators', 'sound', 'lighting', 'hospitality', 'coordination', 'equipment')
  - `role` (TEXT, specific role name)
  - `is_primary` (BOOLEAN, marks primary operator)
- **Unique Constraint:** `(event_uid, operator_name, operator_type, role)`
- **Indexes:** On `event_uid`, `operator_name`, `operator_type`, `(event_uid, operator_type)`
- **RLS:** Public SELECT, service role INSERT/UPDATE
- **Migration:** `20250103000001_create_event_operators.sql`

**3. `operators` (Provider Profiles)**
- **Purpose:** Stores operator/provider information and profiles
- **Key Fields:**
  - `name` (TEXT, PRIMARY KEY)
  - `type` (TEXT, CHECK constraint matching event_operators)
  - `role` (TEXT, specific role)
  - `bio` (TEXT, optional)
  - `social_links` (JSONB, optional)
  - `rating` (NUMERIC, added later)
  - `review_count` (INTEGER, added later)
- **Indexes:** On `type`, `role`, `(type, role)`
- **RLS:** Public SELECT, service role INSERT/UPDATE
- **Migration:** `20250103000002_create_operators.sql`

**4. `provider_reviews` (Operator Reviews)**
- **Purpose:** Stores reviews and ratings for operators
- **Key Fields:**
  - `id` (UUID, PRIMARY KEY)
  - `operator_name` (TEXT, FK to operators)
  - `operator_type` (TEXT)
  - `rating` (INTEGER, 1-5)
  - `review_text` (TEXT)
  - `user_id` (TEXT, optional)
  - `created_at` (TIMESTAMPTZ)
- **RLS:** Public SELECT, authenticated INSERT
- **Migration:** `20250103000005_create_provider_reviews.sql`

### Access Patterns

#### Client-Side Access (Frontend)

**Initialization:**
```javascript
// In CONFIG section
const CONFIG = {
    supabaseUrl: 'https://rymcfymmigomaytblqml.supabase.co',
    supabaseKey: 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ'
};

// In STATE section - single client instance
const state = {
    supabaseClient: null, // Initialized in init()
    // ... other state
};

// In INIT section
state.supabaseClient = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
```

**API Pattern (All in `api` module):**
```javascript
// Standard fetch pattern
async fetchEvents() {
    const { data, error } = await state.supabaseClient
        .from('normalized_events_latest')  // Always use view for latest
        .select('*')
        .order('date', { ascending: true });
    
    if (error) {
        console.error('Error:', error);
        return [];
    }
    return data || [];
}

// With filtering
async fetchEventOperators(eventUids) {
    const { data, error } = await state.supabaseClient
        .from('event_operators')
        .select('*')
        .in('event_uid', eventUids);
    
    return data || [];
}

// With joins (using Supabase's select syntax)
async fetchVenues() {
    // Fetch from operators where type='venue'
    const { data, error } = await state.supabaseClient
        .from('operators')
        .select('*')
        .eq('type', 'venue');
    
    return data || [];
}
```

**Key Rules:**
1. **Always use `state.supabaseClient`** - never create new clients
2. **Use views for versioned data** - `normalized_events_latest` not `normalized_events`
3. **Handle errors gracefully** - return empty arrays/objects, log errors
4. **Use `.select('*')` explicitly** - don't rely on defaults
5. **Order results** - use `.order()` for consistent sorting

#### Server-Side Access (Scripts)

**Pattern for Population Scripts:**
```javascript
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// For RLS bypass (when needed)
// Use execute_sql RPC function for operations that need to bypass RLS
async function executeSQL(sql) {
    const { data, error } = await supabase.rpc('execute_sql', { sql });
    if (error) throw error;
    return data;
}
```

**When to Use `execute_sql` RPC:**
- Inserting into `normalized_events` (versioned table with RLS)
- Complex operations that need to bypass RLS
- One-time data migrations

**When to Use Direct Client:**
- Reading data (respects RLS, which is usually fine)
- Inserting into tables with permissive RLS policies
- Standard CRUD operations

### Workflow Choices

#### 1. Migration Strategy

**Choice: Supabase CLI over Direct SQL**

**Why:**
- Version controlled (migrations in `supabase/migrations/`)
- Applied in correct order automatically
- Can be reviewed before applying
- Better for team collaboration

**Workflow:**
```bash
# 1. Create migration file
# File: supabase/migrations/YYYYMMDDHHMMSS_description.sql

# 2. Write SQL with RLS policies
CREATE TABLE IF NOT EXISTS public.my_table (...);
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "my_table_select" ON public.my_table FOR SELECT USING (true);

# 3. Push migration
cd /Users/601ere/yDance
supabase db push --include-all

# 4. Verify in Supabase Dashboard
# 5. Commit migration file to git
```

**Resources:**
- `docs/SUPABASE_OPERATIONS.md` - Complete migration guide
- Migration files in `supabase/migrations/` - Examples

#### 2. RLS Policy Strategy

**Choice: Permissive SELECT, Service Role Write**

**Pattern:**
```sql
-- Always enable RLS
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- Public read (for frontend)
CREATE POLICY "my_table_select" ON public.my_table
    FOR SELECT USING (true);

-- Service role write (for scripts)
CREATE POLICY "my_table_insert" ON public.my_table
    FOR INSERT WITH CHECK (true);

CREATE POLICY "my_table_update" ON public.my_table
    FOR UPDATE USING (true) WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.my_table TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.my_table TO service_role;
```

**Why:**
- Frontend needs to read data (public SELECT)
- Scripts need to write data (service role INSERT/UPDATE)
- RLS still applies to service role, but policies allow it

#### 3. Versioned Event Storage

**Choice: Versioned table with latest view**

**Structure:**
- `normalized_events` - stores all versions
- `normalized_events_latest` - view showing latest version per event_uid

**Why:**
- Preserves history
- Easy to query latest
- Supports updates without losing data

**Access Pattern:**
- **Read:** Always use `normalized_events_latest` view
- **Write:** Insert new version with incremented version number

**Example:**
```javascript
// Reading (frontend)
const { data } = await state.supabaseClient
    .from('normalized_events_latest')
    .select('*');

// Writing (scripts - needs execute_sql to bypass RLS)
const sql = `
    INSERT INTO public.normalized_events (event_uid, version, normalized_json, dedupe_key)
    VALUES ('${event_uid}', ${newVersion}, '${json}'::jsonb, '${dedupe_key}')
`;
await executeSQL(sql);
```

#### 4. Operator Data Structure

**Choice: Junction table + profiles table**

**Structure:**
- `event_operators` - links events to operators (many-to-many)
- `operators` - stores operator profiles (one per operator)

**Why:**
- Normalized (no data duplication)
- Operators can have multiple roles/types
- Easy to query "all operators for event" or "all events for operator"

**Query Patterns:**
```javascript
// Get all operators for an event
const { data } = await state.supabaseClient
    .from('event_operators')
    .select('*')
    .eq('event_uid', eventUid);

// Get operator profile
const { data } = await state.supabaseClient
    .from('operators')
    .select('*')
    .eq('name', operatorName)
    .single();

// Get all events for an operator
const { data } = await state.supabaseClient
    .from('event_operators')
    .select('event_uid')
    .eq('operator_name', operatorName);
```

### Resources That Informed Approach

1. **`docs/SUPABASE_OPERATIONS.md`**
   - Complete guide to Supabase operations
   - Migration patterns
   - RLS policy examples
   - Troubleshooting guide

2. **Existing Migration Files**
   - `20250103000001_create_event_operators.sql` - Junction table pattern
   - `20250103000002_create_operators.sql` - Profile table pattern
   - `20250103000003_allow_service_role_inserts.sql` - RLS grant pattern
   - `20250103000005_create_provider_reviews.sql` - Review table pattern

3. **Population Scripts**
   - `scripts/populate_rave_operators.js` - Example of data population
   - Shows use of `execute_sql` for RLS bypass
   - Demonstrates relationship between tables

4. **Frontend API Module (`script.js` - `api` section)**
   - Real-world access patterns
   - Error handling examples
   - Query optimization patterns

### Key Decisions & Rationale

1. **Single Supabase Client Instance**
   - **Decision:** Store in `state.supabaseClient`, initialized once
   - **Why:** Prevents connection leaks, ensures consistent configuration

2. **Use Views for Versioned Data**
   - **Decision:** Always query `normalized_events_latest` not `normalized_events`
   - **Why:** Simplifies queries, ensures latest data, hides versioning complexity

3. **Junction Table for Many-to-Many**
   - **Decision:** `event_operators` links events and operators
   - **Why:** Normalized structure, supports multiple operators per event, multiple events per operator

4. **RLS with Permissive Policies**
   - **Decision:** Public SELECT, service role INSERT/UPDATE
   - **Why:** Security (RLS enabled) but practical (frontend can read, scripts can write)

5. **Migration Files Over Direct SQL**
   - **Decision:** Always use Supabase CLI migrations
   - **Why:** Version control, reproducibility, team collaboration

---

## 🐛 Bugs Fixed

### 1. Custom Date Selector Menu Closing
**Problem:** When clicking the CUSTOM option, the menu would close immediately, requiring a second click to access the date scroll.

**Root Cause:** The `setTimeRange()` function was closing all menus before showing the custom date selector.

**Solution:**
- Modified `setTimeRange()` to return early when `range === 'custom'` without closing the menu
- Added `return false;` to CUSTOM button onclick handlers to prevent default behavior
- Menu now stays open until a date is selected

**Files Modified:**
- `script.js`: Updated `router.setTimeRange()` function
- `index.html`: Added `return false;` to all CUSTOM button onclick handlers

### 2. Limited Date Range
**Problem:** Date selector only showed 60 days, limiting future event planning.

**Root Cause:** `generateDateOptions()` was hardcoded to generate only 60 dates.

**Solution:**
- Implemented infinite scroll functionality
- Initial load: 100 dates
- Loads additional 100 dates when scrolling within 200px of bottom
- Added `setupInfiniteDateScroll()` function with scroll event listener
- Fixed scroll listener attachment (was on wrong element - needed `.date-scroll-container` not `.date-scroll`)

**Files Modified:**
- `script.js`: 
  - Updated `generateDateOptions()` to accept `startDay` and `count` parameters
  - Added `setupInfiniteDateScroll()` function
  - Fixed DOM manipulation to use `appendChild` instead of `innerHTML +=`

### 3. Styling Too Prominent
**Problem:** Date selector styling was too heavy for large screens.

**Solution:**
- Reduced padding: `4px 8px` (from `8px 12px`)
- Smaller font: `0.7rem` (from `0.75rem`)
- Removed borders between items
- Simplified hover effects (color change only)
- Increased max-height: `500px` (from `300px`)
- Minimal selected state (left border accent only)

**Files Modified:**
- `style.css`: Updated `.date-option`, `.date-scroll-container`, `.time-range-custom` styles

### 4. GitHub Pages Build Failure
**Problem:** GitHub Pages deployment was failing with error:
```
The process '/usr/bin/git' failed with exit code 128
No url found for submodule path 'RAsCrap/ScrappedData/ra-scraper-exploration' in .gitmodules
```

**Root Cause:** 
- Git had a submodule reference (mode 160000) for `RAsCrap/ScrappedData/ra-scraper-exploration`
- No `.gitmodules` file existed to define the submodule
- GitHub Pages couldn't clone the repository due to broken submodule reference

**Solution:**
1. Removed submodule from git index: `git rm --cached RAsCrap/ScrappedData/ra-scraper-exploration`
2. Removed embedded `.git` directory from the submodule folder
3. Added all files as regular files: `git add RAsCrap/ScrappedData/ra-scraper-exploration/`
4. Committed the conversion

**Key Learning:** GitHub Pages cannot build sites with broken submodule references, even if the submodule isn't needed for the static site.

---

## ✨ UI Features Implemented

### Custom Date Selector Enhancements

1. **Infinite Scroll**
   - Lazy loading of dates as user scrolls
   - Efficient resource usage (only loads visible dates + buffer)
   - Prevents duplicate loads with loading flag
   - Tracks date index for accurate continuation

2. **Improved UX**
   - Menu stays open when selecting CUSTOM
   - Immediate visibility of date scroll (no second click needed)
   - Minimal, clean styling appropriate for large screens
   - Smooth scrolling experience

3. **Date Formatting**
   - Format: `DAY-MONTH-DAYNUM` (e.g., `FRI-1-31`)
   - Consistent with terminal aesthetic
   - Smaller font size for better visual hierarchy

---

## 📚 Key Learnings

### Supabase-Specific Learnings

1. **Service Key Format**
   - The publishable key (`sb_publishable_sk...`) works for both client and service operations
   - No separate JWT token needed
   - Same key used throughout project

2. **RLS Still Applies to Service Role**
   - Even with service role key, RLS policies must allow operations
   - Use `execute_sql` RPC for operations that need to bypass RLS
   - Or ensure RLS policies allow service role operations

3. **Versioned Tables Need Views**
   - Don't query versioned tables directly
   - Always use the `_latest` view for current data
   - Insert new versions, don't update existing ones

4. **Migration File Naming is Strict**
   - Pattern: `YYYYMMDDHHMMSS_description.sql`
   - Timestamps determine execution order
   - Use `--include-all` flag for migrations that predate existing ones

5. **Junction Tables for Many-to-Many**
   - Use junction tables (`event_operators`) to link entities
   - Store profiles separately (`operators` table)
   - Query with `.in()` for multiple values

6. **Error Handling Patterns**
   - Always check `error` before using `data`
   - Return empty arrays/objects on error (don't throw)
   - Log errors for debugging
   - Use `CONFIG.flags.debug` for verbose logging

### General Learnings

### 1. Quick Resource Access Patterns

**Git Submodule Issues:**
- Always check for submodule references when troubleshooting build failures
- Command: `git ls-files --stage | grep "160000"` to find submodules
- Broken submodules cause GitHub Pages builds to fail even if not needed

**GitHub Pages Debugging:**
- Check Actions tab for specific error messages
- Common issues: submodules, Jekyll processing, file size limits
- `.nojekyll` file is essential for static sites (disables Jekyll processing)

**Infinite Scroll Implementation:**
- Attach scroll listeners to the scrollable container, not the content container
- Use proper DOM manipulation (`appendChild`) instead of string concatenation
- Implement loading flags to prevent duplicate requests
- Track indices for accurate continuation

### 2. Event Listener Best Practices

**Scroll Listeners:**
- Always check which element actually scrolls (check CSS `overflow-y: auto`)
- Store handler reference on element for cleanup: `container._scrollHandler`
- Remove old listeners before adding new ones to prevent duplicates

**Menu State Management:**
- Don't close menus prematurely when showing nested content
- Use early returns for special cases (like CUSTOM option)
- Prevent default behavior when needed (`return false;`)

### 3. DOM Manipulation Efficiency

**Appending Elements:**
- ❌ Bad: `container.innerHTML += html` (re-parses entire DOM)
- ✅ Good: `container.appendChild(element)` (efficient, preserves event listeners)

**Performance:**
- Generate HTML strings, then create elements in batch
- Use document fragments for multiple additions
- Avoid frequent DOM queries in scroll handlers

### 4. GitHub Pages Specifics

**Static Site Requirements:**
- `.nojekyll` file in root (disables Jekyll)
- `index.html` in root or specified folder
- No broken submodule references
- Files must be committed (not just staged)

**Build Process:**
- GitHub Pages uses Jekyll by default (even for static sites)
- `.nojekyll` tells it to skip Jekyll processing
- Builds happen on push to configured branch
- Check Actions tab for build status

**URL Format:**
- Project sites: `username.github.io/repository-name`
- Case-sensitive for repository names
- May take 1-5 minutes to update after successful build

---

## ⚠️ Things to Watch Out For

### Supabase-Specific Warnings

1. **RLS Policy Completeness**
   - **Risk:** Missing INSERT/UPDATE policies break data population scripts
   - **Prevention:** Always create SELECT, INSERT, and UPDATE policies when needed
   - **Check:** Verify policies in Supabase Dashboard → Authentication → Policies

2. **Versioned Table Access**
   - **Risk:** Querying `normalized_events` directly returns multiple versions
   - **Prevention:** Always use `normalized_events_latest` view
   - **Exception:** Only query `normalized_events` when you need version history

3. **Service Role Key Limitations**
   - **Risk:** Service role still respects RLS policies
   - **Prevention:** Use `execute_sql` RPC for operations that need RLS bypass
   - **Alternative:** Ensure RLS policies allow service role operations

4. **Migration Order**
   - **Risk:** Migrations applied out of order if timestamps wrong
   - **Prevention:** Use strict timestamp format: `YYYYMMDDHHMMSS`
   - **Check:** Review migration list: `supabase migration list`

5. **Junction Table Constraints**
   - **Risk:** Duplicate entries if unique constraint missing
   - **Prevention:** Always add UNIQUE constraint on junction table
   - **Example:** `UNIQUE(event_uid, operator_name, operator_type, role)`

6. **JSONB Field Access**
   - **Risk:** Querying JSONB fields requires special syntax
   - **Prevention:** Use `.select('field->>key')` for JSONB access
   - **Alternative:** Store denormalized fields if frequently queried

### General Warnings

### 1. Git Submodules
- **Risk:** Broken submodule references break GitHub Pages builds
- **Prevention:** 
  - Check for submodules: `git ls-files --stage | grep "160000"`
  - Either properly configure with `.gitmodules` or convert to regular files
  - Remove embedded `.git` directories when converting

### 2. Infinite Scroll Implementation
- **Risk:** Memory leaks from unremoved event listeners
- **Prevention:**
  - Store handler reference: `container._scrollHandler`
  - Remove before adding: `container.removeEventListener('scroll', container._scrollHandler)`
  - Use loading flags to prevent duplicate loads

### 3. Menu State Management
- **Risk:** Menus closing when they should stay open
- **Prevention:**
  - Use early returns for special cases
  - Don't close menus before showing nested content
  - Test user flow: click → menu opens → select option → content appears

### 4. GitHub Pages Deployment
- **Risk:** Build failures due to repository structure issues
- **Prevention:**
  - Always check Actions tab after push
  - Verify `.nojekyll` exists and is committed
  - Remove or fix broken submodules
  - Keep file sizes reasonable (GitHub Pages has limits)

### 5. Browser Caching
- **Risk:** Users seeing old content after updates
- **Prevention:**
  - Hard refresh: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
  - Use cache-busting query params for testing: `?v=2`
  - Inform users about potential caching delays

---

## 📝 Files Modified Today

1. **script.js**
   - `router.setTimeRange()` - Fixed menu closing issue
   - `router.showCustomDateSelector()` - Added infinite scroll setup
   - `router.generateDateOptions()` - Made dynamic with parameters
   - `router.setupInfiniteDateScroll()` - New function for infinite scroll
   - `router.selectCustomDate()` - Improved selected state handling

2. **index.html**
   - Added `return false;` to all CUSTOM button onclick handlers
   - Time range selectors for Events, DJs, Venues, and MAKERS tabs

3. **style.css**
   - Updated `.date-option` styles (minimal, smaller)
   - Updated `.date-scroll-container` (increased max-height)
   - Updated `.time-range-custom` (reduced padding)

4. **Git Repository**
   - Removed broken submodule reference
   - Converted `RAsCrap/ScrappedData/ra-scraper-exploration` to regular directory
   - Added `.nojekyll` file

---

## 🎓 Best Practices Established

1. **Always check Actions tab** when GitHub Pages isn't updating
2. **Test infinite scroll** by scrolling to bottom and verifying new content loads
3. **Verify menu behavior** - menus should stay open for nested selections
4. **Use proper DOM manipulation** - `appendChild` over `innerHTML +=`
5. **Store event handler references** for proper cleanup
6. **Check for submodules** when troubleshooting build failures
7. **Document session learnings** for future reference

---

## 🔄 Next Steps / Follow-ups

### Supabase
1. Review and optimize RLS policies for performance
2. Consider adding indexes for frequently queried fields
3. Document any new table relationships
4. Test data population scripts after schema changes
5. Monitor query performance in Supabase Dashboard

### UI
1. Monitor GitHub Pages deployment to ensure it's working correctly
2. Test infinite scroll on different screen sizes
3. Consider adding loading indicators for date generation
4. Verify all time range selectors work consistently across tabs
5. Test custom date selection with various date ranges

## 📖 Quick Reference for Next AI Agent

### Supabase Access Checklist
- [ ] Use `state.supabaseClient` (never create new clients)
- [ ] Query `normalized_events_latest` view (not `normalized_events` table)
- [ ] Check for RLS policies before writing data
- [ ] Use `execute_sql` RPC for RLS bypass operations
- [ ] Handle errors gracefully (return empty arrays/objects)
- [ ] Use migrations for schema changes (not direct SQL)

### Common Supabase Patterns
```javascript
// Reading data
const { data, error } = await state.supabaseClient
    .from('table_name')
    .select('*')
    .eq('field', value)
    .order('created_at', { ascending: false });

// Writing data (with RLS)
const { data, error } = await state.supabaseClient
    .from('table_name')
    .insert({ field: value })
    .select()
    .single();

// Writing data (bypass RLS)
await supabase.rpc('execute_sql', { 
    sql: `INSERT INTO table_name (...) VALUES (...)` 
});
```

### Key Files to Reference
- `docs/SUPABASE_OPERATIONS.md` - Complete operations guide
- `supabase/migrations/*.sql` - Schema examples
- `scripts/populate_rave_operators.js` - Data population example
- `script.js` (api module) - Frontend access patterns

---

## 📊 Session Statistics

- **Bugs Fixed:** 4
- **UI Features Enhanced:** 3
- **Files Modified:** 4
- **Git Commits:** 5
- **Key Learnings Documented:** 7

---

*Session Date: January 6, 2025*
*Duration: ~2 hours*
*Focus: Custom Date Selector & GitHub Pages Deployment*

