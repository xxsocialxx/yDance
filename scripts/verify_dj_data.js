/**
 * Verify DJ editorial data has been populated
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyData() {
    console.log('🔍 Verifying DJ Editorial Data\n');
    console.log('='.repeat(70) + '\n');
    
    // Fetch editorial attributes
    console.log('📊 Editorial Attributes:');
    const { data: editorial, error: e1 } = await supabase
        .from('dj_editorial_attributes')
        .select('*')
        .limit(5);
    
    if (e1) {
        console.log(`❌ Error: ${e1.message}\n`);
    } else if (!editorial || editorial.length === 0) {
        console.log('⚠️  No editorial attributes found!\n');
    } else {
        console.log(`✅ Found ${editorial.length} DJs with editorial attributes:\n`);
        editorial.forEach((attr, i) => {
            console.log(`${i + 1}. ${attr.dj_name}`);
            console.log(`   Tribe: ${attr.tribe || 'N/A'}`);
            console.log(`   Genres: ${attr.genres?.join(', ') || 'N/A'}`);
            console.log(`   Style: ${attr.style_tags?.join(', ') || 'N/A'}`);
            console.log(`   Rating: ${attr.editorial_rating || 'N/A'}`);
            console.log(`   Price: $${attr.price_range_min || '?'}-$${attr.price_range_max || '?'}`);
            console.log('');
        });
    }
    
    // Fetch reviews aggregate
    console.log('\n📊 Reviews Aggregate:');
    const { data: reviews, error: e2 } = await supabase
        .from('dj_reviews_aggregate')
        .select('*')
        .limit(5);
    
    if (e2) {
        console.log(`❌ Error: ${e2.message}\n`);
    } else if (!reviews || reviews.length === 0) {
        console.log('⚠️  No review aggregates found!\n');
    } else {
        console.log(`✅ Found ${reviews.length} DJs with review data:\n`);
        reviews.forEach((rev, i) => {
            console.log(`${i + 1}. ${rev.dj_name}`);
            console.log(`   Reviews: ${rev.review_count || 0}`);
            console.log(`   Avg Rating: ${rev.average_rating || 'N/A'}`);
            console.log('');
        });
    }
    
    // Get total counts
    const { count: totalEditorial } = await supabase
        .from('dj_editorial_attributes')
        .select('*', { count: 'exact', head: true });
    
    const { count: totalReviews } = await supabase
        .from('dj_reviews_aggregate')
        .select('*', { count: 'exact', head: true });
    
    console.log('\n' + '='.repeat(70));
    console.log(`\n📈 Summary:`);
    console.log(`   Editorial Attributes: ${totalEditorial || 0} DJs`);
    console.log(`   Reviews Aggregate: ${totalReviews || 0} DJs\n`);
    
    if (totalEditorial > 0 && totalReviews > 0) {
        console.log('✅ Data is populated and ready to display!\n');
    } else {
        console.log('⚠️  Need to populate data. Run: node scripts/full_automated_setup.js\n');
    }
}

verifyData().catch(console.error);

