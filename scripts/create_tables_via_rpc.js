/**
 * Create tables via Supabase RPC using service role key
 * Uses execute_sql function approach
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_c43ecd84d59c3207d71e4c2eae601bded7e30331';

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function ensureExecSQLFunction() {
    // Create or replace the execute_sql function
    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION execute_sql(sql_command text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
            EXECUTE sql_command;
        END;
        $$;
    `;
    
    // Try to create the function using a direct approach
    // Since we can't execute SQL to create the function that executes SQL,
    // we need to try calling it and if it fails, the function doesn't exist
    
    // Alternative: Use pg_net or other methods
    // For now, let's try calling it and see if it exists
    try {
        const { error } = await supabase.rpc('execute_sql', { 
            sql_command: 'SELECT 1' 
        });
        
        if (!error) {
            console.log('✓ execute_sql function exists');
            return true;
        }
    } catch (e) {
        // Function doesn't exist, we need to create it
    }
    
    // Try using pg_net to execute SQL via HTTP
    // Or use Supabase's built-in SQL execution capabilities
    
    console.log('⚠️  execute_sql function not found. Trying alternative methods...\n');
    
    // Method: Try pg_execute_sql if it exists
    try {
        const { error } = await supabase.rpc('pg_execute_sql', { 
            sql: createFunctionSQL 
        });
        
        if (!error) {
            console.log('✓ Created execute_sql function via pg_execute_sql\n');
            return true;
        }
    } catch (e) {
        // pg_execute_sql might not exist either
    }
    
    return false;
}

async function executeSQL(sql) {
    // Try multiple RPC function names that might exist
    const functionNames = [
        'execute_sql',
        'pg_execute_sql', 
        'exec_sql',
        'sql',
        'rpc_exec_sql'
    ];
    
    for (const funcName of functionNames) {
        try {
            const { data, error } = await supabase.rpc(funcName, { 
                sql_command: sql,
                sql: sql,
                query: sql,
                sql_query: sql
            });
            
            if (!error) {
                console.log(`✓ Executed via ${funcName}()`);
                return true;
            }
            
            // Try with different parameter names
        } catch (e) {
            // Try next function
        }
    }
    
    return false;
}

async function createTables() {
    console.log('🚀 Creating tables via Supabase API...\n');
    
    // First, ensure we have a function to execute SQL
    const hasFunction = await ensureExecSQLFunction();
    
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Clean SQL - remove comments and split into statements
    sql = sql.replace(/--.*$/gm, ''); // Remove line comments
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
    
    // Split into individual statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.length > 10);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i] + ';'; // Add semicolon back
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        const success = await executeSQL(statement);
        if (success) {
            successCount++;
        } else {
            console.log(`⚠️  Statement ${i + 1} might have failed or already exists`);
        }
        
        // Small delay
        await new Promise(r => setTimeout(r, 100));
    }
    
    console.log(`\n✅ Executed ${successCount}/${statements.length} statements\n`);
    
    // Verify tables were created
    const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
    const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
    
    if (!e1 && !e2) {
        console.log('✅ Tables created successfully!\n');
        return true;
    } else {
        console.log('⚠️  Tables might not exist. Errors:', e1?.message || e2?.message);
        return false;
    }
}

async function main() {
    try {
        const success = await createTables();
        
        if (success) {
            console.log('📝 Next step: Run data population');
            console.log('   node scripts/populate_dj_editorial.js\n');
        } else {
            console.log('\n⚠️  Could not verify table creation.');
            console.log('Please check Supabase dashboard or try manual SQL execution.\n');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    }
}

main();

