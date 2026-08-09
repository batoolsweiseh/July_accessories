import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const ids = searchParams.get("ids");

  if (!category && !ids) {
    return NextResponse.json({ data: [] }, { headers: noCacheHeaders });
  }

  try {
    if (ids) {
      const idArray = ids.split(",");
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, name, price, category_slug, image_url, is_featured, in_stock")
        .in("id", idArray);
      if (error) throw error;
      return NextResponse.json({ data: data || [] }, { headers: noCacheHeaders });
    }

    const normalizedCategory = category ? category.trim() : "";

    let query = supabaseAdmin
      .from("products")
      .select(
        "id, name, price, category_slug, image_url, is_featured, in_stock, description"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    // Use case-insensitive partial match so deployed category parameter
    // still finds products if casing or minor differences exist.
    if (normalizedCategory) {
      query = query.ilike("category_slug", `%${normalizedCategory}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [] }, { headers: noCacheHeaders });
  } catch (error: any) {
    console.error("products API error:", error);
    return NextResponse.json({ data: [], error: error.message }, { status: 500, headers: noCacheHeaders });
  }
}

