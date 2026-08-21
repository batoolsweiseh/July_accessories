"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function fetchAdminData() {
  try {
    const [categoriesRes, subcategoriesRes, productsRes] = await Promise.all([
      supabaseAdmin.from("categories").select("*").order("title_ar"),
      supabaseAdmin.from("subcategories").select("*").order("title_ar"),
      supabaseAdmin.from("products").select("*, subcategories(title_ar)").order("created_at", { ascending: false }),
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (subcategoriesRes.error) throw subcategoriesRes.error;
    if (productsRes.error) throw productsRes.error;

    const categoryOrder = ["accessories", "sets", "bags", "watches"];
    const sortedCategories = (categoriesRes.data || [])
      .filter((c: any) => c.slug !== "wheel_settings")
      .sort((a: any, b: any) => {
        const idxA = categoryOrder.indexOf(a.slug);
        const idxB = categoryOrder.indexOf(b.slug);
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
      });

    return {
      success: true,
      categories: sortedCategories,
      subcategories: subcategoriesRes.data || [],
      products: productsRes.data || [],
    };
  } catch (error: any) {
    console.error("fetchAdminData error:", error);
    return { success: false, error: error.message };
  }
}

export async function createProduct(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const price = Number(formData.get("price"));
    const description = formData.get("description") as string;
    const whatsappMessage = formData.get("whatsappMessage") as string;
    const categorySlug = formData.get("categorySlug") as string;
    const subcategoryId = formData.get("subcategoryId") as string;
    const isFeatured = formData.get("isFeatured") === "true";
    const inStock = formData.get("inStock") === "true";
    const isNew = formData.get("isNew") === "true";
    const isTrending = formData.get("isTrending") === "true";
    const file = formData.get("imageFile") as File | null;

    let imageUrl = "";

    if (file && file.size > 0) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from("products")
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw new Error("Failed to upload image to storage: " + uploadError.message);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("products")
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    }

    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const validSubcategoryId = subcategoryId && isValidUUID(subcategoryId) ? subcategoryId : null;

    let finalDescription = description || "";
    if (isNew) finalDescription += " [tag:new]";
    if (isTrending) finalDescription += " [tag:trending]";

    const { error: insertError } = await supabaseAdmin.from("products").insert({
      name,
      price,
      description: finalDescription || null,
      whatsapp_message: whatsappMessage || null,
      category_slug: categorySlug,
      subcategory_id: validSubcategoryId,
      is_featured: isFeatured,
      in_stock: inStock,
      image_url: imageUrl || null,
    });

    if (insertError) {
      throw new Error("Failed to insert product: " + insertError.message);
    }

    revalidatePath("/");
    revalidatePath("/category/[slug]", "page");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("createProduct error:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(id: string, imageUrl: string | null) {
  try {
    // 1. Delete from database first
    const { error: dbError } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("id", id);

    if (dbError) {
      throw new Error("Failed to delete product from database: " + dbError.message);
    }

    // 2. Delete image from Storage if applicable
    if (imageUrl) {
      const parts = imageUrl.split("/products/");
      if (parts.length > 1) {
        const fileName = parts[1];
        const { error: storageError } = await supabaseAdmin.storage
          .from("products")
          .remove([fileName]);

        if (storageError) {
          console.error("Failed to delete image from storage:", storageError.message);
        }
      }
    }

    revalidatePath("/");
    revalidatePath("/category/[slug]", "page");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("deleteProduct error:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleStock(id: string, currentInStock: boolean) {
  try {
    const { error } = await supabaseAdmin
      .from("products")
      .update({ in_stock: !currentInStock })
      .eq("id", id);

    if (error) {
      throw new Error("Failed to toggle stock status: " + error.message);
    }

    revalidatePath("/");
    revalidatePath("/category/[slug]", "page");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("toggleStock error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProduct(id: string, formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const price = Number(formData.get("price"));
    const description = formData.get("description") as string;
    const categorySlug = formData.get("categorySlug") as string;
    const subcategoryId = formData.get("subcategoryId") as string;
    const isFeatured = formData.get("isFeatured") === "true";
    const inStock = formData.get("inStock") === "true";
    const isNew = formData.get("isNew") === "true";
    const isTrending = formData.get("isTrending") === "true";
    const existingImageUrl = formData.get("existingImageUrl") as string | null;
    const file = formData.get("imageFile") as File | null;

    let imageUrl = existingImageUrl || "";

    if (file && file.size > 0) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from("products")
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw new Error("Failed to upload image to storage: " + uploadError.message);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from("products")
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;

      // Delete old image if it existed
      if (existingImageUrl) {
        const parts = existingImageUrl.split("/products/");
        if (parts.length > 1) {
          await supabaseAdmin.storage.from("products").remove([parts[1]]);
        }
      }
    }

    const isValidUUID = (id: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const validSubcategoryId = subcategoryId && isValidUUID(subcategoryId) ? subcategoryId : null;

    let finalDescription = description || "";
    if (isNew) finalDescription += " [tag:new]";
    if (isTrending) finalDescription += " [tag:trending]";

    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        name,
        price,
        description: finalDescription || null,
        category_slug: categorySlug,
        subcategory_id: validSubcategoryId,
        is_featured: isFeatured,
        in_stock: inStock,
        image_url: imageUrl || null,
      })
      .eq("id", id);

    if (updateError) {
      throw new Error("Failed to update product: " + updateError.message);
    }

    revalidatePath("/");
    revalidatePath("/category/[slug]", "page");
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("updateProduct error:", error);
    return { success: false, error: error.message };
  }
}

export async function createCustomerOrder(order: {
  customer_name: string;
  customer_phone: string;
  customer_city: string;
  notes?: string;
  delivery_fee?: number;
  items: { id: string; name: string; price: number; quantity: number }[];
}) {
  try {
    // 1. تجميع الأصناف بطريقة واضحة ومنفصلة لكل صنف في سطر
    const itemsLines = order.items.map(
      (item) => `• ${item.name} (${item.quantity} قطع) - ${(item.price * item.quantity).toFixed(0)} ₪`
    );

    let productName = itemsLines.join("\n");
    if (order.notes && order.notes.trim()) {
      productName += `\n\n📝 ملاحظة العميل:\n${order.notes.trim()}`;
    }

    // 2. حساب المجموع الكلي لجميع القطع مع التوصيل
    const itemsTotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const deliveryFee = Number(order.delivery_fee) || 0;
    const totalPrice = itemsTotal + deliveryFee;

    // 3. تحديد رقم المنتج (إذا كانت قطعة واحدة فقط نرسل المعرف، وإلا نرسل null)
    const productId = order.items.length === 1 ? order.items[0].id : null;

    // 4. إدخال سجل واحد في قاعدة البيانات
    const { error } = await supabaseAdmin.from("orders").insert({
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_city: order.customer_city,
      product_id: productId,
      product_name: productName,
      product_price: totalPrice,
      status: "pending",
    });

    if (error) throw error;

    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("createCustomerOrder error:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchOrders() {
  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { success: true, orders: data || [] };
  } catch (error: any) {
    console.error("fetchOrders error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    if (status === "cancelled") {
      const { error } = await supabaseAdmin
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
      revalidatePath("/admin");
      return { success: true };
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) throw error;
    revalidatePath("/admin");
    return { success: true };
  } catch (error: any) {
    console.error("updateOrderStatus error:", error);
    return { success: false, error: error.message };
  }
}

