/**
 * Create tables via Supabase execute_sql RPC endpoint
 * Based on Supabase API documentation
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

async function executeSQLViaRPC(sql) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer': 'return=representation'
            }
        };
        
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const result = {
                    status: res.statusCode,
                    data: data
                };
                
                try {
                    result.json = JSON.parse(data);
                } catch (e) {
                    // Not JSON
                }
                
                resolve(result);
            });
        });
        
        req.on('error', reject);
        
        // Send SQL in request body
        req.write(JSON.stringify({ sql: sql }));
        req.end();
    });
}

async function createTables() {
    console.log('🚀 Creating DJ Editorial Tables via Supabase API\n');
    console.log('Using execute_sql RPC endpoint...\n');
    
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Clean SQL - remove comments
    let cleanSQL = sql
        .replace(/--.*$/gm, '') // Remove line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .trim();
    
    console.log('📝 Executing SQL migration...');
    const result = await executeSQLViaRPC(cleanSQL);
    
    console.log(`Response status: ${result.status}`);
    
    if (result.status === 200 || result.status === 201 || result.status === 204) {
        console.log('✅ SQL executed successfully!\n');
        
        // Verify tables were created
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        console.log('🔍 Verifying tables...');
        const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
        const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
        
        if (!e1 && !e2) {
            console.log('✅ Tables verified! Both tables exist.\n');
            
            // Populate sample data
            console.log('📝 Populating sample data...\n');
            const populateScript = require('./populate_dj_editorial.js');
            // Update the key in populate script first
            await populateScript.main();
            
            console.log('\n🎉 Setup complete!\n');
            return true;
        } else {
            console.log('⚠️  Could not verify tables.');
            console.log(`   dj_editorial_attributes: ${e1?.message || 'OK'}`);
            console.log(`   dj_reviews_aggregate: ${e2?.message || 'OK'}\n`);
            return false;
        }
    } else {
        console.log(`❌ Failed to execute SQL`);
        console.log(`   Status: ${result.status}`);
        if (result.json) {
            console.log(`   Error: ${JSON.stringify(result.json, null, 2)}`);
        } else {
            console.log(`   Response: ${result.data}`);
        }
        console.log('');
        return false;
    }
}

async function main() {
    try {
        await createTables();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();

