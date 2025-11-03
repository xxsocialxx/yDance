/**
 * Full setup script: Attempts to create tables and populate data
 * Falls back to manual instructions if direct DB access isn't available
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_c43ecd84d59c3207d71e4c2eae601bded7e30331';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Sample data patterns
const sampleDataPatterns = [
    { tribe: 'Techno', genres: ['Techno', 'Minimal', 'Industrial'], styleTags: ['busy', 'energetic'], rating: 4.5, priceMin: 500, priceMax: 1500, reviewCount: 47, reviewRating: 4.3 },
    { tribe: 'House', genres: ['Dubstep', 'House', 'Garage', 'Drum & Bass'], styleTags: ['show', 'energetic'], rating: 3.2, priceMin: 200, priceMax: 600, reviewCount: 23, reviewRating: 3.5 },
    { tribe: 'Techno', genres: ['Minimal', 'Deep House'], styleTags: ['minimal', 'busy'], rating: 2.8, priceMin: 100, priceMax: 300, reviewCount: 12, reviewRating: 2.9 },
    { tribe: 'Bass', genres: ['Dubstep', 'Bass', 'Trap', 'Future Bass'], styleTags: ['show', 'energetic', 'busy'], rating: 3.8, priceMin: 300, priceMax: 800, reviewCount: 31, reviewRating: 3.9 },
    { tribe: 'Ambient', genres: ['Ambient', 'Downtempo', 'Chill'], styleTags: ['minimal'], rating: 4.2, priceMin: 150, priceMax: 400, reviewCount: 18, reviewRating: 4.1 }
];

async function checkTablesExist() {
    try {
        const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
        const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
        return !e1 && !e2;
    } catch {
        return false;
    }
}

async function populateData() {
    console.log('\n📝 Populating sample data...\n');
    
    const { data: djs, error } = await supabase
        .from('dj_profiles')
        .select('name')
        .order('name');
    
    if (error || !djs || djs.length === 0) {
        console.log('⚠️  No DJs found or error fetching DJs');
        return;
    }
    
    console.log(`✓ Found ${djs.length} DJs to populate\n`);
    
    let success = 0;
    for (let i = 0; i < djs.length; i++) {
        const dj = djs[i];
        const pattern = sampleDataPatterns[i % sampleDataPatterns.length];
        
        // Populate editorial
        const { error: e1 } = await supabase
            .from('dj_editorial_attributes')
            .upsert({
                dj_name: dj.name,
                tribe: pattern.tribe,
                genres: pattern.genres,
                style_tags: pattern.styleTags,
                editorial_rating: pattern.rating,
                price_range_min: pattern.priceMin,
                price_range_max: pattern.priceMax,
                currency: 'USD',
                notes: `Sample editorial - ${pattern.tribe}`,
                updated_at: new Date().toISOString()
            }, { onConflict: 'dj_name' });
        
        // Populate reviews
        const { error: e2 } = await supabase
            .from('dj_reviews_aggregate')
            .upsert({
                dj_name: dj.name,
                review_count: pattern.reviewCount,
                average_rating: pattern.reviewRating,
                last_review_date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'dj_name' });
        
        if (!e1 && !e2) {
            success++;
            console.log(`  ✓ ${dj.name}: ${pattern.tribe}, ${pattern.rating}/5, $${pattern.priceMin}-$${pattern.priceMax}`);
        } else {
            console.log(`  ❌ ${dj.name}: ${e1?.message || e2?.message}`);
        }
        
        await new Promise(r => setTimeout(r, 50));
    }
    
    console.log(`\n✅ Populated ${success}/${djs.length} DJs successfully\n`);
}

async function main() {
    console.log('🚀 DJ Editorial Full Setup\n');
    
    const tablesExist = await checkTablesExist();
    
    if (!tablesExist) {
        console.log('❌ Tables do not exist yet.\n');
        console.log('📝 Please create tables first:\n');
        console.log('   METHOD 1: Supabase Dashboard (Easiest)');
        console.log('   1. Go to: https://supabase.com/dashboard/project/rymcfymmigomaytblqml/sql/new');
        console.log('   2. Open: supabase/migrations/create_dj_editorial_tables.sql');
        console.log('   3. Copy SQL and paste into editor');
        console.log('   4. Click "Run"\n');
        console.log('   METHOD 2: Supabase CLI');
        console.log('   supabase db push\n');
        console.log('   Then re-run this script: node scripts/full_setup.js\n');
        return;
    }
    
    console.log('✅ Tables exist! Proceeding with data population...\n');
    await populateData();
    console.log('🎉 Setup complete! Check your DJ profiles in the app.\n');
}

main().catch(console.error);

