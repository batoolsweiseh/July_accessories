"use client";
import { useEffect, useState } from "react";

export default function Bubbles() {
  const [bubbles, setBubbles] = useState<
    Array<{ size: number; left: number; duration: number; delay: number }>
  >([]);

  useEffect(() => {
    // نولد الفقاعات عند الـ mount عشان نتجنب الـ hydration mismatch
    setBubbles(
      Array.from({ length: 25 }).map(() => ({
        size: Math.random() * 70 + 20, // من 20 إلى 90 بكسل
        left: Math.random() * 100, // مكان عشوائي أفقياً
        duration: Math.random() * 12 + 10, // من 10 إلى 22 ثانية سرعة
        delay: Math.random() * 10, // تأخير قبل البدء
      }))
    );
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="absolute bottom-[-150px] rounded-full border border-steel/20 bg-white/50 shadow-[0_0_20px_rgba(255,255,255,0.3)] backdrop-blur-sm animate-float"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
