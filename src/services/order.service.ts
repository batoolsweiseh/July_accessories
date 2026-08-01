import { getSupabase } from "../config/supabase";
import { OrderStatus } from "../types/order.types";
import { clearCart } from "./cart.service";
import { toProfileImagePublicUrl } from "./profile-image-storage.service";

// Helper: build product shape with backward-compat artwork alias
const transformProduct = (product: any) => {
  if (!product) return null;
  return {
    ...product,
    // backward-compat aliases
    id: product.id,
    title: product.name,
    image: product.image_url,
    artwork_images: product.image_url
      ? [{ filename: product.image_url, is_featured: true, url: product.image_url }]
      : [],
  };
};

export const createOrderFromCart = async (userId: string, shippingDetails: {
  address: string,
  city: string,
  phone: string,
  name: string,
  shippingFee: number
}) => {
  const supabase = getSupabase();

  // 1. Get cart items with product details
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!cart) throw new Error("السلة غير موجودة");

  const { data: items, error: itemsError } = await supabase
    .from("cart_items")
    .select(`
      product_id,
      quantity,
      product:products (
        id,
        price,
        artist_id,
        in_stock,
        name
      )
    `)
    .eq("cart_id", cart.id);

  if (itemsError || !items || items.length === 0) {
    throw new Error("السلة فارغة");
  }

  // 2. Validate all products are in stock
  for (const item of items as any[]) {
    if (!item.product || !item.product.in_stock) {
      throw new Error(`عذراً، المنتج "${item.product?.name || 'المطلوب'}" غير متوفر حالياً`);
    }
  }

  // 3. Group items by artist_id (seller)
  const ordersByArtist: Record<string, any[]> = {};
  (items as any[]).forEach((item: any) => {
    const artistId = item.product.artist_id || 'default';
    if (!ordersByArtist[artistId]) ordersByArtist[artistId] = [];
    ordersByArtist[artistId].push(item);
  });

  // 4. Create Parent Order
  const grandTotal = (items as any[]).reduce(
    (sum: number, item: any) => sum + (Number(item.product.price) * item.quantity), 0
  ) + (shippingDetails.shippingFee || 0);

  const { data: parentOrder, error: parentError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      artist_id: null,
      parent_order_id: null,
      total_price: grandTotal,
      shipping_fee: shippingDetails.shippingFee || 0,
      shipping_address: shippingDetails.address,
      shipping_city: shippingDetails.city,
      shipping_phone: shippingDetails.phone,
      shipping_name: shippingDetails.name,
      status: 'pending'
    })
    .select()
    .single();

  if (parentError) throw new Error(parentError.message);

  const createdOrders: any[] = [];

  // 5. Create a child order for each artist/seller
  for (const artistId in ordersByArtist) {
    const artistItems = ordersByArtist[artistId]!;
    const itemsPrice = artistItems.reduce(
      (sum: number, item: any) => sum + (Number(item.product.price) * item.quantity), 0
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        artist_id: artistId === 'default' ? null : artistId,
        parent_order_id: parentOrder.id,
        total_price: itemsPrice,
        shipping_fee: 0,
        shipping_address: shippingDetails.address,
        shipping_city: shippingDetails.city,
        shipping_phone: shippingDetails.phone,
        shipping_name: shippingDetails.name,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) throw new Error(orderError.message);

    // Create order items
    const orderItemsData = artistItems.map((item: any) => ({
      order_id: order.id,
      product_id: item.product_id,
      price: item.product.price,
      quantity: item.quantity
    }));

    const { error: itemsInsertError } = await supabase
      .from("order_items")
      .insert(orderItemsData);

    if (itemsInsertError) throw new Error(itemsInsertError.message);

    createdOrders.push(order);
  }

  // 6. Clear cart
  await clearCart(userId);

  return { parentOrder, orders: createdOrders };
};

export const createOrder = async (orderData: {
  userId: string,
  artistId: string,
  items: Array<{ product_id?: string, artwork_id?: string, quantity: number, price: number }>,
  shipping_details: {
    address: string,
    city: string,
    phone: string,
    name: string,
    shipping_fee: number
  }
}) => {
  const supabase = getSupabase();

  // Normalize product_id (support artwork_id as alias)
  const normalizedItems = orderData.items.map(item => ({
    ...item,
    product_id: item.product_id || item.artwork_id,
  }));

  // Check stock
  for (const item of normalizedItems) {
    const { data: product } = await supabase
      .from("products")
      .select("in_stock, name")
      .eq("id", item.product_id)
      .single();

    if (!product || !product.in_stock) {
      throw new Error(`عذراً، المنتج "${product?.name || 'المطلوب'}" غير متوفر حالياً`);
    }
  }

  const itemsPrice = normalizedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalPrice = itemsPrice + (orderData.shipping_details.shipping_fee || 0);

  // 1. Create Parent Order
  const { data: parentOrder, error: parentError } = await supabase
    .from("orders")
    .insert({
      user_id: orderData.userId,
      artist_id: null,
      parent_order_id: null,
      total_price: totalPrice,
      shipping_fee: orderData.shipping_details.shipping_fee || 0,
      shipping_address: orderData.shipping_details.address,
      shipping_city: orderData.shipping_details.city,
      shipping_phone: orderData.shipping_details.phone,
      shipping_name: orderData.shipping_details.name,
      status: 'pending'
    })
    .select()
    .single();

  if (parentError) throw new Error(parentError.message);

  // 2. Create Child Order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: orderData.userId,
      artist_id: orderData.artistId,
      parent_order_id: parentOrder.id,
      total_price: itemsPrice,
      shipping_fee: 0,
      shipping_address: orderData.shipping_details.address,
      shipping_city: orderData.shipping_details.city,
      shipping_phone: orderData.shipping_details.phone,
      shipping_name: orderData.shipping_details.name,
      status: 'pending'
    })
    .select()
    .single();

  if (orderError) throw new Error(orderError.message);

  // 3. Create order items
  const orderItemsData = normalizedItems.map(item => ({
    order_id: order.id,
    product_id: item.product_id,
    price: item.price,
    quantity: item.quantity
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItemsData);

  if (itemsError) throw new Error(itemsError.message);

  return order;
};

export const getArtistOrders = async (artistId: string) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      user:users!orders_user_id_fkey (id, first_name, last_name, email, profile_image),
      items:order_items (
        id,
        quantity,
        price,
        product:products (
          id,
          name,
          image_url
        )
      )
    `)
    .eq("artist_id", artistId)
    .not("parent_order_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((order: any) => ({
    ...order,
    user: order.user ? {
      ...order.user,
      profile_image: order.user.profile_image ? toProfileImagePublicUrl(order.user.profile_image) : null
    } : null,
    items: (order.items || []).map((item: any) => ({
      ...item,
      product: transformProduct(item.product),
      artwork: transformProduct(item.product), // backward-compat
    }))
  }));
};

export const getUserOrders = async (userId: string) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      children:orders!parent_order_id (
        *,
        artist:users!orders_artist_id_fkey (id, artist_name, first_name, last_name, profile_image),
        items:order_items (
          id,
          quantity,
          price,
          product:products (
            id,
            name,
            image_url
          )
        )
      )
    `)
    .eq("user_id", userId)
    .is("parent_order_id", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const calculateParentStatus = (children: any[]) => {
    if (!children || children.length === 0) return 'pending';
    const allCancelledOrRejected = children.every(o => o.status === 'cancelled' || o.status === 'rejected');
    if (allCancelledOrRejected) return 'cancelled';
    const validOrders = children.filter(o => o.status !== 'cancelled' && o.status !== 'rejected');
    if (validOrders.length === 0) return 'cancelled';
    const allDelivered = validOrders.every(o => o.status === 'delivered');
    if (allDelivered) return 'completed';
    const allShippedOrDelivered = validOrders.every(o => o.status === 'shipped' || o.status === 'delivered');
    if (allShippedOrDelivered) return 'shipped';
    const anyShippedOrDelivered = validOrders.some(o => o.status === 'shipped' || o.status === 'delivered');
    if (anyShippedOrDelivered) return 'partially_shipped';
    const anyProcessing = validOrders.some(o => o.status === 'approved' || o.status === 'preparing');
    if (anyProcessing) return 'processing';
    return 'pending';
  };

  return (data || []).map((group: any) => ({
    ...group,
    parent_status: calculateParentStatus(group.children),
    children: (group.children || []).map((order: any) => ({
      ...order,
      artist: order.artist ? {
        ...order.artist,
        profile_image: order.artist.profile_image ? toProfileImagePublicUrl(order.artist.profile_image) : null
      } : null,
      items: (order.items || []).map((item: any) => ({
        ...item,
        product: transformProduct(item.product),
        artwork: transformProduct(item.product), // backward-compat
      }))
    }))
  }));
};

export const updateOrderStatus = async (orderId: string, userId: string, role: string, newStatus: OrderStatus) => {
  const supabase = getSupabase();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) throw new Error("الطلب غير موجود");

  const isBuyer = order.user_id === userId;
  const isSeller = order.artist_id === userId;

  if (!isBuyer && !isSeller) {
    throw new Error("ليس لديك صلاحية لتعديل هذا الطلب");
  }

  const artistStatuses: OrderStatus[] = ['approved', 'rejected', 'preparing', 'shipped'];
  if (artistStatuses.includes(newStatus)) {
    if (!isSeller) {
      throw new Error("فقط البائع يمكنه تغيير الحالة لهذه المرحلة");
    }
  }

  if (newStatus === 'cancelled') {
    if (!isBuyer) {
      throw new Error("فقط المشتري يمكنه إلغاء الطلب");
    }
    const forbiddenForCancellation: OrderStatus[] = ['shipped', 'delivered'];
    if (forbiddenForCancellation.includes(order.status)) {
      throw new Error("لا يمكن إلغاء الطلب بعد شحنه");
    }
  }

  if (newStatus === 'delivered') {
    if (!isBuyer) {
      throw new Error("فقط المشتري يمكنه تأكيد استلام الطلب");
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);

  // On rejection or cancellation: move items back to cart
  const restorationStatuses: OrderStatus[] = ['rejected', 'cancelled'];
  if (restorationStatuses.includes(newStatus) && !restorationStatuses.includes(order.status)) {
    try {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (items && items.length > 0) {
        const cartService = require("./cart.service");
        const cartData = await cartService.getCartByUserId(order.user_id);
        const cartId = cartData.cartId;

        for (const item of items) {
          await cartService.addItemToCart(cartId, { productId: item.product_id, quantity: item.quantity });
        }
      }
    } catch (err) {
      console.error("Error moving items back to cart on rejection/cancellation:", err);
    }
  }

  return updated;
};
