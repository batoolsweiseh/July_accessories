import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const revalidate = 120; // كاش لمدة دقيقتين لتخفيف الحمل عن قاعدة البيانات

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
};
const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export interface SubcategoriesSettings {
  hidden_ids: string[];
  hidden_categories?: string[];
  auto_hide_empty: boolean;
}

const DEFAULT_SETTINGS: SubcategoriesSettings = {
  hidden_ids: [],
  hidden_categories: [],
  auto_hide_empty: false,
};

export async function GET() {
  try {
    const [settingsRes, subcategoriesRes, productsRes] = await Promise.all([
      supabaseAdmin
        .from("categories")
        .select("title_ar")
        .eq("slug", "subcategories_settings")
        .maybeSingle(),
      supabaseAdmin
        .from("subcategories")
        .select("id, category_slug, title_ar")
        .order("title_ar"),
      supabaseAdmin
        .from("products")
        .select("id, subcategory_id, in_stock"),
    ]);

    let parsedSettings = DEFAULT_SETTINGS;
    if (!settingsRes.error && settingsRes.data && settingsRes.data.title_ar) {
      try {
        const parsed = JSON.parse(settingsRes.data.title_ar);
        parsedSettings = {
          hidden_ids: Array.isArray(parsed.hidden_ids) ? parsed.hidden_ids : [],
          hidden_categories: Array.isArray(parsed.hidden_categories) ? parsed.hidden_categories : [],
          auto_hide_empty: !!parsed.auto_hide_empty,
        };
      } catch {
        parsedSettings = DEFAULT_SETTINGS;
      }
    }

    const hiddenSet = new Set(parsedSettings.hidden_ids);
    const hiddenCategorySet = new Set(parsedSettings.hidden_categories || []);
    const subcategories = subcategoriesRes.data || [];
    const products = productsRes.data || [];

    // Calculate in-stock count per subcategory
    const inStockPerSubcategory: Record<string, number> = {};
    for (const p of products) {
      if (p.subcategory_id && p.in_stock !== false) {
        inStockPerSubcategory[p.subcategory_id] = (inStockPerSubcategory[p.subcategory_id] || 0) + 1;
      }
    }

    // Determine visible subcategories per category
    const visibleSubcategoriesByCategory: Record<string, string[]> = {
      accessories: [],
      sets: [],
      bags: [],
      watches: [],
    };

    for (const sub of subcategories) {
      const isExplicitlyHidden = hiddenSet.has(sub.id) || hiddenSet.has(sub.title_ar);
      const isAutoHidden = parsedSettings.auto_hide_empty && (inStockPerSubcategory[sub.id] || 0) === 0;

      if (!isExplicitlyHidden && !isAutoHidden) {
        const catSlug = sub.category_slug;
        if (!hiddenCategorySet.has(catSlug)) {
          if (!visibleSubcategoriesByCategory[catSlug]) {
            visibleSubcategoriesByCategory[catSlug] = [];
          }
          visibleSubcategoriesByCategory[catSlug].push(sub.title_ar);
        }
      }
    }

    return NextResponse.json(
      {
        hidden_ids: parsedSettings.hidden_ids,
        hidden_categories: parsedSettings.hidden_categories || [],
        auto_hide_empty: parsedSettings.auto_hide_empty,
        visible_subcategories_by_category: visibleSubcategoriesByCategory,
        subcategories: subcategories,
      },
      { headers: subcategories.length > 0 ? cacheHeaders : noStoreHeaders }
    );
  } catch (err: any) {
    console.error("Error in GET /api/subcategories-settings:", err);
    return NextResponse.json(
      {
        ...DEFAULT_SETTINGS,
        visible_subcategories_by_category: {},
        subcategories: [],
      },
      { headers: noStoreHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings: SubcategoriesSettings = {
      hidden_ids: Array.isArray(body.hidden_ids) ? body.hidden_ids : [],
      hidden_categories: Array.isArray(body.hidden_categories) ? body.hidden_categories : [],
      auto_hide_empty: !!body.auto_hide_empty,
    };

    const { error } = await supabaseAdmin.from("categories").upsert(
      {
        slug: "subcategories_settings",
        title_ar: JSON.stringify(settings),
        title_en: "SUBCATEGORIES_SETTINGS",
      },
      { onConflict: "slug" }
    );

    if (error) {
      throw error;
    }

    revalidatePath("/");
    revalidatePath("/category/[slug]", "page");
    revalidatePath("/admin");

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("Error in POST /api/subcategories-settings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
