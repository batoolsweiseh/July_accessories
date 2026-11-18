import { supabaseAdmin } from "@/lib/supabase-admin";

export interface PosSaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category_slug?: string | null;
  image_url?: string | null;
  line_total: number;
}

export interface PosSaleRecord {
  id: string;
  invoice_number: string;
  cashier_name: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_received: number;
  change_amount: number;
  payment_method: string;
  items_count: number;
  items: PosSaleItem[];
  customer_phone?: string | null;
  notes?: string | null;
  created_at: string;
}

/**
 * Checks whether native pos_sales and pos_sale_items tables exist in Supabase.
 */
export async function checkNativePosTables(): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.from("pos_sales").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Generates a clean, unique invoice number: JULY-POS-YYYYMMDD-XXXX
 */
export function generateInvoiceNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `JULY-POS-${dateStr}-${rand}`;
}

/**
 * Saves a completed POS sale.
 * Supports native pos_sales table if created, or resilient fallback storage in orders / store_purchase_codes.
 */
export async function savePosSale(saleData: Omit<PosSaleRecord, "id" | "created_at">): Promise<{ success: boolean; data?: PosSaleRecord; error?: string }> {
  const hasNative = await checkNativePosTables();
  const nowIso = new Date().toISOString();

  if (hasNative) {
    // 1. Insert into pos_sales
    const { data: saleRow, error: saleErr } = await supabaseAdmin
      .from("pos_sales")
      .insert({
        invoice_number: saleData.invoice_number,
        cashier_name: saleData.cashier_name || "الكاشير",
        subtotal: saleData.subtotal,
        discount: saleData.discount,
        total: saleData.total,
        amount_received: saleData.amount_received,
        change_amount: saleData.change_amount,
        payment_method: saleData.payment_method || "cash",
        items_count: saleData.items_count,
        customer_phone: saleData.customer_phone || null,
        notes: saleData.notes || null,
      })
      .select()
      .single();

    if (saleErr || !saleRow) {
      console.error("Error inserting pos_sales:", saleErr);
      return { success: false, error: saleErr?.message || "فشل حفظ الفاتورة في جدول المبيعات" };
    }

    // 2. Insert items
    if (saleData.items && saleData.items.length > 0) {
      const itemsToInsert = saleData.items.map((item) => ({
        sale_id: saleRow.id,
        product_id: item.id,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        line_total: item.line_total,
        category_slug: item.category_slug || null,
        image_url: item.image_url || null,
      }));

      const { error: itemsErr } = await supabaseAdmin.from("pos_sale_items").insert(itemsToInsert);
      if (itemsErr) {
        console.error("Error inserting pos_sale_items:", itemsErr);
      }
    }

    return {
      success: true,
      data: {
        ...saleRow,
        items: saleData.items,
      },
    };
  }

  // Fallback: Store securely in orders table as a completed POS order
  try {
    const salePayload = {
      ...saleData,
      created_at: nowIso,
    };

    const { data: orderRow, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: `[POS] ${saleData.invoice_number}`,
        customer_phone: saleData.customer_phone || "0000000000",
        customer_city: "نقطة بيع المحل (POS)",
        product_name: JSON.stringify(salePayload),
        product_price: saleData.total,
        status: "completed",
      })
      .select()
      .single();

    if (orderErr || !orderRow) {
      console.error("Fallback order insert error:", orderErr);
      return { success: false, error: orderErr?.message || "فشل تسجيل الفاتورة في النظام" };
    }

    return {
      success: true,
      data: {
        id: orderRow.id,
        ...saleData,
        created_at: orderRow.created_at || nowIso,
      },
    };
  } catch (err: any) {
    console.error("Save POS sale error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع أثناء الحفظ" };
  }
}

/**
 * Fetches POS sales history with optional date and invoice filtering.
 */
export async function getPosSales(options?: {
  date?: string; // YYYY-MM-DD
  search?: string;
  limit?: number;
}): Promise<{ success: boolean; data: PosSaleRecord[]; error?: string }> {
  const hasNative = await checkNativePosTables();
  const limit = options?.limit || 100;

  if (hasNative) {
    let query = supabaseAdmin
      .from("pos_sales")
      .select(`
        *,
        items:pos_sale_items(*)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options?.search) {
      query = query.ilike("invoice_number", `%${options.search.trim()}%`);
    }

    if (options?.date) {
      const start = `${options.date}T00:00:00.000Z`;
      const end = `${options.date}T23:59:59.999Z`;
      query = query.gte("created_at", start).lte("created_at", end);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching pos_sales:", error);
      return { success: false, data: [], error: error.message };
    }

    const formatted: PosSaleRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      invoice_number: row.invoice_number,
      cashier_name: row.cashier_name,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      total: Number(row.total),
      amount_received: Number(row.amount_received),
      change_amount: Number(row.change_amount),
      payment_method: row.payment_method,
      items_count: row.items_count,
      customer_phone: row.customer_phone,
      notes: row.notes,
      created_at: row.created_at,
      items: (row.items || []).map((item: any) => ({
        id: item.product_id || item.id,
        name: item.product_name,
        price: Number(item.unit_price),
        quantity: item.quantity,
        line_total: Number(item.line_total),
        category_slug: item.category_slug,
        image_url: item.image_url,
      })),
    }));

    return { success: true, data: formatted };
  }

  // Fallback: Read from orders table
  try {
    let query = supabaseAdmin
      .from("orders")
      .select("*")
      .ilike("customer_name", "[POS]%")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options?.search) {
      query = query.ilike("customer_name", `%${options.search.trim()}%`);
    }

    if (options?.date) {
      const start = `${options.date}T00:00:00.000Z`;
      const end = `${options.date}T23:59:59.999Z`;
      query = query.gte("created_at", start).lte("created_at", end);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching fallback pos orders:", error);
      return { success: false, data: [], error: error.message };
    }

    const parsedSales: PosSaleRecord[] = [];
    for (const row of data || []) {
      try {
        const parsed = JSON.parse(row.product_name);
        parsedSales.push({
          id: row.id,
          invoice_number: parsed.invoice_number || row.customer_name.replace("[POS] ", ""),
          cashier_name: parsed.cashier_name || "الكاشير",
          subtotal: Number(parsed.subtotal ?? row.product_price),
          discount: Number(parsed.discount ?? 0),
          total: Number(parsed.total ?? row.product_price),
          amount_received: Number(parsed.amount_received ?? row.product_price),
          change_amount: Number(parsed.change_amount ?? 0),
          payment_method: parsed.payment_method || "cash",
          items_count: Number(parsed.items_count ?? (parsed.items?.length || 1)),
          customer_phone: parsed.customer_phone || row.customer_phone,
          notes: parsed.notes || null,
          created_at: parsed.created_at || row.created_at,
          items: parsed.items || [],
        });
      } catch (e) {
        // Fallback for unparseable item
        parsedSales.push({
          id: row.id,
          invoice_number: row.customer_name.replace("[POS] ", ""),
          cashier_name: "الكاشير",
          subtotal: Number(row.product_price),
          discount: 0,
          total: Number(row.product_price),
          amount_received: Number(row.product_price),
          change_amount: 0,
          payment_method: "cash",
          items_count: 1,
          customer_phone: row.customer_phone,
          notes: null,
          created_at: row.created_at,
          items: [],
        });
      }
    }

    return { success: true, data: parsedSales };
  } catch (err: any) {
    console.error("Error reading POS sales fallback:", err);
    return { success: false, data: [], error: err.message };
  }
}
