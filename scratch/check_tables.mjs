import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function checkOtherTables() {
  const list = ["store_code_redemptions", "user_profiles", "profiles", "customers", "loyalty_codes"];
  for (const name of list) {
    const { data, error } = await sb.from(name).select("*").limit(1);
    console.log(name, error ? error.message : "EXISTS (" + data.length + " rows)");
  }
}

checkOtherTables().catch(console.error);
