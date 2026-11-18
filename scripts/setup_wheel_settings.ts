// ---------------------------------------------------------------
//  script: setup_wheel_settings.ts
//  purpose: insert (or upsert) the wheel‑settings row in Supabase
// ---------------------------------------------------------------
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);


// ----------------- 1️⃣ عدّل المقاطع إذا رغبت -----------------
const defaultSegments = [
  { label: "خصم 10%", color: "#FF5733", probability: 0.05 },
  { label: "خصم 20%", color: "#33C1FF", probability: 0.10 },
  { label: "خصم 30%", color: "#8DFF33", probability: 0.10 },
  { label: "هدية مجانية", color: "#FF33A8", probability: 0.15 },
  { label: "لفّة ثانية", color: "#FFC733", probability: 0.20 },
  { label: "نقطة ولاء", color: "#33FFDD", probability: 0.40 },
];

// ----------------- 2️⃣ تحويل إلى JSON -----------------
const titleArJson = JSON.stringify(defaultSegments);

// ----------------- 3️⃣ Upsert الصف في جدول `categories` ----------
async function upsertWheelSettings() {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .upsert(
      [
        {
          slug: 'wheel_settings',          // المفتاح المعرّف للدوّار
          title_ar: titleArJson,           // ما يقره الـ API
          title_en: 'WHEEL_SETTINGS',     // اختياري لتفادي أخطاء الترجمة
        },
      ],
      { onConflict: 'slug' }               // استبدال إذا كان موجودًا مسبقًا
    );

  if (error) {
    console.error('❌ فشل إدخال wheel_settings:', error);
    process.exit(1);
  } else {
    console.log('✅ تم إدخال/تحديث wheel_settings بنجاح:', data);
  }
}

// ----------------- 4️⃣ تشغيل الدالة -----------------
upsertWheelSettings()
  .then(() => console.log('⚡️ الانتهاء'))
  .catch((e) => console.error('⚠️ خطأ غير متوقع:', e));