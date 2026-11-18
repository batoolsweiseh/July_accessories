-- ============================================================
-- نظام نقاط البيع (POS) لمتجر July Accessories
-- جداول المبيعات وبنود الفواتير في Supabase
-- ============================================================

-- 1. جدول عمليات البيع الرئيسية (POS Sales)
CREATE TABLE IF NOT EXISTS public.pos_sales (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  TEXT UNIQUE NOT NULL,
  cashier_name    TEXT DEFAULT 'الكاشير العام',
  subtotal        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount        NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total           NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(10, 2) NOT NULL DEFAULT 0,
  change_amount   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL DEFAULT 'cash',
  items_count     INTEGER NOT NULL DEFAULT 0,
  customer_phone  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول عناصر وبنود الفاتورة (POS Sale Items)
CREATE TABLE IF NOT EXISTS public.pos_sale_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id         UUID NOT NULL REFERENCES public.pos_sales(id) ON DELETE CASCADE,
  product_id      TEXT,
  product_name    TEXT NOT NULL,
  unit_price      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quantity        INTEGER NOT NULL DEFAULT 1,
  line_total      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  category_slug   TEXT,
  image_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء الفهارس لتحسين سرعة الاستعلامات والبحث
CREATE INDEX IF NOT EXISTS idx_pos_sales_invoice_number ON public.pos_sales(invoice_number);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created_at ON public.pos_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale_id ON public.pos_sale_items(sale_id);

-- تفعيل سياسات الأمان RLS
ALTER TABLE public.pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sale_items ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول (السماح بعمليات القراءة والكتابة للمشرفين والـ Service Role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pos_sales' AND policyname = 'Enable all operations for pos_sales'
  ) THEN
    CREATE POLICY "Enable all operations for pos_sales" ON public.pos_sales
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pos_sale_items' AND policyname = 'Enable all operations for pos_sale_items'
  ) THEN
    CREATE POLICY "Enable all operations for pos_sale_items" ON public.pos_sale_items
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
