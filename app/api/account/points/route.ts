import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserLoyalty } from "@/lib/loyalty";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("customer_session")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول أولاً" },
        { status: 401 }
      );
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json(
        { success: false, error: "جلسة المستخدم غير صالحة" },
        { status: 401 }
      );
    }

    const { points, history } = await getUserLoyalty(user.id);

    return NextResponse.json({
      success: true,
      points,
      history,
    });
  } catch (err: any) {
    console.error("Account points error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "حدث خطأ أثناء جلب النقاط" },
      { status: 500 }
    );
  }
}
