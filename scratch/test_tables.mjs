import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log("Checking Supabase tables...");
  const { data, error } = await supabase.from('settings').select('*');
  console.log("Settings query result:", { data, error });

  const { data: wheelData, error: wheelError } = await supabase.from('wheel_settings').select('*');
  console.log("Wheel settings query result:", { data: wheelData, error: wheelError });
}

checkTable().catch(console.error);
