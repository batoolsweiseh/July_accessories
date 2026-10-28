import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function testInsertTx() {
  const { data, error } = await sb.from("loyalty_transactions").insert({
    user_id: "c2522a1f-190a-4b8d-9a8e-9858702fb1a3",
    code: "TEST-CODE",
    points: 100,
    type: "store_purchase",
    title: "Test Insert",
  }).select();

  console.log("Insert result:", data, error);

  if (data?.length) {
    await sb.from("loyalty_transactions").delete().eq("id", data[0].id);
    console.log("Deleted test transaction.");
  }
}

testInsertTx().catch(console.error);
