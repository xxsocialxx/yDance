# RA Scraper Repository Exploration - Honest Analysis

**Repository:** [manuelzander/ra-scraper](https://github.com/manuelzander/ra-scraper)  
**Exploration Date:** October 31, 2025  
**Approach:** Fresh exploration, understanding user goals

---

## 🎯 What This Repository Aims to Achieve

### Core Purpose
**Artist-Centric Event Discovery** - Find all events where your favorite artists are playing.

This is fundamentally different from location/date-based scraping. Instead of:
- ❌ "Show me all events in California this weekend"

This tool does:
- ✅ "Show me all events where Solomun/Bicep/Four Tet/etc. are playing"

### User Use Cases

1. **Music Fan Use Case**
   - Track favorite DJs/artists
   - Get notified when they have upcoming shows
   - Discover events before they sell out

2. **Concert Tracking**
   - Follow specific artists across different cities
   - See their tour schedules
   - Track ticket availability and pricing

3. **Recursive Discovery**
   - Option to follow artists from event lineups
   - Discover new artists through connections
   - Build network of related events

---

## 🔍 How It Works

### Architecture: Scrapy Framework

**Technology Stack:**
- **Language:** Python 3.7+
- **Framework:** Scrapy (web scraping framework)
- **Output:** JSONL files (JSON Lines format)

### Workflow

```
1. User provides artist list (artists.txt)
   └─> e.g., "solomun", "bicep", "fourtet"

2. Spider visits each artist's RA page
   └─> https://www.residentadvisor.net/dj/{artist}

3. Extracts event listings from artist page
   └─> Finds all events where artist is playing

4. For each event found:
   ├─> Extracts basic info (date, title, venue, city)
   ├─> Visits event detail page
   ├─> Extracts lineup (all artists)
   └─> Extracts prices (on-sale and sold-out)

5. (Optional) Recursive mode
   └─> Follows artists from lineups to find more events

6. Outputs 3 JSONL files:
   ├─> EventItem.jsonl (basic event data)
   ├─> EventLineupItem.jsonl (lineups)
   └─> EventPriceItem.jsonl (pricing)
```

---

## 📊 What Data It Extracts

### 1. EventItem (Basic Event Info)
```json
{
  "id": "1319532",
  "artist": "Solomun",
  "date": "Tue, 31 Dec 2019",
  "title": "NYE with Solomun & Jamie Jones by Link Miami Rebels",
  "link": "https://www.residentadvisor.net/events/1319532",
  "venue": "Space",
  "city": "Miami"
}
```

**Fields:**
- Event ID
- Artist name (the one you're tracking)
- Date
- Event title
- Event URL
- Venue name
- City

### 2. EventLineupItem (Full Lineup)
```json
{
  "id": "1319532",
  "lineup": ["Solomun", "Jamie Jones", "Danyelino", "Thunderpony"]
}
```

**Fields:**
- Event ID (matches EventItem)
- Complete artist lineup

**Note:** Only extracts LINKED artists (ones with RA profiles), not text-only mentions

### 3. EventPriceItem (Ticket Pricing)
```json
{
  "id": "1319532",
  "closed_prices": [
    ["$20.00", "1st release (entry before 12AM)"],
    ["$50.00", "2nd release (entry before 12AM)"]
  ],
  "onsale_prices": [
    ["$100.00 + $12.50", "2nd release (entry AFTER 12 PM)"]
  ]
}
```

**Fields:**
- Event ID (matches EventItem)
- Closed prices (sold-out ticket tiers)
- On-sale prices (available tickets)

**Important:** Extracts detailed pricing info including:
- Price amounts
- Ticket tier descriptions
- Entry time restrictions
- Multiple currencies (USD, EUR, etc.)

---

## 🎨 Key Features

### 1. Artist-Focused
- **Input:** List of artist names
- **Output:** All events for those artists
- **Use Case:** Track specific DJs you love

### 2. Recursive Discovery (Optional)
```python
RECURSIVE = True  # in settings.py
```
- Follows artists found in event lineups
- Can discover events for artists you didn't initially list
- **Warning:** Can result in very large number of requests

### 3. Price Tracking
- Detailed ticket pricing information
- Tracks both on-sale and sold-out prices
- Multiple ticket tiers per event

### 4. Email Notifications
- Can send results via email (Gmail)
- Configurable through `notifications.py`
- Can be automated with GitHub Actions

### 5. Multiple Output Formats
- JSONL (default)
- CSV (configurable)
- Custom exports via Scrapy exporters

---

## 🔄 Comparison: This vs. Our Approach

| Aspect | This Repo (manuelzander) | Our Approach |
|--------|-------------------------|--------------|
| **Input Method** | Artist list | Area code + Date range |
| **Discovery Focus** | Artist-centric | Location/date-centric |
| **GraphQL API** | ❌ No | ✅ Yes |
| **Select-All Method** | ❌ No | ✅ Yes |
| **Price Extraction** | ✅ Yes (detailed) | ✅ Yes (basic) |
| **Lineup Extraction** | ✅ Yes | ✅ Yes |
| **Framework** | Scrapy (Python) | Playwright (Node.js) |
| **Output Format** | JSONL | JSON |
| **Recursive Discovery** | ✅ Optional | ❌ No |
| **Email Notifications** | ✅ Built-in | ❌ No |

### Key Differences

1. **Discovery Strategy**
   - **This:** Start with artists → find their events
   - **Ours:** Start with location/date → find all events

2. **Data Source**
   - **This:** Direct HTML scraping via Scrapy
   - **Ours:** GraphQL API + HTML scraping hybrid

3. **Scope**
   - **This:** Events for specific artists
   - **Ours:** All events in an area/date range

4. **Price Detail**
   - **This:** Very detailed (ticket tiers, entry times)
   - **Ours:** Basic price extraction

---

## 🧪 Testing the Repository

### Setup Process

1. **Clone repository** ✅
2. **Check requirements:**
   - Python 3.7+
   - Scrapy framework
   - Various dependencies

3. **Configuration needed:**
   - Edit `scraper/artists.txt` with artist names
   - (Optional) Configure recursive mode
   - (Optional) Set up email notifications

### Sample Artists Provided

The repo includes these artists in `artists.txt`:
- solomun
- bicep
- fourtet
- kolsch
- benbohmer
- superflu
- christianloffler
- jorisvoorn
- palmstrax
- oliverkoletzki

All are techno/house artists - aligns with RA's main focus.

---

## 💡 What I Learned

### 1. Different Use Case
This tool serves a **different purpose** than our location-based scraper:
- **This:** "Where is my favorite DJ playing?"
- **Ours:** "What events are happening in my city?"

Both are valid, complementary approaches.

### 2. Price Extraction Detail
This scraper has **more detailed price extraction**:
- Multiple ticket tiers
- Entry time restrictions
- Sold-out vs. on-sale tracking
- Currency handling

**Insight:** We could enhance our price extraction to match this detail level.

### 3. Recursive Discovery
The recursive feature is interesting:
- Follows artists from lineups
- Discovers connected events
- Could build event networks

**Potential:** Could adapt this idea for our pipeline.

### 4. Scrapy vs. Playwright
**Scrapy (this repo):**
- ✅ Fast, efficient for bulk scraping
- ✅ Built-in pipelines, middleware
- ✅ Good for structured data extraction
- ⚠️ Less flexible for dynamic content

**Playwright (our approach):**
- ✅ Handles dynamic JavaScript
- ✅ More flexible for complex sites
- ✅ Better for detail page scraping
- ⚠️ Heavier, slower for bulk operations

**Both have their place** - Scrapy for bulk, Playwright for details.

---

## 🎯 User Value Proposition

### Who Would Use This?

1. **Music Fans**
   - Track favorite DJs
   - Get notified of new shows
   - Don't miss events

2. **Concert Goers**
   - Follow artist tours
   - Track ticket availability
   - Plan travel around shows

3. **Event Discovery**
   - Find events through artist connections
   - Discover new artists via lineups
   - Build personal event calendar

### Use Cases

- "I want to see Solomun live - where is he playing?"
- "When is Bicep's next show?"
- "Are there any events with Four Tet coming up?"
- "Show me all events where any of my favorite artists are playing"

---

## 📝 Observations

### Strengths

1. ✅ **Focused Use Case** - Does one thing well (artist tracking)
2. ✅ **Detailed Price Data** - More comprehensive than most scrapers
3. ✅ **Recursive Discovery** - Unique feature for network discovery
4. ✅ **Email Integration** - Built-in notification system
5. ✅ **Scrapy Framework** - Robust, battle-tested

### Limitations

1. ⚠️ **Artist-Centric Only** - Can't query by location/date directly
2. ⚠️ **RA URL Dependency** - Artist names must match RA URL format
3. ⚠️ **HTML Scraping** - Relies on CSS selectors (brittle to site changes)
4. ⚠️ **No API Use** - Doesn't leverage GraphQL API we discovered
5. ⚠️ **Linked Artists Only** - Misses text-only artist mentions

### Potential Improvements

1. **Combine Approaches**
   - Use GraphQL API for bulk discovery
   - Use this method for artist-focused filtering
   - Best of both worlds

2. **Enhanced Price Extraction**
   - Adopt this repo's detailed price parsing
   - Add to our hybrid scraper

3. **Recursive Feature**
   - Add optional recursive discovery to our pipeline
   - Build event networks

4. **Hybrid Framework**
   - Scrapy for bulk scraping
   - Playwright for complex pages

---

## 🚀 Try It Out

### Quick Test Plan

1. **Setup environment:**
   ```bash
   cd ra-scraper-exploration
   virtualenv -p python3 env
   source env/bin/activate
   pip3 install -r requirements.txt
   ```

2. **Configure artists:**
   - Edit `scraper/artists.txt`
   - Add your favorite artists (must match RA URL format)

3. **Run scraper:**
   ```bash
   make build
   ```

4. **Check output:**
   - `EventItem.jsonl` - Basic event data
   - `EventLineupItem.jsonl` - Lineups
   - `EventPriceItem.jsonl` - Prices

### Expected Results

For each artist in the list:
- All their upcoming events
- Complete lineups for those events
- Detailed pricing information

**Sample:** With "solomun" in the list, you'd get all Solomun events with full details.

---

## 🎓 Key Takeaways

1. **Different Philosophy:** Artist-focused vs. location-focused
2. **Complementary Tools:** Could work together
3. **Price Detail:** More comprehensive price extraction
4. **Recursive Discovery:** Unique network-building feature
5. **Scrapy Framework:** Good choice for bulk scraping

**Conclusion:** This is a well-designed tool for **artist tracking**, while our approach excels at **location/date-based discovery**. They serve different but complementary purposes.

---

**Next Steps for Exploration:**
- Test actual run to see current behavior
- Compare output quality with our results
- Evaluate if elements could enhance our pipeline

