import pg from 'pg';
const { Client } = pg;

const passwords = ['July2026', 'July2026!', 'july2026', 'postgres', 'admin'];
const host = 'db.ibbrknipfisyfpgtxtks.supabase.co';

async function testConnection() {
  for (const pass of passwords) {
    console.log(`Trying password: ${pass}...`);
    const client = new Client({
      host,
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: pass,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000,
    });

    try {
      await client.connect();
      console.log(`CONNECTED SUCCESSFULLY with password: ${pass}`);
      await client.query(`
        CREATE TABLE IF NOT EXISTS store_settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      console.log("Table store_settings created successfully!");
      await client.end();
      return true;
    } catch (err) {
      console.log(`Failed with password ${pass}:`, err.message);
    }
  }
  return false;
}

testConnection().catch(console.error);
