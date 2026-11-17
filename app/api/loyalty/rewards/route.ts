import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    // جلب الجوائز مباشرة بدون فلترة is_active عند showAll
    let query = supabaseAdmin
      .from("loyalty_rewards")
      .select("*")
      .order("points_required", { ascending: true });

    // للصفحة العامة: نجيب كل الجوائز (is_active = true أو false)
    // ونصفيها على مستوى الواجهة
    // ما نضع فلتر is_active هنا لأن service_role يتجاوز RLS
    if (!showAll) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("loyalty_rewards fetch error:", error.message, error.code);
      // إذا الجدول غير موجود، أرجع قائمة فارغة بدل خطأ
      if (error.code === "42P01" || error.message?.includes("does not exist")) {
        return NextResponse.json({ success: true, rewards: [], tableNotFound: true });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const rewards = data || [];

    return NextResponse.json(
      {
        success: true,
        rewards,
        count: rewards.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (err: any) {
    console.error("Error fetching rewards:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
