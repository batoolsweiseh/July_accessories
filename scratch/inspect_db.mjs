import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function main() {
  const { data: codes, error: cErr } = await sb.from("store_purchase_codes").select("*");
  console.log("CODES:", codes, cErr);

  const { data: users, error: uErr } = await sb.auth.admin.listUsers();
  console.log("USERS:", users?.users?.map(u => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    user_metadata: u.user_metadata
  })), uErr);

  const { data: tx, error: tErr } = await sb.from("loyalty_transactions").select("*");
  console.log("TRANSACTIONS:", tx, tErr);
}

main().catch(console.error);
