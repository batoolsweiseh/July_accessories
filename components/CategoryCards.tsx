"use client";

import Image from "next/image";

const categories = [
  {
    id: "cat-bags",
    label: "شنط",
    labelEn: "BAGS",
    image: "/images/bags.jpg",
    href: "/category/bags",
  },
  {
    id: "cat-sets",
    label: "أطقم إكسسوارات",
    labelEn: "ACCESSORIES SETS",
    image: "/images/WhatsApp Image 2026-07-12 at 11.30.42 AM.jpeg",
    href: "/category/sets",
  },
  {
    id: "cat-watches",
    label: "ساعات",
    labelEn: "WATCHES",
    image: "/images/watches-model.jpg",
    href: "/category/watches",
  },
  {
    id: "cat-accessories",
    label: "إكسسوارات",
    labelEn: "ACCESSORIES",
    image: "/images/WhatsApp Image 2026-07-17 at 2.36.41 PM.jpeg",
    href: "/category/accessories",
  },
];

export default function CategoryCards() {
  return (
    <section id="shop-categories" className="bg-paper py-12 sm:py-16" dir="rtl">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-10 text-center">
          <p className="mb-2 font-mono text-[10px] sm:text-xs tracking-widest text-charcoal/60">
            — SHOP BY CATEGORY —
          </p>
          <h2 className="font-display text-xl sm:text-3xl md:text-4xl lg:text-5xl text-charcoal">
            تسوّقي حسب الفئة
          </h2>
          <div className="mx-auto mt-3 h-px w-20 bg-gradient-to-l from-transparent via-steel/30 to-transparent" />
        </div>
 
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {categories.map((cat) => (
            <a
              key={cat.id}
              href={cat.href}
              className="group relative block overflow-hidden rounded-xl sm:rounded-2xl bg-white sm:bg-transparent p-1.5 pb-3 sm:p-0 shadow-sm hover:shadow-md transition-all duration-300"
              aria-label={cat.label}
            >
              <div className="relative aspect-[4/5] sm:aspect-square w-full overflow-hidden rounded-lg sm:rounded-2xl bg-gray-50">
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/50 to-transparent hidden sm:block" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-2 sm:pb-4 transition-all duration-500 ease-out hidden sm:flex">
                  <span
                    style={{ fontFamily: "'Lalezar', serif" }}
                    className="text-white text-[11px] sm:text-xl md:text-2xl lg:text-3xl leading-tight drop-shadow-lg text-center px-1"
                  >
                    {cat.label}
                  </span>
                  <span className="mt-0.5 font-mono text-[6px] sm:text-[9px] md:text-[10px] tracking-[0.10em] sm:tracking-[0.18em] text-white/70 uppercase">
                    {cat.labelEn}
                  </span>
                  <span className="mt-1 sm:mt-1.5 block h-px w-5 sm:w-10 bg-[#E0457D]" />
                </div>
              </div>

              {/* Text below the image, only visible on mobile (hidden on sm and up) */}
              <div className="flex flex-col items-center mt-2.5 sm:hidden">
                <span
                  style={{ fontFamily: "'Lalezar', serif" }}
                  className="text-charcoal text-[13px] leading-tight text-center px-1 font-semibold"
                >
                  {cat.label}
                </span>
                <span className="mt-0.5 font-mono text-[8px] tracking-[0.12em] text-charcoal/50 uppercase">
                  {cat.labelEn}
                </span>
                <span className="mt-1 block h-px w-6 bg-[#E0457D]" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
