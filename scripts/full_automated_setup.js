/**
 * Complete automated setup - works once execute_sql function exists
 * 
 * PROCESS:
 * 1. Create execute_sql function (ONE-TIME, manual): Run scripts/create_execute_sql_function.sql in Supabase
 * 2. Run this script: node scripts/full_automated_setup.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

async function checkFunctionExists() {
    try {
        const result = await executeSQL('SELECT 1');
        return result.status === 200 || result.status === 204;
    } catch {
        return false;
    }
}

async function main() {
    console.log('🚀 DJ Editorial Complete Setup\n');
    console.log('='.repeat(70) + '\n');
    
    // Check function
    console.log('🔍 Checking execute_sql function...');
    const hasFunction = await checkFunctionExists();
    
    if (!hasFunction) {
        console.log('\n❌ execute_sql function not found!\n');
        console.log('📝 REQUIRED: Create function first (one-time setup):\n');
        console.log('   1. Go to: https://supabase.com/dashboard/project/rymcfymmigomaytblqml/sql/new');
        console.log('   2. Open: scripts/create_execute_sql_function.sql');
        console.log('   3. Copy/paste SQL and click "Run"');
        console.log('   4. Then re-run this script\n');
        process.exit(1);
    }
    
    console.log('✅ Function exists!\n\n');
    
    // Create tables
    console.log('📝 Step 1: Creating tables...');
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const cleanSQL = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    
    const result = await executeSQL(cleanSQL);
    
    if (result.status !== 200 && result.status !== 201 && result.status !== 204) {
        console.log(`❌ Failed: ${result.status}`);
        if (result.json) console.log(JSON.stringify(result.json, null, 2));
        process.exit(1);
    }
    
    console.log('✅ Tables created!\n');
    
    // Verify
    console.log('🔍 Step 2: Verifying tables...');
    const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
    const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
    
    if (e1 || e2) {
        console.log('⚠️  Verification issues:');
        if (e1) console.log(`   dj_editorial_attributes: ${e1.message}`);
        if (e2) console.log(`   dj_reviews_aggregate: ${e2.message}`);
        console.log('');
        process.exit(1);
    }
    
    console.log('✅ Tables verified!\n');
    
    // Populate
    console.log('📝 Step 3: Populating sample data...\n');
    const populateScript = require('./populate_dj_editorial.js');
    await populateScript.main();
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 Setup Complete!\n');
    console.log('✅ Tables created');
    console.log('✅ Sample data populated');
    console.log('✅ Ready to use in app\n');
}

main().catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});

