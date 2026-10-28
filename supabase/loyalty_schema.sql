-- ============================================================
-- نظام النقاط وأكواد الخصم والجوائز لمحل July Accessories
-- شغّلي هذا الـ SQL في Supabase → SQL Editor
-- ملاحظة: تم تصميم هذا الملف بطريقة آمنة تماماً ولا يحذف أي بيانات قديمة
-- ============================================================

-- 1. جدول أكواد المشتريات والخصم
CREATE TABLE IF NOT EXISTS public.store_purchase_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  points      INTEGER NOT NULL DEFAULT 0,
  is_used     BOOLEAN NOT NULL DEFAULT FALSE,
  used_by     UUID,
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  note        TEXT
);

-- إضافة الأعمدة الجديدة للأكواد إن لم تكن موجودة مسبقاً
ALTER TABLE public.store_purchase_codes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.store_purchase_codes ADD COLUMN IF NOT EXISTS usage_type TEXT NOT NULL DEFAULT 'once_per_user';
ALTER TABLE public.store_purchase_codes ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER NOT NULL DEFAULT 1;

-- 2. جدول تسجيل استخدام الأكواد لكل مستخدم (يمنع تكرار استخدام الكود لنفس المستخدم نهائياً)
CREATE TABLE IF NOT EXISTS public.store_code_redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id     UUID REFERENCES public.store_purchase_codes(id) ON DELETE SET NULL,
  code        TEXT NOT NULL,
  user_id     UUID NOT NULL,
  user_name   TEXT,
  user_phone  TEXT,
  points      INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_code_user UNIQUE (code, user_id)
);

-- 3. جدول حركات وسجل النقاط للمستخدمين
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,
  code           TEXT,
  points         INTEGER NOT NULL,
  type           TEXT NOT NULL DEFAULT 'store_purchase', -- 'store_purchase', 'admin_adjustment', 'reward'
  title          TEXT,
  note           TEXT,
  balance_before INTEGER,
  balance_after  INTEGER,
  user_name      TEXT,
  user_phone     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة الأعمدة الجديدة لسجل الحركات إن لم تكن موجودة
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS balance_before INTEGER;
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS balance_after INTEGER;
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS user_phone TEXT;

-- 4. جدول بيانات وملفات المستخدمين والنقاط
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY, -- مطابق لـ auth.users.id
  full_name   TEXT,
  phone       TEXT,
  email       TEXT,
  points      INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جدول الجوائز الشهرية
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  points_required INTEGER NOT NULL DEFAULT 100,
  description     TEXT NOT NULL DEFAULT '',
  month_tag       TEXT NOT NULL DEFAULT 'جوائز هذا الشهر',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  icon            TEXT DEFAULT 'fa-gift',
  image           TEXT DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- تفعيل سياسات الأمان والحماية (Row Level Security - RLS)
-- ============================================================

ALTER TABLE public.store_purchase_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- السماح لـ Service Role (الخادم) بكافة الصلاحيات
DROP POLICY IF EXISTS "Service role has full access to codes" ON public.store_purchase_codes;
CREATE POLICY "Service role has full access to codes" ON public.store_purchase_codes
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to redemptions" ON public.store_code_redemptions;
CREATE POLICY "Service role has full access to redemptions" ON public.store_code_redemptions
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to transactions" ON public.loyalty_transactions;
CREATE POLICY "Service role has full access to transactions" ON public.loyalty_transactions
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to user_profiles" ON public.user_profiles;
CREATE POLICY "Service role has full access to user_profiles" ON public.user_profiles
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role has full access to rewards" ON public.loyalty_rewards;
CREATE POLICY "Service role has full access to rewards" ON public.loyalty_rewards
  FOR ALL USING (auth.role() = 'service_role');

-- المستخدم العادي يستطيع فقط قراءة الجوائز النشطة وقراءة سجلاته وبياناته هو فقط دون تعديلها
DROP POLICY IF EXISTS "Public can view active rewards" ON public.loyalty_rewards;
CREATE POLICY "Public can view active rewards" ON public.loyalty_rewards
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can view own transactions" ON public.loyalty_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.store_code_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.store_code_redemptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- ============================================================
-- خطة التراجع الآمنة (Rollback Plan) - في حال الرغبة في التراجع:
-- ============================================================
-- DROP TABLE IF EXISTS public.store_code_redemptions;
-- DROP TABLE IF EXISTS public.user_profiles;
-- ALTER TABLE public.store_purchase_codes DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE public.store_purchase_codes DROP COLUMN IF EXISTS usage_type;
-- ALTER TABLE public.store_purchase_codes DROP COLUMN IF EXISTS max_uses_per_user;
-- ALTER TABLE public.loyalty_transactions DROP COLUMN IF EXISTS note;
-- ALTER TABLE public.loyalty_transactions DROP COLUMN IF EXISTS balance_before;
-- ALTER TABLE public.loyalty_transactions DROP COLUMN IF EXISTS balance_after;
-- ALTER TABLE public.loyalty_transactions DROP COLUMN IF EXISTS user_name;
-- ALTER TABLE public.loyalty_transactions DROP COLUMN IF EXISTS user_phone;
