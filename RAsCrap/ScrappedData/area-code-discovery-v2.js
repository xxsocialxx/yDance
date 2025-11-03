const { chromium } = require('playwright');
const axios = require('axios');

/**
 * Enhanced area code discovery - multiple methods
 */
async function discoverAreaCode(locationUrl) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const areaCodeCandidates = [];

  try {
    console.log(`🔍 Analyzing: ${locationUrl}\n`);

    // Set up network interception BEFORE navigation
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/graphql')) {
        try {
          const postData = request.postDataJSON();
          if (postData?.variables?.filters?.areas?.eq) {
            const areaCode = postData.variables.filters.areas.eq;
            console.log(`📡 GraphQL REQUEST - Area Code: ${areaCode}`);
            areaCodeCandidates.push(areaCode);
          }
        } catch (e) {
          // Try as string
          const postDataStr = request.postData();
          if (postDataStr) {
            try {
              const parsed = JSON.parse(postDataStr);
              if (parsed?.variables?.filters?.areas?.eq) {
                const areaCode = parsed.variables.filters.areas.eq;
                console.log(`📡 GraphQL REQUEST (string) - Area Code: ${areaCode}`);
                areaCodeCandidates.push(areaCode);
              }
            } catch (e2) {}
          }
        }
      }
    });

    // Navigate and wait
    await page.goto(locationUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(5000);

    // Scroll to trigger API calls
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(2000);

    // Method: Extract from page source and all scripts
    const pageAnalysis = await page.evaluate(() => {
      const results = {
        areaCodes: [],
        __NEXT_DATA__: null,
        allScripts: []
      };

      // Check for __NEXT_DATA__
      const nextDataScript = document.querySelector('script#__NEXT_DATA__');
      if (nextDataScript) {
        try {
          results.__NEXT_DATA__ = JSON.parse(nextDataScript.textContent);
        } catch (e) {
          results.__NEXT_DATA__ = { error: e.message };
        }
      }

      // Search all script tags
      const scripts = document.querySelectorAll('script');
      scripts.forEach((script, idx) => {
        const text = script.textContent || script.innerHTML || '';
        if (text.length > 0) {
          // Look for area code patterns
          const patterns = [
            /areas.*?eq.*?(\d+)/gi,
            /areaId["\']?\s*[:=]\s*(\d+)/gi,
            /"area"\s*:\s*(\d+)/gi,
            /area.*?id["\']?\s*[:=]\s*(\d+)/gi,
            /areaCode["\']?\s*[:=]\s*(\d+)/gi
          ];

          patterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
              matches.forEach(match => {
                const num = match.match(/(\d+)/);
                if (num) {
                  const code = parseInt(num[1]);
                  if (code > 0 && code < 10000) {
                    results.areaCodes.push(code);
                  }
                }
              });
            }
          });
        }
      });

      // Deep search __NEXT_DATA__ if we have it
      if (results.__NEXT_DATA__ && typeof results.__NEXT_DATA__ === 'object' && !results.__NEXT_DATA__.error) {
        function deepSearch(obj, path = []) {
          if (path.length > 20) return; // Prevent infinite recursion
          
          if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
              const newPath = [...path, key];
              
              // Check if key contains 'area' and value is a number
              if (key.toLowerCase().includes('area') && typeof value === 'number' && value > 0 && value < 10000) {
                results.areaCodes.push(value);
                console.log(`Found in __NEXT_DATA__: ${newPath.join('.')} = ${value}`);
              }
              
              // Recursive search
              if (typeof value === 'object' && value !== null) {
                deepSearch(value, newPath);
              }
            }
          }
        }
        
        deepSearch(results.__NEXT_DATA__);
      }

      return results;
    });

    console.log(`\n📄 Page Analysis:`);
    if (pageAnalysis.__NEXT_DATA__) {
      console.log(`   ✅ __NEXT_DATA__ found`);
      if (!pageAnalysis.__NEXT_DATA__.error) {
        console.log(`   Top keys:`, Object.keys(pageAnalysis.__NEXT_DATA__).slice(0, 10));
      }
    } else {
      console.log(`   ❌ __NEXT_DATA__ not found`);
    }
    
    if (pageAnalysis.areaCodes.length > 0) {
      console.log(`   📍 Area codes in page:`, [...new Set(pageAnalysis.areaCodes)]);
      areaCodeCandidates.push(...pageAnalysis.areaCodes);
    }

    // Get unique area codes
    const uniqueCodes = [...new Set(areaCodeCandidates)];
    console.log(`\n📊 All Area Code Candidates: ${uniqueCodes.length > 0 ? uniqueCodes.join(', ') : 'None'}\n`);

    // Test each candidate
    for (const areaCode of uniqueCodes) {
      console.log(`🧪 Testing area code: ${areaCode}`);
      
      try {
        const testResult = await axios.post('https://ra.co/graphql', {
          operationName: 'GET_EVENT_LISTINGS',
          variables: {
            filters: {
              areas: { eq: areaCode },
              listingDate: {
                gte: '2025-10-31',
                lte: '2025-11-03'
              }
            },
            pageSize: 3,
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
            'Referer': locationUrl,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          timeout: 10000
        });

        if (testResult.data?.data?.eventListings?.data?.length > 0) {
          const sampleEvent = testResult.data.data.eventListings.data[0].event;
          const totalResults = testResult.data.data.eventListings.totalResults;
          console.log(`   ✅ VERIFIED! Area code ${areaCode} works!`);
          console.log(`   📊 Total events: ${totalResults}`);
          console.log(`   📍 Sample: ${sampleEvent.title} @ ${sampleEvent.venue?.name}`);
          
          // Check if it looks like Washington DC
          const venueName = sampleEvent.venue?.name?.toLowerCase() || '';
          const eventTitle = sampleEvent.title?.toLowerCase() || '';
          if (venueName.includes('washington') || venueName.includes('dc') || 
              venueName.includes('district') || eventTitle.includes('dc') ||
              eventTitle.includes('washington')) {
            console.log(`   🎯 This appears to be Washington DC!`);
          }
          
          await browser.close();
          return { 
            areaCode, 
            verified: true, 
            totalResults,
            sampleEvent: sampleEvent.title
          };
        } else {
          console.log(`   ❌ No events returned`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.response?.status || error.message}`);
      }
    }

    await browser.close();
    return uniqueCodes.length > 0 ? { areaCode: uniqueCodes[0], verified: false } : null;

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    return null;
  }
}

// CLI usage
if (require.main === module) {
  const locationUrl = process.argv[2] || 'https://ra.co/events/us/washington-dc';
  
  discoverAreaCode(locationUrl)
    .then(result => {
      if (result && result.areaCode) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ DISCOVERED AREA CODE: ${result.areaCode}`);
        if (result.verified) {
          console.log(`✅ VERIFIED: ${result.totalResults} events found`);
        }
        console.log(`${'='.repeat(60)}`);
        
        const locationSlug = locationUrl.match(/\/events\/(.+)$/)?.[1] || 'unknown';
        console.log(`\n📝 Add to area-codes.json:`);
        console.log(`   "${locationSlug}": ${result.areaCode}`);
      } else {
        console.log('\n❌ Could not discover area code');
        process.exit(1);
      }
    })
    .catch(console.error);
}

module.exports = { discoverAreaCode };
