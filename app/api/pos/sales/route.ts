import { NextResponse } from "next/server";
import { savePosSale, getPosSales, generateInvoiceNumber } from "@/lib/pos";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getPosSales({ date, search });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "فشل جلب سجل المبيعات" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      items,
      discount = 0,
      amount_received = 0,
      payment_method = "cash",
      cashier_name = "الكاشير",
      customer_phone,
      notes,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "السلة فارغة. يجب إضافة منتجات لإتمام البيع." },
        { status: 400 }
      );
    }

    // 1. Server-side validation of products and current prices
    const productIds = items.map((i: any) => i.id);
    const { data: dbProducts, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price, category_slug, image_url, in_stock")
      .in("id", productIds);

    if (pErr) {
      console.error("POS server product check error:", pErr);
    }

    const dbMap = new Map((dbProducts || []).map((p: any) => [p.id, p]));

    let calculatedSubtotal = 0;
    const validatedItems = items.map((item: any) => {
      const dbProduct = dbMap.get(item.id);
      const unitPrice = dbProduct ? Number(dbProduct.price) : Number(item.price);
      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      const lineTotal = Number((unitPrice * qty).toFixed(2));
      calculatedSubtotal += lineTotal;

      return {
        id: item.id,
        name: dbProduct?.name || item.name,
        price: unitPrice,
        quantity: qty,
        line_total: lineTotal,
        category_slug: dbProduct?.category_slug || item.category_slug || null,
        image_url: dbProduct?.image_url || item.image_url || null,
      };
    });

    calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));
    const safeDiscount = Math.max(0, Math.min(Number(discount) || 0, calculatedSubtotal));
    const finalTotal = Number((calculatedSubtotal - safeDiscount).toFixed(2));
    const safeReceived = Math.max(finalTotal, Number(amount_received) || finalTotal);
    const changeAmount = Number((safeReceived - finalTotal).toFixed(2));

    const invoiceNumber = generateInvoiceNumber();

    const saleRecord = {
      invoice_number: invoiceNumber,
      cashier_name: cashier_name || "الكاشير",
      subtotal: calculatedSubtotal,
      discount: safeDiscount,
      total: finalTotal,
      amount_received: safeReceived,
      change_amount: changeAmount,
      payment_method: payment_method || "cash",
      items_count: validatedItems.reduce((acc, curr) => acc + curr.quantity, 0),
      items: validatedItems,
      customer_phone: customer_phone || null,
      notes: notes || null,
    };

    const saveResult = await savePosSale(saleRecord);

    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "تم حفظ الفاتورة بنجاح",
      sale: saveResult.data,
    });
  } catch (error: any) {
    console.error("POS API checkout error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "حدث خطأ أثناء معالجة عملية البيع" },
      { status: 500 }
    );
  }
}
