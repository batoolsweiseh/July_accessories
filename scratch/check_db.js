const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split(/\r?\n/);
const parsed = {};
for (const line of lines) {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.substring(0, idx).trim();
    let v = line.substring(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    parsed[k] = v;
  }
}

const { createClient } = require('@supabase/supabase-js');
const sb = createClient(parsed.NEXT_PUBLIC_SUPABASE_URL, parsed.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Let's check all known tables
  const testTables = ['categories', 'subcategories', 'products', 'orders', 'order_items', 'loyalty_points', 'point_transactions', 'purchase_codes', 'loyalty_codes'];
  for (const t of testTables) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (!error) {
      console.log(`Table '${t}' exists! Row sample:`, data);
    } else {
      console.log(`Table '${t}': ${error.message}`);
    }
  }

  // Also check if rpc or postgres functions exist
  const { data: rpcData, error: rpcErr } = await sb.rpc('exec_sql', { sql: 'SELECT 1;' });
  console.log('exec_sql rpc:', { rpcData, rpcErr });
}
run();
