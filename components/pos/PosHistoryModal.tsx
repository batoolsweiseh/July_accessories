"use client";

import React, { useState, useEffect } from "react";
import { PosSaleRecord } from "@/lib/pos";

interface PosHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSaleForReprint: (sale: PosSaleRecord) => void;
}

export default function PosHistoryModal({
  isOpen,
  onClose,
  onSelectSaleForReprint,
}: PosHistoryModalProps) {
  const [sales, setSales] = useState<PosSaleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().slice(0, 10);
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSaleDetails, setActiveSaleDetails] = useState<PosSaleRecord | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDate) params.append("date", selectedDate);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/pos/sales?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSales(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load POS history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const totalSalesToday = sales.reduce((acc, s) => acc + Number(s.total), 0);
  const totalItemsCount = sales.reduce((acc, s) => acc + Number(s.items_count), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#D8CFC5]">
        {/* ─── Modal Header ─── */}
        <div className="p-4 sm:p-5 border-b border-[#E6E0D8] bg-[#FDFBF9] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#3A302B] flex items-center gap-2">
              <span>سجل المبيعات والفواتير</span>
              <span className="text-xs bg-[#E0457D]/10 text-[#E0457D] font-bold px-2 py-0.5 rounded-full">
                {sales.length} عملية
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              استعراض فواتير الكاشير وإعادة طباعة أي إيصال سابق
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* ─── Summary Cards Bar ─── */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-[#FAF8F5] border-b border-[#E6E0D8] text-center">
          <div className="bg-white p-3 rounded-xl border border-[#E8E2D9] shadow-xs">
            <span className="text-[11px] text-gray-500 block">إجمالي مبيعات اليوم</span>
            <span className="text-base sm:text-lg font-extrabold text-[#E0457D]">
              {totalSalesToday.toFixed(2)} ₪
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E8E2D9] shadow-xs">
            <span className="text-[11px] text-gray-500 block">عدد الفواتير</span>
            <span className="text-base sm:text-lg font-extrabold text-[#3A302B]">
              {sales.length}
            </span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E8E2D9] shadow-xs">
            <span className="text-[11px] text-gray-500 block">إجمالي القطع المباعة</span>
            <span className="text-base sm:text-lg font-extrabold text-[#3A302B]">
              {totalItemsCount} قطعة
            </span>
          </div>
        </div>

        {/* ─── Filter & Search Bar ─── */}
        <div className="p-4 border-b border-[#E6E0D8] flex flex-wrap gap-2 items-center justify-between bg-white">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchHistory()}
              placeholder="ابحث برقم الفاتورة..."
              className="flex-1 py-1.5 px-3 text-xs border border-gray-300 rounded-lg text-[#3A302B] focus:outline-none focus:ring-1 focus:ring-[#E0457D]"
            />
            <button
              onClick={fetchHistory}
              className="px-3 py-1.5 bg-[#3A302B] text-white rounded-lg text-xs font-medium hover:bg-black transition-colors"
            >
              بحث
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">التاريخ:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="py-1 px-2.5 text-xs border border-gray-300 rounded-lg text-[#3A302B] focus:outline-none focus:ring-1 focus:ring-[#E0457D]"
            />
          </div>
        </div>

        {/* ─── Sales Table or Empty ─── */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 gap-2">
              <div className="w-6 h-6 border-2 border-gray-300 border-t-[#E0457D] rounded-full animate-spin" />
              <span className="text-xs">جاري تحميل السجل...</span>
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-1">
              <p className="text-sm font-semibold">لا توجد عمليات بيع مسجلة لهذا التاريخ</p>
              <p className="text-xs text-gray-400">جرب اختيار تاريخ آخر أو تحقق من البحث</p>
            </div>
          ) : (
            <div className="border border-[#E8E2D9] rounded-xl overflow-hidden divide-y divide-[#E8E2D9]">
              {sales.map((sale) => {
                const dateObj = new Date(sale.created_at);
                const timeStr = dateObj.toLocaleTimeString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={sale.id}
                    className="p-3.5 bg-white hover:bg-[#FDFBF9] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#3A302B]">
                          {sale.invoice_number}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium">
                          • {timeStr}
                        </span>
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
                          {sale.payment_method === "cash" ? "كاش" : sale.payment_method}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>القطع: {sale.items_count}</span>
                        {sale.discount > 0 && (
                          <span className="text-red-500">
                            خصم: -{sale.discount.toFixed(0)} ₪
                          </span>
                        )}
                        <span>الكاشير: {sale.cashier_name || "الكاشير العام"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-left">
                        <span className="text-sm font-extrabold text-[#E0457D]">
                          {Number(sale.total).toFixed(2)} ₪
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectSaleForReprint(sale)}
                        className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#E0457D] hover:text-white text-[#3A302B] border border-[#D8CFC5] rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                        <span>طباعة الإيصال</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
