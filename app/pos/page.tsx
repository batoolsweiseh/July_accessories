"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import PosCatalog, { PosProduct } from "@/components/pos/PosCatalog";
import PosCart from "@/components/pos/PosCart";
import PosReceipt from "@/components/pos/PosReceipt";
import PosHistoryModal from "@/components/pos/PosHistoryModal";
import { PosSaleItem, PosSaleRecord } from "@/lib/pos";

export default function PosPage() {
  const [cartItems, setCartItems] = useState<PosSaleItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [cashierName, setCashierName] = useState<string>("الكاشير العام");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeReceiptSale, setActiveReceiptSale] = useState<PosSaleRecord | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const receiptRef = useRef<HTMLDivElement>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  /* ─── Cart Handlers ─── */
  const handleAddToCart = (product: PosProduct) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                line_total: (item.quantity + 1) * item.price,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          category_slug: product.category_slug,
          image_url: product.image_url,
          line_total: Number(product.price),
        },
      ];
    });

    showNotification(`تمت إضافة "${product.name}" للسلة`);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            return {
              ...item,
              quantity: nextQty,
              line_total: nextQty * item.price,
            };
          }
          return item;
        })
        .filter(Boolean) as PosSaleItem[];
    });
  };

  const handleRemoveItem = (id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscount(0);
  };

  /* ─── Checkout & Printing ─── */
  const triggerBrowserPrint = () => {
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleCompleteSale = async (amountReceived: number) => {
    if (cartItems.length === 0 || isProcessing) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/pos/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartItems,
          discount,
          amount_received: amountReceived,
          cashier_name: cashierName,
          payment_method: "cash",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "فشل تسجيل عملية البيع");
      }

      const completedSale: PosSaleRecord = json.sale;
      setActiveReceiptSale(completedSale);
      handleClearCart();
      showNotification(`تم تسجيل الفاتورة بنجاح: ${completedSale.invoice_number}`);

      // Open print prompt
      triggerBrowserPrint();
    } catch (err: any) {
      console.error("Sale error:", err);
      showNotification(err.message || "حدث خطأ أثناء إتمام البيع", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReprintSale = (sale: PosSaleRecord) => {
    setActiveReceiptSale(sale);
    setIsHistoryOpen(false);
    showNotification(`جاري طباعة إيصال الفاتورة: ${sale.invoice_number}`);
    triggerBrowserPrint();
  };

  const totalCartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="pos-main-container min-h-screen bg-[#F7F4F0] text-[#3A302B] flex flex-col font-sans select-none">
      {/* ─── Notification Toast ─── */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 py-2.5 px-5 rounded-xl shadow-lg text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-300 ${
            notification.type === "success"
              ? "bg-[#3A302B] text-white"
              : "bg-red-600 text-white"
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* ─── POS Top Navigation Bar (Hidden during Print) ─── */}
      <header className="no-print bg-white border-b border-[#E6E0D8] px-4 py-2.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logos/july-exact-horizontal.png"
              alt="July Accessories"
              width={100}
              height={32}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
          <div className="h-4 w-px bg-gray-300" />
          <span className="text-xs sm:text-sm font-bold bg-[#FAF8F5] border border-[#E6E0D8] text-[#3A302B] px-2.5 py-1 rounded-lg">
            نظام نقاط البيع (POS)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F2ECE4] border border-[#D8CFC5] rounded-xl text-xs font-bold text-[#3A302B] flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <svg
              className="w-4 h-4 text-[#E0457D]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>سجل الفواتير</span>
          </button>

          {/* Admin Dashboard Return */}
          <Link
            href="/admin"
            className="px-3 py-1.5 bg-[#3A302B] hover:bg-black text-white rounded-xl text-xs font-medium transition-colors"
          >
            لوحة الإدارة
          </Link>
        </div>
      </header>

      {/* ─── Mobile View Tabs (Catalog / Cart) ─── */}
      <div className="no-print lg:hidden bg-white border-b border-[#E6E0D8] grid grid-cols-2 p-1.5 gap-1.5 sticky top-[53px] z-20">
        <button
          onClick={() => setMobileTab("catalog")}
          className={`py-2 text-xs font-bold rounded-lg transition-all ${
            mobileTab === "catalog"
              ? "bg-[#3A302B] text-white shadow-xs"
              : "bg-[#F3EFEA] text-gray-600"
          }`}
        >
          المنتجات والكتالوج
        </button>
        <button
          onClick={() => setMobileTab("cart")}
          className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "cart"
              ? "bg-[#E0457D] text-white shadow-xs"
              : "bg-[#F3EFEA] text-gray-600"
          }`}
        >
          <span>سلة الفاتورة</span>
          {totalCartCount > 0 && (
            <span className="bg-white text-[#E0457D] text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-extrabold">
              {totalCartCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── Main Content Area (Split Screen) ─── */}
      <main className="no-print flex-1 flex flex-col lg:flex-row overflow-hidden h-[calc(100vh-53px)]">
        {/* Right Area: Product Catalog */}
        <div
          className={`flex-1 h-full overflow-hidden ${
            mobileTab === "catalog" ? "flex" : "hidden lg:flex"
          } flex-col`}
        >
          <PosCatalog onAddToCart={handleAddToCart} />
        </div>

        {/* Left Area: Sale Cart & Cashier Calculator */}
        <div
          className={`w-full lg:w-[420px] xl:w-[460px] h-full overflow-hidden ${
            mobileTab === "cart" ? "flex" : "hidden lg:flex"
          } flex-col border-r border-[#E6E0D8] shadow-lg`}
        >
          <PosCart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            discount={discount}
            onDiscountChange={setDiscount}
            cashierName={cashierName}
            onCashierChange={setCashierName}
            onCompleteSale={handleCompleteSale}
            isProcessing={isProcessing}
          />
        </div>
      </main>

      {/* ─── Sales History Modal ─── */}
      <PosHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectSaleForReprint={handleReprintSale}
      />

      {/* ─── Hidden Printable Thermal Receipt Container ─── */}
      <div className="hidden print:block print:w-full print:m-0">
        <PosReceipt ref={receiptRef} sale={activeReceiptSale} />
      </div>
    </div>
  );
}
