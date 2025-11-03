# RA.co Scraping Implementation Notes

**Date:** October 31, 2025  
**Status:** ✅ Working Implementation

---

## What Has Worked

### Method: Select-All + Selection API

**Final Approach:** Use browser's Selection API to extract all page text, then parse structured data from the markdown-like output.

**Why This Works:**
- ✅ No permission popups (uses Selection API, not Clipboard)
- ✅ Captures everything visible on page
- ✅ Resilient to DOM structure changes
- ✅ Simple, reliable, fast (~5 seconds per event)
- ✅ 100% success rate on tested events

### Technical Implementation

**Tool:** Playwright (Node.js/JavaScript)

**Key Components:**
1. **Text Selection:** Uses `document.createRange()` and `window.getSelection()` - no clipboard permissions needed
2. **Text Parsing:** Pattern-based extraction using label markers ("Venue", "Date", "LINEUP", "Genres", etc.)
3. **Field Extraction:** Position-aware parsing (knows venue comes after "Venue" label)

**File:** `ra-scraper-selectall.js`

---

## Extracted Fields

Successfully extracting the following fields from RA.co event pages:

### Core Fields ✅
- **Title** - Event name
- **Venue** - Venue name
- **Address** - Full address
- **Date** - Event date
- **Time** - Event time range
- **Promoter** - Promoter name

### Content Fields ✅
- **Artists/Lineup** - List of performing artists
- **Genres** - Event genres/tags
- **Description** - Full event description
- **Cost** - Ticket price
- **Minimum Age** - Age requirement

### Metadata Fields ✅
- **Interested** - Number of people interested
- **Admin** - Event admin username
- **URL** - Event page URL
- **Scraped At** - Timestamp

---

## Parser Logic

### Structure Pattern

Based on actual RA.co select-all output:

```
[Title]
Venue
[Venue Name]
[Address]
Date
[Date]
[Time Range]
Promoter
[Promoter Name]
Interested
[Count]
LINEUP
[Artist 1]
[Artist 2]
...
Genres
[Genre 1]
[Genre 2]
...
[Description text - long paragraph]
Event admin
[Admin username]
Cost
[Price]
Min. age
[Age]
```

### Key Parsing Strategies

1. **Label-Based Extraction:** Find labels like "Venue", "Date", "LINEUP", then extract next line(s)
2. **Section Boundaries:** Description is between "Genres" and "Event admin" sections
3. **Pattern Matching:** Date formats, time formats, age formats
4. **Multi-line Handling:** Artists and genres are lists (multiple lines)

---

## Test Results

### Event 1: https://ra.co/events/2292678
- ✅ All fields extracted successfully
- ✅ Title: "El Techo Halloween"
- ✅ Venue: "El Techo"
- ✅ 4 artists extracted
- ✅ 2 genres extracted
- ✅ Full description captured

### Event 2: https://ra.co/events/2271765
- ✅ All fields extracted successfully
- ✅ Title: "Groove Haul Underground"
- ✅ Venue: "TBA - THE CAVE"
- ✅ 5 artists extracted
- ✅ 3 genres extracted

### Event 3: https://ra.co/events/2234611
- ✅ All fields extracted successfully
- ✅ Title: "The Hustle: A 70's Disco Halloween [DC]"
- ✅ Time: "22:00 - 02:00" (extracted correctly)
- ✅ Cost: "20+" (extracted correctly)
- ✅ Min Age: "21+" (extracted correctly)
- ✅ Description stops correctly at "Event admin" section

---

## Code Structure

```
ra-scraper-selectall.js
├── RAEventParser class
│   ├── parse() - Main parsing orchestrator
│   ├── extractTitle() - Skips nav menu, finds first substantial line
│   ├── extractVenue() - Finds "Venue" label, gets next line
│   ├── extractAddress() - Gets line after venue name
│   ├── extractDate() - Finds "Date" label, extracts date
│   ├── extractTime() - Gets time range after date
│   ├── extractPromoter() - Finds "Promoter" label
│   ├── extractInterested() - Gets count after "Interested"
│   ├── extractArtists() - Finds "LINEUP" section, collects artist lines
│   ├── extractGenres() - Finds "Genres" section, collects genre lines
│   ├── extractDescription() - Between genres and "Event admin"
│   ├── extractCost() - Finds "Cost" label
│   ├── extractMinAge() - Finds "Min. age" or "Min age" label
│   └── extractAdmin() - Finds "Event admin" label
│
└── scrapeEventViaSelectAll() function
    ├── Browser setup (Playwright)
    ├── Navigate to event page
    ├── Extract text via Selection API
    ├── Parse with RAEventParser
    └── Save JSON + raw text
```

---

## Key Learnings

### What Didn't Work

1. **Element-Level DOM Extraction:** Only 33% success rate - most fields lack reliable CSS selectors
2. **Clipboard API:** Required permission popup - switched to Selection API
3. **OCR Approach:** Considered but not needed - text extraction works perfectly

### What Worked

1. **Select-All Method:** Captures everything in predictable structure
2. **Selection API:** No permissions needed, works reliably
3. **Label-Based Parsing:** Very reliable when page structure is consistent
4. **Position-Aware Logic:** Understanding field order makes parsing robust

---

## Advantages of This Approach

1. **Resilient:** Works even if DOM structure changes
2. **Complete:** Captures all visible text
3. **Fast:** Single operation, ~5 seconds per event
4. **No Permissions:** Selection API requires no user interaction
5. **Reliable:** Based on text labels, not CSS selectors
6. **Debuggable:** Can save raw text for manual inspection

---

## Future Improvements

1. **Batch Processing:** Scrape multiple events in sequence
2. **CSV Export:** Convert JSON to CSV for spreadsheet use
3. **Error Handling:** Better handling of missing fields
4. **Rate Limiting:** Add delays between requests
5. **Validation:** Validate extracted data formats
6. **Image URLs:** Extract event image URLs (if needed)

---

## Usage

```bash
# Scrape single event
node ra-scraper-selectall.js "https://ra.co/events/2292678"

# Output:
# - event-{timestamp}.json (structured data)
# - event-{timestamp}-raw.txt (raw text for debugging)
```

---

## Files Created

- `ra-scraper-selectall.js` - Main scraper
- `test-element-capture.js` - Diagnostic tool for testing selectors
- `package.json` - Dependencies
- `README.md` - Documentation
- `SCRAPING-NOTES.md` - This file

---

## Legal Note

⚠️ **For Development Purposes Only**

RA.co's Terms of Use prohibit scraping. This implementation is for:
- Development and testing
- Learning purposes
- Prototyping

Consider reaching out to RA.co for API access or partnership opportunities for production use.

