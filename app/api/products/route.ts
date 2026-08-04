import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const ids = searchParams.get("ids");

  if (!category && !ids) {
    return NextResponse.json({ data: [] });
  }

  try {
    if (ids) {
      const idArray = ids.split(",");
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, name, price, category_slug, image_url, is_featured, in_stock")
        .in("id", idArray);
      if (error) throw error;
      return NextResponse.json({ data: data || [] });
    }

    let query = supabaseAdmin
      .from("products")
      .select(
        "id, name, price, category_slug, image_url, is_featured, in_stock, description"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (category === "bags") {
      query = query.eq("category_slug", "bags");
    } else {
      query = query.eq("category_slug", category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error("products API error:", error);
    return NextResponse.json({ data: [], error: error.message }, { status: 500 });
  }
}
