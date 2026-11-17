import Header from "@/components/Header";
import NoticeBoxes from "@/components/NoticeBoxes";
import Hero from "@/components/Hero";
import CategoryCards from "@/components/CategoryCards";
import ProductSlider from "@/components/ProductSlider";
import Ticker from "@/components/Ticker";
import Footer from "@/components/Footer";
import LuckyWheel from "@/components/LuckyWheel";

export const revalidate = 60; // إعادة التوليد والتخزين المؤقت كل 60 ثانية لحماية السيرفر من الضغط

export default function Home() {
  return (
    <main>
      <Header />
      <NoticeBoxes />
      <Hero />
      <Ticker />
      <CategoryCards />
      <ProductSlider />
      <LuckyWheel />

      <Footer />
    </main>
  );
}

