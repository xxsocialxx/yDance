/**
 * Test different ways to use the service key
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://rymcfymmigomaytblqml.supabase.co';
const SUPABASE_SERVICE_KEY = 'sbp_c43ecd84d59c3207d71e4c2eae601bded7e30331';

// Try different client configurations
const configs = [
    { name: 'Default config', opts: {} },
    { name: 'With auth disabled', opts: { auth: { autoRefreshToken: false, persistSession: false } } },
    { name: 'With db schema', opts: { db: { schema: 'public' } } }
];

async function testKey() {
    console.log('Testing service key format...\n');
    console.log(`Key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
    console.log(`Length: ${SUPABASE_SERVICE_KEY.length}`);
    console.log(`Starts with: ${SUPABASE_SERVICE_KEY.substring(0, 4)}\n`);
    
    for (const config of configs) {
        console.log(`Testing: ${config.name}`);
        try {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, config.opts);
            
            // Try a simple query
            const { data, error } = await supabase.from('dj_profiles').select('id').limit(1);
            
            if (error) {
                console.log(`  ❌ Error: ${error.message}\n`);
            } else {
                console.log(`  ✅ Key works! Query successful.\n`);
                
                // Now try RPC
                console.log('  Testing RPC functions...');
                const rpcTests = ['execute_sql', 'exec_sql', 'pg_execute_sql'];
                for (const func of rpcTests) {
                    const { error: rpcError } = await supabase.rpc(func, { sql: 'SELECT 1' });
                    if (!rpcError) {
                        console.log(`  ✅ ${func}() exists and works!`);
                        return func;
                    }
                }
                console.log('  ⚠️  No RPC function found\n');
                break;
            }
        } catch (error) {
            console.log(`  ❌ Exception: ${error.message}\n`);
        }
    }
}

testKey().catch(console.error);

