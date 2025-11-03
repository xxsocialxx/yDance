/**
 * Create sample reviews for DJs
 * Generates 50 sample users and reviews for existing DJs
 * Note: This is for testing until real user authentication is implemented
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// DJs we have data for
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

// Sample usernames (varied styles)
const usernameTemplates = [
    'raver', 'technohead', 'basslover', 'housefan', 'djcollector',
    'nightowl', 'partyanimal', 'musichead', 'vinylhead', 'beatjunkie',
    'soundlover', 'dancelover', 'mixmaster', 'groovefinder', 'rhythmseeker',
    'beatkeeper', 'soundwave', 'frequency', 'amplify', 'resonate',
    'pulse', 'beat', 'groove', 'vibe', 'energy',
    'wave', 'flow', 'drive', 'thrust', 'momentum'
];

// Review comments (varied)
const reviewComments = [
    'Incredible set, energy was off the charts!',
    'Solid performance, great track selection.',
    'Amazing mixing skills, highly recommend.',
    'Was okay, expected more from the hype.',
    'Perfect vibe, exactly what I needed.',
    'Great technical skills but could connect more with crowd.',
    'One of the best sets I\'ve seen!',
    'Good but felt rushed at times.',
    'Masterful control of the room.',
    'Love the energy, wish it lasted longer.',
    'Solid DJ, knows how to work a crowd.',
    'Technical perfection but lacked soul.',
    'Amazing night, will definitely catch again!',
    'Good set but not my style.',
    'Incredible journey through sounds.',
    null, null, null, null // Some reviews without comments (ratings only)
];

function generateSampleUsers(count = 50) {
    const users = [];
    const usedUsernames = new Set();
    
    for (let i = 0; i < count; i++) {
        let username;
        let attempts = 0;
        do {
            const template = usernameTemplates[Math.floor(Math.random() * usernameTemplates.length)];
            const number = Math.floor(Math.random() * 9999) + 1;
            username = `${template}${number}`;
            attempts++;
        } while (usedUsernames.has(username) && attempts < 100);
        
        usedUsernames.add(username);
        
        users.push({
            username: username,
            display_name: username.charAt(0).toUpperCase() + username.slice(1)
        });
    }
    
    return users;
}

function generateRating() {
    // Weighted distribution: more 4s and 5s, fewer 1s and 2s
    const rand = Math.random();
    if (rand < 0.05) return 1; // 5% - 1 star
    if (rand < 0.10) return 2; // 5% - 2 stars
    if (rand < 0.25) return 3; // 15% - 3 stars
    if (rand < 0.60) return 4; // 35% - 4 stars
    if (rand < 0.85) return 5; // 25% - 5 stars
    // 15% chance of decimal ratings
    return Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0-5.0
}

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

async function createSampleUsers(users) {
    console.log('📝 Creating sample users...\n');
    
    const batchSize = 20;
    let inserted = 0;
    
    for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        
        const values = batch.map(u => {
            const username = u.username.replace(/'/g, "''");
            const displayName = (u.display_name || u.username).replace(/'/g, "''");
            return `('${username}', '${displayName}')`;
        }).join(',\n    ');
        
        const sql = `
INSERT INTO sample_users (username, display_name)
VALUES
    ${values}
ON CONFLICT (username) DO NOTHING;
        `.trim();
        
        const result = await executeSQL(sql);
        
        if (result.status === 200 || result.status === 201 || result.status === 204) {
            inserted += batch.length;
            process.stdout.write(`  ✓ Inserted ${inserted}/${users.length} users...\r`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Created ${inserted} sample users\n`);
    return users;
}

async function createReviews(users) {
    console.log('📝 Creating sample reviews...\n');
    
    // Get user IDs from database
    const { data: dbUsers, error } = await supabase
        .from('sample_users')
        .select('id, username');
    
    if (error || !dbUsers || dbUsers.length === 0) {
        console.error('❌ Could not fetch users from database');
        return;
    }
    
    // Create reviews: 3-10 reviews per DJ
    const reviews = [];
    
    djs.forEach(dj => {
        const reviewCount = Math.floor(Math.random() * 8) + 3; // 3-10 reviews
        
        for (let i = 0; i < reviewCount; i++) {
            const user = dbUsers[Math.floor(Math.random() * dbUsers.length)];
            const rating = generateRating();
            const comment = reviewComments[Math.floor(Math.random() * reviewComments.length)];
            
            reviews.push({
                dj_name: dj,
                user_id: user.id,
                user_name: user.username,
                rating: rating,
                comment: comment,
                created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString() // Random date in last 90 days
            });
        }
    });
    
    console.log(`📝 Generated ${reviews.length} reviews\n`);
    
    // Insert reviews
    const batchSize = 20;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < reviews.length; i += batchSize) {
        const batch = reviews.slice(i, i + batchSize);
        
        const values = batch.map(r => {
            const djName = r.dj_name.replace(/'/g, "''");
            const userId = r.user_id;
            const userName = (r.user_name || '').replace(/'/g, "''");
            const comment = r.comment ? r.comment.replace(/'/g, "''") : null;
            const createdAt = r.created_at;
            
            return `('${djName}', '${userId}', '${userName}', ${r.rating}, ${comment ? `'${comment}'` : 'NULL'}, '${createdAt}'::timestamptz)`;
        }).join(',\n    ');
        
        const sql = `
INSERT INTO reviews (dj_name, user_id, user_name, rating, comment, created_at)
VALUES
    ${values};
        `.trim();
        
        const result = await executeSQL(sql);
        
        if (result.status === 200 || result.status === 201 || result.status === 204) {
            inserted += batch.length;
            process.stdout.write(`  ✓ Inserted ${inserted}/${reviews.length} reviews...\r`);
        } else {
            errors += batch.length;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Created ${inserted} reviews\n`);
    
    // Update aggregate table
    console.log('📝 Updating reviews aggregate table...\n');
    await updateReviewsAggregate();
    
    console.log('🎉 Sample reviews created!\n');
}

async function updateReviewsAggregate() {
    // Update dj_reviews_aggregate table with new review counts and averages
    for (const dj of djs) {
        const { data: djReviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('dj_name', dj);
        
        if (djReviews && djReviews.length > 0) {
            const reviewCount = djReviews.length;
            const avgRating = djReviews.reduce((sum, r) => sum + parseFloat(r.rating), 0) / reviewCount;
            const lastReview = djReviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            
            const { error } = await supabase
                .from('dj_reviews_aggregate')
                .upsert({
                    dj_name: dj,
                    review_count: reviewCount,
                    average_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
                    last_review_date: lastReview.created_at,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'dj_name'
                });
            
            if (!error) {
                process.stdout.write(`  ✓ Updated aggregate for ${dj}...\r`);
            }
        }
    }
    console.log('\n');
}

async function main() {
    console.log('🎵 Creating Sample Reviews System\n');
    console.log('='.repeat(70) + '\n');
    
    try {
        // First create sample users
        const users = generateSampleUsers(50);
        await createSampleUsers(users);
        
        // Then create reviews
        await createReviews(users);
        
        console.log('='.repeat(70));
        console.log('✅ Complete! Reviews system ready.\n');
        console.log('💡 Note: Real user authentication integration pending\n');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

main();

