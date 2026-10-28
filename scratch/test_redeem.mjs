import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function testRedeem() {
  const userId = "c2522a1f-190a-4b8d-9a8e-9858702fb1a3";
  const code = "JULY-2216-100";

  // Simulate what redeemStorePurchaseCode does
  const { data: { user }, error: userError } = await sb.auth.admin.getUserById(userId);
  console.log("getUserById:", user?.id, userError);

  const { data: codeRow, error: codeError } = await sb
    .from("store_purchase_codes")
    .select("*")
    .eq("code", code)
    .single();
  console.log("codeRow:", codeRow, codeError);

  // Test updating user metadata
  const meta = user.user_metadata || {};
  const currentPoints = typeof meta.points === "number" ? Math.max(0, meta.points) : 0;
  const newTotal = currentPoints + codeRow.points;

  const { data: updatedUser, error: updateErr } = await sb.auth.admin.updateUserById(userId, {
    user_metadata: { ...meta, points: newTotal }
  });
  console.log("updateUserById:", updatedUser?.user?.user_metadata, updateErr);

  // Re-fetch with getUserById
  const { data: { user: refetched } } = await sb.auth.admin.getUserById(userId);
  console.log("Refetched user_metadata:", refetched?.user_metadata);

  // Revert back so we don't pollute
  await sb.auth.admin.updateUserById(userId, {
    user_metadata: meta
  });
  console.log("Reverted successfully.");
}

testRedeem().catch(console.error);
