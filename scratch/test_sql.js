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

async function testSql() {
  const url = parsed.NEXT_PUBLIC_SUPABASE_URL;
  const key = parsed.SUPABASE_SERVICE_ROLE_KEY;

  // Let's test standard endpoints
  const endpoints = [
    '/rest/v1/rpc/sql',
    '/rest/v1/rpc/run_sql',
    '/rest/v1/rpc/query',
    '/pg/query',
    '/api/query'
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${url}${ep}`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'SELECT 1;' })
      });
      console.log(ep, res.status);
    } catch (e) {
      console.log(ep, 'Error:', e.message);
    }
  }
}

testSql();
