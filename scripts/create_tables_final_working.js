/**
 * Create tables via Supabase API using correct service role key
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_publishable_sk0GTezrQ8me8sPRLsWo4g_8UEQgztQ';

// Create admin client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function executeSQL(sql) {
    // Try various RPC function names that might exist
    const attempts = [
        // Standard patterns
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
    ];
    
    for (let i = 0; i < attempts.length; i++) {
        try {
            const result = await attempts[i]();
            
            if (!result.error) {
                console.log(`✅ Success using method ${i + 1}`);
                return true;
            }
            
            // Log meaningful errors (not "function doesn't exist")
            if (result.error && 
                !result.error.message.includes('function') && 
                !result.error.message.includes('not exist') &&
                !result.error.message.includes('does not exist')) {
                console.log(`  Attempt ${i + 1}: ${result.error.message}`);
            }
        } catch (error) {
            // Continue to next
        }
    }
    
    return false;
}

async function createTables() {
    console.log('🚀 Creating DJ Editorial Tables via Supabase API\n');
    console.log('Using service role key...\n');
    
    const sqlPath = path.join(__dirname, '..', 'supabase/migrations/create_dj_editorial_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Clean and split SQL into statements
    let cleanSQL = sql
        .replace(/--.*$/gm, '') // Remove line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .trim();
    
    // Split into statements
    const statements = cleanSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.length > 10);
    
    console.log(`📝 Executing ${statements.length} SQL statements...\n`);
    
    // Try executing entire SQL first, then individual statements if needed
    let success = await executeSQL(cleanSQL);
    
    if (!success && statements.length > 0) {
        console.log('Trying individual statements...\n');
        let successCount = 0;
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            const result = await executeSQL(statement);
            if (result) {
                successCount++;
            }
            await new Promise(r => setTimeout(r, 50));
        }
        success = successCount > 0;
    }
    
    if (success) {
        console.log('\n✅ SQL executed successfully!\n');
        
        // Verify tables exist
        console.log('🔍 Verifying tables...');
        const { error: e1 } = await supabase.from('dj_editorial_attributes').select('id').limit(1);
        const { error: e2 } = await supabase.from('dj_reviews_aggregate').select('id').limit(1);
        
        if (!e1 && !e2) {
            console.log('✅ Tables verified! Both tables exist.\n');
            
            // Now populate data
            console.log('📝 Populating sample data...\n');
            const populateScript = require('./populate_dj_editorial.js');
            await populateScript.main();
            
            return true;
        } else {
            console.log('⚠️  Tables might not be fully created.');
            console.log(`   dj_editorial_attributes: ${e1?.message || 'OK'}`);
            console.log(`   dj_reviews_aggregate: ${e2?.message || 'OK'}\n`);
            return false;
        }
    } else {
        console.log('\n❌ Could not execute SQL via RPC functions.\n');
        console.log('Please check if your Supabase instance has SQL execution enabled.\n');
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

