import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function main() {
  // عرض كل الأكواد بكل أعمدتها
  const { data: codes, error } = await sb.from("store_purchase_codes").select("*");
  console.log("الأكواد (كل الأعمدة):", JSON.stringify(codes, null, 2), error);

  // تفعيل كل الأكواد الموجودة
  if (codes && codes.length > 0) {
    for (const code of codes) {
      const { error: updErr } = await sb
        .from("store_purchase_codes")
        .update({ is_active: true, usage_type: "once_per_user" })
        .eq("id", code.id);
      if (updErr) console.log("فشل تفعيل", code.code, updErr.message);
      else console.log("✅ تم تفعيل الكود:", code.code);
    }
  }
}

main().catch(console.error);
