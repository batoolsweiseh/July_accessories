import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const revalidate = 60; // كاش لمدة 60 ثانية لحماية قاعدة البيانات من الضغط العالي

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};
const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};
const getHeaders = (data: any[] | null) => (data && data.length > 0 ? cacheHeaders : noStoreHeaders);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const categories = searchParams.get("categories");
  const ids = searchParams.get("ids");

  if (!category && !categories && !ids) {
    return NextResponse.json({ data: [] }, { headers: noStoreHeaders });
  }

  try {
    if (ids) {
      const idArray = ids.split(",");
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, name, price, category_slug, image_url, is_featured, in_stock")
        .in("id", idArray);
      if (error) throw error;
      return NextResponse.json({ data: data || [] }, { headers: getHeaders(data) });
    }

    // دعم الاستعلام المتعدد لتصنيفات مجمعة في طلب واحد
    const multiCats = categories || (category?.includes(",") ? category : null);
    if (multiCats) {
      const catList = multiCats.split(",").map((c) => c.trim().toLowerCase());
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, name, price, category_slug, image_url, is_featured, in_stock, description")
        .in("category_slug", catList)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ data: data || [] }, { headers: getHeaders(data) });
    }

    const normalizedCategory = category ? category.trim() : "";

    let query = supabaseAdmin
      .from("products")
      .select(
        "id, name, price, category_slug, image_url, is_featured, in_stock, description"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (normalizedCategory) {
      query = query.ilike("category_slug", `%${normalizedCategory}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [] }, { headers: getHeaders(data) });
  } catch (error: any) {
    console.error("products API error:", error);
    return NextResponse.json({ data: [], error: error.message }, { status: 500, headers: noStoreHeaders });
  }
}

