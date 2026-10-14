-- ============================================================
-- جداول نظام النقاط والجوائز لمحل July Accessories
-- شغّلي هذا الـ SQL في Supabase → SQL Editor
-- ============================================================

-- 1. جدول أكواد مشتريات المحل
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

-- 2. جدول حركات النقاط للمستخدمين
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  code       TEXT,
  points     INTEGER NOT NULL,
  type       TEXT NOT NULL DEFAULT 'store_purchase',
  title      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول الجوائز الشهرية
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

-- تعطيل Row Level Security (الأدمن فقط يوصل عبر Service Role)
ALTER TABLE public.store_purchase_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards       DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Migration: إضافة عمود image إذا كان الجدول موجوداً مسبقاً
-- شغّلي هذا السطر فقط إذا الجدول كان موجوداً قبل هذا التحديث
-- ============================================================
-- ALTER TABLE public.loyalty_rewards ADD COLUMN IF NOT EXISTS image TEXT DEFAULT NULL;
