/**
 * Test script to verify events are being loaded and can be displayed
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testEvents() {
    console.log('🔍 Testing Events Loading\n');
    console.log('='.repeat(70) + '\n');
    
    // Fetch from normalized_events_latest view (same as app)
    const { data, error } = await supabase
        .from('normalized_events_latest')
        .select('normalized_json, created_at')
        .order('created_at', { ascending: true });
    
    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }
    
    if (!data || data.length === 0) {
        console.log('⚠️  No events found in normalized_events_latest view\n');
        return;
    }
    
    console.log(`✅ Found ${data.length} events in database\n`);
    
    // Extract normalized_json
    const events = data.map(row => row.normalized_json).filter(Boolean);
    console.log(`✅ Extracted ${events.length} valid event objects\n`);
    
    // Check date distribution
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    const upcoming7Days = [];
    const upcoming14Days = [];
    const past = [];
    const noDate = [];
    
    events.forEach(event => {
        const date = event.date || event.start;
        if (!date) {
            noDate.push(event);
            return;
        }
        
        const eventDate = new Date(date);
        if (isNaN(eventDate.getTime())) {
            noDate.push(event);
            return;
        }
        
        if (eventDate < now) {
            past.push(event);
        } else if (eventDate <= sevenDaysLater) {
            upcoming7Days.push(event);
        } else if (eventDate <= fourteenDaysLater) {
            upcoming14Days.push(event);
        }
    });
    
    console.log('📊 Date Distribution:');
    console.log(`   Past events: ${past.length}`);
    console.log(`   Next 7 days: ${upcoming7Days.length}`);
    console.log(`   8-14 days: ${upcoming14Days.length}`);
    console.log(`   No valid date: ${noDate.length}\n`);
    
    // Show sample events
    console.log('📅 Sample Events (Next 7 Days):');
    upcoming7Days.slice(0, 5).forEach((e, i) => {
        const date = new Date(e.date || e.start);
        console.log(`   ${i + 1}. ${e.title || e.name}`);
        console.log(`      ${e.dj || 'No DJ'} @ ${e.venue?.name || e.location || 'TBD'}`);
        console.log(`      ${date.toLocaleString()}`);
        console.log('');
    });
    
    if (upcoming14Days.length > 0) {
        console.log('📅 Sample Events (8-14 Days):');
        upcoming14Days.slice(0, 3).forEach((e, i) => {
            const date = new Date(e.date || e.start);
            console.log(`   ${i + 1}. ${e.title || e.name}`);
            console.log(`      ${date.toLocaleString()}`);
            console.log('');
        });
    }
    
    console.log('='.repeat(70));
    console.log('\n💡 Main Events tab should show ALL events (past + future)');
    console.log('   DJ tab only shows DJs with events in next 7 days\n');
}

testEvents().catch(console.error);

