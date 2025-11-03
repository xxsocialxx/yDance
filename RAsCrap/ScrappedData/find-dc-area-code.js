const axios = require('axios');

/**
 * Systematically test area codes to find Washington DC
 */
async function findDCAreaCode() {
  console.log('🔍 Testing area codes to find Washington DC...\n');
  
  // Test a focused range of codes (prioritize likely candidates)
  const codesToTest = [
    // Likely US city codes (around 300s)
    300, 301, 302, 303, 304, 305, 306, 307, 309, 310, 311, 312, 313, 314, 315,
    // Lower numbers that might be major cities
    4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20,
    // Medium range
    50, 51, 52, 100, 101, 102, 150, 151, 200, 201, 250, 251
  ];
  
  console.log(`Testing ${codesToTest.length} area codes...\n`);
  
  let found = null;
  
  for (let i = 0; i < codesToTest.length && !found; i++) {
    const code = codesToTest[i];
    
    // Skip known ones
    if (code === 308 || code === 2 || code === 13) continue;
    
    try {
      const response = await axios.post('https://ra.co/graphql', {
        operationName: 'GET_EVENT_LISTINGS',
        variables: {
          filters: {
            areas: { eq: code },
            listingDate: {
              gte: '2025-10-31',
              lte: '2025-11-03'
            }
          },
          pageSize: 5,
          page: 1
        },
        query: `query GET_EVENT_LISTINGS($filters: FilterInputDtoInput, $page: Int, $pageSize: Int) {
          eventListings(filters: $filters, pageSize: $pageSize, page: $page) {
            data { 
              event { 
                id
                title 
                venue {
                  name
                }
              } 
            }
            totalResults
          }
        }`
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 5000
      });
      
      if (response.data?.data?.eventListings?.totalResults > 0) {
        const events = response.data.data.eventListings.data;
        
        // Check if any event is in DC
        for (const eventData of events) {
          const event = eventData.event;
          const venue = event.venue?.name?.toLowerCase() || '';
          const title = event.title?.toLowerCase() || '';
          
          const dcIndicators = [
            'washington',
            'dc',
            'district of columbia',
            'el techo',
            'union stage',
            'capital'
          ];
          
          const isDC = dcIndicators.some(indicator => 
            venue.includes(indicator) || title.includes(indicator)
          );
          
          if (isDC) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`✅ FOUND WASHINGTON DC AREA CODE: ${code}`);
            console.log(`${'='.repeat(60)}\n`);
            console.log(`Sample Events:`);
            events.slice(0, 3).forEach(e => {
              console.log(`  - ${e.event.title} @ ${e.event.venue?.name}`);
            });
            console.log(`\nTotal Events: ${response.data.data.eventListings.totalResults}`);
            found = code;
            break;
          }
        }
        
        // Progress indicator
        if (i % 10 === 0) {
          console.log(`Tested ${i + 1}/${codesToTest.length} area codes...`);
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      // Skip errors, continue testing
    }
  }
  
  if (!found) {
    console.log('\n❌ Washington DC area code not found in tested range');
    console.log('   May need to test a different range or use alternative method');
  } else {
    console.log(`\n📝 Area Code: ${found}`);
    console.log(`   Add to area-codes.json: "us/washington-dc": ${found}`);
  }
  
  return found;
}

if (require.main === module) {
  findDCAreaCode()
    .then(code => {
      if (code) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { findDCAreaCode };
