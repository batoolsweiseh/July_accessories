import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export const revalidate = 300; // كاش 5 دقائق لحماية السيرفر

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1200",
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("title_ar")
      .eq("slug", "wheel_settings")
      .single();

    if (error || !data || !data.title_ar) {
      return NextResponse.json({ segments: [] }, { headers: cacheHeaders });
    }

    const segments = JSON.parse(data.title_ar);
    return NextResponse.json({ segments: Array.isArray(segments) ? segments : [] }, { headers: cacheHeaders });
  } catch {
    return NextResponse.json({ segments: [] }, { headers: cacheHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const { segments } = await request.json();
    if (!Array.isArray(segments)) {
      return NextResponse.json({ error: "Invalid segments data" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("categories").upsert(
      {
        slug: "wheel_settings",
        title_ar: JSON.stringify(segments),
        title_en: "WHEEL_SETTINGS",
      },
      { onConflict: "slug" }
    );

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving wheel segments:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
