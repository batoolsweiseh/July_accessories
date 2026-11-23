-- ============================================================
-- إعداد قاعدة البيانات الشاملة لمتجر July Accessories (المشروع الجديد)
-- الصقي هذا الكود بالكامل في Supabase -> SQL Editor ثم اضغطي RUN
-- ============================================================

-- 1. جدول التصنيفات الرئيسية
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول التصنيفات الفرعية
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug TEXT REFERENCES public.categories(slug) ON DELETE CASCADE,
  title_ar TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول المنتجات
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  whatsapp_message TEXT,
  category_slug TEXT,
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول الطلبات
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  customer_phone TEXT,
  customer_city TEXT,
  product_id UUID,
  product_name TEXT,
  product_price NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. جداول نظام الولاء والنقاط
CREATE TABLE IF NOT EXISTS public.store_purchase_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  usage_type TEXT NOT NULL DEFAULT 'once_per_user',
  max_uses_per_user INTEGER NOT NULL DEFAULT 1,
  used_by UUID,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT
);

CREATE TABLE IF NOT EXISTS public.store_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id UUID REFERENCES public.store_purchase_codes(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_phone TEXT,
  points INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_code_user UNIQUE (code, user_id)
);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  code TEXT,
  points INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'store_purchase',
  title TEXT,
  note TEXT,
  balance_before INTEGER,
  balance_after INTEGER,
  user_name TEXT,
  user_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  points_required INTEGER NOT NULL DEFAULT 100,
  description TEXT NOT NULL DEFAULT '',
  month_tag TEXT NOT NULL DEFAULT 'جوائز هذا الشهر',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  icon TEXT DEFAULT 'fa-gift',
  image TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- إدخال الأقسام الافتراضية
-- ============================================================
INSERT INTO public.categories (slug, title_ar, title_en) VALUES
  ('accessories', 'إكسسوارات', 'ACCESSORIES'),
  ('sets', 'أطقم إكسسوارات', 'ACCESSORIES SETS'),
  ('bags', 'شنط', 'BAGS'),
  ('watches', 'ساعات', 'WATCHES'),
  ('wheel_settings', '[]', 'WHEEL_SETTINGS')
ON CONFLICT (slug) DO NOTHING;

-- إدخال الأقسام الفرعية الافتراضية
INSERT INTO public.subcategories (category_slug, title_ar) VALUES
  ('accessories', 'أساور'),
  ('accessories', 'خاتم شبيه ذهب'),
  ('accessories', 'خاتم ماركة'),
  ('accessories', 'سنسال'),
  ('accessories', 'حلق كبس'),
  ('accessories', 'حلق طويل'),
  ('accessories', 'خلخال'),
  ('accessories', 'دبل'),
  ('accessories', 'أطقم أساور'),
  ('sets', 'أطقم شبيه الذهب'),
  ('sets', 'أطقم ماركات'),
  ('sets', 'أطقم نواعم'),
  ('bags', 'حقائب صغيرة'),
  ('bags', 'حقائب متوسطة'),
  ('bags', 'حقائب كبيرة'),
  ('watches', 'ساعات ماركة ستاتي'),
  ('watches', 'ساعات ماركة رجالي'),
  ('watches', 'ساعات شبيه ماركة ستاتي'),
  ('watches', 'ساعات شبيه ماركة رجالي')
ON CONFLICT DO NOTHING;

-- ============================================================
-- تفعيل سياسات الأمان والقراءة العامة (RLS)
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_purchase_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;

-- سياسات القراءة العامة
DROP POLICY IF EXISTS "Public categories read" ON public.categories;
CREATE POLICY "Public categories read" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public subcategories read" ON public.subcategories;
CREATE POLICY "Public subcategories read" ON public.subcategories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public products read" ON public.products;
CREATE POLICY "Public products read" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public rewards read" ON public.loyalty_rewards;
CREATE POLICY "Public rewards read" ON public.loyalty_rewards FOR SELECT USING (true);

-- صلاحيات كاملة للـ Service Role
DROP POLICY IF EXISTS "Service role all categories" ON public.categories;
CREATE POLICY "Service role all categories" ON public.categories FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role all subcategories" ON public.subcategories;
CREATE POLICY "Service role all subcategories" ON public.subcategories FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role all products" ON public.products;
CREATE POLICY "Service role all products" ON public.products FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role all orders" ON public.orders;
CREATE POLICY "Service role all orders" ON public.orders FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role all codes" ON public.store_purchase_codes;
CREATE POLICY "Service role all codes" ON public.store_purchase_codes FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role all redemptions" ON public.store_code_redemptions;
CREATE POLICY "Service role all redemptions" ON public.store_code_redemptions FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role all transactions" ON public.loyalty_transactions;
CREATE POLICY "Service role all transactions" ON public.loyalty_transactions FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role all profiles" ON public.user_profiles;
CREATE POLICY "Service role all profiles" ON public.user_profiles FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role all rewards" ON public.loyalty_rewards;
CREATE POLICY "Service role all rewards" ON public.loyalty_rewards FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- إنشاء Storage Bucket لصور المنتجات
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read storage products" ON storage.objects;
CREATE POLICY "Public read storage products" ON storage.objects FOR SELECT USING (bucket_id = 'products');

DROP POLICY IF EXISTS "Service role full access storage products" ON storage.objects;
CREATE POLICY "Service role full access storage products" ON storage.objects FOR ALL USING (bucket_id = 'products' AND auth.role() = 'service_role');
