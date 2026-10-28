import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function testCols() {
  const { data, error } = await sb.from("store_purchase_codes").select("is_active").limit(1);
  console.log("is_active in store_purchase_codes:", data, error?.message);

  const { data: txData, error: txError } = await sb.from("loyalty_transactions").select("note, balance_before, balance_after").limit(1);
  console.log("note, balance in loyalty_transactions:", txData, txError?.message);
}

testCols().catch(console.error);
