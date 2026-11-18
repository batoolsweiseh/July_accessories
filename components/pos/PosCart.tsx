"use client";

import React, { useState } from "react";
import Image from "next/image";
import { PosSaleItem } from "@/lib/pos";

interface PosCartProps {
  items: PosSaleItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  discount: number;
  onDiscountChange: (discount: number) => void;
  cashierName: string;
  onCashierChange: (name: string) => void;
  onCompleteSale: (received: number) => void;
  isProcessing: boolean;
}

const QUICK_CASH_AMOUNTS = [20, 50, 100, 200];

export default function PosCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  discount,
  onDiscountChange,
  cashierName,
  onCashierChange,
  onCompleteSale,
  isProcessing,
}: PosCartProps) {
  const [receivedInput, setReceivedInput] = useState<string>("");

  const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const safeDiscount = Math.max(0, Math.min(discount, subtotal));
  const finalTotal = Math.max(0, subtotal - safeDiscount);

  // Auto-calculated received amount or custom typed
  const actualReceived =
    receivedInput !== "" ? parseFloat(receivedInput) || 0 : finalTotal;
  const change = Math.max(0, actualReceived - finalTotal);

  const handleQuickCash = (amount: number) => {
    setReceivedInput(amount.toString());
  };

  const handleExactCash = () => {
    setReceivedInput(finalTotal.toString());
  };

  const handleCheckoutClick = () => {
    if (items.length === 0 || isProcessing) return;
    onCompleteSale(actualReceived);
  };

  return (
    <div className="flex flex-col h-full bg-white text-[#3A302B]">
      {/* ─── Cart Header ─── */}
      <div className="p-4 border-b border-[#E6E0D8] flex items-center justify-between bg-[#FDFBF9]">
        <div>
          <h2 className="text-base font-bold text-[#3A302B] flex items-center gap-2">
            <span>سلة البيع الحالية</span>
            <span className="text-xs bg-[#E0457D]/10 text-[#E0457D] px-2 py-0.5 rounded-full font-bold">
              {items.reduce((acc, i) => acc + i.quantity, 0)} قطع
            </span>
          </h2>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <span>الكاشير:</span>
            <input
              type="text"
              value={cashierName}
              onChange={(e) => onCashierChange(e.target.value)}
              placeholder="اسم الكاشير"
              className="border-b border-dashed border-gray-300 bg-transparent text-[#3A302B] px-1 py-0.5 text-xs font-medium focus:outline-none focus:border-[#E0457D] w-28"
            />
          </div>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            disabled={isProcessing}
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
          >
            إفراغ السلة
          </button>
        )}
      </div>

      {/* ─── Cart Items List ─── */}
      <div className="flex-1 overflow-y-auto p-4 divide-y divide-[#F2EFEA]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
            <svg
              className="w-12 h-12 stroke-current text-gray-200"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-sm font-medium">السلة فارغة</p>
            <p className="text-xs text-gray-400">
              اضغط على أي قطعة من القائمة لإضافتها للفاتورة
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="py-3 flex items-center gap-3">
              {/* Product Thumbnail */}
              <div className="relative w-12 h-12 rounded-lg bg-[#FAF8F5] border border-[#EBE5DE] overflow-hidden flex-shrink-0">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-400">
                    قطعة
                  </div>
                )}
              </div>

              {/* Title & Price */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-semibold text-[#3A302B] truncate leading-snug">
                  {item.name}
                </h4>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {Number(item.price).toFixed(0)} ₪ للقطعة
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1.5 bg-[#F6F3EE] rounded-lg p-0.5 border border-[#E6E0D8]">
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  disabled={isProcessing}
                  className="w-6 h-6 rounded flex items-center justify-center bg-white text-gray-700 shadow-xs hover:bg-gray-100 active:scale-95 text-xs font-bold transition-all disabled:opacity-50"
                  title="إنقاص"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold text-[#3A302B]">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  disabled={isProcessing}
                  className="w-6 h-6 rounded flex items-center justify-center bg-white text-gray-700 shadow-xs hover:bg-gray-100 active:scale-95 text-xs font-bold transition-all disabled:opacity-50"
                  title="زيادة"
                >
                  +
                </button>
              </div>

              {/* Line Total */}
              <div className="text-left w-14">
                <div className="text-xs font-bold text-[#3A302B]">
                  {(item.price * item.quantity).toFixed(0)} ₪
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  disabled={isProcessing}
                  className="text-[10px] text-red-400 hover:text-red-600 mt-0.5 block"
                >
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── Checkout & Calculations Area ─── */}
      {items.length > 0 && (
        <div className="p-4 bg-[#FDFBF9] border-t border-[#E6E0D8] space-y-3">
          {/* Subtotal & Discount rows */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>المجموع الفرعي:</span>
              <span className="font-semibold">{subtotal.toFixed(2)} ₪</span>
            </div>

            {/* Manual Discount field */}
            <div className="flex items-center justify-between text-gray-600">
              <span>خصم يدوي (₪):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  step="1"
                  value={discount === 0 ? "" : discount}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    onDiscountChange(Math.max(0, Math.min(val, subtotal)));
                  }}
                  placeholder="0"
                  className="w-20 text-center py-1 px-2 border border-gray-300 rounded-md text-xs font-bold text-red-600 focus:outline-none focus:ring-1 focus:ring-red-500 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-between text-sm font-extrabold text-[#3A302B] pt-1.5 border-t border-dashed border-gray-200">
              <span>المبلغ الإجمالي الصافي:</span>
              <span className="text-base text-[#E0457D]">
                {finalTotal.toFixed(2)} ₪
              </span>
            </div>
          </div>

          {/* Cash Payment Section */}
          <div className="pt-2 border-t border-[#E6E0D8] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#3A302B]">
                المبلغ المستلم (كاش):
              </span>
              <button
                type="button"
                onClick={handleExactCash}
                className="text-[11px] text-[#E0457D] hover:underline font-medium"
              >
                المبلغ بالتمام ({finalTotal.toFixed(0)} ₪)
              </button>
            </div>

            {/* Quick cash buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_CASH_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickCash(amt)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    actualReceived === amt
                      ? "bg-[#3A302B] text-white border-[#3A302B]"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {amt} ₪
                </button>
              ))}
            </div>

            {/* Custom Cash Input & Change Display */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">
                  المستلم يدوياً:
                </label>
                <input
                  type="number"
                  min={finalTotal}
                  value={receivedInput}
                  onChange={(e) => setReceivedInput(e.target.value)}
                  placeholder={finalTotal.toFixed(0)}
                  className="w-full py-1.5 px-3 border border-gray-300 rounded-lg text-sm font-bold text-center bg-white focus:outline-none focus:ring-2 focus:ring-[#E0457D]"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">
                  الباقي للزبون:
                </label>
                <div
                  className={`w-full py-1.5 px-3 rounded-lg text-sm font-bold text-center border ${
                    actualReceived >= finalTotal
                      ? "bg-green-50 border-green-300 text-green-700"
                      : "bg-red-50 border-red-300 text-red-600"
                  }`}
                >
                  {change.toFixed(2)} ₪
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckoutClick}
            disabled={
              isProcessing || items.length === 0 || actualReceived < finalTotal
            }
            className="w-full mt-2 py-3.5 px-4 bg-[#E0457D] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#c93a6c] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>جاري إنهاء الفاتورة...</span>
              </>
            ) : actualReceived < finalTotal ? (
              <span>المبلغ المستلم أقل من الإجمالي!</span>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>إنهاء البيع وطباعة الإيصال ({finalTotal.toFixed(0)} ₪)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
