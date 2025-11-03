/**
 * Find existing SQL execution functions in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function querySystemTables() {
    // Try to query pg_proc to find SQL execution functions
    // But this requires direct SQL access...
    
    // Alternative: Try calling various function names
    const functionNames = [
        'execute_sql',
        'exec_sql',
        'pg_execute_sql',
        'sql',
        'run_sql',
        'supabase_exec_sql',
        'exec',
        'query',
        'execute'
    ];
    
    console.log('🔍 Testing existing RPC functions...\n');
    
    for (const funcName of functionNames) {
        try {
            // Try with different parameter names
            const paramNames = ['sql', 'query', 'sql_command', 'sql_query', 'command', 'statement'];
            
            for (const param of paramNames) {
                const testSQL = 'SELECT 1';
                const { data, error } = await supabase.rpc(funcName, { [param]: testSQL });
                
                if (!error) {
                    console.log(`✅ Found working function: ${funcName}(${param})`);
                    return { name: funcName, param: param };
                }
                
                // Check if it's a "function doesn't exist" error vs other error
                if (error && !error.message.includes('function') && !error.message.includes('not exist')) {
                    // Function exists but maybe wrong params
                    console.log(`  ⚠️  ${funcName} exists but error: ${error.message.substring(0, 50)}`);
                }
            }
        } catch (e) {
            // Continue
        }
    }
    
    console.log('\n❌ No working function found.\n');
    return null;
}

async function tryDirectSQLQuery() {
    // Try querying information_schema to find functions
    // But we need SQL execution for this...
    
    console.log('Trying to query pg_catalog for functions...\n');
    
    // Use execute_sql if it exists, or try system queries
    const systemQueries = [
        "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%sql%' OR routine_name LIKE '%exec%'",
        "SELECT proname FROM pg_proc WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND proname LIKE '%sql%'"
    ];
    
    // Can't execute these without SQL execution capability...
    // Catch-22
    
    return null;
}

async function main() {
    const found = await querySystemTables();
    
    if (found) {
        console.log(`\n✅ Use: supabase.rpc('${found.name}', { ${found.param}: sql })`);
        console.log('\nUpdating scripts to use this function...\n');
    } else {
        console.log('\n💡 Next steps:');
        console.log('1. Create execute_sql function (one-time)');
        console.log('2. Or share the function name you normally use\n');
    }
}

main().catch(console.error);

