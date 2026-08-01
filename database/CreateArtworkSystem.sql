-- ============================================================
-- FILE: CreateArtworkSystem.sql
-- DESC: Complete product catalog system (products, categories, subcategories)
-- ============================================================

-- ── Categories table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  slug       VARCHAR(255) PRIMARY KEY,
  title_ar   VARCHAR(255) NOT NULL,
  title_en   VARCHAR(255),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Subcategories table ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subcategories (
  id            UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_slug VARCHAR(255) NOT NULL REFERENCES categories(slug) ON DELETE CASCADE,
  title_ar      VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Products table ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(255)   NOT NULL CHECK (LENGTH(TRIM(name)) >= 2),
  description      TEXT,
  price            DECIMAL(10,2)  NOT NULL CHECK (price > 0),
  category_slug    VARCHAR(255)   NOT NULL REFERENCES categories(slug) ON DELETE RESTRICT,
  subcategory_id   UUID           REFERENCES subcategories(id) ON DELETE SET NULL,
  artist_id        UUID           NOT NULL REFERENCES users(id), -- maintains link to users/artists for backend compatibility
  is_featured      BOOLEAN        NOT NULL DEFAULT FALSE,
  in_stock         BOOLEAN        NOT NULL DEFAULT TRUE,
  image_url        TEXT,
  whatsapp_message TEXT,
  is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_category_slug ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_artist_id ON products(artist_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- ── Auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_subcategories_updated_at ON subcategories;
CREATE TRIGGER trg_subcategories_updated_at
  BEFORE UPDATE ON subcategories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();