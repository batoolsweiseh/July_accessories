import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductDetailClient from "@/components/ProductDetailClient";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { parseProductPieces, cleanDescriptionTags, ProductPiece } from "@/lib/productVariants";

type Product = {
  id: number | string;
  name: string;
  price: string;
  category: string;
  inStock?: boolean;
  isNew?: boolean;
  desc: string;
  fullDesc: string;
  specs: { label: string; value: string }[];
  image?: string;
  whatsapp: string;
  hasColors?: boolean;
  pieces?: ProductPiece[];
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
    const cleanDesc = cleanDescriptionTags(desc);
    const isNew = data.is_new || desc.includes("[tag:new]");
    const hasColors = desc.includes("[tag:colors]");
    const pieces = parseProductPieces(desc);
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
      whatsapp: data.whatsapp_message || `https://wa.me/972597287067?text=أريد أطلب: ${data.name}`,
      hasColors,
      pieces,
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
      const cleanDesc = cleanDescriptionTags(desc);
      const isNew = p.is_new || desc.includes("[tag:new]");
      const hasColors = desc.includes("[tag:colors]");
      const pieces = parseProductPieces(desc);
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
        whatsapp: p.whatsapp_message || `https://wa.me/972597287067?text=أريد أطلب: ${p.name}`,
        hasColors,
        pieces,
      };
    });
  } catch (err) {
    console.error("Error fetching all products from Supabase:", err);
    return [];
  }
}

export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({
    id: String(p.id),
  }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  return (
    <>
      <Header />
      <ProductDetailClient product={product} />
      <Footer />
    </>
  );
}
