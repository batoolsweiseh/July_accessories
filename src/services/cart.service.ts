import { getSupabase } from "../config/supabase";
import type { AddToCartInput } from "../types/cart.types";

// Helper: get a product's image url for cart display
const getProductImageUrl = (product: any): string | null => {
  return product?.image_url || null;
};

const getOrCreateCartId = async (userId: string) => {
  const supabase = getSupabase();
  let { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!cart) {
    const { data: newCart, error: createError } = await supabase
      .from("carts")
      .insert({ user_id: userId })
      .select("id")
      .single();

    if (createError) throw new Error("تعذر إنشاء سلة للمستخدم");
    return newCart.id;
  }
  return cart.id;
};

export const getCartByCartId = async (cartId: string) => {
  const supabase = getSupabase();

  console.log(`Fetching cart for cartId: ${cartId}`);

  const { data: items, error: itemsError } = await supabase
    .from("cart_items")
    .select(`
      id,
      quantity,
      product:products (
        id,
        name,
        price,
        image_url,
        in_stock,
        category_slug,
        subcategory_id
      )
    `)
    .eq("cart_id", cartId);

  if (itemsError) {
    console.error("Supabase Error fetching cart items:", itemsError);
    throw new Error(itemsError.message);
  }

  // Transform items to ensure backward-compat shape (artwork alias)
  const transformedItems = (items || []).map((item: any) => {
    const product = item.product || null;
    const productWithImage = product ? {
      ...product,
      title: product.name, // backward-compat alias
      image: product.image_url, // backward-compat alias
      artwork_images: product.image_url ? [{ filename: product.image_url, is_featured: true, url: product.image_url }] : [],
    } : null;
    return {
      ...item,
      product: productWithImage,
      artwork: productWithImage, // backward-compat alias
    };
  });

  return { cartId, items: transformedItems };
};

export const getCartByUserId = async (userId: string) => {
  const cartId = await getOrCreateCartId(userId);
  return getCartByCartId(cartId);
};

export const updateCartItemQuantity = async (cartId: string, itemId: string, quantity: number) => {
  const supabase = getSupabase();

  if (quantity < 1) {
    return removeItemFromCart(cartId, itemId);
  }

  // 1. Get the item to find its product_id
  const { data: item, error: itemError } = await supabase
    .from("cart_items")
    .select("product_id, cart_id")
    .eq("id", itemId)
    .single();

  if (itemError || !item) throw new Error("المنتج غير موجود في السلة");

  // 2. Check stock
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("in_stock")
    .eq("id", item.product_id)
    .single();

  if (productError || !product) throw new Error("المنتج غير موجود");
  if (!product.in_stock) throw new Error("المنتج غير متوفر حالياً");

  // 3. Update
  const { error: updateError } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId);

  if (updateError) throw new Error(updateError.message);

  return getCartByCartId(cartId);
};

export const addItemToCart = async (cartId: string, input: AddToCartInput) => {
  const supabase = getSupabase();
  // Support both productId and artworkId (backward-compat)
  const productId = input.productId || input.artworkId;
  const quantity = input.quantity ?? 1;

  if (!productId) throw new Error("معرّف المنتج مطلوب");

  console.log(`Adding item to cart: cartId=${cartId}, product=${productId}, qty=${quantity}`);

  // 1. Check product exists and in stock
  const { data: product } = await supabase
    .from("products")
    .select("in_stock")
    .eq("id", productId)
    .single();

  if (!product) throw new Error("المنتج غير موجود");
  if (!product.in_stock) throw new Error("المنتج غير متوفر حالياً");

  // 2. Check if item already exists in cart
  const { data: existing, error: checkError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking existing item:", checkError);
    throw new Error(checkError.message);
  }

  if (existing) {
    const newQuantity = existing.quantity + quantity;
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: newQuantity })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({
        cart_id: cartId,
        product_id: productId,
        quantity
      });
    if (error) throw new Error(error.message);
  }

  return getCartByCartId(cartId);
};

export const removeItemFromCart = async (cartId: string, itemId: string) => {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  return getCartByCartId(cartId);
};

export const clearCart = async (userId: string) => {
  const supabase = getSupabase();
  const cartId = await getOrCreateCartId(userId);

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cartId);

  if (error) throw new Error(error.message);
};
