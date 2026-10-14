import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { claimLoyaltyReward } from "@/lib/loyalty";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("customer_session")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "يجب تسجيل الدخول أولاً لاستبدال المكافأة" },
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
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد المكافأة المراد استبدالها" },
        { status: 400 }
      );
    }

    const result = await claimLoyaltyReward(user.id, rewardId);

    return NextResponse.json({
      success: true,
      rewardTitle: result.rewardTitle,
      pointsDeducted: result.pointsDeducted,
      remainingPoints: result.remainingPoints,
      claimCode: result.claimCode,
      history: result.history,
      message: `مبروك! تم استبدال ${result.pointsDeducted} نقطة بنجاح، رصيدك الآن: ${result.remainingPoints} نقطة. كود الاستلام: ${result.claimCode}`,
    });
  } catch (err: any) {
    console.error("Claim reward error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "حدث خطأ أثناء استبدال المكافأة. يرجى المحاولة مرة أخرى.",
      },
      { status: 400 }
    );
  }
}
