const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

/**
 * RA.co Event Scraper using Select-All + Copy-Paste method
 * Based on actual markdown structure from select-all operation
 * 
 * Structure observed:
 * 1. Title (first line)
 * 2. "Venue" label
 * 3. Venue name
 * 4. Address
 * 5. "Date" label
 * 6. Date
 * 7. Time range
 * 8. "Promoter" label
 * 9. Promoter name
 * 10. "Interested" label
 * 11. Interest count
 * ...separators...
 * "LINEUP" label
 * Artists (one per line)
 * ...separators...
 * "Genres" label
 * Genres (one per line)
 * Long description text...
 */

class RAEventParser {
  constructor(text) {
    // Split into lines and clean
    this.lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.match(/^[\s\u00A0]*$/));
    this.data = {};
  }

  parse() {
    this.data.title = this.extractTitle();
    this.data.venue = this.extractVenue();
    this.data.address = this.extractAddress();
    this.data.date = this.extractDate();
    this.data.time = this.extractTime();
    this.data.promoter = this.extractPromoter();
    this.data.interested = this.extractInterested();
    this.data.artists = this.extractArtists();
    this.data.genres = this.extractGenres();
    this.data.description = this.extractDescription();
    this.data.cost = this.extractCost();
    this.data.minAge = this.extractMinAge();
    this.data.admin = this.extractAdmin();
    
    return this.data;
  }

  extractTitle() {
    // Title comes after navigation menu
    // Skip common nav items: "Events", "Music", "Magazine", "Store", "My account"
    const navItems = /^(Events|Music|Magazine|Store|My account|Search|Menu)$/i;
    
    // Find first substantial line that's not a nav item and comes before "Venue"
    const venueIndex = this.lines.findIndex(line => line.match(/^Venue$/i));
    const searchEnd = venueIndex > 0 ? venueIndex : this.lines.length;
    
    for (let i = 0; i < searchEnd; i++) {
      const line = this.lines[i];
      // Title is substantial (> 5 chars), not a nav item, not too long
      if (line.length > 5 && line.length < 200 && !navItems.test(line)) {
        return line;
      }
    }
    
    return null;
  }

  extractVenue() {
    // After "Venue" label, the next line is venue name
    const venueIndex = this.lines.findIndex(line => 
      line.match(/^Venue$/i)
    );
    
    if (venueIndex >= 0 && venueIndex < this.lines.length - 1) {
      return this.lines[venueIndex + 1];
    }
    return null;
  }

  extractAddress() {
    // Address comes after venue name
    const venueIndex = this.lines.findIndex(line => 
      line.match(/^Venue$/i)
    );
    
    if (venueIndex >= 0 && venueIndex + 2 < this.lines.length) {
      const addressLine = this.lines[venueIndex + 2];
      // Address typically contains street number and city
      if (addressLine.match(/\d+.*(Ave|St|Street|Road|Blvd|Boulevard|Washington|Los Angeles|New York|San Francisco|London|Berlin)/i)) {
        return addressLine;
      }
    }
    return null;
  }

  extractDate() {
    // After "Date" label
    const dateIndex = this.lines.findIndex(line => 
      line.match(/^Date$/i)
    );
    
    if (dateIndex >= 0 && dateIndex < this.lines.length - 1) {
      const dateLine = this.lines[dateIndex + 1];
      // Date format: "31 Oct 2025"
      if (dateLine.match(/\d+\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i)) {
        return dateLine;
      }
    }
    return null;
  }

  extractTime() {
    // Time comes right after date
    const dateIndex = this.lines.findIndex(line => 
      line.match(/^Date$/i)
    );
    
    if (dateIndex >= 0 && dateIndex + 2 < this.lines.length) {
      const timeLine = this.lines[dateIndex + 2];
      // Time format: "Fri 17:00 - Sun 22:00" or "22:00 - 02:00"
      if (timeLine.match(/\d{1,2}:\d{2}.*-.*\d{1,2}:\d{2}/)) {
        return timeLine;
      }
      // Also check for day name patterns
      if (timeLine.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun).*\d{1,2}:\d{2}.*-.*(Mon|Tue|Wed|Thu|Fri|Sat|Sun).*\d{1,2}:\d{2}/i)) {
        return timeLine;
      }
    }
    return null;
  }

  extractPromoter() {
    // After "Promoter" label
    const promoterIndex = this.lines.findIndex(line => 
      line.match(/^Promoter$/i)
    );
    
    if (promoterIndex >= 0 && promoterIndex < this.lines.length - 1) {
      return this.lines[promoterIndex + 1];
    }
    return null;
  }

  extractInterested() {
    // After "Interested" label
    const interestedIndex = this.lines.findIndex(line => 
      line.match(/^Interested$/i)
    );
    
    if (interestedIndex >= 0 && interestedIndex < this.lines.length - 1) {
      const count = parseInt(this.lines[interestedIndex + 1]);
      return isNaN(count) ? null : count;
    }
    return null;
  }

  extractArtists() {
    const artists = [];
    const lineupIndex = this.lines.findIndex(line => 
      line.match(/^Lineup$/i) || line.match(/^LINEUP$/i)
    );
    
    if (lineupIndex >= 0) {
      // Collect artists until we hit next section
      for (let i = lineupIndex + 1; i < this.lines.length; i++) {
        const line = this.lines[i];
        
        // Stop at next major section
        if (line.match(/^(Share|Genres|Event admin|Description|Price|Tickets?)/i)) {
          break;
        }
        
        // Skip separator characters
        if (line.match(/^[^\w]/)) {
          continue;
        }
        
        // Artist names are typically 2-50 characters
        if (line.length >= 2 && line.length <= 50 && !line.match(/^\d+$/)) {
          artists.push(line);
        }
      }
    }
    
    return artists.length > 0 ? artists : null;
  }

  extractGenres() {
    const genres = [];
    const genresIndex = this.lines.findIndex(line => 
      line.match(/^Genres?$/i)
    );
    
    if (genresIndex >= 0) {
      // Collect genres until we hit description
      for (let i = genresIndex + 1; i < this.lines.length; i++) {
        const line = this.lines[i];
        
        // Stop when we hit description (long text) or other sections
        if (line.length > 200 || line.match(/^(Event admin|Last updated|Promotional|Update)/i)) {
          break;
        }
        
        // Genre names are typically 5-30 characters
        if (line.length >= 5 && line.length <= 30 && !line.match(/^\d/)) {
          genres.push(line);
        }
      }
    }
    
    return genres.length > 0 ? genres : null;
  }

  extractDescription() {
    // Description is between Genres and "Event admin" section
    const genresIndex = this.lines.findIndex(line => 
      line.match(/^Genres?$/i)
    );
    
    const adminIndex = this.lines.findIndex(line => 
      line.match(/^(Event admin|Last updated|Promotional|Update|Producer|Cost|Min age|Do you have)/i)
    );
    
    let descriptionStart = -1;
    let descriptionEnd = adminIndex > 0 ? adminIndex : this.lines.length;
    
    // Find where description starts (after genres section)
    if (genresIndex >= 0) {
      // Skip genre lines (usually 1-5 lines after "Genres")
      for (let i = genresIndex + 1; i < Math.min(genresIndex + 10, this.lines.length); i++) {
        const line = this.lines[i];
        // Description starts with a substantial line (>50 chars)
        // or a line that looks like description text (not a label)
        if (line.length > 50 || (!line.match(/^(Cost|Min age|Event admin|Last updated|Promotional)/i) && line.length > 20)) {
          descriptionStart = i;
          break;
        }
      }
    }
    
    if (descriptionStart >= 0 && descriptionStart < descriptionEnd) {
      const description = [];
      for (let i = descriptionStart; i < descriptionEnd; i++) {
        const line = this.lines[i];
        
        // Stop at metadata sections (double-check)
        if (line.match(/^(Event admin|Last updated|Promotional|Update|Producer|Cost|Min age|Do you have|Share|Save)/i)) {
          break;
        }
        
        // Collect description text (skip very short lines that are likely separators)
        if (line.length > 10) {
          description.push(line);
        }
      }
      
      if (description.length > 0) {
        return description.join(' ').trim();
      }
    }
    
    return null;
  }
  
  extractCost() {
    const costIndex = this.lines.findIndex(line => 
      line.match(/^Cost$/i)
    );
    
    if (costIndex >= 0 && costIndex < this.lines.length - 1) {
      return this.lines[costIndex + 1];
    }
    return null;
  }
  
  extractMinAge() {
    const ageIndex = this.lines.findIndex(line => 
      line.match(/^Min\.?\s*age$/i) || line.match(/^Minimum age$/i)
    );
    
    if (ageIndex >= 0 && ageIndex < this.lines.length - 1) {
      return this.lines[ageIndex + 1];
    }
    return null;
  }

  extractAdmin() {
    // After "Event admin" label
    const adminIndex = this.lines.findIndex(line => 
      line.match(/^Event admin$/i)
    );
    
    if (adminIndex >= 0 && adminIndex < this.lines.length - 1) {
      return this.lines[adminIndex + 1];
    }
    return null;
  }
}

/**
 * Scrape event using select-all + copy method
 */
async function scrapeEventViaSelectAll(eventUrl) {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  try {
    console.log(`\n🔍 Scraping: ${eventUrl}\n`);
    
    // Navigate to event page
    await page.goto(eventUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(5000); // Wait for dynamic content
    
    // Scroll to top to ensure we're at the beginning
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    
    console.log('📋 Selecting all text on page...');
    
    // Method: Use Selection API directly (NO permissions needed, NO popup!)
    // This is better than clipboard because it doesn't require permissions
    const fullText = await page.evaluate(() => {
      // Select all content in the body
      const body = document.body;
      if (!body) return null;
      
      const range = document.createRange();
      range.selectNodeContents(body);
      
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Get the selected text directly
      const selectedText = selection.toString();
      
      // Clear selection (optional, but clean)
      selection.removeAllRanges();
      
      return selectedText;
    });
    
    if (!fullText || fullText.length < 100) {
      throw new Error(`Could not extract text - only got ${fullText?.length || 0} characters`);
    }
    
    console.log(`✅ Captured ${fullText.length} characters (using Selection API - no permissions needed!)\n`);
    
    // Parse the text
    console.log('🔍 Parsing event data...');
    const parser = new RAEventParser(fullText);
    const eventData = parser.parse();
    
    // Add metadata
    eventData.url = eventUrl;
    eventData.scrapedAt = new Date().toISOString();
    eventData.rawTextLength = fullText.length;
    
    // Optionally keep raw text (commented out to save space)
    // eventData.rawText = fullText;
    
    await browser.close();
    return { eventData, rawText: fullText };
    
  } catch (error) {
    console.error('❌ Error:', error);
    await browser.close();
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const eventUrl = process.argv[2] || 'https://ra.co/events/2292678';
  
  scrapeEventViaSelectAll(eventUrl)
    .then(async ({ eventData, rawText }) => {
      console.log('\n📊 EXTRACTED EVENT DATA:\n');
      console.log(JSON.stringify(eventData, null, 2));
      
      // Save structured data
      const outputDir = path.dirname(__filename);
      const timestamp = Date.now();
      const jsonFile = path.join(outputDir, `event-${timestamp}.json`);
      await fs.writeFile(jsonFile, JSON.stringify(eventData, null, 2));
      console.log(`\n💾 Saved structured data to: ${jsonFile}`);
      
      // Save raw text for debugging
      const rawFile = path.join(outputDir, `event-${timestamp}-raw.txt`);
      await fs.writeFile(rawFile, rawText);
      console.log(`💾 Saved raw text to: ${rawFile}`);
    })
    .catch(error => {
      console.error('Failed to scrape event:', error);
      process.exit(1);
    });
}

module.exports = { scrapeEventViaSelectAll, RAEventParser };
