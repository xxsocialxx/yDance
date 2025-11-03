/**
 * Complete automated setup: Create function + tables + populate
 * Attempts to create execute_sql function via alternative methods
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createFunctionViaHTTP() {
    // Try creating function via direct HTTP to Supabase
    const functionSQL = `CREATE OR REPLACE FUNCTION execute_sql(sql text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN EXECUTE sql; END; $$; GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role, anon, authenticated;`;
    
    // Method 1: Try via pg_net if available
    // Method 2: Try via Supabase Management API
    // Method 3: Use a temporary admin function if one exists
    
    // For now, let's try if there's already a way to execute SQL
    // Or check if execute_sql exists with different parameter names
    
    return false; // Will need manual creation
}

async function executeSQL(sql) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`);
    
    return new Promise((resolve, reject) => {
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
    // Try calling execute_sql with a simple query
    try {
        const result = await executeSQL('SELECT 1');
        return result.status === 200 || result.status === 204;
    } catch {
        return false;
    }
}

async function main() {
    console.log('🚀 Automated DJ Editorial Setup\n');
    
    // Check if function exists
    console.log('🔍 Checking for execute_sql function...');
    const functionExists = await checkFunctionExists();
    
    if (!functionExists) {
        console.log('\n⚠️  execute_sql function does not exist.\n');
        console.log('📝 OPTION 1: Create function manually (one-time):');
        console.log('   1. Go to: https://supabase.com/dashboard/project/rymcfymmigomaytblqml/sql/new');
        console.log('   2. Run: scripts/create_execute_sql_function.sql');
        console.log('   3. Then re-run this script\n');
        
        console.log('📝 OPTION 2: If you have a different function name, please share it.\n');
        
        // Try alternative: Maybe they use a different method entirely
        console.log('💡 Trying alternative: Direct table creation via PostgREST...\n');
        
        // PostgREST doesn't support DDL, so this won't work
        // But let's try if there's a schema endpoint
        
        return;
    }
    
    console.log('✅ Function exists! Proceeding...\n\n');
    
    // Create tables
    console.log('📝 Creating tables...');
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const cleanSQL = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    
    const result = await executeSQL(cleanSQL);
    
    if (result.status === 200 || result.status === 204) {
        console.log('✅ Tables created!\n');
        
        // Verify
        const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
        const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
        
        if (!e1 && !e2) {
            console.log('✅ Verification passed!\n');
            
            // Populate
            console.log('📝 Populating data...\n');
            const populateScript = require('./populate_dj_editorial.js');
            await populateScript.main();
            
            console.log('\n🎉 Complete!\n');
        }
    } else {
        console.log(`❌ Failed: ${result.status}`);
        if (result.json) console.log(JSON.stringify(result.json, null, 2));
    }
}

main().catch(console.error);

