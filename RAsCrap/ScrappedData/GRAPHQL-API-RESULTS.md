# GraphQL API Results - What Data We Get

**Test Date:** October 31, 2025  
**Method:** Direct GraphQL API calls (no browser needed)

---

## ✅ API Works Successfully!

**Endpoint:** `https://ra.co/graphql`  
**No Authentication Required**  
**Speed:** ~1 second per page (20 events)

---

## Sample Results: Area 308 (California)

Fetched **175 events** for Halloween weekend (Oct 31 - Nov 3, 2025) in **4.5 seconds**!

### Data Structure from GraphQL API

```json
{
  "id": "2252290",
  "title": "**SOLD OUT** HydeFM Halloween Warehouse Party - SEXTILE DJ Set",
  "date": "2025-10-31T00:00:00.000",
  "startTime": "2025-10-31T22:00:00.000",
  "endTime": "2025-11-01T04:00:00.000",
  "url": "https://ra.co/events/2252290",
  "venue": "TBA - Secret Warehouse Location",
  "venueUrl": null,
  "artists": ["SEXTILE"],
  "attending": 1265,
  "isTicketed": true,
  "image": "https://static.ra.cohttps://images.ra.co/314226d3a662f55c8754f8fe70a7e3b04a3cbabe.jpg",
  "pick": "Fans of post-punk and industrial dance can not miss Sextile's sojourn into the San Francisco darkness...",
  "listingDate": "2025-10-31T00:00:00.000"
}
```

---

## ✅ What the GraphQL API Provides

### Core Event Data
- ✅ **Event ID** - Unique identifier
- ✅ **Title** - Full event name
- ✅ **Date** - ISO format date
- ✅ **Start Time** - Exact start time
- ✅ **End Time** - Exact end time
- ✅ **URL** - Direct link to event page

### Venue Information
- ✅ **Venue Name** - Venue title
- ✅ **Venue URL** - Link to venue page (when available)
- ⚠️ **Address** - NOT included (need to scrape detail page)

### Artists/Lineup
- ✅ **Artists Array** - List of all performing artists
- ✅ **Artist Names** - Full names

### Engagement Metrics
- ✅ **Attending Count** - Number of people attending
- ✅ **Is Ticketed** - Boolean flag

### Media
- ✅ **Event Image** - Flyer/poster URL
- ✅ **Pick Blurb** - Editorial description (when available)

---

## ❌ What's Missing from GraphQL API

The API returns **event listings** (summary data), not full event details:

- ❌ **Full Description** - Only has "pick" blurb (if curated)
- ❌ **Cost/Ticket Price** - Not available
- ❌ **Minimum Age** - Not available
- ❌ **Promoter Details** - Not available
- ❌ **Full Address** - Only venue name
- ❌ **Event Admin** - Not available
- ❌ **Genres** - Not in listing response (might be in filters)

---

## Comparison: GraphQL vs Select-All Method

| Field | GraphQL API | Select-All Method |
|-------|------------|-------------------|
| Title | ✅ | ✅ |
| Date/Time | ✅ | ✅ |
| Venue | ✅ (name only) | ✅ (name + address) |
| Artists | ✅ | ✅ |
| Description | ⚠️ (pick blurb only) | ✅ (full text) |
| Cost | ❌ | ✅ |
| Min Age | ❌ | ✅ |
| Promoter | ❌ | ✅ |
| Attending | ✅ | ✅ |
| Images | ✅ | ❌ |

---

## Performance Comparison

### GraphQL API
- **Speed:** ~1 second per 20 events
- **175 events in:** ~9 seconds (with 1s delays)
- **Resource Usage:** Minimal (no browser)
- **Best For:** Bulk event discovery, listings

### Select-All Method
- **Speed:** ~5 seconds per event
- **175 events in:** ~15 minutes (sequential)
- **Resource Usage:** Browser required
- **Best For:** Complete detailed extraction

---

## Sample Events from GraphQL (Area 308)

1. **SOLD OUT** HydeFM Halloween Warehouse Party - SEXTILE DJ Set
   - Venue: TBA - Secret Warehouse Location
   - Artists: SEXTILE
   - Attending: 1,265
   - URL: https://ra.co/events/2252290

2. Lights Down Low: Rave to the Grave
   - Venue: TBA - Open Air
   - Artists: TOKiMONSTA, Chloé Caillet, LB aka LABAT, Regularfantasy...
   - Attending: 1,162
   - URL: https://ra.co/events/2245016

3. Certified Groovers: Halloween Party with Chez Damier...
   - Venue: TBA - Downtown Los Angeles
   - Artists: Chez Damier, Liquid Earth, Cromie...
   - Attending: 774

4. SQUISH: Midland + Laurel Halo + Jonny From Space
   - Venue: F8 1192 Folsom
   - Artists: Midland, Laurel Halo, Jonny From Space...
   - Attending: 602

5. Factory 93 presents: Halloween at Warehouse Cow Palace
   - Venue: Cow Palace
   - Artists: Amelie Lens, Dax J, KlangKuenstler...
   - Attending: 498

---

## Finding Washington DC Area Code

**Status:** ⚠️ Still searching for correct area code

Area code **308** = California (tested ✅)  
Area code **2** = UK (tested ✅)  
**Washington DC** = Unknown area code

**Next Steps:**
- Need to inspect DC events page or DC event details
- Or find area code mapping from RA.co's location system
- Or test more area codes systematically

---

## Recommendation: Hybrid Approach

1. **Use GraphQL API** to get:
   - Fast event discovery
   - Event list with basic info
   - Event URLs

2. **Use Select-All Method** on event URLs to get:
   - Full descriptions
   - Cost and age requirements
   - Promoter details
   - Complete address

**Best of both worlds:**
- Speed of API for discovery
- Completeness of Select-All for details

---

## Usage

```bash
# Fetch events via GraphQL API
node ra-graphql-fetcher.js <area_code> <start_date> <end_date> [output_file]

# Example (California area)
node ra-graphql-fetcher.js 308 2025-10-31 2025-11-03 events.json

# Output: JSON file with all events
```

