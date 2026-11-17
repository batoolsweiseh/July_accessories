import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isAdmin = searchParams.get("admin") === "1";

  try {
    const { data, error } = await supabaseAdmin
      .from("categories")
      .select("title_ar")
      .eq("slug", "wheel_settings")
      .single();

    if (error || !data || !data.title_ar) {
      return NextResponse.json({ segments: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const segments = JSON.parse(data.title_ar);
    const valid = Array.isArray(segments) && segments.length > 0;
    const headers = isAdmin
      ? { "Cache-Control": "no-store, no-cache, must-revalidate" }
      : { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

    return NextResponse.json(
      { segments: valid ? segments : [] },
      { headers: valid ? headers : { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ segments: [] }, { headers: { "Cache-Control": "no-store" } });
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

    try {
      revalidatePath("/api/wheel-segments");
      revalidatePath("/");
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving wheel segments:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
