import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function main() {
  // مزامنة user_profiles مع user_metadata لجميع المستخدمين
  const { data: { users } } = await sb.auth.admin.listUsers();
  
  for (const user of users) {
    const meta = user.user_metadata || {};
    const points = typeof meta.points === "number" ? meta.points : 0;
    const name = meta.full_name || meta.name || "";
    const phone = meta.phone || user.email?.replace("@july-store.local", "") || "";

    console.log(`مزامنة: ${name} (${phone}) - ${points} نقطة`);

    // upsert في user_profiles
    const { error } = await sb.from("user_profiles").upsert({
      id: user.id,
      full_name: name,
      phone,
      email: user.email || "",
      points,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (error) console.log("  ❌ خطأ:", error.message);
    else console.log("  ✅ تمت المزامنة");
  }

  // عرض user_profiles بعد المزامنة
  const { data: profiles } = await sb.from("user_profiles").select("*");
  console.log("\nجدول user_profiles بعد المزامنة:");
  profiles?.forEach(p => console.log(`  - ${p.full_name || p.phone} | ${p.points} نقطة`));

  // عرض حركات النقاط
  const { data: tx } = await sb.from("loyalty_transactions").select("*").order("created_at", { ascending: false });
  console.log("\nآخر حركات النقاط:");
  tx?.slice(0, 5).forEach(t => console.log(`  - [${t.type}] ${t.points} نقطة | ${t.title}`));
}

main().catch(console.error);
