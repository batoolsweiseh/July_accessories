-- جدول أكواد مشتريات المحل (اختياري إضافي في Supabase)
CREATE TABLE IF NOT EXISTS public.store_purchase_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  purchase_amount NUMERIC,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  used_by UUID,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

-- جدول حركات النقاط للمستخدمين
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT,
  points INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'store_purchase',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
