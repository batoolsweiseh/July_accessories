import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { phone, code, regionCode } = await request.json();

    if (!phone || !code || !regionCode) {
      return NextResponse.json(
        { success: false, error: "البيانات ناقصة" },
        { status: 400 }
      );
    }

    const fullPhone = `${regionCode}${phone.replace(/^0+/, "")}`.replace(/\+/g, "");
    const messageBody = `رمز التحقق الخاص بك لمتجر July Accessories هو: ${code}`;

    // 1. محاولة الإرسال عبر واتساب (UltraMsg)
    const ultraInstance = process.env.ULTRAMSG_INSTANCE_ID;
    const ultraToken = process.env.ULTRAMSG_TOKEN;

    if (ultraInstance && ultraToken) {
      const url = `https://api.ultramsg.com/${ultraInstance}/messages/chat`;
      const params = new URLSearchParams({
        token: ultraToken,
        to: fullPhone,
        body: messageBody,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const data = await res.json();
      if (data.sent === "true" || data.success) {
        return NextResponse.json({ success: true, provider: "ultramsg" });
      }
    }

    // 2. محاولة الإرسال عبر SMS (Twilio)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioAuthToken && twilioPhone) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const auth = Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString("base64");

      const params = new URLSearchParams({
        To: `+${fullPhone}`,
        From: twilioPhone,
        Body: messageBody,
      });

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (res.ok) {
        return NextResponse.json({ success: true, provider: "twilio" });
      }
    }

    // إذا لم تكن الإعدادات موجودة
    console.log(`[DEV MODE] OTP Code not sent to network. Set up ULTRAMSG or TWILIO keys in .env. Code: ${code} for ${fullPhone}`);
    return NextResponse.json({
      success: false,
      error: "لم يتم تكوين إعدادات الواتساب أو الرسائل (انظر لملف البيئة .env)",
      devMode: true,
      code, // إرجاع الكود في وضع التطوير فقط لتسهيل الفحص
    });
  } catch (error: any) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
