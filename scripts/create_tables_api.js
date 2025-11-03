/**
 * Create tables via Supabase API
 * Using service role key for schema operations
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_c43ecd84d59c3207d71e4c2eae601bded7e30331';

// Create admin client with service role key
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function executeSQL(sql) {
    // Try using Supabase Management API or RPC function
    // Method 1: Try using a stored procedure approach
    // First, we need to create a function that can execute DDL
    
    // Method 2: Use direct HTTP request to Supabase Management API
    const url = new URL(SUPABASE_URL);
    const hostname = url.hostname;
    
    // Supabase might expose schema operations through management API
    // Let's try using pg_net or direct HTTP
    
    return new Promise((resolve, reject) => {
        // Try POST to /rest/v1/rpc/exec_sql or similar
        const sqlEscaped = sql.replace(/'/g, "''");
        
        // Use HTTP request to execute SQL via Supabase API
        const options = {
            hostname: hostname,
            path: '/rest/v1/rpc/exec_sql',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer': 'return=representation'
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(true);
                } else {
                    console.log('Response:', res.statusCode, data);
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        
        req.write(JSON.stringify({ sql: sql }));
        req.end();
    });
}

async function createTablesViaRPC() {
    // Try creating a function first, then calling it
    // Or use Supabase's built-in schema operations
    
    console.log('🔧 Attempting to create tables via API...\n');
    
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));
    
    // Try executing via RPC call to exec_sql function
    // This requires a function to exist in Supabase that can execute DDL
    
    // Alternative: Use Supabase Management API endpoint
    // POST to /management/v1/projects/{ref}/database/execute
    
    const projectRef = SUPABASE_URL.split('//')[1].split('.')[0]; // Extract project ref
    
    for (const statement of statements) {
        if (!statement) continue;
        
        try {
            // Try using pg_net HTTP extension or direct call
            const { data, error } = await supabaseAdmin.rpc('exec_sql', { 
                sql_query: statement 
            });
            
            if (error) {
                // Function doesn't exist, try alternative method
                console.log('RPC method not available, trying alternative...');
                break;
            }
            
            console.log('✓ Executed statement');
        } catch (e) {
            console.log('Trying HTTP method...');
            
            // Try HTTP request to management API
            await executeSQLViaHTTP(statement, projectRef);
        }
    }
}

async function executeSQLViaHTTP(statement, projectRef) {
    return new Promise((resolve, reject) => {
        const url = new URL(`https://api.supabase.com/v1/projects/${projectRef}/database/execute`);
        
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });
        
        req.on('error', reject);
        req.write(JSON.stringify({ query: statement }));
        req.end();
    });
}

async function main() {
    try {
        await createTablesViaRPC();
    } catch (error) {
        console.error('Error:', error.message);
        console.log('\nTrying alternative approach...\n');
    }
}

main();

