import Logo from "./Logo";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-paper-2 border-t border-steel/20">
      {/* قائمة الفوتر */}
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-3">
          {/* الشعار والتلخيص */}
          <div>
            <a href="#" className="inline-block mb-4">
              <Logo className="items-start" />
            </a>
          </div>

          {/* روابط سريعة */}
          <div>
            <h3 className="mb-4 font-display text-sm text-charcoal uppercase tracking-widest">
              روابط سريعة
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "الرئيسية", href: "/" },
                { label: "من نحن", href: "/about" },
              ].map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-charcoal hover:text-charcoal transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* تواصل */}
          <div>
            <h3 className="mb-4 font-display text-sm text-charcoal uppercase tracking-widest">
              تواصلي معنا
            </h3>
            <div className="space-y-3 text-sm text-charcoal">
              <a
                href="https://wa.me/972597287067"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-charcoal transition-colors"
              >
                <i className="fa-brands fa-whatsapp text-lg"></i>
                واتساب
              </a>
              <a
                href="https://www.instagram.com/july._accessories?igsh=anMwaHQzd2FvbGNk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-charcoal transition-colors"
              >
                <i className="fa-brands fa-instagram text-lg"></i>
                إنستاغرام
              </a>

            </div>
          </div>
        </div>
      </div>

      {/* شريط حقوق النشر */}
      <div className="border-t border-steel/20 py-5 text-center">
        <p className="text-xs text-charcoal">
          © {year} July Accessories · جميع الحقوق محفوظة ·  working by batool sweiseh
        </p>
      </div>
    </footer>
  );
}
