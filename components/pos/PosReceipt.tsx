"use client";

import React, { forwardRef } from "react";
import Image from "next/image";
import { PosSaleRecord } from "@/lib/pos";

interface PosReceiptProps {
  sale: PosSaleRecord | null;
}

export const PosReceipt = forwardRef<HTMLDivElement, PosReceiptProps>(({ sale }, ref) => {
  if (!sale) return null;

  const dateObj = new Date(sale.created_at);
  const formattedDate = dateObj.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const formattedTime = dateObj.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      ref={ref}
      id="pos-thermal-receipt"
      dir="rtl"
      className="receipt-print-area bg-white text-black font-mono text-sm leading-tight p-4 mx-auto max-w-[80mm] print:max-w-full print:p-0"
      style={{
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* ─── Header & Logo ─── */}
      <div className="text-center pb-3 border-b border-dashed border-gray-400">
        <div className="flex justify-center mb-1">
          <Image
            src="/logos/july-exact-horizontal.png"
            alt="July Accessories"
            width={130}
            height={40}
            className="h-9 w-auto object-contain brightness-0"
            priority
          />
        </div>
        <h1 className="text-base font-bold tracking-wider mt-1 font-sans">
          July Accessories
        </h1>
        <p className="text-[11px] text-gray-700 mt-0.5">
          إكسسوارات راقية وهدايا مميزة
        </p>
      </div>

      {/* ─── Meta Details ─── */}
      <div className="py-2.5 text-[12px] border-b border-dashed border-gray-400 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">رقم الفاتورة:</span>
          <span className="font-bold tracking-tight">{sale.invoice_number}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">التاريخ:</span>
          <span>{formattedDate} - {formattedTime}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">الكاشير:</span>
          <span>{sale.cashier_name || "الكاشير العام"}</span>
        </div>
        {sale.customer_phone && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">هاتف الزبون:</span>
            <span>{sale.customer_phone}</span>
          </div>
        )}
      </div>

      {/* ─── Items Table ─── */}
      <div className="py-2.5 border-b border-dashed border-gray-400">
        <div className="grid grid-cols-12 text-[11px] font-bold text-gray-700 pb-1.5 border-b border-gray-300">
          <div className="col-span-6 text-right">الصنف</div>
          <div className="col-span-2 text-center">الكمية</div>
          <div className="col-span-2 text-center">السعر</div>
          <div className="col-span-2 text-left">الإجمالي</div>
        </div>

        <div className="divide-y divide-gray-100">
          {sale.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 text-[11px] py-1.5 items-center">
              <div className="col-span-6 text-right font-sans font-medium line-clamp-2 pr-0.5">
                {item.name}
              </div>
              <div className="col-span-2 text-center font-bold">
                ×{item.quantity}
              </div>
              <div className="col-span-2 text-center">
                {Number(item.price).toFixed(0)} ₪
              </div>
              <div className="col-span-2 text-left font-bold">
                {Number(item.line_total).toFixed(0)} ₪
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Totals ─── */}
      <div className="py-2.5 space-y-1.5 text-[12px] border-b border-dashed border-gray-400">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">المجموع الفرعي ({sale.items_count} قطع):</span>
          <span className="font-medium">{sale.subtotal.toFixed(2)} ₪</span>
        </div>

        {sale.discount > 0 && (
          <div className="flex justify-between items-center text-red-600">
            <span>الخصم المطبق:</span>
            <span className="font-bold">-{sale.discount.toFixed(2)} ₪</span>
          </div>
        )}

        <div className="flex justify-between items-center text-sm font-extrabold pt-1 border-t border-gray-200">
          <span>المبلغ المطلوب صافي:</span>
          <span className="text-base">{sale.total.toFixed(2)} ₪</span>
        </div>

        <div className="flex justify-between items-center pt-1 text-[11px] text-gray-700">
          <span>طريقة الدفع:</span>
          <span>{sale.payment_method === "cash" ? "نقداً (كاش)" : sale.payment_method}</span>
        </div>

        <div className="flex justify-between items-center text-[11px] text-gray-700">
          <span>المبلغ المستلم:</span>
          <span className="font-bold">{sale.amount_received.toFixed(2)} ₪</span>
        </div>

        <div className="flex justify-between items-center text-[12px] font-bold text-gray-900 bg-gray-50 p-1 rounded">
          <span>الباقي للزبون:</span>
          <span>{sale.change_amount.toFixed(2)} ₪</span>
        </div>
      </div>

      {/* ─── Footer & Barcode/Thank You ─── */}
      <div className="text-center pt-3 space-y-1 text-gray-700">
        <p className="font-bold text-[12px] font-sans">
          شكراً لتسوقكم من July Accessories ✨
        </p>
        <p className="text-[10px] text-gray-500">
          نرجو الاحتفاظ بالإيصال عند التبديل خلال 3 أيام
        </p>
        <p className="text-[9px] text-gray-400 pt-1 tracking-widest">
          {sale.invoice_number}
        </p>
      </div>
    </div>
  );
});

PosReceipt.displayName = "PosReceipt";

export default PosReceipt;
