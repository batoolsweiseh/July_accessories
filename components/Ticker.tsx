const items = [
  "مكفول سنتين",
  "ستانلس أصلي",
  "لمعة ما بتخيب",
  "شبيه الماركات",
  "ضد الصدأ",
  "توصيل لكل الضفة",
  "3 فروع في نابلس",
  "أطقم وإكسسوارات",
  "شنط وساعات",
  "جودة عالية",
];

// نضاعف القائمة عشان الحلقة تصير سلسة بدون انقطاع
const repeated = [...items, ...items, ...items];

export default function Ticker() {
  return (
    <div
      aria-hidden
      className="overflow-hidden border-y border-black/10 bg-white py-3 select-none"
    >
      <div className="ticker-track inline-flex gap-10" dir="rtl">
        {repeated.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2.5 font-mono text-xs tracking-widest text-black whitespace-nowrap"
          >
            <span className="text-black text-sm">✦</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
