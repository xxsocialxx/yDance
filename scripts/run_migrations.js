/**
 * Script to run SQL migrations and populate DJ editorial data
 * Run with: node scripts/run_migrations.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_c43ecd84d59c3207d71e4c2eae601bded7e30331';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Sample data patterns - varied to test different scenarios
const sampleDataPatterns = [
    {
        tribe: 'Techno',
        genres: ['Techno', 'Minimal', 'Industrial'],
        styleTags: ['busy', 'energetic'],
        rating: 4.5,
        priceMin: 500,
        priceMax: 1500,
        reviewCount: 47,
        reviewRating: 4.3
    },
    {
        tribe: 'House',
        genres: ['Dubstep', 'House', 'Garage', 'Drum & Bass'],
        styleTags: ['show', 'energetic'],
        rating: 3.2,
        priceMin: 200,
        priceMax: 600,
        reviewCount: 23,
        reviewRating: 3.5
    },
    {
        tribe: 'Techno',
        genres: ['Minimal', 'Deep House'],
        styleTags: ['minimal', 'busy'],
        rating: 2.8,
        priceMin: 100,
        priceMax: 300,
        reviewCount: 12,
        reviewRating: 2.9
    },
    {
        tribe: 'Bass',
        genres: ['Dubstep', 'Bass', 'Trap', 'Future Bass'],
        styleTags: ['show', 'energetic', 'busy'],
        rating: 3.8,
        priceMin: 300,
        priceMax: 800,
        reviewCount: 31,
        reviewRating: 3.9
    },
    {
        tribe: 'Ambient',
        genres: ['Ambient', 'Downtempo', 'Chill'],
        styleTags: ['minimal'],
        rating: 4.2,
        priceMin: 150,
        priceMax: 400,
        reviewCount: 18,
        reviewRating: 4.1
    }
];

async function runSQLMigration(sqlFile) {
    console.log(`\n📝 Running SQL migration: ${sqlFile}`);
    const sqlPath = path.join(__dirname, '..', sqlFile);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    // Execute each statement using RPC or direct query
    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We'll need to use the REST API or execute statements individually
    // For now, we'll use the PostgREST approach via upsert operations
    
    console.log(`✓ SQL migration file read (${statements.length} statements)`);
    console.log('⚠️  Please run the SQL migration manually in Supabase SQL Editor');
    console.log(`   File: ${sqlPath}`);
    
    return true;
}

async function fetchExistingDJs() {
    console.log('\n🔍 Fetching existing DJs from database...');
    const { data, error } = await supabase
        .from('dj_profiles')
        .select('name')
        .order('name', { ascending: true });
    
    if (error) {
        console.error('❌ Error fetching DJs:', error);
        throw error;
    }
    
    console.log(`✓ Found ${data.length} DJs`);
    return data;
}

async function populateEditorialAttributes(djName, pattern) {
    const { data, error } = await supabase
        .from('dj_editorial_attributes')
        .upsert({
            dj_name: djName,
            tribe: pattern.tribe,
            genres: pattern.genres,
            style_tags: pattern.styleTags,
            editorial_rating: pattern.rating,
            price_range_min: pattern.priceMin,
            price_range_max: pattern.priceMax,
            currency: 'USD',
            notes: `Sample editorial data - ${pattern.tribe} focused artist`,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'dj_name'
        })
        .select();
    
    if (error) {
        console.error(`❌ Error upserting editorial for ${djName}:`, error);
        return false;
    }
    
    console.log(`  ✓ ${djName}: Tribe=${pattern.tribe}, Rating=${pattern.rating}, Price=$${pattern.priceMin}-$${pattern.priceMax}`);
    return true;
}

async function populateReviewAggregate(djName, pattern) {
    const { data, error } = await supabase
        .from('dj_reviews_aggregate')
        .upsert({
            dj_name: djName,
            review_count: pattern.reviewCount,
            average_rating: pattern.reviewRating,
            last_review_date: new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'dj_name'
        })
        .select();
    
    if (error) {
        console.error(`❌ Error upserting reviews for ${djName}:`, error);
        return false;
    }
    
    console.log(`  ✓ ${djName}: Reviews=${pattern.reviewCount}, Avg Rating=${pattern.reviewRating}`);
    return true;
}

async function main() {
    console.log('🚀 Starting DJ Editorial Data Migration\n');
    
    try {
        // Step 1: Check if tables exist by trying to query them
        console.log('📊 Checking if tables exist...');
        const { error: editorialError } = await supabase
            .from('dj_editorial_attributes')
            .select('id')
            .limit(1);
        
        const { error: reviewsError } = await supabase
            .from('dj_reviews_aggregate')
            .select('id')
            .limit(1);
        
        if (editorialError || reviewsError) {
            console.log('❌ Tables do not exist yet. Please run SQL migration first:');
            console.log('   1. Go to Supabase Dashboard > SQL Editor');
            console.log('   2. Copy contents of: supabase/migrations/create_dj_editorial_tables.sql');
            console.log('   3. Run the SQL migration');
            console.log('   4. Then re-run this script\n');
            process.exit(1);
        }
        
        console.log('✓ Tables exist, proceeding with data population...\n');
        
        // Step 2: Fetch existing DJs
        const djs = await fetchExistingDJs();
        
        if (djs.length === 0) {
            console.log('⚠️  No DJs found in database. Please add DJs first.');
            return;
        }
        
        // Step 3: Populate data for each DJ
        console.log('\n📝 Populating editorial attributes and reviews...\n');
        
        let successCount = 0;
        let failCount = 0;
        
        for (let i = 0; i < djs.length; i++) {
            const dj = djs[i];
            const pattern = sampleDataPatterns[i % sampleDataPatterns.length];
            
            console.log(`Processing ${i + 1}/${djs.length}: ${dj.name}`);
            
            const editorialSuccess = await populateEditorialAttributes(dj.name, pattern);
            const reviewSuccess = await populateReviewAggregate(dj.name, pattern);
            
            if (editorialSuccess && reviewSuccess) {
                successCount++;
            } else {
                failCount++;
            }
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`\n✅ Migration complete!`);
        console.log(`   Success: ${successCount} DJs`);
        console.log(`   Failed: ${failCount} DJs`);
        
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main, fetchExistingDJs };

