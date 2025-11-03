/**
 * Create sample past events for DJs to test past events functionality
 * Adds events to Supabase events table with dates in the past
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// DJs we have data for (from verify_dj_data.js)
const djs = [
    'BLASSAM',
    'BlipBloop',
    'DJ Luna',
    'DJ Nova',
    'DJ Shadow',
    'Full Decks',
    'Mr. Cutei',
    'Tekimon',
    'UFO',
    'Wrench Man'
];

// Venues (varied)
const venues = [
    { name: 'Club Techno', city: 'Montreal' },
    { name: 'Bass Den', city: 'Montreal' },
    { name: 'House Vibes', city: 'Toronto' },
    { name: 'Underground', city: 'Montreal' },
    { name: 'Warehouse', city: 'Toronto' },
    { name: 'The Loft', city: 'Montreal' },
    { name: 'Industrial', city: 'Toronto' },
    { name: 'Minimal Space', city: 'Montreal' },
    { name: 'Deep House', city: 'Vancouver' },
    { name: 'The Basement', city: 'Montreal' }
];

// Event types
const eventTypes = ['EVENT', 'SHOW', 'FESTIVAL', 'SET'];

function getRandomPastDate(daysAgoMin = 1, daysAgoMax = 180) {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * (daysAgoMax - daysAgoMin + 1)) + daysAgoMin;
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    
    // Add random time (evening hours typically)
    const hour = Math.floor(Math.random() * 6) + 20; // 8 PM - 2 AM
    const minute = Math.floor(Math.random() * 4) * 15; // :00, :15, :30, :45
    date.setHours(hour % 24, minute, 0, 0);
    
    return date;
}

function generateEventTitle(djName, eventType) {
    const prefixes = ['Night', 'Session', 'Rave', 'Party', 'Set', 'Night', 'Event'];
    const suffix = Math.random() > 0.7 ? ` #${Math.floor(Math.random() * 5) + 1}` : '';
    return `${djName} ${prefixes[Math.floor(Math.random() * prefixes.length)]}${suffix}`;
}

async function createPastEvents() {
    console.log('🎵 Creating sample past events for DJs...\n');
    
    // Create 3-8 past events per DJ (random)
    const events = [];
    
    djs.forEach(dj => {
        const eventCount = Math.floor(Math.random() * 6) + 3; // 3-8 events
        
        for (let i = 0; i < eventCount; i++) {
            const venue = venues[Math.floor(Math.random() * venues.length)];
            const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
            const date = getRandomPastDate(1, 180); // Past 1-180 days
            const title = generateEventTitle(dj, eventType);
            
            events.push({
                title: title,
                dj: dj,
                date: date.toISOString(),
                type: eventType.toLowerCase(),
                venue: {
                    name: venue.name,
                    city: venue.city
                },
                city: venue.city,
                location: venue.name,
                description: `Past event by ${dj} at ${venue.name}`,
                created_at: new Date().toISOString()
            });
        }
    });
    
    console.log(`📝 Generated ${events.length} past events\n`);
    console.log('Sample events:');
    events.slice(0, 5).forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.title}`);
        console.log(`     ${e.dj} @ ${e.venue.name}, ${e.city}`);
        console.log(`     ${new Date(e.date).toLocaleDateString()}`);
        console.log('');
    });
    
    // Insert into Supabase using execute_sql to bypass RLS
    console.log('📤 Inserting events into Supabase...\n');
    
    // Use execute_sql RPC function to insert events (bypasses RLS)
    const https = require('https');
    
    async function executeSQL(sql) {
        return new Promise((resolve, reject) => {
            const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`);
            
            const req = https.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Prefer': 'return=representation'
                }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, json, data });
                    } catch {
                        resolve({ status: res.statusCode, data });
                    }
                });
            });
            
            req.on('error', reject);
            req.write(JSON.stringify({ sql: sql }));
            req.end();
        });
    }
    
    // Build SQL INSERT statements
    let inserted = 0;
    let errors = 0;
    
    // Insert in batches of 10 using SQL
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        
        // Build INSERT statement for batch
        const values = batch.map(event => {
            const normalizedJson = {
                title: event.title,
                name: event.title,
                dj: event.dj,
                date: event.date,
                start: event.date,
                type: event.type,
                city: event.city,
                location: event.location,
                venue: {
                    name: event.venue.name,
                    city: event.venue.city
                },
                description: event.description || null
            };
            
            // Generate event_uid and dedupe_key
            const { randomUUID, createHash } = require('crypto');
            const eventUid = randomUUID();
            // Create dedupe_key from title + date for uniqueness
            const dedupeKey = createHash('sha256')
                .update(`${event.title}${event.date}`)
                .digest('hex').substring(0, 32);
            
            // Escape JSON for SQL
            const jsonStr = JSON.stringify(normalizedJson).replace(/'/g, "''");
            const createdAt = event.created_at;
            const version = 1; // Default version for new events
            
            return `('${eventUid}', ${version}, '${jsonStr}'::jsonb, '${dedupeKey}', '${createdAt}'::timestamptz)`;
        }).join(',\n    ');
        
        const sql = `
INSERT INTO normalized_events (event_uid, version, normalized_json, dedupe_key, created_at)
VALUES
    ${values};
        `.trim();
        
        try {
            const result = await executeSQL(sql);
            
            if (result.status === 200 || result.status === 201 || result.status === 204) {
                inserted += batch.length;
                process.stdout.write(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted} total)...\r`);
            } else {
                console.error(`  ❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, result.status);
                if (result.json) console.error(JSON.stringify(result.json, null, 2));
                errors += batch.length;
            }
        } catch (err) {
            console.error(`  ❌ Error:`, err.message);
            errors += batch.length;
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`\n\n✅ Complete!`);
    console.log(`   Inserted: ${inserted} events`);
    console.log(`   Errors: ${errors} events\n`);
    
    if (errors > 0) {
        console.log('⚠️  Some events failed to insert. Check your table structure.\n');
        console.log('💡 Make sure your events table has columns:');
        console.log('   - title, dj, date, type, city, location');
        console.log('   - venue_name, venue_city (or venue JSON)\n');
    }
}

async function main() {
    try {
        await createPastEvents();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();

