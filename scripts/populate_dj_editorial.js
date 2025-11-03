/**
 * Script to populate DJ editorial attributes from existing DJs
 * Run with: node scripts/populate_dj_editorial.js
 * 
 * This script:
 * 1. Fetches all existing DJs from dj_profiles
 * 2. Generates sample editorial data for each
 * 3. Populates dj_editorial_attributes and dj_reviews_aggregate tables
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

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

async function fetchExistingDJs() {
    console.log('Fetching existing DJs from database...');
    const { data, error } = await supabase
        .from('dj_profiles')
        .select('name')
        .order('name', { ascending: true });
    
    if (error) {
        console.error('Error fetching DJs:', error);
        throw error;
    }
    
    console.log(`Found ${data.length} DJs`);
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
        console.error(`Error upserting editorial for ${djName}:`, error);
        return false;
    }
    
    console.log(`✓ Populated editorial attributes for: ${djName}`);
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
        console.error(`Error upserting reviews for ${djName}:`, error);
        return false;
    }
    
    console.log(`✓ Populated review aggregate for: ${djName}`);
    return true;
}

async function main() {
    try {
        // Fetch existing DJs
        const djs = await fetchExistingDJs();
        
        if (djs.length === 0) {
            console.log('No DJs found in database. Please add DJs first.');
            return;
        }
        
        console.log('\nPopulating editorial attributes and reviews...\n');
        
        // Populate data for each DJ, cycling through patterns
        for (let i = 0; i < djs.length; i++) {
            const dj = djs[i];
            const pattern = sampleDataPatterns[i % sampleDataPatterns.length];
            
            await populateEditorialAttributes(dj.name, pattern);
            await populateReviewAggregate(dj.name, pattern);
        }
        
        console.log(`\n✓ Successfully populated data for ${djs.length} DJs`);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { main, fetchExistingDJs };

