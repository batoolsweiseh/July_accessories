import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function main() {
  console.log("=== اختبار نظام النقاط الكامل ===\n");

  // 1. عرض الأكواد الموجودة مع is_active و usage_type
  const { data: codes } = await sb.from("store_purchase_codes").select("*");
  console.log("الأكواد الموجودة:");
  codes?.forEach(c => console.log(`  - ${c.code} | ${c.points} نقطة | مفعّل: ${c.is_active} | نوع: ${c.usage_type}`));

  // 2. تجربة تبديل حالة الكود الأول
  if (codes && codes.length > 0) {
    const testCode = codes[0];
    console.log(`\nتجربة تبديل حالة الكود: ${testCode.code}`);
    const newStatus = !testCode.is_active;
    const { error } = await sb.from("store_purchase_codes").update({ is_active: newStatus }).eq("id", testCode.id);
    if (error) {
      console.log("❌ فشل التبديل:", error.message);
    } else {
      console.log(`✅ تم تغيير الحالة إلى: ${newStatus}`);
      // إرجاعه لحالته الأصلية
      await sb.from("store_purchase_codes").update({ is_active: testCode.is_active }).eq("id", testCode.id);
      console.log(`✅ تم إرجاع الحالة إلى: ${testCode.is_active}`);
    }
  }

  // 3. عرض المستخدمين وأرصدتهم
  const { data: { users } } = await sb.auth.admin.listUsers();
  console.log("\nالمستخدمون:");
  users?.forEach(u => {
    const meta = u.user_metadata || {};
    console.log(`  - ${meta.full_name || meta.phone} | النقاط: ${meta.points ?? 0}`);
  });

  // 4. عرض user_profiles
  const { data: profiles } = await sb.from("user_profiles").select("*");
  console.log("\nجدول user_profiles:");
  profiles?.forEach(p => console.log(`  - ${p.full_name || p.phone} | النقاط: ${p.points}`));

  // 5. عرض store_code_redemptions
  const { data: redemptions } = await sb.from("store_code_redemptions").select("*");
  console.log("\nاستخدامات الأكواد:", redemptions?.length || 0, "سجل");

  // 6. عرض loyalty_transactions
  const { data: tx } = await sb.from("loyalty_transactions").select("*");
  console.log("حركات النقاط:", tx?.length || 0, "حركة");
  tx?.forEach(t => console.log(`  - ${t.type} | ${t.points} نقطة | ${t.title}`));
}

main().catch(console.error);
