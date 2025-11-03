const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * Scrapes events from ra.co for a specific location and date range
 * @param {string} location - Location code (e.g., 'us/california', 'gb/london')
 * @param {Date} startDate - Start date for filtering events
 * @param {Date} endDate - End date for filtering events (e.g., weekend end)
 * @returns {Promise<Array>} Array of event objects
 */
async function scrapeRAEvents(location = 'us/california', startDate = null, endDate = null) {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();

  // Set realistic headers
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  });

  try {
    // Navigate to events page
    const url = `https://ra.co/events/${location}`;
    console.log(`Navigating to: ${url}`);
    
    // Monitor network requests to see if there's an API call
    const apiResponses = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/') || url.includes('events') && response.headers()['content-type']?.includes('json')) {
        apiResponses.push({ url, status: response.status() });
      }
    });
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });

    // Wait longer for JavaScript to execute and content to load
    console.log('Waiting for page to fully load...');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.log('Network not idle, continuing anyway...');
    });

    // Try multiple strategies to find events
    let foundEvents = false;
    
    // Strategy 1: Wait for popular events section
    try {
      await page.waitForSelector('[data-pw-test-id="popular-events"]', { timeout: 10000 });
      console.log('Found popular events section');
      foundEvents = true;
    } catch (e) {
      console.log('Popular events section not found immediately');
    }

    // Strategy 2: Look for any event cards
    try {
      await page.waitForSelector('[data-testid="event-upcoming-card"], [data-pw-test-id="popular-event-item"]', { 
        timeout: 5000 
      });
      console.log('Found event cards');
      foundEvents = true;
    } catch (e) {
      console.log('Event cards not found with primary selectors');
    }

    // Strategy 3: Wait a bit more and try again
    if (!foundEvents) {
      console.log('Waiting additional time for dynamic content...');
      await page.waitForTimeout(8000);
      
      // Try scrolling to trigger lazy loading
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          window.scrollBy(0, window.innerHeight);
        });
        await page.waitForTimeout(2000);
      }
    }
    
    // Try to find and click "Load more" or scroll to trigger lazy loading
    try {
      // Check if there's infinite scroll
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await page.waitForTimeout(2000);
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(3000);
    } catch (e) {
      // Ignore scroll errors
    }

    // Extract events from the page - simpler, more robust approach
    const result = await page.evaluate(({ startDateStr, endDateStr, location }) => {
      // Strategy: Find ALL links to event detail pages, then extract info from their containers
      const allLinks = Array.from(document.querySelectorAll('a[href]'));
      const eventLinks = allLinks
        .map(link => {
          const href = link.getAttribute('href');
          const fullHref = href.startsWith('http') ? href : `https://ra.co${href}`;
          const match = fullHref.match(/ra\.co\/events\/(\d+)/);
          if (match) {
            return { link, href: fullHref, eventId: match[1] };
          }
          return null;
        })
        .filter(item => item !== null);
      
      // Deduplicate by event ID
      const uniqueEvents = new Map();
      eventLinks.forEach(({ link, href, eventId }) => {
        if (!uniqueEvents.has(eventId)) {
          uniqueEvents.set(eventId, { link, href, eventId });
        }
      });
      
      const debugInfo = { 
        cardsFound: uniqueEvents.size,
        totalEventLinks: eventLinks.length
      };
      
      // Now extract info for each unique event
      const eventCards = Array.from(uniqueEvents.values());

      const events = [];
      const eventIds = new Set(); // To avoid duplicates
      
      // Parse date strings if provided
      const startDate = startDateStr ? new Date(startDateStr) : null;
      const endDate = endDateStr ? new Date(endDateStr) : null;

      eventCards.forEach(({ link, href, eventId }) => {
        try {
          if (eventIds.has(eventId)) return;
          eventIds.add(eventId);
          
          // Find the container element (work up the DOM tree)
          let container = link;
          for (let i = 0; i < 10; i++) {
            container = container.parentElement;
            if (!container) break;
            // Look for recognizable container patterns
            const testId = container.getAttribute('data-testid') || container.getAttribute('data-pw-test-id');
            if (testId && (testId.includes('event') || testId.includes('card') || testId.includes('item'))) {
              break;
            }
            // Also check for list items or cards
            if (container.tagName === 'LI' || container.className.includes('card') || container.className.includes('item')) {
              break;
            }
          }
          
          const card = container || link.parentElement;

          // Extract title - try multiple approaches
          let title = '';
          // First try the link text itself
          title = link.textContent?.trim() || '';
          // Clean up title (remove extra whitespace, newlines)
          title = title.replace(/\s+/g, ' ').trim();
          
          // If link has a span child, use that
          const span = link.querySelector('span');
          if (span && span.textContent.trim()) {
            title = span.textContent.trim();
          }
          
          // If still no good title, look in the container
          if (!title || title.length < 3) {
            const heading = card.querySelector('h1, h2, h3, h4, [data-pw-test-id="event-title"]');
            if (heading) {
              title = heading.textContent?.trim() || '';
            }
          }

          // Extract date
          const dateSpan = card.querySelector('span[color="secondary"]');
          let dateText = dateSpan?.textContent?.trim() || '';
          
          // Try to parse the date (format: "Sat, 1 Nov" or "Fri, 31 Oct")
          let eventDate = null;
          if (dateText) {
            const now = new Date();
            const currentYear = now.getFullYear();
            
            // Parse date like "Sat, 1 Nov" or "Fri, 31 Oct"
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dateMatch = dateText.match(/(\d+)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
            
            if (dateMatch) {
              const day = parseInt(dateMatch[1]);
              const monthName = dateMatch[2];
              const month = monthNames.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
              
              if (month !== -1) {
                eventDate = new Date(currentYear, month, day);
                
                // If date is more than 6 months in the past, assume next year
                if (eventDate < now && (now - eventDate) > 180 * 24 * 60 * 60 * 1000) {
                  eventDate = new Date(currentYear + 1, month, day);
                }
              }
            }
          }

          // Filter by date range if provided
          if (startDate && eventDate && eventDate < startDate) return;
          if (endDate && eventDate && eventDate > endDate) return;

          // Extract venue - try multiple approaches
          let venue = '';
          const venueLink = card.querySelector('[data-pw-test-id="event-venue-link"], a[href*="/clubs/"]');
          if (venueLink) {
            const venueSpan = venueLink.querySelector('span');
            venue = venueSpan?.textContent?.trim() || venueLink?.textContent?.trim() || '';
          }
          
          // Try finding venue near location icon
          if (!venue) {
            const locationRow = Array.from(card.querySelectorAll('div, span')).find(el => {
              const svg = el.querySelector('svg[aria-label="Location"]');
              return svg !== null;
            });
            if (locationRow) {
              // Get text from sibling or child
              const venueMeta = locationRow.querySelector('[data-testid="meta-text"], a, span');
              venue = venueMeta?.textContent?.trim() || '';
              // Or get text from next sibling
              if (!venue && locationRow.nextElementSibling) {
                venue = locationRow.nextElementSibling.textContent?.trim() || '';
              }
            }
          }

          // Extract interest/attendance count
          const personRow = Array.from(card.querySelectorAll('div')).find(div => {
            const svg = div.querySelector('svg[aria-label="Person"]');
            return svg !== null;
          });
          const attendance = personRow?.querySelector('[data-testid="meta-text"]')?.textContent?.trim() || '';

          // Extract image (may be lazy loaded)
          const imageContainer = card.querySelector('[data-pw-test-id="event-image-link"]');
          let imageUrl = '';
          if (imageContainer) {
            const img = imageContainer.querySelector('img');
            if (img) {
              imageUrl = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || '';
            }
            // Check for lazy loaded images in nested elements
            if (!imageUrl) {
              const lazyDiv = imageContainer.querySelector('[class*="Lazy"]');
              if (lazyDiv) {
                const nestedImg = lazyDiv.querySelector('img');
                if (nestedImg) {
                  imageUrl = nestedImg.getAttribute('src') || nestedImg.getAttribute('data-src') || '';
                }
              }
            }
            // If no img tag, might be background-image or lazy loaded
            if (!imageUrl) {
              const style = imageContainer.style.backgroundImage || 
                           window.getComputedStyle(imageContainer).backgroundImage;
              if (style && style !== 'none') {
                const urlMatch = style.match(/url\(['"]?(.+?)['"]?\)/);
                if (urlMatch) imageUrl = urlMatch[1];
              }
            }
          }

          // Extract event status (SOLD OUT, etc.)
          let status = '';
          const statusMatch = title.match(/\*\*(.+?)\*\*/);
          if (statusMatch) {
            status = statusMatch[1].trim();
          }

          // Extract artists from title (common patterns)
          let artists = [];
          let cleanTitle = title;
          if (status) {
            cleanTitle = title.replace(/\*\*.+?\*\*\s*/, '');
          }

          // Patterns: "Artist1, Artist2 & Artist3 present Event"
          // "Event - ARTIST DJ Set"
          // "Artist1 + Artist2 + Artist3"
          // "Artist1 & Artist2 present Event"
          
          // Check for "present" pattern
          const presentMatch = cleanTitle.match(/^(.+?)\s+present[s]?\s+(.+)$/i);
          if (presentMatch) {
            const artistPart = presentMatch[1];
            cleanTitle = presentMatch[2];
            // Split by comma, &, +
            artists = artistPart.split(/[,&+]/).map(a => a.trim()).filter(a => a);
          } else {
            // Check for " - ARTIST DJ Set" or " - ARTIST Live" pattern
            const dashMatch = cleanTitle.match(/^(.+?)\s+-\s+(.+?)\s+(DJ\s+Set|Live|presents?|set)$/i);
            if (dashMatch) {
              artists = [dashMatch[2].trim()];
              cleanTitle = dashMatch[1].trim();
            } else {
              // Check for "Artist1 + Artist2 + Artist3: Event"
              const colonMatch = cleanTitle.match(/^(.+?):\s+(.+)$/);
              if (colonMatch) {
                const artistPart = colonMatch[1];
                cleanTitle = colonMatch[2];
                artists = artistPart.split(/[+,]/).map(a => a.trim()).filter(a => a);
              } else {
                // Check if title contains common artist separators
                const separatorMatch = cleanTitle.match(/^(.+?)\s+[+&]\s+(.+?)$/);
                if (separatorMatch && cleanTitle.length < 60) {
                  // Likely artist names at start
                  artists = [separatorMatch[1].trim(), separatorMatch[2].trim()];
                }
              }
            }
          }

          // Extract venue ID if available
          let venueId = '';
          if (venueLink) {
            const venueHref = venueLink.getAttribute('href');
            if (venueHref) {
              const venueMatch = venueHref.match(/\/clubs\/(\d+)/);
              if (venueMatch) venueId = venueMatch[1];
            }
          }

          // Extract event type/format hints from title
          let eventType = '';
          const typeKeywords = {
            'warehouse': /warehouse/i,
            'rave': /rave/i,
            'party': /party/i,
            'festival': /festival/i,
            'showcase': /showcase/i,
            'present': /present/i,
            'halloween': /halloween/i
          };
          
          for (const [type, regex] of Object.entries(typeKeywords)) {
            if (title.match(regex)) {
              eventType = type;
              break;
            }
          }

          // Full event URL
          const fullUrl = eventLink.startsWith('http') ? eventLink : `https://ra.co${eventLink}`;

          events.push({
            id: eventId,
            title: title,
            cleanTitle: cleanTitle.trim(),
            date: dateText,
            dateParsed: eventDate ? eventDate.toISOString().split('T')[0] : null,
            venue: venue,
            venueId: venueId,
            venueUrl: venueId ? `https://ra.co/clubs/${venueId}` : null,
            url: fullUrl,
            imageUrl: imageUrl,
            attendance: attendance,
            attendanceNum: attendance ? parseInt(attendance.replace(/[^\d]/g, '')) * (attendance.includes('K') ? 1000 : 1) : null,
            location: location,
            status: status,
            artists: artists.length > 0 ? artists : null,
            eventType: eventType || null,
            scrapedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error extracting event:', error);
        }
      });

      return { events, debugInfo };
    }, { 
      startDateStr: startDate ? startDate.toISOString() : null, 
      endDateStr: endDate ? endDate.toISOString() : null, 
      location 
    });

    const events = result.events;
    console.log(`Found ${result.debugInfo.cardsFound} event cards, extracted ${events.length} events`);
    
    // Diagnostic: Check what's actually on the page
    if (events.length === 0) {
      const diagnostics = await page.evaluate(() => {
        return {
          hasPopularSection: !!document.querySelector('[data-pw-test-id="popular-events"]'),
          eventLinks: document.querySelectorAll('a[href*="/events/"]').length,
          eventIdLinks: Array.from(document.querySelectorAll('a[href*="/events/"]'))
            .filter(a => /\/events\/\d+/.test(a.getAttribute('href')))
            .length,
          anyCards: document.querySelectorAll('[data-testid*="event"], [data-pw-test-id*="event"]').length
        };
      });
      console.log('Page diagnostics:', diagnostics);
    }

    // Enhance events with detail page data (limited to first 5 to avoid rate limiting)
    console.log('Enhancing events with detail page data...');
    const enhancedEvents = [];
    const detailPageLimit = Math.min(events.length, 5); // Limit to avoid rate limiting
    
    for (let i = 0; i < detailPageLimit; i++) {
      try {
        const event = events[i];
        console.log(`  Fetching details for: ${event.title.substring(0, 50)}...`);
        
        const detailPage = await browser.newPage();
        await detailPage.goto(event.url, { waitUntil: 'networkidle', timeout: 15000 });
        await detailPage.waitForTimeout(1000);
        
        const detailData = await detailPage.evaluate(() => {
          const data = {};
          
          // Extract full description
          const descriptionEl = document.querySelector('[data-testid="event-description"], [class*="description"]');
          if (descriptionEl) {
            data.description = descriptionEl.textContent.trim();
          }
          
          // Extract start and end time
          const timeEl = document.querySelector('[data-testid="event-time"], time[datetime]');
          if (timeEl) {
            const datetime = timeEl.getAttribute('datetime') || timeEl.textContent.trim();
            data.startTime = datetime;
          }
          
          // Extract price range
          const priceEl = document.querySelector('[data-testid="event-price"], [class*="price"]');
          if (priceEl) {
            data.price = priceEl.textContent.trim();
          }
          
          // Extract full artist list (might be in a different section)
          const artistSection = document.querySelector('[data-testid="event-artists"], [class*="artist"]');
          if (artistSection) {
            const artistLinks = artistSection.querySelectorAll('a, span');
            const artists = Array.from(artistLinks).map(el => el.textContent.trim()).filter(t => t);
            if (artists.length > 0) {
              data.artistsFull = artists;
            }
          }
          
          // Extract genre/tags
          const genreEl = document.querySelector('[data-testid="event-genre"], [class*="genre"]');
          if (genreEl) {
            data.genre = genreEl.textContent.trim();
          }
          
          // Extract promoter
          const promoterEl = document.querySelector('[data-testid="event-promoter"], a[href*="/promoters/"]');
          if (promoterEl) {
            data.promoter = promoterEl.textContent.trim();
            const promoterHref = promoterEl.getAttribute('href');
            if (promoterHref) {
              const match = promoterHref.match(/\/promoters\/(\d+)/);
              if (match) data.promoterId = match[1];
            }
          }
          
          // Extract full image URL
          const imageEl = document.querySelector('[data-testid="event-image"] img, img[alt*="event"]');
          if (imageEl) {
            data.imageUrlFull = imageEl.getAttribute('src') || imageEl.getAttribute('data-src') || '';
          }
          
          // Extract ticket link
          const ticketLink = document.querySelector('a[href*="tickets"], a[data-testid="ticket-link"]');
          if (ticketLink) {
            data.ticketUrl = ticketLink.getAttribute('href');
          }
          
          return data;
        });
        
        // Merge detail data with event data
        enhancedEvents.push({
          ...event,
          ...detailData,
          imageUrl: detailData.imageUrlFull || event.imageUrl,
          artists: detailData.artistsFull || event.artists
        });
        
        await detailPage.close();
        
        // Rate limiting - wait between requests
        if (i < detailPageLimit - 1) {
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.log(`  Warning: Could not fetch details for event ${events[i].id}:`, error.message);
        enhancedEvents.push(events[i]); // Use original event data
      }
    }
    
    // Add remaining events without detail enhancement
    enhancedEvents.push(...events.slice(detailPageLimit));

    console.log(`Enhanced ${detailPageLimit} events with detail page data`);

    console.log(`Found ${enhancedEvents.length} events total`);

    await browser.close();
    return enhancedEvents;

  } catch (error) {
    console.error('Scraping error:', error);
    await browser.close();
    throw error;
  }
}

/**
 * Helper function to get weekend dates (Friday to Sunday)
 */
function getWeekendDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // Find next Friday (or current if it's Friday-Sunday)
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + (daysUntilFriday === 0 && now.getHours() < 12 ? 0 : daysUntilFriday || 7));
  friday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);
  
  return { start: friday, end: sunday };
}

/**
 * Main function to scrape weekend events
 */
async function scrapeWeekendEvents(location = 'us/california') {
  const { start, end } = getWeekendDates();
  
  console.log(`Scraping events for location: ${location}`);
  console.log(`Date range: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);
  
  const events = await scrapeRAEvents(location, start, end);
  
  // Filter events that fall on weekend (Fri, Sat, Sun)
  const weekendEvents = events.filter(event => {
    if (!event.dateParsed) return true; // Include if date couldn't be parsed
    
    const eventDate = new Date(event.dateParsed);
    const dayOfWeek = eventDate.getDay();
    
    // Friday = 5, Saturday = 6, Sunday = 0
    return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0;
  });

  return weekendEvents;
}

// CLI execution
if (require.main === module) {
  const location = process.argv[2] || 'us/california';
  
  scrapeWeekendEvents(location)
    .then(async (events) => {
      console.log(`\nFound ${events.length} weekend events:`);
      events.forEach((event, idx) => {
        console.log(`\n${idx + 1}. ${event.cleanTitle || event.title}`);
        if (event.status) console.log(`   Status: ${event.status}`);
        if (event.artists && event.artists.length > 0) {
          console.log(`   Artists: ${event.artists.join(', ')}`);
        }
        console.log(`   Date: ${event.date}`);
        console.log(`   Venue: ${event.venue}`);
        if (event.price) console.log(`   Price: ${event.price}`);
        if (event.attendance) console.log(`   Interest: ${event.attendance}`);
        console.log(`   URL: ${event.url}`);
      });

      // Save to JSON file
      const outputDir = path.dirname(__filename);
      const outputFile = path.join(outputDir, `ra-events-${location.replace(/\//g, '-')}-${Date.now()}.json`);
      await fs.writeFile(outputFile, JSON.stringify(events, null, 2));
      console.log(`\nEvents saved to: ${outputFile}`);
    })
    .catch(error => {
      console.error('Failed to scrape events:', error);
      process.exit(1);
    });
}

module.exports = { scrapeRAEvents, scrapeWeekendEvents, getWeekendDates };
