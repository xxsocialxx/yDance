const { chromium } = require('playwright');
const axios = require('axios');

/**
 * Discover area code for a given location/market
 */
async function discoverAreaCode(locationUrl) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const areaCodeCandidates = [];

  try {
    console.log(`🔍 Analyzing: ${locationUrl}\n`);

    // Method 1: Monitor GraphQL requests AND responses
    page.on('request', request => {
      if (request.url().includes('/graphql')) {
        try {
          const postData = request.postDataJSON();
          if (postData?.variables?.filters?.areas) {
            const areaCode = postData.variables.filters.areas.eq;
            console.log(`📡 Found in GraphQL REQUEST: ${areaCode}`);
            areaCodeCandidates.push({
              source: 'graphql-request',
              areaCode: areaCode,
              method: 'network-monitoring'
            });
          }
        } catch (e) {
          // Not JSON or no post data
        }
      }
    });

    // Also monitor responses
    page.on('response', async response => {
      if (response.url().includes('/graphql')) {
        try {
          const json = await response.json();
          // Sometimes response contains area context
          if (json?.extensions?.areaId) {
            const areaCode = json.extensions.areaId;
            console.log(`📥 Found in GraphQL RESPONSE: ${areaCode}`);
            areaCodeCandidates.push({
              source: 'graphql-response',
              areaCode: areaCode,
              method: 'response-monitoring'
            });
          }
        } catch (e) {
          // Not JSON or error
        }
      }
    });

    // Method 2: Extract from page JavaScript
    await page.goto(locationUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000); // Wait longer for dynamic content

    // Scroll to trigger lazy loading and more API calls
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);

    // Extract from __NEXT_DATA__ and all page data
    const pageData = await page.evaluate(() => {
      const results = {};
      
      // Try __NEXT_DATA__ script tag
      const nextDataScript = document.querySelector('script#__NEXT_DATA__');
      if (nextDataScript) {
        try {
          const data = JSON.parse(nextDataScript.textContent);
          
          // Deep search for any numeric value that could be area code
          function deepSearch(obj, path = '') {
            if (!obj || typeof obj !== 'object') return;
            
            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key;
              
              // Look for keys containing 'area' and numeric values
              if (key.toLowerCase().includes('area') && typeof value === 'number') {
                results[currentPath] = value;
              }
              
              // Also check for 'id' after 'area'
              if (key.toLowerCase().includes('area') && typeof value === 'object') {
                if (value.id && typeof value.id === 'number') {
                  results[`${currentPath}.id`] = value.id;
                }
              }
              
              // Recursive search
              if (typeof value === 'object' && value !== null) {
                deepSearch(value, currentPath);
              }
            }
          }
          
          deepSearch(data);
          
        } catch (e) {
          console.log('Error parsing __NEXT_DATA__:', e.message);
        }
      }

      // Try window global variables
      if (window.__NEXT_DATA__) {
        try {
          const data = window.__NEXT_DATA__;
          if (data.props?.areaId) results['window.__NEXT_DATA__.props.areaId'] = data.props.areaId;
          if (data.props?.pageProps?.areaId) results['window.__NEXT_DATA__.props.pageProps.areaId'] = data.props.pageProps.areaId;
          if (data.props?.pageProps?.initialArea?.id) results['window.__NEXT_DATA__.props.pageProps.initialArea.id'] = data.props.pageProps.initialArea.id;
          
          // Deep search window data too
          function searchWindowData(obj, path = 'window') {
            if (!obj || typeof obj !== 'object') return;
            for (const [key, value] of Object.entries(obj)) {
              if (key.toLowerCase().includes('area') && typeof value === 'number') {
                results[`${path}.${key}`] = value;
              }
              if (typeof value === 'object' && value !== null && path.split('.').length < 10) {
                searchWindowData(value, `${path}.${key}`);
              }
            }
          }
          searchWindowData(data, 'window.__NEXT_DATA__');
        } catch (e) {}
      }

      // Try to find area code in any script tags (more patterns)
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        
        // Look for various patterns
        const patterns = [
          /areaId["\']?\s*[:=]\s*(\d+)/gi,
          /"area"\s*:\s*(\d+)/gi,
          /areas.*?eq.*?(\d+)/gi,
          /area.*?id["\']?\s*[:=]\s*(\d+)/gi
        ];
        
        patterns.forEach(pattern => {
          const matches = text.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const numMatch = match.match(/(\d+)/);
              if (numMatch) {
                const num = parseInt(numMatch[1]);
                if (num > 0 && num < 10000) { // Reasonable range for area codes
                  results[`script-pattern-${num}`] = num;
                }
              }
            });
          }
        });
      }

      return results;
    });

    // Add page data results
    for (const [path, areaCode] of Object.entries(pageData)) {
      console.log(`📄 Found in page data (${path}): ${areaCode}`);
      areaCodeCandidates.push({
        source: 'page-javascript',
        path: path,
        areaCode: areaCode,
        method: 'dom-extraction'
      });
    }

    // Method 3: Check page URL and route params
    const currentUrl = page.url();
    console.log(`🔗 Current URL: ${currentUrl}`);
    
    // Extract any numeric ID from URL pattern
    const urlMatch = currentUrl.match(/\/events\/[^\/]+\/(\d+)/);
    if (urlMatch) {
      console.log(`🔗 Found in URL: ${urlMatch[1]}`);
      areaCodeCandidates.push({
        source: 'url-pattern',
        areaCode: parseInt(urlMatch[1]),
        method: 'url-parsing'
      });
    }

    await page.waitForTimeout(2000);

    // Verify by testing the area code
    const uniqueAreaCodes = [...new Set(areaCodeCandidates.map(c => c.areaCode))];
    
    console.log(`\n📊 Found ${uniqueAreaCodes.length} unique area code candidate(s): ${uniqueAreaCodes.join(', ')}\n`);

    for (const areaCode of uniqueAreaCodes) {
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
            pageSize: 1,
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
          console.log(`✅ Area code ${areaCode} WORKS!`);
          console.log(`   Found ${testResult.data.data.eventListings.totalResults} events`);
          console.log(`   Sample: ${sampleEvent.title} @ ${sampleEvent.venue?.name}`);
          
          // Check if venue looks like Washington DC
          const venueName = sampleEvent.venue?.name?.toLowerCase() || '';
          if (venueName.includes('washington') || venueName.includes('dc') || venueName.includes('district')) {
            console.log(`   🎯 This appears to be Washington DC events!`);
          }
          
          await browser.close();
          return { areaCode, verified: true, totalResults: testResult.data.data.eventListings.totalResults };
        } else {
          console.log(`   ❌ Area code ${areaCode} returned no results`);
        }
      } catch (error) {
        console.log(`   ❌ Error testing area code ${areaCode}: ${error.message}`);
      }
    }

    // If no verification worked, return the first candidate anyway
    if (uniqueAreaCodes.length > 0) {
      console.log(`\n⚠️  Could not verify, but best candidate: ${uniqueAreaCodes[0]}`);
      await browser.close();
      return { areaCode: uniqueAreaCodes[0], verified: false };
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }

  return null;
}

// CLI usage
if (require.main === module) {
  const locationUrl = process.argv[2] || 'https://ra.co/events/us/washington-dc';
  
  discoverAreaCode(locationUrl)
    .then(result => {
      if (result && result.areaCode) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`✅ DISCOVERED AREA CODE: ${result.areaCode}`);
        console.log(`${'='.repeat(60)}`);
        
        const locationSlug = locationUrl.match(/\/events\/(.+)$/)?.[1] || 'unknown';
        console.log(`\n📝 Add to area-codes.json:`);
        console.log(`   "${locationSlug}": ${result.areaCode}`);
        
        if (result.verified) {
          console.log(`\n✅ Verified: ${result.totalResults} events found for this area code`);
        } else {
          console.log(`\n⚠️  Unverified: Please test manually`);
        }
      } else {
        console.log('\n❌ Could not discover area code');
        process.exit(1);
      }
    })
    .catch(console.error);
}

module.exports = { discoverAreaCode };
