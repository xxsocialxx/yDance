# RA Artist Scraper - Repository Analysis

**Repository:** [manuelzander/ra-scraper](https://github.com/manuelzander/ra-scraper)  
**Analysis Date:** October 31, 2025  
**Status:** Explored and analyzed

---

## 📋 Overview

A Python-based Scrapy scraper designed for **artist-centric event discovery** on Resident Advisor (RA.co). Unlike location-based scrapers, this tool focuses on finding all events where specific artists are playing.

---

## 🎯 Core Purpose

**Find where your favorite artists are playing** - Track specific DJs/artists and get notified of their upcoming events.

**Use Case:** "Show me all events where Solomun/Bicep/Four Tet are playing"

---

## ✨ Key Features

### 1. Artist-Focused Discovery
- Input: List of artist names (one per line in `artists.txt`)
- Output: All upcoming events for those artists
- **Different philosophy** from location-based scraping

### 2. Comprehensive Data Extraction
Extracts three types of data:

**EventItem** (Basic event info):
- Event ID, title, date
- Venue name, city
- Artist name (the one being tracked)
- Event URL

**EventLineupItem** (Complete lineups):
- All artists in the event
- Linked artists only (ones with RA profiles)

**EventPriceItem** (Detailed pricing):
- **On-sale prices** (available tickets)
- **Closed prices** (sold-out ticket tiers)
- Multiple ticket tiers per event
- Entry time restrictions
- Currency handling (USD, EUR, etc.)

### 3. Recursive Discovery (Optional)
```python
RECURSIVE = True  # in settings.py
```
- Follows artists found in event lineups
- Discovers events for artists not initially listed
- Builds network of connected events
- **Warning:** Can result in very large number of requests

### 4. Email Notifications
- Sends results via email (Gmail)
- Configurable through `notifications.py`
- Can be automated with GitHub Actions

### 5. Multiple Output Formats
- JSONL (default - JSON Lines)
- CSV (configurable)
- Custom exports via Scrapy exporters

---

## 🛠️ Technology Stack

- **Language:** Python 3.7+
- **Framework:** Scrapy (web scraping framework)
- **Dependencies:** scrapy, lxml, parsel, pandas

---

## ⚠️ Current Limitations

### 1. Blocking Issues (Critical)
- ❌ **403 Forbidden errors** when scraping artist pages
- RA.co blocks Scrapy requests (detects bot)
- **Status:** Not working currently without workarounds

**Blocking Causes:**
- Default Scrapy User-Agent (obvious bot)
- No cookies enabled by default
- Missing browser headers
- Non-browser TLS fingerprint
- Suspicious request patterns

### 2. Domain Redirects
- RA.co redirects `www.residentadvisor.net` → `ra.co`
- Fixed by adding `ra.co` to `allowed_domains`
- But still blocked by 403 errors

### 3. Artist URL Dependency
- Artist names must match RA URL format exactly
- Format: `https://www.residentadvisor.net/dj/{ARTIST_NAME}`
- Wrong format = no events found

### 4. Linked Artists Only
- Only extracts artists with RA profile links
- Misses text-only artist mentions in lineups
- Incomplete lineup data for some events

### 5. HTML Scraping Brittleness
- Relies on CSS selectors
- Vulnerable to site structure changes
- Selectors may break if RA redesigns

### 6. No API Usage
- Doesn't leverage GraphQL API we discovered
- Pure HTML scraping approach
- Could be faster/more reliable with API

### 7. Limited Error Handling
- No graceful handling of missing data
- Exceptions can stop entire scrape
- Limited retry logic for failed requests

---

## 💡 Suggestions for Improvement

### 1. Overcome Blocking (High Priority)

**Option A: Use Browser Automation**
```python
# Use scrapy-playwright plugin
pip install scrapy-playwright
playwright install chromium

# In settings.py
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}
```
- Real browser engine (bypasses detection)
- Handles JavaScript challenges
- **Best solution**

**Option B: Enhanced Headers + Cookies**
```python
# settings.py
COOKIES_ENABLED = True
USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...'

DEFAULT_REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'DNT': '1',
}
```
- May or may not work (depends on detection level)
- Easier to implement

**Option C: Cloudscraper Library**
```python
import cloudscraper
scraper = cloudscraper.create_scraper()
```
- Specialized for Cloudflare-protected sites
- Might help if RA.co uses Cloudflare

### 2. Integrate GraphQL API

**Hybrid Approach:**
- Use GraphQL API for fast event discovery
- Filter results by artist names
- Use Scrapy only for detail page scraping (prices, lineups)

**Benefits:**
- Faster discovery
- Less blocking risk
- More reliable

### 3. Improve Artist Matching

**Current:** Exact name matching  
**Suggestion:** Fuzzy matching
- Handle variations (DVS1 vs dvs1 vs Dvs1)
- Handle artist aliases
- Handle special characters

### 4. Better Error Handling

**Suggestions:**
- Graceful handling of 403 errors
- Retry logic with exponential backoff
- Skip failed events, continue processing
- Log errors for debugging

### 5. Text-Only Artist Extraction

**Current:** Only linked artists  
**Suggestion:** Also extract text-only artists
- Parse lineup text
- Extract names even without links
- More complete lineup data

### 6. Rate Limiting

**Current:** 0.5 second delay  
**Suggestions:**
- Increase delay (1-2 seconds)
- Add randomization
- Respect robots.txt more carefully
- Add exponential backoff for errors

### 7. Session Management

**Suggestions:**
- Visit homepage first (get cookies)
- Maintain session across requests
- Handle cookie consent dialogs
- Add referrer headers (pretend browsing site)

### 8. Proxy Support

**For scale:**
- Rotate proxies to avoid IP bans
- Use residential proxies
- Distribute requests across IPs

### 9. Data Validation

**Suggestions:**
- Validate extracted data
- Check for missing required fields
- Clean/normalize data (dates, prices, etc.)
- Remove duplicates

### 10. Modernize Dependencies

**Current:** Old Python 3.7, old Scrapy  
**Suggestions:**
- Update to Python 3.9+
- Update Scrapy to latest version
- Update all dependencies
- Fix compatibility issues

---

## 🔄 Comparison with Our Approach

| Aspect | This Repo | Our Approach |
|--------|-----------|--------------|
| **Focus** | Artist-centric | Location/date-centric |
| **Input** | Artist list | Area code + date range |
| **Framework** | Scrapy (Python) | Playwright (Node.js) |
| **API Usage** | ❌ No | ✅ GraphQL API |
| **Blocking Issues** | ❌ Yes (403 errors) | ✅ No (works) |
| **Price Detail** | ✅ Very detailed | ✅ Basic |
| **Speed** | Fast (if not blocked) | Medium (browser overhead) |
| **Reliability** | ⚠️ Brittle (selectors) | ✅ Resilient (text parsing) |
| **Output** | JSONL | JSON |

---

## 🎓 Key Learnings

### What We Learned

1. **Different Philosophy**
   - Artist-focused vs. location-focused
   - Both approaches have value
   - Could complement each other

2. **Price Extraction Excellence**
   - This repo has very detailed price extraction
   - Multiple ticket tiers
   - Entry time restrictions
   - **We could adopt this detail level**

3. **Recursive Discovery**
   - Interesting feature for network building
   - Could adapt to our pipeline
   - Useful for discovering related events

4. **Scrapy vs. Playwright**
   - Scrapy: Fast, efficient (when not blocked)
   - Playwright: More reliable, bypasses blocks
   - Both have their place

---

## 📊 Test Results (Our Attempt)

### Setup
- ✅ Cloned repository
- ✅ Installed dependencies (with compatibility fixes)
- ✅ Configured artists: dvs1, floorplan, anetha
- ❌ **Blocked by 403 errors**

### What We Tried
1. Fixed domain redirect issue (added `ra.co`)
2. Attempted to run scraper
3. Encountered 403 Forbidden on all artist pages

### Why It Failed
- RA.co detects Scrapy as bot
- Missing browser-like headers
- No cookies/session
- Non-browser TLS fingerprint

---

## 💭 Theoretical Workarounds

### Could Work (Not Tested)

1. **scrapy-playwright** - Use browser automation
2. **Enhanced headers + cookies** - More realistic requests
3. **Proxy rotation** - Avoid IP-based blocking
4. **Cloudscraper** - Handle Cloudflare challenges
5. **Session management** - Maintain cookies across requests

### Why We Don't Need Them

- ✅ Our GraphQL API approach works
- ✅ Our Playwright Select-All method works
- ✅ No blocking issues with our approach
- ✅ Better reliability and completeness

---

## 🚀 Recommended Hybrid Approach

**Best of Both Worlds:**

1. **Use GraphQL API** for fast event discovery
   - Query events by date range
   - Filter by artist names in lineups
   - Get event URLs quickly

2. **Use Scrapy with Playwright** for detail extraction
   - Scrape detail pages for prices/lineups
   - Use browser automation to avoid blocks
   - Get complete data

3. **Or: Use Our Select-All Method**
   - Already working perfectly
   - No blocking issues
   - Complete data extraction

---

## 📝 Files in Repository

- `scraper/scraper/spiders/ra_artist_spider.py` - Main spider
- `scraper/scraper/items.py` - Data models
- `scraper/scraper/settings.py` - Configuration
- `scraper/scraper/pipelines.py` - Data processing
- `scraper/artists.txt` - Artist list
- `scraper/notifications.py` - Email functionality
- `requirements.txt` - Dependencies

---

## ⚖️ Legal/Ethical Considerations

- ⚠️ RA.co's Terms of Service prohibit scraping
- ⚠️ Bypassing blocks may violate ToS
- ✅ Our GraphQL API usage is more acceptable
- ✅ Browser automation (Playwright) is less detectable
- **Recommendation:** Use legitimate methods (API + reasonable automation)

---

## 📚 References

- Repository: https://github.com/manuelzander/ra-scraper
- Scrapy Docs: https://docs.scrapy.org/
- Our Analysis: See `RA-SCRAPER-EXPLORATION.md`
- Blocking Analysis: See `RA-BLOCKING-ANALYSIS.md`

---

**Conclusion:** Interesting artist-focused approach with detailed price extraction, but currently blocked. Our hybrid approach (GraphQL + Playwright) works better and avoids blocking issues entirely.

