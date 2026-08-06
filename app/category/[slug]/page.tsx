import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CategoryClient from "./CategoryClient";

export const dynamic = "force-dynamic";

/* ─── بيانات الفئات الاحتياطية ─────────────────────────────────────── */
type CategoryInfo = {
  title: string;
  subtitle: string;
  subcategories: string[];
};

const categoryData: Record<string, CategoryInfo> = {
  accessories: {
    title: "إكسسوارات",
    subtitle: "ACCESSORIES",
    subcategories: [
      "أساور",
      "خاتم شبيه ذهب",
      "خاتم ماركة",
      "سنسال",
      "حلق كبس",
      "حلق طويل",
      "خلخال",
      "دبل",
      "أطقم أساور",
    ],
  },
  sets: {
    title: "أطقم إكسسوارات",
    subtitle: "ACCESSORIES SETS",
    subcategories: ["أطقم شبيه الذهب", "أطقم ماركات", "أطقم نواعم"],
  },
  bags: {
    title: "شنط",
    subtitle: "BAGS",
    subcategories: ["حقائب صغيرة", "حقائب متوسطة", "حقائب كبيرة"],
  },
  watches: {
    title: "ساعات",
    subtitle: "WATCHES",
    subcategories: [
      "ساعات ماركة ستاتي",
      "ساعات ماركة رجالي",
      "ساعات شبيه ماركة ستاتي",
      "ساعات شبيه ماركة رجالي",
    ],
  },
};

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  // 1. Fetch category from Supabase or fallback to local data
  const { data: category } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .single();

  const fallbackCategory = categoryData[slug];
  if (!category && !fallbackCategory) {
    notFound();
  }

  const categoryTitle = category?.title_ar || fallbackCategory?.title || "";
  const categorySubtitle = category?.title_en || fallbackCategory?.subtitle || "";

  const normalizedSlug = slug.trim().toLowerCase();

  // 2. Fetch subcategories from Supabase (use admin to bypass RLS)
  const { data: dbSubcategories, error: subcategoriesError } = await supabaseAdmin
    .from("subcategories")
    .select("id, title_ar, category_slug")
    .ilike("category_slug", `%${normalizedSlug}%`);

  if (subcategoriesError) {
    console.error("Error fetching subcategories from Supabase:", subcategoriesError);
  }

  const subcategories = dbSubcategories && dbSubcategories.length > 0
    ? dbSubcategories.map((s) => s.title_ar)
    : fallbackCategory?.subcategories || [];

  // 3. Fetch products from Supabase (use admin to bypass RLS)
  let { data: dbProducts, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .ilike("category_slug", `%${normalizedSlug}%`);

  if (error) {
    console.error("Error fetching products from Supabase:", error);
  }

  if ((!dbProducts || dbProducts.length === 0) && dbSubcategories && dbSubcategories.length > 0) {
    const subcategoryIds = dbSubcategories.map((s) => s.id);
    const { data: fallbackProducts, error: fallbackProductsError } = await supabaseAdmin
      .from("products")
      .select("*")
      .in("subcategory_id", subcategoryIds)
      .order("created_at", { ascending: false })
      .limit(100);

    if (fallbackProductsError) {
      console.error("Error fetching fallback products from Supabase:", fallbackProductsError);
    }

    if (fallbackProducts && fallbackProducts.length > 0) {
      dbProducts = fallbackProducts;
    }
  }

  const productsData = dbProducts || [];

  const subcategoryMap = new Map(
    (dbSubcategories || []).map((s: any) => [s.id, s.title_ar])
  );

  // Map database products to the layout structure
  const products = productsData.map((p: any) => {
    const desc = p.description || "";
    const isNew = desc.includes("[tag:new]");
    const isTrending = desc.includes("[tag:trending]");
    const subcategoryTitle = subcategoryMap.get(p.subcategory_id) || "عام";

    return {
      id: p.id,
      name: p.name,
      price: Number(p.price),
      subcategory: subcategoryTitle,
      image: p.image_url || "/images/placeholder.jpg",
      isFeatured: !!p.is_featured,
      isNew,
      isTrending,
    };
  });

  return (
    <>
      <Header />
      <CategoryClient
        categoryTitle={categoryTitle}
        categorySubtitle={categorySubtitle}
        subcategories={subcategories}
        products={products}
      />
      <Footer />
    </>
  );
}
