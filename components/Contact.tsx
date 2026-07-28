export default function Contact() {
  return (
    <section id="contact" className="bg-white/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* العنوان */}
        <div className="mb-14 text-center">
          <p className="mb-2 font-mono text-xs tracking-widest text-charcoal">— GET IN TOUCH —</p>
          <h2 className="font-display text-4xl text-charcoal sm:text-5xl">تواصلي معنا</h2>
          <div className="mx-auto mt-3 h-px w-20 bg-gradient-to-l from-transparent via-steel/20 to-transparent" />
          <p className="mt-4 text-charcoal">نرد خلال أقل من ٣٠ دقيقة ✦ يومياً ١٠ص–١٠م</p>
        </div>

        {/* بطاقات التواصل */}
        <div className="mx-auto max-w-2xl flex flex-col gap-5">
          <a
            href="https://wa.me/96170000000"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-5 rounded-2xl border border-steel/20 bg-paper p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-steel/20 hover:shadow-lg hover:shadow-black/10"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-3xl group-hover:bg-white/20 transition">
              📱
            </span>
            <div>
              <p className="font-display text-lg text-charcoal">واتساب</p>
              <p className="text-sm text-charcoal">أسرع طريقة للتواصل — اطلبي مباشرة</p>
            </div>
            <svg className="mr-auto h-5 w-5 text-charcoal/60 rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </a>

          <a
            href="https://www.instagram.com/july._accessories?igsh=anMwaHQzd2FvbGNk"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-5 rounded-2xl border border-steel/20 bg-paper p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-steel/20 hover:shadow-lg hover:shadow-black/10"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/10 text-3xl group-hover:bg-white/20 transition">
              📸
            </span>
            <div>
              <p className="font-display text-lg text-charcoal">إنستاغرام</p>
              <p className="text-sm text-charcoal">شوفي آخر التشكيلات والعروض</p>
            </div>
            <svg className="mr-auto h-5 w-5 text-charcoal/60 rotate-180" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
