const { fetchEventsViaGraphQL } = require('./ra-graphql-fetcher');
const { scrapeEventViaSelectAll } = require('./ra-scraper-selectall');
const fs = require('fs').promises;
const path = require('path');

/**
 * Hybrid RA.co Event Scraper
 * 
 * Combines:
 * 1. GraphQL API - Fast event discovery (bulk listing)
 * 2. Select-All Method - Complete detailed extraction (individual pages)
 * 
 * Best of both worlds:
 * - Fast bulk discovery via API
 * - Complete detailed data via scraping
 */

/**
 * Hybrid scrape: Get event list via GraphQL, then detailed data via Select-All
 */
async function hybridScrape(areaCode, startDate, endDate, maxEvents = 5) {
  console.log('\n🚀 HYBRID SCRAPER: GraphQL API + Select-All Method\n');
  console.log(`📍 Area: ${areaCode}`);
  console.log(`📅 Date Range: ${startDate} to ${endDate}`);
  console.log(`🎯 Processing: ${maxEvents} events\n`);
  
  // Step 1: Get event list via GraphQL API (fast discovery)
  console.log('📡 Step 1: Fetching event list via GraphQL API...\n');
  
  const result = await fetchEventsViaGraphQL(areaCode, startDate, endDate, 1, maxEvents * 2);
  
  if (!result || !result.data || result.data.length === 0) {
    console.log('❌ No events found via GraphQL API');
    return [];
  }
  
  console.log(`✅ Found ${result.data.length} events via API`);
  console.log(`📋 Selecting first ${maxEvents} events for detailed scraping...\n`);
  
  // Take first N events
  const eventsToScrape = result.data.slice(0, maxEvents);
  
  // Step 2: Get detailed data via Select-All for each event
  console.log('🔍 Step 2: Extracting detailed data via Select-All method...\n');
  
  const hybridEvents = [];
  
  for (let i = 0; i < eventsToScrape.length; i++) {
    const eventListing = eventsToScrape[i];
    const eventBasic = eventListing.event;
    
    console.log(`\n[${i + 1}/${eventsToScrape.length}] ${eventBasic.title}`);
    console.log(`   URL: ${eventBasic.contentUrl ? `https://ra.co${eventBasic.contentUrl}` : 'N/A'}`);
    
    try {
      // Get full URL
      const eventUrl = eventBasic.contentUrl 
        ? `https://ra.co${eventBasic.contentUrl}`
        : `https://ra.co/events/${eventBasic.id}`;
      
      // Scrape detailed data
      const { eventData } = await scrapeEventViaSelectAll(eventUrl);
      
      // Merge API data (fast) + Scraped data (complete)
      const hybridEvent = {
        // From GraphQL API (fast discovery)
        id: eventBasic.id,
        apiTitle: eventBasic.title,
        apiDate: eventBasic.date,
        apiStartTime: eventBasic.startTime,
        apiEndTime: eventBasic.endTime,
        apiVenue: eventBasic.venue?.name || null,
        apiVenueUrl: eventBasic.venue?.contentUrl ? `https://ra.co${eventBasic.venue.contentUrl}` : null,
        apiArtists: eventBasic.artists?.map(a => a.name) || [],
        apiAttending: eventBasic.attending || 0,
        apiIsTicketed: eventBasic.isTicketed || false,
        apiImage: eventBasic.images?.[0]?.filename ? 
          `https://static.ra.co${eventBasic.images[0].filename}` : null,
        apiPick: eventBasic.pick?.blurb || null,
        
        // From Select-All scraping (complete details)
        scrapedTitle: eventData.title,
        scrapedVenue: eventData.venue,
        scrapedAddress: eventData.address,
        scrapedDate: eventData.date,
        scrapedTime: eventData.time,
        scrapedPromoter: eventData.promoter,
        scrapedArtists: eventData.artists,
        scrapedGenres: eventData.genres,
        scrapedDescription: eventData.description,
        scrapedCost: eventData.cost,
        scrapedMinAge: eventData.minAge,
        scrapedAdmin: eventData.admin,
        scrapedInterested: eventData.interested,
        
        // Combined best data
        title: eventData.title || eventBasic.title,
        date: eventData.dateParsed || eventBasic.date,
        time: eventData.time || (eventBasic.startTime ? `${eventBasic.startTime} - ${eventBasic.endTime}` : null),
        venue: eventData.venue || eventBasic.venue?.name,
        address: eventData.address || null,
        artists: eventData.artists || eventBasic.artists?.map(a => a.name) || [],
        genres: eventData.genres || null,
        description: eventData.description || eventBasic.pick?.blurb || null,
        cost: eventData.cost || null,
        minAge: eventData.minAge || null,
        promoter: eventData.promoter || null,
        attending: eventData.attendingNum || eventBasic.attending || 0,
        interested: eventData.interested || null,
        url: eventUrl,
        imageUrl: eventBasic.images?.[0]?.filename ? 
          `https://static.ra.co${eventBasic.images[0].filename}` : null,
        isTicketed: eventBasic.isTicketed || false,
        admin: eventData.admin || null,
        
        // Metadata
        scrapedAt: eventData.scrapedAt || new Date().toISOString(),
        dataSource: 'hybrid'
      };
      
      hybridEvents.push(hybridEvent);
      
      console.log(`   ✅ Scraped: ${eventData.title}`);
      console.log(`   📍 Venue: ${eventData.venue || 'N/A'}`);
      if (eventData.artists && eventData.artists.length > 0) {
        console.log(`   🎤 Artists: ${eventData.artists.slice(0, 3).join(', ')}${eventData.artists.length > 3 ? '...' : ''}`);
      }
      if (eventData.cost) console.log(`   💰 Cost: ${eventData.cost}`);
      if (eventData.minAge) console.log(`   🔞 Age: ${eventData.minAge}`);
      
      // Rate limiting delay
      if (i < eventsToScrape.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      // Still add basic data from API
      hybridEvents.push({
        id: eventBasic.id,
        title: eventBasic.title,
        date: eventBasic.date,
        time: eventBasic.startTime ? `${eventBasic.startTime} - ${eventBasic.endTime}` : null,
        venue: eventBasic.venue?.name,
        artists: eventBasic.artists?.map(a => a.name) || [],
        attending: eventBasic.attending || 0,
        url: eventBasic.contentUrl ? `https://ra.co${eventBasic.contentUrl}` : null,
        dataSource: 'api-only',
        error: error.message
      });
    }
  }
  
  return hybridEvents;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
Usage: node ra-hybrid-scraper.js <area_code> <start_date> <end_date> [max_events] [output_file]

Examples:
  # California area, 5 events
  node ra-hybrid-scraper.js 308 2025-10-31 2025-11-03 5

  # Custom number of events
  node ra-hybrid-scraper.js 308 2025-10-31 2025-11-03 10 events.json
    `);
    process.exit(1);
  }
  
  const areaCode = parseInt(args[0]);
  const startDate = args[1];
  const endDate = args[2];
  const maxEvents = parseInt(args[3]) || 5;
  const outputFile = args[4] || `hybrid-events-${areaCode}-${Date.now()}.json`;
  
  hybridScrape(areaCode, startDate, endDate, maxEvents)
    .then(async (events) => {
      if (events.length === 0) {
        console.log('\n❌ No events processed');
        process.exit(1);
      }
      
      console.log(`\n\n📊 SUMMARY`);
      console.log(`✅ Successfully processed ${events.length} events\n`);
      
      // Display summary
      console.log('📋 Final Results:\n');
      events.forEach((event, i) => {
        console.log(`${i + 1}. ${event.title}`);
        console.log(`   📅 ${event.date} ${event.time || ''}`);
        console.log(`   📍 ${event.venue}${event.address ? ` - ${event.address}` : ''}`);
        if (event.artists && event.artists.length > 0) {
          console.log(`   🎤 ${event.artists.slice(0, 3).join(', ')}${event.artists.length > 3 ? ` +${event.artists.length - 3} more` : ''}`);
        }
        if (event.genres && event.genres.length > 0) {
          console.log(`   🎵 ${event.genres.join(', ')}`);
        }
        if (event.cost) console.log(`   💰 ${event.cost}`);
        if (event.minAge) console.log(`   🔞 ${event.minAge}`);
        if (event.description) {
          const desc = event.description.substring(0, 100);
          console.log(`   📝 ${desc}${event.description.length > 100 ? '...' : ''}`);
        }
        console.log(`   👥 Attending: ${event.attending}`);
        console.log(`   📊 Data Source: ${event.dataSource}`);
        console.log('');
      });
      
      // Save to file
      const outputPath = path.join(__dirname, outputFile);
      await fs.writeFile(outputPath, JSON.stringify(events, null, 2));
      console.log(`💾 Saved ${events.length} hybrid events to: ${outputPath}`);
      
      // Create comparison summary
      const summary = {
        totalEvents: events.length,
        apiOnly: events.filter(e => e.dataSource === 'api-only').length,
        hybrid: events.filter(e => e.dataSource === 'hybrid').length,
        hasDescription: events.filter(e => e.description).length,
        hasCost: events.filter(e => e.cost).length,
        hasMinAge: events.filter(e => e.minAge).length,
        hasPromoter: events.filter(e => e.promoter).length,
        hasAddress: events.filter(e => e.address).length
      };
      
      console.log('\n📈 Data Completeness:');
      console.log(`   Description: ${summary.hasDescription}/${summary.totalEvents}`);
      console.log(`   Cost: ${summary.hasCost}/${summary.totalEvents}`);
      console.log(`   Min Age: ${summary.hasMinAge}/${summary.totalEvents}`);
      console.log(`   Promoter: ${summary.hasPromoter}/${summary.totalEvents}`);
      console.log(`   Address: ${summary.hasAddress}/${summary.totalEvents}`);
      
    })
    .catch(error => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { hybridScrape };
