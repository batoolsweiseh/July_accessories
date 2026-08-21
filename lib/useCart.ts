"use client";

import { useState, useEffect, useCallback } from "react";

/* ── الأنواع ── */
export type CartProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  in_stock: boolean;
  category_slug: string;
};

export type CartItem = {
  id: string;          // نفس product.id يُستخدم كـ itemId
  quantity: number;
  product: CartProduct;
};

export type Cart = {
  cartId: string;
  items: CartItem[];
};

const STORAGE_KEY = "july-cart";

function createDefaultCart(): Cart {
  return { cartId: "local", items: [] };
}

function normalizeProduct(product: unknown): CartProduct {
  const source = (product && typeof product === "object" ? product : {}) as Partial<CartProduct>;

  return {
    id: typeof source.id === "string" ? source.id : "",
    name: typeof source.name === "string" && source.name.trim() ? source.name : "منتج",
    price: Number(source.price) || 0,
    image_url: typeof source.image_url === "string" ? source.image_url : null,
    in_stock: source.in_stock !== false,
    category_slug: typeof source.category_slug === "string" ? source.category_slug : "",
  };
}

function normalizeCart(value: unknown): Cart {
  if (!value || typeof value !== "object") {
    return createDefaultCart();
  }

  const source = value as Partial<Cart> & { items?: unknown };
  const rawItems = Array.isArray(source.items) ? source.items : [];

  const items: CartItem[] = rawItems.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const entry = item as Record<string, unknown>;
    const quantity = Number(entry.quantity);
    const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;

    return [{
      id: typeof entry.id === "string" ? entry.id : String(entry.id ?? ""),
      quantity: safeQuantity,
      product: normalizeProduct(entry.product),
    }];
  });

  return {
    cartId: typeof source.cartId === "string" && source.cartId.trim() ? source.cartId : "local",
    items,
  };
}

/* ── قراءة السلة من localStorage ── */
function readCart(): Cart {
  if (typeof window === "undefined") {
    return createDefaultCart();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeCart(raw ? JSON.parse(raw) : null);
  } catch {
    return createDefaultCart();
  }
}

/* ── حفظ السلة في localStorage ── */
function saveCart(cart: Cart): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const normalizedCart = normalizeCart(cart);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedCart));
    window.dispatchEvent(new Event("july-cart-changed"));
  } catch { /* ignore */ }
}

/* ── Hook ── */
export function useCart() {
  const [cart, setCart] = useState<Cart>(createDefaultCart);
  const [loading, setLoading] = useState(false);

  /* تحميل السلة عند الـ mount وعند أي تغيير */
  const syncCart = useCallback(() => {
    setCart(readCart());
  }, []);

  /* التحقق من وجود منتجات السلة في قاعدة البيانات وحذف المحذوفة */
  const validateCartItems = useCallback(async () => {
    const current = readCart();
    if (current.items.length === 0) return;

    try {
      const ids = current.items.map((i) => i.id).join(",");
      const res = await fetch(`/api/products?ids=${ids}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      const validIds = new Set<string>(
        (json.data || []).map((p: { id: string | number }) => String(p.id))
      );

      const cleanedItems = current.items.filter((i) => validIds.has(i.id));
      if (cleanedItems.length !== current.items.length) {
        const newCart: Cart = { ...current, items: cleanedItems };
        saveCart(newCart);
        setCart(newCart);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    syncCart();
    validateCartItems();                                      // تحقق فوري عند التحميل
    window.addEventListener("july-cart-changed", syncCart);
    window.addEventListener("focus", validateCartItems);      // تحقق عند الرجوع للتاب
    return () => {
      window.removeEventListener("july-cart-changed", syncCart);
      window.removeEventListener("focus", validateCartItems);
    };
  }, [syncCart, validateCartItems]);

  const items = cart.items ?? [];
  const totalItems = items.length; // عدد المنتجات المختلفة في السلة
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0); // مجموع عدد القطع الكلي
  const totalPrice = items.reduce(
    (sum, i) => sum + i.quantity * Number(i.product.price),
    0
  );

  /* ── إضافة منتج (يتطلب بيانات المنتج) ── */
  const addToCart = useCallback(
    async (productId: string | number, quantity = 1, productData?: Partial<CartProduct>) => {
      setLoading(true);
      try {
        const normalizedId = String(productId);
        // إذا ما في بيانات مباشرة، نجيبها من الـ API
        let product: CartProduct | null = productData ? ({ ...productData, id: normalizedId } as CartProduct) : null;
        if (!product || !product.name) {
          const res = await fetch(`/api/products?ids=${normalizedId}`);
          const json = await res.json();
          const p = (json.data || [])[0];
          if (!p) throw new Error("المنتج غير موجود");
          product = {
            id: String(p.id),
            name: p.name,
            price: Number(p.price),
            image_url: p.image_url || null,
            in_stock: p.in_stock ?? true,
            category_slug: p.category_slug || "",
          };
        }

        if (!product || product.in_stock === false) {
          alert("عذراً، هذا المنتج نفدت كميته ولا يمكن طلبه حالياً.");
          return;
        }

        const current = readCart();
        const existing = current.items.find((i) => i.id === normalizedId);

        let newItems: CartItem[];
        if (existing) {
          // إذا كان المنتج مضافاً مسبقاً في السلة لا نزيد العدد أو نضاعفه
          newItems = current.items;
        } else {
          newItems = [...current.items, { id: normalizedId, quantity: Math.max(1, quantity), product }];
        }

        const newCart: Cart = { ...current, items: newItems };
        saveCart(newCart);
        setCart(newCart);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* ── تحديث الكمية ── */
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    const current = readCart();
    let newItems: CartItem[];
    if (quantity < 1) {
      newItems = current.items.filter((i) => i.id !== itemId);
    } else {
      newItems = current.items.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      );
    }
    const newCart: Cart = { ...current, items: newItems };
    saveCart(newCart);
    setCart(newCart);
  }, []);

  /* ── حذف منتج ── */
  const removeItem = useCallback((itemId: string) => {
    const current = readCart();
    const newCart: Cart = {
      ...current,
      items: current.items.filter((i) => i.id !== itemId),
    };
    saveCart(newCart);
    setCart(newCart);
  }, []);

  /* ── تفريغ السلة ── */
  const clearCart = useCallback(() => {
    const newCart: Cart = { cartId: "local", items: [] };
    saveCart(newCart);
    setCart(newCart);
  }, []);

  return {
    cart,
    loading,
    totalItems,
    totalQuantity,
    totalPrice,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    syncCart,
  };
}
