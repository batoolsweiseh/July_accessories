import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

// Check which columns exist in store_purchase_codes
async function checkTableColumns() {
  // Try querying with is_active to see if column exists
  const { data, error } = await sb.from("store_purchase_codes").select("id, is_active, usage_type").limit(1);
  if (error) {
    console.log("Columns is_active/usage_type NOT present:", error.message);
    return false;
  }
  console.log("Columns is_active/usage_type EXIST:", data);
  return true;
}

// Check if store_code_redemptions table exists
async function checkRedemptionsTable() {
  const { data, error } = await sb.from("store_code_redemptions").select("id").limit(1);
  if (error) {
    console.log("store_code_redemptions table NOT present:", error.message);
    return false;
  }
  console.log("store_code_redemptions table EXISTS:", data);
  return true;
}

// Check if loyalty_transactions table exists
async function checkTransactionsTable() {
  const { data, error } = await sb.from("loyalty_transactions").select("id").limit(1);
  if (error) {
    console.log("loyalty_transactions table NOT present:", error.message);
    return false;
  }
  console.log("loyalty_transactions table EXISTS:", data);
  return true;
}

// Check if user_profiles table exists
async function checkProfilesTable() {
  const { data, error } = await sb.from("user_profiles").select("id").limit(1);
  if (error) {
    console.log("user_profiles table NOT present:", error.message);
    return false;
  }
  console.log("user_profiles table EXISTS:", data);
  return true;
}

// Check if loyalty_rewards table exists
async function checkRewardsTable() {
  const { data, error } = await sb.from("loyalty_rewards").select("id").limit(1);
  if (error) {
    console.log("loyalty_rewards table NOT present:", error.message);
    return false;
  }
  console.log("loyalty_rewards table EXISTS:", data);
  return true;
}

async function main() {
  console.log("=== Checking DB tables and columns ===");
  await checkTableColumns();
  await checkRedemptionsTable();
  await checkTransactionsTable();
  await checkProfilesTable();
  await checkRewardsTable();
}

main().catch(console.error);
