import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ProductDetailClient from "@/components/ProductDetailClient";

type Product = {
  id: number;
  name: string;
  price: string;
  category: string;
  isNew?: boolean;
  desc: string;
  fullDesc: string;
  specs: { label: string; value: string }[];
  image?: string;
  whatsapp: string;
};

async function getProductById(id: string): Promise<Product | undefined> {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      console.error("Supabase returned no product or error for ID:", id, error);
      return undefined;
    }
    const desc = data.description || "";
    const cleanDesc = desc.replace(/\[tag:new\]/g, "").replace(/\[tag:trending\]/g, "").trim();
    const isNew = data.is_new || desc.includes("[tag:new]");
    return {
      id: data.id,
      name: data.name,
      price: String(data.price) + " ₪",
      category: data.category_slug,
      isNew,
      desc: cleanDesc,
      fullDesc: cleanDesc,
      specs: [],
      image: data.image_url,
      whatsapp: data.whatsapp_message || `https://wa.me/972590000000?text=أريد أطلب: ${data.name}`,
    };
  } catch (err) {
    console.error("Error fetching product by ID from Supabase:", err);
    return undefined;
  }
}

async function getAllProducts(): Promise<Product[]> {
  try {
    const { data, error } = await supabaseAdmin.from("products").select("*");
    if (error || !data) {
      console.error("Supabase returned no products or error when fetching all products:", error);
      return [];
    }
    return data.map((p: any) => {
      const desc = p.description || "";
      const cleanDesc = desc.replace(/\[tag:new\]/g, "").replace(/\[tag:trending\]/g, "").trim();
      const isNew = p.is_new || desc.includes("[tag:new]");
      return {
        id: p.id,
        name: p.name,
        price: String(p.price) + " ₪",
        category: p.category_slug,
        isNew,
        desc: cleanDesc,
        fullDesc: cleanDesc,
        specs: [],
        image: p.image_url,
        whatsapp: p.whatsapp_message || `https://wa.me/972590000000?text=أريد أطلب: ${p.name}`,
      };
    });
  } catch (err) {
    console.error("Error fetching all products from Supabase:", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const product = await getProductById(params.id);
  if (!product) return { title: "المنتج غير موجود" };
  return {
    title: `${product.name} | July Accessories`,
    description: product.fullDesc,
  };
}

export async function generateStaticParams() {
  const allProducts = await getAllProducts();
  return allProducts.map((p) => ({ id: String(p.id) }));
}

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  return (
    <>
      <Header />
      <ProductDetailClient product={product} />
      <Footer />
    </>
  );
}
