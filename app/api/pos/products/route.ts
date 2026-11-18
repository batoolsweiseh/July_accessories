import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";

    let query = supabaseAdmin
      .from("products")
      .select("id, name, price, category_slug, subcategory_id, image_url, in_stock, is_featured")
      .order("name", { ascending: true })
      .limit(300);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (category && category !== "all") {
      query = query.eq("category_slug", category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
