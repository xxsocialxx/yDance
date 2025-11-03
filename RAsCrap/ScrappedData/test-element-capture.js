const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * Diagnostic script to test element-level capture on ra.co
 * Tests if we can reliably extract text from event card/detail elements
 */
async function testElementLevelCapture(url) {
  let browser;
  let page;
  
  try {
    browser = await chromium.launch({ 
      headless: false, // Visible to see what's happening
      slowMo: 100 // Slower to avoid window shuffle issues
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    page = await context.newPage();

    console.log(`\n🔍 Testing element-level capture for: ${url}\n`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for page to stabilize and ensure viewport is ready
    console.log('Waiting for page to fully load and stabilize...');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Extra wait for dynamic content
    await page.waitForFunction(() => document.readyState === 'complete');
    
    // Ensure we're scrolled to top and page is stable
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);
    
    console.log('📋 Analyzing page structure...\n');
    
    const diagnostics = await page.evaluate(() => {
      const results = {
        pageType: 'unknown',
        eventId: null,
        extractors: {}
      };
      
      // Detect if this is an event detail page
      const eventIdMatch = window.location.pathname.match(/\/events\/(\d+)/);
      if (eventIdMatch) {
        results.pageType = 'event-detail';
        results.eventId = eventIdMatch[1];
      }
      
      // Test extraction of key fields
      const fieldsToTest = {
        title: {
          selectors: [
            'h1',
            '[data-pw-test-id="event-title"]',
            '[data-testid="event-title"]',
            'h1[class*="title"]',
            'article h1',
            '.event-title',
            'title' // fallback to document title
          ],
          results: {}
        },
        date: {
          selectors: [
            'time[datetime]',
            '[data-testid="event-date"]',
            '[data-pw-test-id="event-date"]',
            '[class*="date"]',
            'time',
            // Try finding any element with date-like text
            '*',
            'span',
            'div'
          ],
          results: {}
        },
        venue: {
          selectors: [
            'a[href*="/clubs/"]',
            '[data-pw-test-id="event-venue"]',
            '[data-testid="event-venue"]',
            '[class*="venue"]',
            'a[href*="/clubs"]'
          ],
          results: {}
        },
        artists: {
          selectors: [
            '[data-pw-test-id="event-artists"]',
            '[data-testid="event-artists"]',
            '[class*="artist"]',
            '[class*="lineup"]',
            'article [class*="lineup"]'
          ],
          results: {}
        },
        promoter: {
          selectors: [
            'a[href*="/promoters/"]',
            '[data-pw-test-id="event-promoter"]',
            '[class*="promoter"]'
          ],
          results: {}
        },
        genre: {
          selectors: [
            '[data-pw-test-id="event-genre"]',
            '[class*="genre"]',
            '[class*="tag"]'
          ],
          results: {}
        },
        description: {
          selectors: [
            '[data-testid="event-description"]',
            '[data-pw-test-id="event-description"]',
            '[class*="description"]',
            'article [class*="description"]'
          ],
          results: {}
        },
        price: {
          selectors: [
            '[data-testid="event-price"]',
            '[data-pw-test-id="event-price"]',
            '[class*="price"]',
            '[class*="ticket"]'
          ],
          results: {}
        },
        image: {
          selectors: [
            '[data-testid="event-image"] img',
            '[data-pw-test-id="event-image"] img',
            'article img',
            'img[alt*="event"]',
            'img[src*="events"]'
          ],
          results: {}
        }
      };
      
      // Test each field with all selectors
      for (const [field, config] of Object.entries(fieldsToTest)) {
        for (const selector of config.selectors) {
          try {
            let element = null;
            
            // Special handling for document title
            if (selector === 'title' && field === 'title') {
              element = document.querySelector('title');
            } else {
              element = document.querySelector(selector);
            }
            
            let elements = [];
            
            // For wildcard selectors (*), filter by field-specific patterns
            if (selector === '*') {
              const allElements = document.querySelectorAll('span, div, p, time, li');
              elements = Array.from(allElements);
              
              // Filter by field-specific patterns
              if (field === 'date') {
                // Look for date patterns
                elements = elements.filter(el => {
                  const text = el.textContent || '';
                  return /(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{1,2})/i.test(text);
                });
              }
            } else if (selector === 'span' || selector === 'div') {
              // For generic tags, get all of them for testing
              elements = Array.from(document.querySelectorAll(selector));
              // Limit to first 20 to avoid performance issues
              elements = elements.slice(0, 20);
            } else {
              elements = [document.querySelector(selector)].filter(Boolean);
            }
            
            if (elements.length > 0) {
              // Test all matching elements, keep the best one
              let bestElement = null;
              let bestText = '';
              let bestValue = '';
              let bestScore = 0;
              
              elements.forEach(element => {
                let text = element.textContent?.trim() || '';
                let value = '';
                
                // For images, get src
                if (element.tagName === 'IMG') {
                  value = element.getAttribute('src') || element.getAttribute('data-src') || '';
                  text = element.getAttribute('alt') || '';
                }
                
                // For time elements, get datetime
                if (element.tagName === 'TIME') {
                  value = element.getAttribute('datetime') || '';
                }
                
                // For links, get href
                if (element.tagName === 'A') {
                  value = element.getAttribute('href') || '';
                }
                
                // Score element based on relevance
                let score = text.length;
                if (field === 'date' && /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i.test(text)) score += 100;
                if (field === 'artists' && (text.includes('+') || text.includes('&'))) score += 50;
                if (field === 'description' && text.length > 100) score += 50;
                
                if (score > bestScore && (text.length > 2 || value)) {
                  bestScore = score;
                  bestElement = element;
                  bestText = text;
                  bestValue = value;
                }
              });
              
              if (bestElement) {
                const computedStyle = window.getComputedStyle(bestElement);
                const rect = bestElement.getBoundingClientRect();
                
                config.results[selector] = {
                  found: true,
                  text: bestText || '(empty)',
                  value: bestValue || null,
                  textLength: bestText?.length || 0,
                  visible: computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden',
                  inViewport: rect.top >= 0 && rect.left >= 0,
                  opacity: parseFloat(computedStyle.opacity),
                  hasText: !!(bestText && bestText.length > 2),
                  hasValue: !!bestValue,
                  tagName: bestElement.tagName,
                  className: bestElement.className.substring(0, 100),
                  elementsFound: elements.length
                };
              } else {
                config.results[selector] = { found: false, elementsChecked: elements.length };
              }
            } else {
              config.results[selector] = { found: false };
            }
          } catch (e) {
            config.results[selector] = { found: false, error: e.message };
          }
        }
      }
      
      results.extractors = fieldsToTest;
      
      return results;
    });
    
    // Print results
    console.log('📊 DIAGNOSTIC RESULTS:\n');
    console.log(`Page Type: ${diagnostics.pageType}`);
    if (diagnostics.eventId) {
      console.log(`Event ID: ${diagnostics.eventId}\n`);
    }
    
    console.log('🔬 FIELD EXTRACTION TEST RESULTS:\n');
    
    const fieldStatus = {};
    
    for (const [field, config] of Object.entries(diagnostics.extractors)) {
      console.log(`\n📌 ${field.toUpperCase()}:`);
      let working = false;
      let bestSelector = null;
      let bestResult = null;
      
      for (const [selector, result] of Object.entries(config.results)) {
        const hasData = result.found && (result.hasText || result.hasValue);
        const status = hasData ? '✅' : '❌';
        console.log(`  ${status} ${selector}`);
        
        if (hasData) {
          if (!bestResult || (result.textLength > (bestResult.textLength || 0))) {
            bestResult = result;
            bestSelector = selector;
          }
          
          if (result.text) {
            const preview = result.text.length > 60 
              ? result.text.substring(0, 60) + '...' 
              : result.text;
            console.log(`     Text: "${preview}"`);
          }
          if (result.value) {
            console.log(`     Value: ${result.value.substring(0, 60)}`);
          }
          console.log(`     Visible: ${result.visible ? '✅' : '❌'} | In Viewport: ${result.inViewport ? '✅' : '❌'}`);
          working = true;
        } else if (result.found) {
          console.log(`     Found but empty/invisible`);
        }
      }
      
      fieldStatus[field] = {
        working,
        bestSelector,
        bestResult
      };
      
      if (working) {
        console.log(`  ✅ ${field} extraction: WORKING via "${bestSelector}"`);
      } else {
        console.log(`  ❌ ${field} extraction: FAILED - may need copy-paste approach`);
      }
    }
    
    // Overall assessment
    console.log('\n\n📈 OVERALL ASSESSMENT:\n');
    const workingFields = Object.values(fieldStatus).filter(f => f.working).length;
    const totalFields = Object.keys(fieldStatus).length;
    const percentage = Math.round((workingFields / totalFields) * 100);
    
    console.log(`✅ Working: ${workingFields}/${totalFields} fields (${percentage}%)`);
    
    if (percentage >= 80) {
      console.log('✅ EXCELLENT: Most fields can be extracted via element-level capture');
      console.log('   → Use direct DOM extraction (fastest approach)');
    } else if (percentage >= 50) {
      console.log(`⚠️  PARTIAL: ${workingFields}/${totalFields} fields work with element-level`);
      console.log('   → Use hybrid approach: element-level for working fields, copy-paste for others');
      console.log('\n   Working fields:');
      Object.entries(fieldStatus)
        .filter(([_, s]) => s.working)
        .forEach(([field, s]) => console.log(`     - ${field} (via "${s.bestSelector}")`));
      console.log('\n   Failed fields:');
      Object.entries(fieldStatus)
        .filter(([_, s]) => !s.working)
        .forEach(([field]) => console.log(`     - ${field}`));
    } else {
      console.log(`❌ POOR: Only ${workingFields}/${totalFields} fields work with element-level`);
      console.log('   → Use copy-paste or OCR approach');
    }
    
    // Save detailed report with best selectors
    const report = {
      url,
      timestamp: new Date().toISOString(),
      pageType: diagnostics.pageType,
      eventId: diagnostics.eventId,
      summary: {
        workingFields,
        totalFields,
        percentage
      },
      fieldStatus,
      allResults: diagnostics.extractors
    };
    
    const reportFile = path.join(__dirname, `diagnostic-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportFile}`);
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for 15 seconds for manual inspection...');
    console.log('   (Close manually or wait for auto-close)\n');
    await page.waitForTimeout(15000);
    
    await browser.close();
    return report;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    throw error;
  }
}

// Run the diagnostic
if (require.main === module) {
  const url = process.argv[2] || 'https://ra.co/events/us/california';
  testElementLevelCapture(url).catch(console.error);
}

module.exports = { testElementLevelCapture };
