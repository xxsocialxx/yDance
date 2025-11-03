# Implementation Suggestions for RA Artist Scraper

**Repository:** [manuelzander/ra-scraper](https://github.com/manuelzander/ra-scraper)

---

## 🚨 Critical Issues to Fix

### 1. Blocking (403 Errors) - HIGH PRIORITY

**Problem:** RA.co blocks Scrapy requests with 403 Forbidden

**Solutions:**

#### Option A: Use scrapy-playwright (RECOMMENDED)
```bash
pip install scrapy-playwright
playwright install chromium
```

```python
# settings.py
DOWNLOAD_HANDLERS = {
    "http": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
    "https": "scrapy_playwright.handler.ScrapyPlaywrightDownloadHandler",
}

PLAYWRIGHT_BROWSER_TYPE = "chromium"
```

**Why:** Real browser engine bypasses bot detection

#### Option B: Enhanced Headers + Cookies
```python
# settings.py
COOKIES_ENABLED = True
USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

DEFAULT_REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
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

**Why:** More realistic browser headers

#### Option C: Cloudscraper
```python
import cloudscraper
scraper = cloudscraper.create_scraper()
response = scraper.get(url)
```

**Why:** Handles Cloudflare challenges

---

### 2. Integrate GraphQL API - MEDIUM PRIORITY

**Problem:** Not using fast GraphQL API for discovery

**Solution:**
```python
# Use GraphQL API for event discovery
import requests

def get_events_via_api(artist_names, area_code=308, start_date='2025-01-01', end_date='2026-12-31'):
    query = """
    query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $page: Int, $pageSize: Int) {
        eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
            data {
                event {
                    id
                    title
                    date
                    artists { name }
                    venue { name }
                    contentUrl
                }
            }
        }
    }
    """
    
    payload = {
        "operationName": "GET_EVENT_LISTINGS",
        "variables": {
            "filters": {
                "areas": {"eq": area_code},
                "listingDate": {"gte": start_date, "lte": end_date}
            },
            "pageSize": 100,
            "page": 1
        },
        "query": query
    }
    
    response = requests.post('https://ra.co/graphql', json=payload)
    events = response.json()['data']['eventListings']['data']
    
    # Filter by artist names
    matching = [e for e in events if any(
        artist.name.lower() in name.lower() 
        for artist in e['event']['artists'] 
        for name in artist_names
    )]
    
    return matching
```

**Benefits:**
- Faster than scraping
- No blocking issues
- More reliable

---

### 3. Improve Artist Matching - LOW PRIORITY

**Problem:** Exact name matching is brittle

**Solution:** Fuzzy matching
```python
from difflib import SequenceMatcher

def fuzzy_match(artist_name, search_names):
    for search_name in search_names:
        similarity = SequenceMatcher(None, 
            artist_name.lower(), 
            search_name.lower()
        ).ratio()
        if similarity > 0.8:  # 80% similarity threshold
            return True
    return False
```

---

### 4. Better Error Handling - MEDIUM PRIORITY

**Problem:** Exceptions stop entire scrape

**Solution:**
```python
# In spider
def parse(self, response):
    try:
        # scraping logic
    except Exception as e:
        self.logger.error(f"Error parsing {response.url}: {e}")
        # Continue with next item, don't stop
        return
```

---

### 5. Session Management - LOW PRIORITY

**Problem:** No session/cookies

**Solution:**
```python
# Visit homepage first
def start_requests(self):
    # Get initial cookies
    yield scrapy.Request(
        'https://ra.co',
        callback=self.after_homepage,
        dont_filter=True
    )

def after_homepage(self, response):
    # Now visit artist pages with cookies
    artists = get_artists("artists.txt")
    for artist in artists:
        url = f"https://ra.co/dj/{artist}"
        yield scrapy.Request(url=url, callback=self.parse)
```

---

## 📊 Priority Ranking

1. **HIGH:** Fix blocking (scrapy-playwright)
2. **MEDIUM:** Integrate GraphQL API
3. **MEDIUM:** Better error handling
4. **LOW:** Fuzzy artist matching
5. **LOW:** Session management

---

## 🎯 Recommended Implementation Order

1. **Start with scrapy-playwright** - Solves blocking issue immediately
2. **Then add GraphQL API** - Faster discovery
3. **Then improve error handling** - More robust
4. **Finally add enhancements** - Fuzzy matching, sessions, etc.

---

**Note:** These are suggestions for improving the repository. Our current hybrid approach (GraphQL + Playwright) already works and doesn't have these issues.

