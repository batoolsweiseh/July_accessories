import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function testFetchUsersAndCodes() {
  const { data: users, error: uErr } = await sb.auth.admin.listUsers();
  console.log("Total auth users:", users?.users?.length, uErr);

  const { data: codes, error: cErr } = await sb.from("store_purchase_codes").select("*");
  console.log("Codes in db:", codes?.length, cErr);

  const { data: tx, error: tErr } = await sb.from("loyalty_transactions").select("*");
  console.log("Tx in db:", tx?.length, tErr);
}

testFetchUsersAndCodes().catch(console.error);
