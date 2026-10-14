const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const lines = env.split(/\r?\n/);
const parsed = {};
for (const line of lines) {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.substring(0, idx).trim();
    let v = line.substring(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    parsed[k] = v;
  }
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(parsed.NEXT_PUBLIC_SUPABASE_URL, parsed.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: buckets, error } = await sb.storage.listBuckets();
  console.log('Buckets:', buckets, error);
}
check();
