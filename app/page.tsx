import Header from "@/components/Header";
import Hero from "@/components/Hero";
import CategoryCards from "@/components/CategoryCards";
import ProductSlider from "@/components/ProductSlider";
import Ticker from "@/components/Ticker";
import Footer from "@/components/Footer";
import LuckyWheel from "@/components/LuckyWheel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <Ticker />
      <CategoryCards />
      <ProductSlider />
      <LuckyWheel />

      <Footer />
    </main>
  );
}

