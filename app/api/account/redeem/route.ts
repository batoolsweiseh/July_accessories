import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redeemStorePurchaseCode } from "@/lib/loyalty";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("customer_session")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول أولاً لإضافة النقاط إلى حسابك" },
        { status: 401 }
      );
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "انتهت جلسة تسجيل الدخول، يرجى إعادة تسجيل الدخول" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { code } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { success: false, error: "يرجى كتابة كود مشتريات المحل" },
        { status: 400 }
      );
    }

    const result = await redeemStorePurchaseCode(user.id, code);

    return NextResponse.json({
      success: true,
      pointsAdded: result.pointsAdded,
      totalPoints: result.totalPoints,
      history: result.history,
      message: `تمت إضافة ${result.pointsAdded} نقطة بنجاح إلى رصيدك!`,
    });
  } catch (err: any) {
    console.error("Account redeem error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "حدث خطأ أثناء معالجة الكود. يرجى المحاولة مرة أخرى.",
      },
      { status: 400 }
    );
  }
}
