# DJ Profile Page - Current Analysis

## Current Structure & Order

1. **HEADER**
   - DJ Name (uppercase, accent color)
   - x.dance/ URL slug

2. **YOUR HISTORY** (conditional - only if > 0)
   - SEEN: count
   - BY FRIENDS: count

3. **EDITORIAL**
   - TRIBE
   - GENRES
   - STYLE
   - RATING (X/5)
   - ASKED ($X - $Y)

4. **REVIEWS** (conditional)
   - Rating (clickable link)
   - Review count

5. **STATUS** (conditional)
   - Activity status text

6. **STATISTICS** (conditional)
   - EVENTS: count
   - FIRST APPEARANCE: date
   - LAST APPEARANCE: date
   - FREQUENCY: text

7. **CITIES** (conditional)
   - City (count) | City (count)

8. **UPCOMING** (conditional)
   - Date, Venue, City, [DETAILS] link

9. **VENUE HISTORY** (conditional)
   - Venue (count) | Venue (count)

10. **EXTERNAL** (conditional)
    - SOUNDCLOUD, INSTAGRAM, BANDCAMP, WEBSITE links

11. **ACTIONS**
    - [BACK] button

## Design Observations

### ✅ Strengths
- Clean terminal aesthetic
- Conditional rendering (no empty sections)
- Clear section hierarchy
- Monospace font consistency

### 🤔 Questions for Refinement

1. **Section Order**
   - Should UPCOMING be higher (before statistics)?
   - Should EDITORIAL come before YOUR HISTORY?
   - Status placement - is "STATUS" needed or redundant with activity?

2. **Data Presentation**
   - Price format: "$500 - $1500" vs "$500-$1500" (spaces)
   - Rating format: "4.5/5" - consistent?
   - Dates: "Nov 2, 2024" format - clear enough?
   - City/venue counts: "Montreal (5)" - readable?

3. **Visual Hierarchy**
   - Should certain sections be visually distinct?
   - Should UPCOMING be emphasized (different styling)?
   - Should REVIEWS link be more prominent?

4. **Terminal Aesthetic**
   - Section separators: dotted borders - consistent?
   - Spacing between sections - comfortable?
   - All caps labels - should some be lowercase?

5. **Interaction**
   - Clickable elements (reviews, details, external links) - consistent?
   - BACK button styling - matches terminal style?
   - Missing: Share/copy profile link?

6. **Edge Cases**
   - What if DJ has no events at all?
   - What if editorial data is partial?
   - What if upcoming events list is very long?

7. **Missing Elements**
   - Bio/description (if we add it later)?
   - Tags/categories for filtering?
   - Related DJs section?
   - Social proof (friend recommendations)?

