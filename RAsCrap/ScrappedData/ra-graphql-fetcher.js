const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * RA.co GraphQL API Event Fetcher
 * Based on: https://github.com/djb-gt/resident-advisor-events-scraper
 * 
 * Fetches event listings using RA.co's GraphQL API
 * Much faster than browser scraping for event discovery
 */

const GRAPHQL_URL = 'https://ra.co/graphql';

const GRAPHQL_QUERY = `
  query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $filterOptions: FilterOptionsInputDtoInput, $page: Int, $pageSize: Int) {
    eventListings(filters: $filters, filterOptions: $filterOptions, pageSize: $pageSize, page: $page) {
      data {
        id
        listingDate
        event {
          id
          date
          startTime
          endTime
          title
          contentUrl
          flyerFront
          isTicketed
          attending
          queueItEnabled
          newEventForm
          images {
            id
            filename
            alt
            type
            crop
          }
          pick {
            id
            blurb
          }
          venue {
            id
            name
            contentUrl
            live
          }
          artists {
            id
            name
          }
        }
      }
      filterOptions {
        genre {
          label
          value
        }
      }
      totalResults
    }
  }
`;

/**
 * Fetch events using GraphQL API
 */
async function fetchEventsViaGraphQL(areaCode, startDate, endDate, page = 1, pageSize = 20) {
  const headers = {
    'Content-Type': 'application/json',
    'Referer': 'https://ra.co/events',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://ra.co'
  };

  // Ensure areaCode is a number (API expects Int type)
  const areaCodeNum = typeof areaCode === 'string' ? parseInt(areaCode) : areaCode;

  const payload = {
    operationName: 'GET_EVENT_LISTINGS',
    variables: {
      filters: {
        areas: { eq: areaCodeNum },
        listingDate: {
          gte: startDate,
          lte: endDate
        }
      },
      filterOptions: { genre: true },
      pageSize: pageSize,
      page: page
    },
    query: GRAPHQL_QUERY
  };

  try {
    console.log(`📡 Fetching events from GraphQL API (page ${page})...`);
    const response = await axios.post(GRAPHQL_URL, payload, { headers });
    
    if (response.data.errors) {
      console.error('GraphQL Errors:', response.data.errors);
      return null;
    }
    
    return response.data.data.eventListings;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetch all events (with pagination)
 */
async function fetchAllEvents(areaCode, startDate, endDate, delay = 1000) {
  const allEvents = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const result = await fetchEventsViaGraphQL(areaCode, startDate, endDate, page, 20);
    
    if (!result || !result.data || result.data.length === 0) {
      hasMore = false;
      break;
    }
    
    allEvents.push(...result.data);
    
    console.log(`✅ Page ${page}: ${result.data.length} events (Total: ${allEvents.length})`);
    
    // Check if there are more pages
    const totalResults = result.totalResults || 0;
    if (allEvents.length >= totalResults || result.data.length < 20) {
      hasMore = false;
    } else {
      page++;
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return allEvents;
}

/**
 * Format event data for display
 */
function formatEvent(eventData) {
  const event = eventData.event;
  
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    url: event.contentUrl ? `https://ra.co${event.contentUrl}` : null,
    venue: event.venue?.name || null,
    venueUrl: event.venue?.contentUrl ? `https://ra.co${event.venue.contentUrl}` : null,
    artists: event.artists?.map(a => a.name) || [],
    attending: event.attending || 0,
    isTicketed: event.isTicketed || false,
    image: event.images?.[0]?.filename ? 
      `https://static.ra.co${event.images[0].filename}` : null,
    pick: event.pick?.blurb || null,
    listingDate: eventData.listingDate
  };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
Usage: node ra-graphql-fetcher.js <area_code> <start_date> <end_date> [output_file]

Examples:
  # Washington DC area (need to find area code)
  node ra-graphql-fetcher.js 308 2025-10-31 2025-11-03

  # California area
  node ra-graphql-fetcher.js 308 2025-10-31 2025-11-03 events.json
    `);
    process.exit(1);
  }
  
  const areaCode = parseInt(args[0]);
  const startDate = args[1];
  const endDate = args[2];
  const outputFile = args[3] || `events-${areaCode}-${Date.now()}.json`;
  
  console.log(`\n🔍 Fetching events for area ${areaCode}`);
  console.log(`📅 Date range: ${startDate} to ${endDate}\n`);
  
  fetchAllEvents(areaCode, startDate, endDate)
    .then(async (events) => {
      if (events.length === 0) {
        console.log('\n❌ No events found. Check area code and date range.');
        process.exit(1);
      }
      
      // Format events
      const formattedEvents = events.map(formatEvent);
      
      console.log(`\n✅ Fetched ${formattedEvents.length} events\n`);
      
      // Display sample
      console.log('📋 Sample Events:\n');
      formattedEvents.slice(0, 5).forEach((event, i) => {
        console.log(`${i + 1}. ${event.title}`);
        console.log(`   Date: ${event.date} ${event.startTime || ''} - ${event.endTime || ''}`);
        console.log(`   Venue: ${event.venue}`);
        if (event.artists.length > 0) {
          console.log(`   Artists: ${event.artists.join(', ')}`);
        }
        console.log(`   Attending: ${event.attending} | URL: ${event.url}`);
        console.log('');
      });
      
      // Save to file
      const outputPath = path.join(__dirname, outputFile);
      await fs.writeFile(outputPath, JSON.stringify(formattedEvents, null, 2));
      console.log(`💾 Saved ${formattedEvents.length} events to: ${outputPath}`);
      
      return formattedEvents;
    })
    .catch(error => {
      console.error('Failed to fetch events:', error);
      process.exit(1);
    });
}

module.exports = { fetchEventsViaGraphQL, fetchAllEvents, formatEvent };
