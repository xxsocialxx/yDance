const { fetchEventsViaGraphQL } = require('./ra-graphql-fetcher');
const { scrapeEventViaSelectAll } = require('./ra-scraper-selectall');
const fs = require('fs').promises;
const path = require('path');

/**
 * Artist-Focused RA.co Event Scraper
 * 
 * Finds all events for specific artists using:
 * 1. GraphQL API to search for events
 * 2. Filter by artist names in lineups
 * 3. Select-All method for complete details
 */

/**
 * Search for events by artist names
 */
async function searchEventsByArtists(artistNames, areaCode = 308, startDate = '2025-01-01', endDate = '2026-12-31') {
  console.log(`\n🔍 Searching for events with artists: ${artistNames.join(', ')}\n`);
  console.log(`📍 Area: ${areaCode}`);
  console.log(`📅 Date Range: ${startDate} to ${endDate}\n`);
  
  // Fetch all events in date range
  const allEvents = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const result = await fetchEventsViaGraphQL(areaCode, startDate, endDate, page, 100);
    
    if (!result || !result.data || result.data.length === 0) {
      hasMore = false;
      break;
    }
    
    // Filter events that contain any of our artists
    const matchingEvents = result.data.filter(eventData => {
      const event = eventData.event;
      const artists = event.artists || [];
      const artistNamesLower = artistNames.map(a => a.toLowerCase());
      
      return artists.some(artist => {
        const artistName = artist.name.toLowerCase();
        return artistNamesLower.some(searchName => 
          artistName.includes(searchName) || searchName.includes(artistName)
        );
      });
    });
    
    allEvents.push(...matchingEvents);
    
    console.log(`📡 Page ${page}: Found ${matchingEvents.length} matching events (Total: ${allEvents.length})`);
    
    // Check if more pages
    const totalResults = result.totalResults || 0;
    if (allEvents.length >= totalResults || result.data.length < 100) {
      hasMore = false;
    } else {
      page++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return allEvents;
}

/**
 * Get complete event details for artist events
 */
async function getArtistEvents(artistNames, areaCode = 308, maxEvents = 50) {
  console.log(`\n🎤 ARTIST EVENT SCRAPER\n`);
  console.log(`Artists: ${artistNames.join(', ')}\n`);
  
  // Step 1: Search for events
  const matchingEvents = await searchEventsByArtists(artistNames, areaCode);
  
  if (matchingEvents.length === 0) {
    console.log('❌ No events found for these artists');
    return [];
  }
  
  console.log(`\n✅ Found ${matchingEvents.length} events total`);
  console.log(`📋 Processing first ${Math.min(matchingEvents.length, maxEvents)} events...\n`);
  
  // Step 2: Get complete details
  const completeEvents = [];
  const eventsToProcess = matchingEvents.slice(0, maxEvents);
  
  for (let i = 0; i < eventsToProcess.length; i++) {
    const eventData = eventsToProcess[i].event;
    
    // Find which artists match
    const matchingArtists = eventData.artists?.filter(artist => {
      const artistName = artist.name.toLowerCase();
      return artistNames.some(searchName => 
        artistName.includes(searchName.toLowerCase()) || 
        searchName.toLowerCase().includes(artistName)
      );
    }) || [];
    
    console.log(`\n[${i + 1}/${eventsToProcess.length}] ${eventData.title}`);
    console.log(`   Matching Artists: ${matchingArtists.map(a => a.name).join(', ')}`);
    console.log(`   URL: https://ra.co${eventData.contentUrl}`);
    
    try {
      const eventUrl = `https://ra.co${eventData.contentUrl}`;
      const { eventData: scrapedData } = await scrapeEventViaSelectAll(eventUrl);
      
      const completeEvent = {
        // From GraphQL
        id: eventData.id,
        apiTitle: eventData.title,
        apiDate: eventData.date,
        apiStartTime: eventData.startTime,
        apiEndTime: eventData.endTime,
        apiVenue: eventData.venue?.name,
        apiArtists: eventData.artists?.map(a => a.name) || [],
        apiAttending: eventData.attending || 0,
        apiUrl: eventUrl,
        
        // From Scraping
        scrapedTitle: scrapedData.title,
        scrapedVenue: scrapedData.venue,
        scrapedAddress: scrapedData.address,
        scrapedDate: scrapedData.date,
        scrapedTime: scrapedData.time,
        scrapedPromoter: scrapedData.promoter,
        scrapedArtists: scrapedData.artists,
        scrapedGenres: scrapedData.genres,
        scrapedDescription: scrapedData.description,
        scrapedCost: scrapedData.cost,
        scrapedMinAge: scrapedData.minAge,
        scrapedAdmin: scrapedData.admin,
        scrapedInterested: scrapedData.interested,
        
        // Combined
        title: scrapedData.title || eventData.title,
        date: scrapedData.dateParsed || eventData.date,
        time: scrapedData.time || (eventData.startTime ? `${eventData.startTime} - ${eventData.endTime}` : null),
        venue: scrapedData.venue || eventData.venue?.name,
        address: scrapedData.address || null,
        artists: scrapedData.artists || eventData.artists?.map(a => a.name) || [],
        genres: scrapedData.genres || null,
        description: scrapedData.description || null,
        cost: scrapedData.cost || null,
        minAge: scrapedData.minAge || null,
        promoter: scrapedData.promoter || null,
        attending: scrapedData.attendingNum || eventData.attending || 0,
        interested: scrapedData.interested || null,
        url: eventUrl,
        
        // Metadata
        matchingArtists: matchingArtists.map(a => a.name),
        scrapedAt: scrapedData.scrapedAt || new Date().toISOString(),
        dataSource: 'hybrid-artist-search'
      };
      
      completeEvents.push(completeEvent);
      
      console.log(`   ✅ Complete: ${completeEvent.title}`);
      if (completeEvent.cost) console.log(`   💰 Cost: ${completeEvent.cost}`);
      if (completeEvent.venue) console.log(`   📍 Venue: ${completeEvent.venue}`);
      
      // Rate limiting
      if (i < eventsToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      // Still add basic API data
      completeEvents.push({
        id: eventData.id,
        title: eventData.title,
        date: eventData.date,
        venue: eventData.venue?.name,
        artists: eventData.artists?.map(a => a.name) || [],
        url: `https://ra.co${eventData.contentUrl}`,
        dataSource: 'api-only',
        error: error.message
      });
    }
  }
  
  return completeEvents;
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node ra-artist-scraper.js <artist1> [artist2] [artist3] ... [options]

Examples:
  # Search for dvs1, floorplan, anetha events
  node ra-artist-scraper.js dvs1 floorplan anetha

  # Limit to 10 events
  node ra-artist-scraper.js dvs1 floorplan anetha --max 10

  # Specific area
  node ra-artist-scraper.js dvs1 --area 308
    `);
    process.exit(1);
  }
  
  const artists = [];
  let areaCode = 308;
  let maxEvents = 50;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--area' && args[i + 1]) {
      areaCode = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--max' && args[i + 1]) {
      maxEvents = parseInt(args[i + 1]);
      i++;
    } else {
      artists.push(args[i]);
    }
  }
  
  if (artists.length === 0) {
    console.log('❌ Please provide at least one artist name');
    process.exit(1);
  }
  
  getArtistEvents(artists, areaCode, maxEvents)
    .then(async (events) => {
      if (events.length === 0) {
        console.log('\n❌ No events found');
        process.exit(1);
      }
      
      console.log(`\n\n📊 RESULTS SUMMARY`);
      console.log(`✅ Found ${events.length} events\n`);
      
      // Group by artist
      const byArtist = {};
      events.forEach(event => {
        event.matchingArtists?.forEach(artist => {
          if (!byArtist[artist]) byArtist[artist] = [];
          byArtist[artist].push(event);
        });
      });
      
      console.log('📋 Events by Artist:\n');
      Object.keys(byArtist).forEach(artist => {
        console.log(`\n${artist.toUpperCase()} (${byArtist[artist].length} events):`);
        byArtist[artist].forEach(event => {
          console.log(`  - ${event.title}`);
          console.log(`    Date: ${event.date} ${event.time || ''}`);
          if (event.venue) console.log(`    Venue: ${event.venue}`);
          if (event.cost) console.log(`    Cost: ${event.cost}`);
          console.log(`    URL: ${event.url}`);
        });
      });
      
      // Save to file
      const outputFile = `artist-events-${artists.join('-')}-${Date.now()}.json`;
      const outputPath = path.join(__dirname, outputFile);
      await fs.writeFile(outputPath, JSON.stringify(events, null, 2));
      console.log(`\n💾 Saved ${events.length} events to: ${outputPath}`);
      
    })
    .catch(error => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { getArtistEvents, searchEventsByArtists };

