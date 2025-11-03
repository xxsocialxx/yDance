# GitHub Repository Analysis: RA.co GraphQL API Scraper

**Repository:** [djb-gt/resident-advisor-events-scraper](https://github.com/djb-gt/resident-advisor-events-scraper)

---

## Overview

This repository reveals that **RA.co has a GraphQL API endpoint** that can be used to fetch event data programmatically. This is a more elegant solution than web scraping!

### Key Discovery

✅ **RA.co has an official GraphQL API** - Much better than HTML scraping!

---

## Their Approach: GraphQL API

### Technology Stack
- **Language:** Python
- **Libraries:** `requests`, `pandas`
- **Method:** Direct GraphQL API calls (no browser needed!)

### Features
- Fetches events by area code and date range
- Returns structured JSON data
- Exports to CSV format
- No browser automation needed

### Output Fields
- Event name
- Date
- Start Time
- End Time
- Artists
- Venue
- Event URL
- Number of guests attending

---

## Comparison: GraphQL API vs Our Select-All Method

### GraphQL API Approach (GitHub Repo) ✅
**Pros:**
- ⚡ **Faster** - Direct API calls, no browser
- 🔄 **More efficient** - Structured data, no parsing needed
- 📊 **Batch-friendly** - Can fetch multiple events in one query
- 🎯 **Official endpoint** - More reliable long-term
- 💾 **Lower resource usage** - No browser overhead

**Cons:**
- 🔒 **May require authentication** (need to check)
- 📝 **Need to reverse-engineer GraphQL queries**
- 🔍 **Might have rate limits**
- ⚠️ **Could break if API changes**

### Our Select-All Method ✅
**Pros:**
- ✅ **Works immediately** - No API discovery needed
- 🛡️ **Resilient** - Based on text structure, not API contracts
- 📋 **Gets everything** - Captures all visible text
- 🔍 **Complete data** - Description, genres, cost, age, etc.
- 🚫 **No auth needed** - Just browse the page

**Cons:**
- 🐌 **Slower** - Browser automation overhead
- 💻 **Resource intensive** - Requires browser instance
- 🔄 **One event at a time** - Sequential processing
- 📝 **Requires parsing** - Text extraction needed

---

## Recommendation: Hybrid Approach

### Best Strategy

1. **For Bulk Data (Event Lists):** Use GraphQL API
   - Faster for fetching many events
   - Structured data
   - Better for date range queries

2. **For Detailed Event Pages:** Use Select-All Method
   - Complete data extraction
   - Works when API lacks fields
   - Gets description, cost, age, etc.

3. **Combined Workflow:**
   ```
   Step 1: Use GraphQL API to get event list/IDs
   Step 2: Use Select-All method on individual event pages
          for full details
   ```

---

## Next Steps

### Option 1: Integrate GraphQL API
- Reverse-engineer their GraphQL query
- Use it to fetch event lists quickly
- Then use Select-All for detailed event pages

### Option 2: Enhance Select-All
- Add batch processing
- Optimize for multiple events
- Export to CSV/Excel

### Option 3: Combine Both
- GraphQL for event discovery
- Select-All for event details
- Best of both worlds

---

## GraphQL Query Structure (Inferred)

Based on the repo structure, they likely use:
- **Endpoint:** `https://ra.co/api/graphql` (or similar)
- **Query:** Stored in `graphql_query_template.json`
- **Variables:** Area code, start_date, end_date

### Actual GraphQL Query

**Endpoint:** `https://ra.co/graphql`

**Query Structure:**
```json
{
  "operationName": "GET_EVENT_LISTINGS",
  "variables": {
    "filters": {
      "areas": {"eq": "AREA_CODE"},
      "listingDate": {
        "gte": "START_DATE",
        "lte": "END_DATE"
      }
    },
    "filterOptions": {"genre": true},
    "pageSize": 20,
    "page": 1
  },
  "query": "query GET_EVENT_LISTINGS(...) { eventListings(...) { ... } }"
}
```

**Response Fields Available:**
- Event ID, title, date, startTime, endTime
- Artists (id, name)
- Venue (id, name, contentUrl)
- Event URL (contentUrl)
- Attending count
- Images
- Pick (editorial blurb)
- Flyer front image
- Is ticketed flag

**Note:** The API returns event listings (summary data), not full event details.

---

## Files in Their Repo

1. `event_fetcher.py` - Main scraper script
2. `graphql_query_template.json` - GraphQL query structure
3. `requirements.txt` - Python dependencies
4. `README.md` - Documentation

---

## Key Findings from Their Code

### ✅ Discovered Details

1. **API Endpoint:** `https://ra.co/graphql` - No authentication needed!
2. **Rate Limiting:** They use 1 second delay between requests
3. **Pagination:** 20 events per page, pagination supported
4. **Data Available:**
   - Event title, date, times
   - Artists list
   - Venue info
   - Event URL
   - Attending count
   - Images
   
5. **Missing in API:**
   - Full description (probably not in listing API)
   - Cost/ticket price
   - Minimum age
   - Promoter details
   - Full address

### ⚠️ Limitations

The GraphQL API appears to return **event listings** (summary data), not full event details. For complete data like descriptions, cost, age requirements, we still need to:
- Visit individual event pages
- Use Select-All method for full details

---

## Action Items

- [x] Examine their GraphQL query template ✅
- [x] Understand their API structure ✅
- [ ] Test GraphQL API endpoint with Node.js
- [ ] Compare data completeness (API vs Select-All)
- [ ] Create hybrid implementation:
  - GraphQL API for event discovery/listing
  - Select-All for detailed event pages
- [ ] Keep Select-All as primary detailed extraction method

## Implementation Opportunity

We could enhance our scraper by:

1. **Adding GraphQL Module:**
   ```javascript
   // Use GraphQL to get event list quickly
   const events = await fetchEventsViaGraphQL(area, startDate, endDate);
   
   // Then use Select-All for full details
   for (const event of events) {
     const details = await scrapeEventViaSelectAll(event.contentUrl);
     // Combine API data + detailed scraped data
   }
   ```

2. **Best of Both Worlds:**
   - Fast event discovery via GraphQL
   - Complete data extraction via Select-All
   - Much faster than visiting every event page

---

## Conclusion

The GitHub repo shows a **better approach for bulk event fetching** (GraphQL API), but our **Select-All method is superior for individual event details**. A hybrid approach would be optimal:

- **GraphQL API:** Fast event discovery and listing
- **Select-All Method:** Complete detailed extraction

Both methods have their place!

