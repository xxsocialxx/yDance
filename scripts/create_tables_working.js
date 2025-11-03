/**
 * Create tables via Supabase API using execute_sql RPC endpoint
 * Based on Supabase Management API documentation
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_c43ecd84d59c3207d71e4c2eae601bded7e30331';

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
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log(`✓ HTTP ${res.statusCode}`);
                    resolve({ success: true, data: data });
                } else {
                    // Try parsing error
                    let errorMsg = data;
                    try {
                        const parsed = JSON.parse(data);
                        errorMsg = parsed.message || parsed.error || data;
                    } catch (e) {}
                    
                    resolve({ success: false, status: res.statusCode, error: errorMsg });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        // Send SQL in request body
        req.write(JSON.stringify({ sql: sql }));
        req.end();
    });
}

async function createTables() {
    console.log('🚀 Creating DJ Editorial Tables via Supabase API\n');
    
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL migration via RPC...\n');
    
    const result = await executeSQLViaRPC(sql);
    
    if (result.success) {
        console.log('✅ SQL executed successfully!\n');
        
        // Verify tables were created
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        console.log('🔍 Verifying tables...');
        const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
        const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
        
        if (!e1 && !e2) {
            console.log('✅ Tables verified! Both tables exist.\n');
            
            // Now populate data
            console.log('📝 Populating sample data...\n');
            const { exec } = require('child_process');
            exec('node scripts/populate_dj_editorial.js', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error populating: ${error}`);
                    return;
                }
                console.log(stdout);
                if (stderr) console.error(stderr);
            });
            
            return true;
        } else {
            console.log('⚠️  Tables might not be fully created yet.');
            console.log(`   Error 1: ${e1?.message || 'None'}`);
            console.log(`   Error 2: ${e2?.message || 'None'}\n`);
            return false;
        }
    } else {
        console.log(`❌ Failed to execute SQL`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Error: ${result.error}\n`);
        
        // If execute_sql function doesn't exist, we might need to create it first
        if (result.error && result.error.includes('function') || result.status === 404) {
            console.log('💡 The execute_sql RPC function might not exist.');
            console.log('   Creating it first...\n');
            
            // Try creating the function first
            const createFunctionSQL = `
                CREATE OR REPLACE FUNCTION execute_sql(sql text)
                RETURNS void
                LANGUAGE plpgsql
                SECURITY DEFINER
                AS $$
                BEGIN
                    EXECUTE sql;
                END;
                $$;
            `;
            
            // But we need SQL execution to create the function... catch-22
            // Let's try using a different approach - Supabase might have a built-in function
            console.log('⚠️  Need to create execute_sql function first.');
            console.log('   Please run this SQL in Supabase Dashboard to create the function:\n');
            console.log(createFunctionSQL);
            console.log('\n   Then re-run this script.\n');
        }
        
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

