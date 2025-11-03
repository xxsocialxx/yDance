/**
 * Create tables via Supabase API - Final attempt
 * Using correct service role key format and methods
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Use the service role key provided
const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_c43ecd84d59c3207d71e4c2eae601bded7e30331';

// Create client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    db: {
        schema: 'public'
    }
});

async function executeSQL(sql) {
    // Method 1: Try using pg_net extension via RPC
    // pg_net allows HTTP requests from within PostgreSQL
    
    // Method 2: Create a temporary function and call it
    // But we need SQL execution to create the function...
    
    // Method 3: Use Supabase's built-in SQL execution via RPC
    // Try all possible function names with various parameter formats
    
    const attempts = [
        // Standard execute_sql patterns
        () => supabase.rpc('execute_sql', { sql: sql }),
        () => supabase.rpc('execute_sql', { sql_command: sql }),
        () => supabase.rpc('exec_sql', { sql: sql }),
        () => supabase.rpc('exec_sql', { query: sql }),
        
        // pg_execute variations
        () => supabase.rpc('pg_execute_sql', { sql: sql }),
        () => supabase.rpc('pg_execute', { sql: sql }),
        
        // Generic SQL execution
        () => supabase.rpc('sql', { query: sql }),
        () => supabase.rpc('run_sql', { sql: sql }),
        () => supabase.rpc('run_sql', { query: sql }),
        
        // Supabase specific
        () => supabase.rpc('supabase_exec_sql', { sql: sql }),
        
        // Try with different case
        () => supabase.rpc('EXECUTE_SQL', { sql: sql }),
    ];
    
    for (let i = 0; i < attempts.length; i++) {
        try {
            const result = await attempts[i]();
            
            if (!result.error) {
                console.log(`✅ Success! Used method ${i + 1}`);
                return true;
            }
            
            // Log meaningful errors
            if (result.error && !result.error.message.includes('function') && !result.error.message.includes('not exist')) {
                console.log(`  Attempt ${i + 1}: ${result.error.message}`);
            }
        } catch (error) {
            // Continue to next
        }
    }
    
    // If all RPC attempts fail, try direct HTTP POST to /rest/v1/rpc/
    // Some Supabase instances expose SQL execution differently
    
    return false;
}

async function createTables() {
    console.log('🚀 Creating DJ Editorial Tables via Supabase API\n');
    console.log('Using service role key...\n');
    
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the entire SQL
    console.log('📝 Executing SQL migration...');
    const success = await executeSQL(sql);
    
    if (success) {
        console.log('\n✅ SQL executed successfully!\n');
        
        // Verify tables exist
        console.log('🔍 Verifying tables...');
        const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
        const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
        
        if (!e1 && !e2) {
            console.log('✅ Tables verified! Both tables exist.\n');
            return true;
        } else {
            console.log('⚠️  Tables might not be created yet.');
            console.log(`   Error 1: ${e1?.message || 'None'}`);
            console.log(`   Error 2: ${e2?.message || 'None'}\n`);
            return false;
        }
    } else {
        console.log('\n❌ Could not execute SQL via API.');
        console.log('\nPossible reasons:');
        console.log('1. Service role key format might be incorrect');
        console.log('2. SQL execution function not enabled in your Supabase instance');
        console.log('3. Different RPC function name required\n');
        
        console.log('💡 Please share:');
        console.log('   - What RPC function name you normally use');
        console.log('   - Or if you use a different method\n');
        
        return false;
    }
}

async function main() {
    try {
        const success = await createTables();
        
        if (success) {
            console.log('🎉 Tables created! Now populating data...\n');
            // Run population
            const { exec } = require('child_process');
            exec('node scripts/populate_dj_editorial.js', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error: ${error}`);
                    return;
                }
                console.log(stdout);
                if (stderr) console.error(stderr);
            });
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

main();

