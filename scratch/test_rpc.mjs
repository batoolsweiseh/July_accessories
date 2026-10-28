import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function testSql() {
  // Let's test if we can create a table or if rpc is available
  const { data, error } = await sb.rpc("exec_sql", { sql: "SELECT 1" });
  console.log("rpc exec_sql:", data, error?.message);
}

testSql().catch(console.error);
