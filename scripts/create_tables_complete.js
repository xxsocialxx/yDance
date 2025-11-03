/**
 * Complete setup: Create execute_sql function, then create tables, then populate data
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
        req.write(JSON.stringify({ sql: sql }));
        req.end();
    });
}

async function ensureExecuteSQLFunction() {
    console.log('📋 Step 1: Ensuring execute_sql function exists...\n');
    
    const functionSQL = `
CREATE OR REPLACE FUNCTION execute_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    EXECUTE sql;
END;
$$;

GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
    `.trim();
    
    // Try to create the function
    // Since we can't execute SQL to create the function that executes SQL,
    // we need to check if it exists first, or try a different method
    
    // Try checking if function exists by calling it with a simple query
    try {
        const testResult = await executeSQLViaRPC('SELECT 1');
        if (testResult.status === 200 || testResult.status === 204) {
            console.log('✅ execute_sql function exists\n');
            return true;
        }
    } catch (e) {
        // Function doesn't exist
    }
    
    console.log('⚠️  execute_sql function does not exist.');
    console.log('\n📝 Please create it first by running this SQL in Supabase Dashboard:\n');
    console.log('━'.repeat(70));
    
    const functionPath = path.join(__dirname, 'create_execute_sql_function.sql');
    const functionSQLContent = fs.readFileSync(functionPath, 'utf8');
    console.log(functionSQLContent);
    
    console.log('━'.repeat(70));
    console.log('\nAfter creating the function, re-run this script.\n');
    
    return false;
}

async function createTables() {
    console.log('📋 Step 2: Creating DJ Editorial tables...\n');
    
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Clean SQL
    let cleanSQL = sql
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim();
    
    console.log('📝 Executing SQL migration...');
    const result = await executeSQLViaRPC(cleanSQL);
    
    if (result.status === 200 || result.status === 201 || result.status === 204) {
        console.log('✅ Tables created successfully!\n');
        return true;
    } else {
        console.log(`❌ Failed: Status ${result.status}`);
        if (result.json) {
            console.log(`   ${JSON.stringify(result.json, null, 2)}`);
        }
        console.log('');
        return false;
    }
}

async function verifyTables() {
    console.log('📋 Step 3: Verifying tables...\n');
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
    const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
    
    if (!e1 && !e2) {
        console.log('✅ Both tables verified!\n');
        return true;
    } else {
        console.log('⚠️  Verification issues:');
        console.log(`   dj_editorial_attributes: ${e1?.message || 'OK'}`);
        console.log(`   dj_reviews_aggregate: ${e2?.message || 'OK'}\n`);
        return false;
    }
}

async function populateData() {
    console.log('📋 Step 4: Populating sample data...\n');
    
    const populateScript = require('./populate_dj_editorial.js');
    await populateScript.main();
}

async function main() {
    console.log('🚀 Complete DJ Editorial Setup\n');
    console.log('='.repeat(70) + '\n');
    
    // Step 1: Ensure execute_sql function exists
    const hasFunction = await ensureExecuteSQLFunction();
    if (!hasFunction) {
        return;
    }
    
    // Step 2: Create tables
    const tablesCreated = await createTables();
    if (!tablesCreated) {
        return;
    }
    
    // Step 3: Verify
    const verified = await verifyTables();
    if (!verified) {
        return;
    }
    
    // Step 4: Populate
    await populateData();
    
    console.log('🎉 Setup complete! DJ profiles now have editorial attributes.\n');
}

main().catch(console.error);

