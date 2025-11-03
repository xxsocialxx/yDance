/**
 * Create tables via Supabase API using proper methods
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_c43ecd84d59c3207d71e4c2eae601bded7e30331';

// Extract project reference from URL
const PROJECT_REF = 'rymcfymmigomaytblqml';

async function makeRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
                } else {
                    const error = new Error(`HTTP ${res.statusCode}: ${data}`);
                    error.status = res.statusCode;
                    error.data = data;
                    reject(error);
                }
            });
        });
        
        req.on('error', reject);
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
}

async function createTableViaManagementAPI(tableName, columns) {
    // Try Supabase Management API
    const options = {
        hostname: 'api.supabase.com',
        path: `/v1/projects/${PROJECT_REF}/database/tables`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
        }
    };
    
    try {
        const result = await makeRequest(options, {
            name: tableName,
            columns: columns
        });
        return result;
    } catch (error) {
        // If that doesn't work, try alternative
        throw error;
    }
}

async function executeSQLViaFunction(sql) {
    // Try creating/using a PostgreSQL function that executes SQL
    // First ensure the function exists, then call it
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    // Try calling exec_sql or similar function
    const { data, error } = await supabase.rpc('exec_sql', { 
        query: sql 
    });
    
    if (error) {
        // Function might not exist, try creating it first
        throw error;
    }
    
    return data;
}

async function createExecSQLFunction() {
    // Create a function that can execute SQL
    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            EXECUTE sql_query;
        END;
        $$;
    `;
    
    // This needs to be executed first - catch-22
    // Let's try direct HTTP to database
}

async function executeViaHTTPEndpoint(sql) {
    // Try Supabase's REST API with direct SQL execution endpoint
    // Some Supabase instances expose this
    
    const url = new URL(SUPABASE_URL);
    
    const options = {
        hostname: url.hostname,
        path: '/rest/v1/rpc/exec_sql',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'return=representation'
        }
    };
    
    try {
        const result = await makeRequest(options, { sql_query: sql });
        return result;
    } catch (error) {
        // Try alternative endpoint
        throw error;
    }
}

async function createTables() {
    console.log('🚀 Creating tables via Supabase API...\n');
    
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Try multiple methods
    const methods = [
        { name: 'HTTP RPC endpoint', fn: () => executeViaHTTPEndpoint(sql) },
        { name: 'RPC function call', fn: () => executeSQLViaFunction(sql) }
    ];
    
    for (const method of methods) {
        try {
            console.log(`Trying: ${method.name}...`);
            await method.fn();
            console.log(`✅ Success using ${method.name}\n`);
            return true;
        } catch (error) {
            console.log(`❌ ${method.name} failed: ${error.message}`);
        }
    }
    
    // If all fail, try splitting SQL and using PostgREST operations
    console.log('\nTrying method: Create tables via PostgREST operations...\n');
    return await createTablesViaPostgREST();
}

async function createTablesViaPostgREST() {
    // Create tables using Supabase client operations
    // This might work for some operations
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        db: {
            schema: 'public'
        }
    });
    
    // Unfortunately, PostgREST doesn't support DDL operations
    // We need to find the correct API endpoint
    
    // Try using Supabase's database admin API
    console.log('Attempting direct database connection approach...\n');
    
    // Use pg library with connection string derived from service key
    // Or use the management API endpoints
    
    return false;
}

async function main() {
    try {
        const success = await createTables();
        
        if (success) {
            console.log('✅ Tables created successfully!\n');
            console.log('📝 Now run: node scripts/populate_dj_editorial.js\n');
        } else {
            console.log('\n⚠️  Could not create tables via API.');
            console.log('Please check Supabase documentation for the correct endpoint.');
            console.log('Or run SQL manually in Supabase Dashboard.\n');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();

