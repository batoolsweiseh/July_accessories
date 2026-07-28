const features = [
  {
    id: "feat-rust",
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" aria-hidden>
        <circle cx="20" cy="20" r="16" stroke="#000000" strokeWidth="2.5" />
        <path d="M13 27c1-5 4-8 7-8s6 3 7 8" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 19V13" stroke="#9DA3A8" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    title: "ضد الصدأ ١٠٠٪",
    body: "ستانلس 316L الجراحي لا يتأكسد ولا يغير لونه حتى بعد سنوات",
  },
  {
    id: "feat-sun",
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" aria-hidden>
        <circle cx="20" cy="20" r="7" stroke="#000000" strokeWidth="2.5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => (
          <line
            key={i}
            x1={20 + 10 * Math.cos((a * Math.PI) / 180)}
            y1={20 + 10 * Math.sin((a * Math.PI) / 180)}
            x2={20 + 14 * Math.cos((a * Math.PI) / 180)}
            y2={20 + 14 * Math.sin((a * Math.PI) / 180)}
            stroke="#9DA3A8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ))}
      </svg>
    ),
    title: "مقاوم للشمس والبحر",
    body: "لا يتأثر بالأشعة فوق البنفسجية أو الماء المالح، مثالي للصيف",
  },
  {
    id: "feat-sweat",
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" aria-hidden>
        <path d="M20 8c0 8-10 14-10 20a10 10 0 0020 0C30 22 20 16 20 8z" stroke="#000000" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
    ),
    title: "ضد العرق والرطوبة",
    body: "مثالي لليومي — يبقى لامع حتى في أشد الأيام حرارة",
  },
  {
    id: "feat-skin",
    icon: (
      <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none" aria-hidden>
        <path d="M20 32c-8 0-14-6-14-14S12 8 20 8s14 6 14 10" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M28 22l5 5-5 5" stroke="#9DA3A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "آمن على البشرة",
    body: "خالٍ من النيكل والمواد المثيرة للحساسية، موصى به طبياً",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-white/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* العنوان */}
        <div className="mb-14 text-center">
          <p className="mb-2 font-mono text-xs tracking-widest text-charcoal">— QUALITY PROMISE —</p>
          <h2 className="font-display text-4xl text-charcoal sm:text-5xl">لماذا ستانلس 316L؟</h2>
          <div className="mx-auto mt-3 h-px w-20 bg-gradient-to-l from-transparent via-steel/20 to-transparent" />
        </div>

        {/* بطاقات الميزات */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.id}
              className="rounded-2xl border border-steel/20 bg-paper p-7 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-steel/20 hover:shadow-lg hover:shadow-black/10"
            >
              <div className="mb-5 flex justify-center">{f.icon}</div>
              <h3 className="mb-2 font-display text-lg text-charcoal">{f.title}</h3>
              <p className="text-sm leading-relaxed text-charcoal">{f.body}</p>
            </div>
          ))}
        </div>

        {/* شارة الثقة */}
        <div className="mt-14 rounded-2xl border border-steel/20 bg-paper p-8 text-center shadow-sm">
          <p className="font-display text-2xl text-charcoal sm:text-3xl">
            كل قطعة مضمونة ✦ جودة أصلية ✦ لمعة دايمة
          </p>
          <p className="mt-2 text-sm text-charcoal">
            نوفر ضمان جودة على جميع مجوهراتنا — إذا تغيّر اللون نستبدل!
          </p>
        </div>
      </div>
    </section>
  );
}
