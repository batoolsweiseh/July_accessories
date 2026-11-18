"use client";

import { useState } from "react";

/* ─── Types ─── */
interface PosItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  line_total: number;
  image_url?: string;
  category_slug?: string;
}

interface PosSaleData {
  invoice_number: string;
  cashier_name: string;
  subtotal: number;
  discount: number;
  total: number;
  amount_received: number;
  change_amount: number;
  payment_method: string;
  items_count: number;
  items: PosItem[];
  customer_phone?: string | null;
  notes?: string | null;
  created_at?: string;
}

interface ParsedPosSale {
  orderId: string;
  invoiceNumber: string;
  cashierName: string;
  subtotal: number;
  discount: number;
  total: number;
  amountReceived: number;
  changeAmount: number;
  paymentMethod: string;
  itemsCount: number;
  items: PosItem[];
  createdAt: string;
  notes?: string | null;
}

function parsePosOrder(order: any): ParsedPosSale | null {
  try {
    const data: PosSaleData = JSON.parse(order.product_name);
    return {
      orderId: order.id,
      invoiceNumber: data.invoice_number || order.customer_name.replace("[POS] ", ""),
      cashierName: data.cashier_name || "الكاشير",
      subtotal: data.subtotal ?? data.total ?? order.product_price,
      discount: data.discount ?? 0,
      total: data.total ?? order.product_price,
      amountReceived: data.amount_received ?? data.total ?? order.product_price,
      changeAmount: data.change_amount ?? 0,
      paymentMethod: data.payment_method === "cash" ? "نقداً" : data.payment_method || "نقداً",
      itemsCount: data.items_count ?? (data.items?.length ?? 0),
      items: Array.isArray(data.items) ? data.items : [],
      createdAt: order.created_at,
      notes: data.notes,
    };
  } catch {
    return null;
  }
}

/* ─── Sale Detail Modal ─── */
function SaleDetailModal({
  sale,
  onClose,
}: {
  sale: ParsedPosSale;
  onClose: () => void;
}) {
  const formattedDate = new Date(sale.createdAt).toLocaleString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">تفاصيل الفاتورة</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{sale.invoiceNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
            >
              🖨️ طباعة
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg p-1.5 transition-all text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "الكاشير", value: `👤 ${sale.cashierName}` },
              { label: "التاريخ", value: formattedDate },
              { label: "طريقة الدفع", value: `💵 ${sale.paymentMethod}` },
              { label: "عدد القطع", value: `${sale.itemsCount} قطعة` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-xs font-bold text-neutral-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Products Table */}
          {sale.items.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">المنتجات</h4>
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold border-b border-slate-100">
                      <th className="px-3 py-2.5">المنتج</th>
                      <th className="px-3 py-2.5 text-center">الكمية</th>
                      <th className="px-3 py-2.5 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sale.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-neutral-900 text-xs leading-snug">{item.name}</div>
                          <div className="text-[11px] text-slate-400">{item.price} ₪ / قطعة</div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="bg-slate-100 text-neutral-900 text-xs font-bold px-2 py-0.5 rounded-lg">
                            ×{item.quantity}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-left font-bold text-neutral-900 text-xs">
                          {item.line_total} ₪
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-slate-100 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>المجموع</span>
              <span className="font-semibold">{sale.subtotal} ₪</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-sm text-rose-600">
                <span>الخصم</span>
                <span className="font-semibold">- {sale.discount} ₪</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-neutral-900 border-t border-slate-200 pt-2">
              <span>الإجمالي النهائي</span>
              <span className="text-[#E0457D] text-lg">{sale.total} ₪</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 pt-1">
              <span>المبلغ المستلم</span>
              <span>{sale.amountReceived} ₪</span>
            </div>
            {sale.changeAmount > 0 && (
              <div className="flex justify-between text-xs text-slate-500">
                <span>الباقي للعميل</span>
                <span className="font-semibold text-neutral-700">{sale.changeAmount} ₪</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
              <span className="font-bold">📝 ملاحظات: </span>
              {sale.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function PosSalesAdminSection({ orders }: { orders: any[] }) {
  const [selectedSale, setSelectedSale] = useState<ParsedPosSale | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Parse POS orders
  const posOrders = orders.filter(
    (o) => typeof o.customer_name === "string" && o.customer_name.startsWith("[POS]")
  );
  const posSales: ParsedPosSale[] = posOrders
    .map(parsePosOrder)
    .filter((s): s is ParsedPosSale => s !== null);

  // Apply filters
  const filteredSales = posSales.filter((sale) => {
    const matchSearch =
      !searchQuery ||
      sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.cashierName.includes(searchQuery);
    const matchDate =
      !dateFilter || new Date(sale.createdAt).toISOString().startsWith(dateFilter);
    return matchSearch && matchDate;
  });

  // Stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = posSales.filter((s) => s.createdAt.slice(0, 10) === todayStr);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const allTotal = posSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6" dir="rtl">
      {selectedSale && (
        <SaleDetailModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0 text-lg">
          🧾
        </div>
        <div>
          <h2
            style={{ fontFamily: "'Lalezar', serif" }}
            className="text-2xl text-neutral-900 leading-tight"
          >
            مبيعات الكاشير (POS)
          </h2>
          <p className="text-xs text-slate-500">الفواتير الصادرة من نقطة البيع</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-violet-700">{posSales.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">إجمالي الفواتير</div>
        </div>
        <div className="bg-[#FAF8F5] border border-[#E8DFD8] rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#3A302B]">{allTotal} ₪</div>
          <div className="text-[11px] text-slate-500 mt-0.5">إجمالي المبيعات</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-700">{todaySales.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">فواتير اليوم</div>
        </div>
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-[#E0457D]">{todayTotal} ₪</div>
          <div className="text-[11px] text-slate-500 mt-0.5">إيرادات اليوم</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة أو اسم الكاشير..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-4 py-2.5 text-sm text-neutral-900 placeholder:text-slate-400 outline-none focus:border-neutral-400 transition-colors"
          />
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-400 transition-colors"
        />
        {(searchQuery || dateFilter) && (
          <button
            onClick={() => { setSearchQuery(""); setDateFilter(""); }}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold transition-all"
          >
            مسح
          </button>
        )}
      </div>

      {/* Table or Empty */}
      {posSales.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-5xl mb-3">🧾</div>
          <h3 className="text-base font-bold text-neutral-900">لا توجد مبيعات بعد</h3>
          <p className="text-sm text-slate-400 mt-1">
            عند إتمام عمليات بيع من نقطة الكاشير، ستظهر هنا.
          </p>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="text-center py-10 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-sm text-slate-400">لا توجد نتائج مطابقة</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold border-b border-slate-100">
                <th className="px-4 py-3 text-right">رقم الفاتورة</th>
                <th className="px-4 py-3 text-right">الكاشير</th>
                <th className="px-4 py-3 text-right">التاريخ</th>
                <th className="px-4 py-3 text-center">القطع</th>
                <th className="px-4 py-3 text-right">الخصم</th>
                <th className="px-4 py-3 text-right">الإجمالي</th>
                <th className="px-4 py-3 text-center">الدفع</th>
                <th className="px-4 py-3 text-center">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredSales.map((sale) => {
                const isToday = sale.createdAt.slice(0, 10) === todayStr;
                const formattedDate = new Date(sale.createdAt).toLocaleString("ar-EG", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <tr key={sale.orderId} className="hover:bg-slate-50/60 transition-colors">
                    {/* الفاتورة */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />}
                        <span className="font-mono text-xs font-bold text-neutral-900 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg whitespace-nowrap">
                          {sale.invoiceNumber}
                        </span>
                      </div>
                    </td>
                    {/* الكاشير */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-neutral-900 text-sm">{sale.cashierName}</span>
                    </td>
                    {/* التاريخ */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formattedDate}
                      {isToday && (
                        <span className="mr-1.5 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded">
                          اليوم
                        </span>
                      )}
                    </td>
                    {/* القطع */}
                    <td className="px-4 py-3 text-center">
                      <span className="bg-slate-100 text-neutral-900 font-bold text-xs px-2.5 py-1 rounded-lg">
                        {sale.itemsCount}
                      </span>
                    </td>
                    {/* الخصم */}
                    <td className="px-4 py-3">
                      {sale.discount > 0 ? (
                        <span className="text-rose-600 font-semibold text-sm">- {sale.discount} ₪</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    {/* الإجمالي */}
                    <td className="px-4 py-3">
                      <span className="font-bold text-base text-neutral-900">{sale.total}</span>
                      <span className="text-slate-400 text-xs mr-0.5"> ₪</span>
                    </td>
                    {/* طريقة الدفع */}
                    <td className="px-4 py-3 text-center">
                      <span className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap">
                        💵 {sale.paymentMethod}
                      </span>
                    </td>
                    {/* التفاصيل */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedSale(sale)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-100 text-violet-700 text-xs font-bold transition-all active:scale-95"
                      >
                        📋 عرض
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Summary */}
      {filteredSales.length > 0 && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 border-t border-slate-100 pt-4">
          <span>
            يُعرض <strong className="text-neutral-900">{filteredSales.length}</strong> من إجمالي{" "}
            <strong className="text-neutral-900">{posSales.length}</strong> فاتورة
          </span>
          <span>
            مجموع المعروض:{" "}
            <strong className="text-neutral-900 text-sm">
              {filteredSales.reduce((sum, s) => sum + s.total, 0)} ₪
            </strong>
          </span>
        </div>
      )}
    </section>
  );
}
