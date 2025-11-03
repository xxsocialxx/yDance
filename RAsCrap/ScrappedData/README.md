# RA.co Event Scraper

A Node.js scraper for extracting weekend events from ra.co (Resident Advisor). **For development purposes only.**

## Legal Notice

⚠️ **IMPORTANT**: This scraper is intended for **development and educational purposes only**. Please review ra.co's Terms of Use before using. Be respectful of rate limits and consider reaching out to ra.co for API access or partnership opportunities.

## Installation

```bash
npm install
```

This will install Playwright and its browser dependencies.

## Usage

### Scrape Weekend Events (Default: California)

```bash
npm run scrape
# or
node ra-scraper.js
```

### Scrape Events for Specific Location

```bash
# California
npm run scrape:ca
node ra-scraper.js us/california

# New York
npm run scrape:ny
node ra-scraper.js us/new-york

# London
npm run scrape:london
node ra-scraper.js gb/london
```

### Use as Module

```javascript
const { scrapeWeekendEvents, scrapeRAEvents } = require('./ra-scraper');

// Scrape weekend events
scrapeWeekendEvents('us/california').then(events => {
  console.log(`Found ${events.length} events`);
});

// Scrape with custom date range
const startDate = new Date('2024-11-01');
const endDate = new Date('2024-11-03');
scrapeRAEvents('us/california', startDate, endDate).then(events => {
  console.log(events);
});
```

## Output

The scraper will:
1. Print events to console
2. Save results to a JSON file: `ra-events-{location}-{timestamp}.json`

### Event Object Structure

```json
{
  "id": "2255974",
  "title": "COBRAH & Rhonda INTL present GAGBALL",
  "date": "Sat, 1 Nov",
  "dateParsed": "2024-11-01",
  "venue": "Los Globos",
  "url": "https://ra.co/events/2255974",
  "imageUrl": "",
  "attendance": "1.2K",
  "location": "us/california"
}
```

## Selectors Used

Based on analysis of ra.co's HTML structure:

- **Event Cards**: `[data-testid="event-upcoming-card"]`, `[data-pw-test-id="popular-event-item"]`
- **Event Title**: `[data-pw-test-id="event-title-link"]`
- **Event Date**: `span[color="secondary"]`
- **Venue**: `[data-pw-test-id="event-venue-link"]` or `[data-testid="meta-text"]` (near location icon)
- **Event URL**: Extracted from title/image link `href`
- **Attendance**: `[data-testid="meta-text"]` (near person icon)

## Notes

- The scraper uses Playwright (headless browser) to handle dynamic content
- Events are filtered to weekends (Friday-Sunday)
- Duplicate events are automatically removed
- Images may be lazy-loaded and might not always be captured

## Troubleshooting

1. **No events found**: The selectors may have changed. Check the HTML structure.
2. **Timeout errors**: Increase timeout values or check network connectivity.
3. **Rate limiting**: Add delays between requests if scraping multiple locations.

## Development

To modify the scraper:

1. Update selectors in `ra-scraper.js` if ra.co changes their HTML structure
2. Adjust date filtering logic as needed
3. Add additional fields (artists, genres, prices) by identifying new selectors

## Additional Web Inspector Info That Could Help

If the current selectors break, you might want to check:

1. **Network Tab**: Look for API endpoints that ra.co uses to fetch events (might be more efficient than scraping HTML)
2. **__NEXT_DATA__ Script**: The JSON data in the script tag might contain event data
3. **Event Detail Page**: Inspect a single event page to extract more detailed information
4. **Main Event Listing**: The `[data-tracking-id="events-all"]` section may have different selectors for the full event list
