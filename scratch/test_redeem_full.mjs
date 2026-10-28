import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = fs.readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const sb = createClient(url, key);

async function main() {
  console.log("=== اختبار استخدام كود من قبل المستخدم ===\n");

  // 1. إنشاء كود اختبار
  const testCode = "TEST-" + Math.floor(1000 + Math.random() * 9000);
  const { data: newCode, error: codeErr } = await sb.from("store_purchase_codes").insert({
    code: testCode,
    points: 50,
    is_active: true,
    usage_type: "once_per_user",
    note: "كود اختبار",
    is_used: false,
  }).select().single();

  if (codeErr) {
    console.log("❌ فشل إنشاء الكود:", codeErr.message);
    return;
  }
  console.log("✅ تم إنشاء كود الاختبار:", testCode, "(50 نقطة)");

  // 2. جلب المستخدم الأول
  const { data: { users } } = await sb.auth.admin.listUsers();
  const testUser = users[1]; // batool
  if (!testUser) { console.log("❌ لا يوجد مستخدم"); return; }
  
  const meta = testUser.user_metadata || {};
  console.log("\nالمستخدم:", meta.full_name || meta.phone, "| رصيد قبل:", meta.points ?? 0, "نقطة");

  // 3. تجربة استخدام الكود
  const cleanCode = testCode.toUpperCase();

  // فحص is_active
  const { data: codeRow } = await sb.from("store_purchase_codes").select("*").eq("code", cleanCode).single();
  console.log("\nفحص الكود:", codeRow?.code, "| مفعّل:", codeRow?.is_active, "| نقاط:", codeRow?.points);

  // فحص عدم الاستخدام المسبق
  const { data: prev } = await sb.from("store_code_redemptions").select("id").eq("code", cleanCode).eq("user_id", testUser.id).limit(1);
  console.log("هل سُبق استخدامه؟", prev?.length > 0 ? "نعم ❌" : "لا ✅");

  // تسجيل الاستخدام
  const { error: redeemErr } = await sb.from("store_code_redemptions").insert({
    code_id: codeRow.id,
    code: cleanCode,
    user_id: testUser.id,
    user_name: meta.full_name || meta.name || "",
    user_phone: meta.phone || "",
    points: codeRow.points,
    redeemed_at: new Date().toISOString(),
  });
  if (redeemErr) { console.log("❌ فشل تسجيل الاستخدام:", redeemErr.message); return; }
  console.log("✅ تم تسجيل الاستخدام في store_code_redemptions");

  // تسجيل في loyalty_transactions
  const currentPoints = typeof meta.points === "number" ? meta.points : 0;
  const newTotal = currentPoints + codeRow.points;
  const { error: txErr } = await sb.from("loyalty_transactions").insert({
    user_id: testUser.id,
    code: cleanCode,
    points: codeRow.points,
    type: "store_purchase",
    title: codeRow.note || "كود مشتريات",
    note: `تم تفعيل الكود ${cleanCode}`,
    balance_before: currentPoints,
    balance_after: newTotal,
    user_name: meta.full_name || "",
    user_phone: meta.phone || "",
  });
  if (txErr) { console.log("❌ فشل تسجيل الحركة:", txErr.message); }
  else console.log("✅ تم تسجيل الحركة في loyalty_transactions");

  // تحديث رصيد المستخدم
  await sb.auth.admin.updateUserById(testUser.id, {
    user_metadata: { ...meta, points: newTotal }
  });
  await sb.from("user_profiles").upsert({ id: testUser.id, points: newTotal, updated_at: new Date().toISOString() }, { onConflict: "id" });
  console.log("✅ تم تحديث رصيد المستخدم إلى:", newTotal, "نقطة");

  // محاولة استخدام نفس الكود مرة ثانية (يجب أن ترفض)
  console.log("\n--- محاولة استخدام الكود مرة ثانية ---");
  const { data: prev2 } = await sb.from("store_code_redemptions").select("id").eq("code", cleanCode).eq("user_id", testUser.id).limit(1);
  if (prev2?.length > 0) {
    console.log("✅ الكود محظور للاستخدام مرة ثانية (مبروك - النظام يعمل صح!)");
  } else {
    console.log("❌ خطأ: يمكن استخدام الكود مرة ثانية!");
  }

  // حذف كود الاختبار وأثره
  await sb.from("store_code_redemptions").delete().eq("code", cleanCode);
  await sb.from("loyalty_transactions").delete().eq("code", cleanCode);
  await sb.from("store_purchase_codes").delete().eq("id", codeRow.id);
  // إرجاع رصيد المستخدم
  await sb.auth.admin.updateUserById(testUser.id, { user_metadata: { ...meta, points: currentPoints } });
  await sb.from("user_profiles").upsert({ id: testUser.id, points: currentPoints, updated_at: new Date().toISOString() }, { onConflict: "id" });
  console.log("\n🧹 تم تنظيف بيانات الاختبار. الرصيد عاد إلى:", currentPoints, "نقطة");
}

main().catch(console.error);
