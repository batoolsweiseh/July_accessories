import { NextResponse } from "next/server";
import { getLoyaltyRewards } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";
    const rewards = await getLoyaltyRewards(!showAll);

    return NextResponse.json({
      success: true,
      rewards,
    });
  } catch (err: any) {
    console.error("Error fetching rewards:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
