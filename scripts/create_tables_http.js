/**
 * Create tables via Supabase REST API using HTTP requests
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

async function makeRequest(endpoint, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(endpoint, SUPABASE_URL);
        
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
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
}

async function tryRPCEndpoints(sql) {
    const endpoints = [
        '/rest/v1/rpc/execute_sql',
        '/rest/v1/rpc/exec_sql',
        '/rest/v1/rpc/pg_execute_sql',
        '/rest/v1/rpc/sql',
        '/rest/v1/rpc/run_sql',
        '/rest/v1/rpc/execute',
    ];
    
    const bodyVariations = [
        { sql: sql },
        { sql_command: sql },
        { query: sql },
        { sql_query: sql },
        { command: sql },
    ];
    
    for (const endpoint of endpoints) {
        for (const body of bodyVariations) {
            try {
                const result = await makeRequest(endpoint, body);
                
                if (result.status === 200 || result.status === 201 || result.status === 204) {
                    console.log(`✅ Success with ${endpoint}`);
                    console.log(`   Body format: ${Object.keys(body)[0]}`);
                    return true;
                } else if (result.status !== 404 && result.status !== 400) {
                    console.log(`  ${endpoint}: Status ${result.status}`);
                    if (result.json?.message) {
                        console.log(`    ${result.json.message}`);
                    }
                }
            } catch (error) {
                // Continue
            }
        }
    }
    
    return false;
}

async function createTables() {
    console.log('🚀 Creating DJ Editorial Tables via Supabase REST API\n');
    
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Clean SQL
    let cleanSQL = sql
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim();
    
    console.log('📝 Trying various RPC endpoints...\n');
    
    const success = await tryRPCEndpoints(cleanSQL);
    
    if (success) {
        console.log('\n✅ Tables created!\n');
        
        // Verify with Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
        const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
        
        if (!e1 && !e2) {
            console.log('✅ Verification: Both tables exist!\n');
            console.log('📝 Populating sample data...\n');
            
            // Run population script
            const populateScript = require('./populate_dj_editorial.js');
            await populateScript.main();
            
            return true;
        }
    } else {
        console.log('\n❌ Could not find working RPC endpoint.\n');
        console.log('💡 Please share:');
        console.log('   1. What RPC function name you normally use');
        console.log('   2. Or the endpoint path you use\n');
    }
    
    return false;
}

async function main() {
    try {
        await createTables();
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();

