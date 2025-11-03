/**
 * Create tables via Supabase API using direct HTTP requests
 * Based on Supabase REST API and Management API patterns
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_c43ecd84d59c3207d71e4c2eae601bded7e30331';
const PROJECT_REF = 'rymcfymmigomaytblqml';

async function makeHTTPSRequest(url, options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const result = {
                    status: res.statusCode,
                    headers: res.headers,
                    data: data
                };
                
                // Try to parse JSON
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
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        
        req.end();
    });
}

async function createTableViaRPC(sql) {
    // Method 1: Try RPC endpoint with service key
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);
    
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=representation'
        }
    };
    
    try {
        const result = await makeHTTPSRequest(url, options, { sql: sql });
        if (result.status === 200 || result.status === 201) {
            return true;
        }
        console.log(`RPC endpoint response: ${result.status}`, result.data);
    } catch (error) {
        // Try next method
    }
    
    // Method 2: Try management API
    const mgmtUrl = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/execute`;
    
    const mgmtOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
        }
    };
    
    try {
        const result = await makeHTTPSRequest(new URL(mgmtUrl), mgmtOptions, { 
            query: sql 
        });
        if (result.status === 200 || result.status === 201) {
            return true;
        }
        console.log(`Management API response: ${result.status}`, result.data);
    } catch (error) {
        // Try next
    }
    
    // Method 3: Try using Supabase client's rpc with correct function name
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    // Try common RPC function names
    const rpcFunctions = [
        { name: 'exec_sql', params: { sql: sql } },
        { name: 'execute_sql', params: { sql_command: sql } },
        { name: 'pg_execute_sql', params: { sql: sql } },
        { name: 'sql', params: { query: sql } },
        { name: 'run_sql', params: { sql: sql } }
    ];
    
    for (const rpc of rpcFunctions) {
        try {
            const { data, error } = await supabase.rpc(rpc.name, rpc.params);
            if (!error) {
                console.log(`✓ Success using ${rpc.name}()`);
                return true;
            } else {
                // Check if it's just that function doesn't exist vs other error
                if (error.message && !error.message.includes('function') && !error.message.includes('does not exist')) {
                    console.log(`⚠️  ${rpc.name}: ${error.message}`);
                }
            }
        } catch (e) {
            // Try next
        }
    }
    
    return false;
}

async function main() {
    console.log('🚀 Creating tables via Supabase API...\n');
    
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL migration...\n');
    
    // Try executing the entire SQL file
    const success = await createTableViaRPC(sql);
    
    if (success) {
        console.log('\n✅ Tables created successfully!\n');
        
        // Verify
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
        const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
        
        if (!e1 && !e2) {
            console.log('✅ Verification: Tables exist!\n');
            console.log('📝 Next: Run data population');
            console.log('   node scripts/populate_dj_editorial.js\n');
        } else {
            console.log('⚠️  Could not verify tables. Please check manually.\n');
        }
    } else {
        console.log('\n⚠️  Could not create tables via API.');
        console.log('Please check if your Supabase instance has SQL execution functions enabled.');
        console.log('Or run SQL manually in Supabase Dashboard.\n');
    }
}

main().catch(console.error);

