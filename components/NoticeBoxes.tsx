import React from "react";

const notices = [
  "يعرض الموقع مجموعة من القطع المتوفرة بشكل دائم، بينما تتوفر في فروعنا تشكيلة أوسع ومتنوعة من الإكسسوارات.",
  "تم تحسين بعض الصور باستخدام تقنيات الذكاء الاصطناعي، مع الحفاظ على الشكل الحقيقي للقطع .",
  "نعمل على تحديث الصور خلال الأيام القادمة لتظهر القطع بصورتها الفعلية.",
];

export default function NoticeBoxes() {
  return (
    <section className="w-full bg-[#FAF8F5] py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-3">
        {notices.map((text, index) => (
          <div
            key={index}
            className="w-full bg-[#F8F5F1] border border-[#D8CFC5] rounded-xl px-5 py-3.5 sm:py-4 shadow-[0_2px_8px_rgba(58,48,43,0.04)] text-center transition-all duration-200"
          >
            <p
              className="text-[#3A302B] text-sm sm:text-base md:text-lg leading-relaxed font-medium m-0 tracking-normal"
              dir="rtl"
            >
              {text}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

