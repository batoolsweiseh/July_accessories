import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Bubbles from "@/components/Bubbles";

export const metadata: Metadata = {
  title: "من نحن | July Accessories",
  description: "تعرفي على قصة July Accessories، المتجر المختص بأحدث الإكسسوارات والشنط العصرية.",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-paper pb-24 pt-16 sm:pt-24 relative overflow-hidden">
        <Bubbles />
        {/* خلفية تجميلية */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/10 blur-[120px]"
        />

        <div className="mx-auto max-w-3xl px-5 sm:px-8 relative z-10 animate-fade-up">
          <h1 className="mb-10 text-center font-display text-4xl sm:text-5xl text-charcoal">
            من نحن
          </h1>

          <div className="rounded-[2rem] border border-steel/20 bg-paper-2 p-8 sm:p-12 shadow-xl shadow-black/5">
            <div className="space-y-6 font-body text-base leading-relaxed text-charcoal">
              <p>
                <strong className="font-display text-xl">July Accessories</strong> هو متجر مختص بتقديم أحدث صيحات الإكسسوارات النسائية والشبابية والشنط العصرية، حيث نحرص على اختيار تصاميم مميزة تجمع بين الأناقة والجودة لتناسب جميع الأذواق والمناسبات.
              </p>

              <p>
                نؤمن أن الأناقة تبدأ من التفاصيل، لذلك نوفر تشكيلات متنوعة ومتجددة باستمرار تعكس أحدث صيحات الموضة، مع اهتمام كبير بتقديم منتجات ذات جودة عالية وأسعار مناسبة.
              </p>

              <p>
                نسعى دائماً لتقديم تجربة تسوق مميزة وسهلة لعملائنا في مختلف فروعنا، مع خدمة مميزة واهتمام بأدق التفاصيل.
              </p>

              <div className="my-10 h-px w-full bg-gradient-to-r from-transparent via-steel/30 to-transparent" />

              <h2 className="mb-6 font-display text-2xl text-charcoal flex items-center gap-2">
                <i className="fa-solid fa-location-dot text-charcoal"></i>
                فروعنا
              </h2>

              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-charcoal"></span>
                  <span><strong>نابلس</strong> – شارع سفيان، مجمع سفيان التجاري، بجانب شاورما ع كيفك</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-charcoal"></span>
                  <span><strong>نابلس</strong> – شارع العدل، عمارة سعد الدين، بجانب A7la Moda</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-charcoal"></span>
                  <span><strong>نابلس</strong> – طلعة الطور، أمام صالون عمار للرجال</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
