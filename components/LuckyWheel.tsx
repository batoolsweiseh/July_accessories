"use client";

import { useRef, useState, useEffect } from "react";

type Segment = { label: string; color: string; textColor?: string; probability?: number };

function spinWheel(prizesList: Segment[]) {
  const totalWeight = prizesList.reduce((sum, p) => sum + (p.probability ?? 0), 0);
  if (totalWeight <= 0) return prizesList[0];

  const rand = Math.random() * totalWeight;
  let cumulative = 0;
  for (const prize of prizesList) {
    cumulative += prize.probability ?? 0;
    if (rand < cumulative) return prize;
  }
  return prizesList[0];
}

const STORAGE_KEY = "july-wheel-segments";
const COOLDOWN_KEY = "july-wheel-last-spin";
const PRIZE_KEY = "july-wheel-last-prize";
const COOLDOWN_TIME = 48 * 60 * 60 * 1000; // 48 hours

function loadSegments(): Segment[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

function getContrastColor(hexColor: string): string {
  try {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 180 ? "#b52b57" : "#ffffff";
  } catch {
    return "#ffffff";
  }
}

function drawWheel(canvas: HTMLCanvasElement, segments: Segment[], rotation: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx || segments.length === 0) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = cx - 12;
  const arc = (2 * Math.PI) / segments.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();

  segments.forEach((seg, i) => {
    const start = rotation + i * arc - Math.PI / 2;
    const end = start + arc;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textColor = seg.textColor || getContrastColor(seg.color);
    ctx.fillStyle = textColor;
    
    // حجم خط متوازن ومناسب لعدد الخيارات
    const fontSize = Math.max(13, Math.min(18, Math.floor(380 / segments.length)));
    ctx.font = `bold ${fontSize}px 'IBM Plex Sans Arabic', 'Lalezar', sans-serif`;
    
    if (textColor === "#ffffff") {
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 4;
    } else {
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    // توسيط النص في منتصف شعاع الشريحة لمنع اختفاء أي حرف تحت الدائرة المركزية
    const textRadius = (r + 48) / 2;
    const maxTextWidth = r - 70;
    ctx.fillText(seg.label, textRadius, 0, maxTextWidth);
    ctx.restore();
  });

  // المركز الخارجي بحجم متناسق لا يغطي الكلمات
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, 2 * Math.PI);
  ctx.fillStyle = "#111";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // نقطة المركز الداخلية
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
}

export default function LuckyWheel() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [lastSpinTime, setLastSpinTime] = useState<number | null>(null);
  const [lastPrize, setLastPrize] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  /* تحميل القطاعات من السيرفر/localStorage وحالة الكول داون */
  useEffect(() => {
    setMounted(true);
    setSegments(loadSegments());

    fetch("/api/wheel-segments")
      .then((res) => res.json())
      .then((data) => {
        if (data.segments && Array.isArray(data.segments)) {
          setSegments(data.segments);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.segments));
          } catch {}
        }
      })
      .catch((err) => console.error("Error loading wheel segments from server:", err));

    const lastSpin = localStorage.getItem(COOLDOWN_KEY);
    const savedPrize = localStorage.getItem(PRIZE_KEY);

    if (lastSpin) {
      const lastSpinMs = parseInt(lastSpin, 10);
      if (!isNaN(lastSpinMs)) {
        if (Date.now() - lastSpinMs < COOLDOWN_TIME) {
          setLastSpinTime(lastSpinMs);
          if (savedPrize) {
            setLastPrize(savedPrize);
            setResult(savedPrize);
          }
        } else {
          // انتهت فترة الانتظار
          localStorage.removeItem(COOLDOWN_KEY);
          localStorage.removeItem(PRIZE_KEY);
        }
      }
    }
  }, []);

  /* فحص دوري لانتهاء الكول داون */
  useEffect(() => {
    if (lastSpinTime === null) return;

    const checkCooldown = () => {
      const elapsed = Date.now() - lastSpinTime;
      const remaining = COOLDOWN_TIME - elapsed;

      if (remaining <= 0) {
        setLastSpinTime(null);
        setLastPrize(null);
        setResult(null);
        setShowResult(false);
        try {
          localStorage.removeItem(COOLDOWN_KEY);
          localStorage.removeItem(PRIZE_KEY);
        } catch {}
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 30000);
    return () => clearInterval(interval);
  }, [lastSpinTime]);

  const isCooldownActive = lastSpinTime !== null && (Date.now() - lastSpinTime < COOLDOWN_TIME);

  /* إعادة رسم عند تغيير القطاعات */
  useEffect(() => {
    if (canvasRef.current && segments.length > 0) {
      drawWheel(canvasRef.current, segments, rotation);
    }
  }, [segments]);

  const paintWheel = (rot: number, segs: Segment[]) => {
    if (canvasRef.current) drawWheel(canvasRef.current, segs, rot);
  };

  const spin = () => {
    if (spinning || segments.length < 2 || isCooldownActive) return;

    // تسجيل وقت الدوران الحالي لمنع الدوران مجدداً قبل 48 ساعة
    const now = Date.now();
    localStorage.setItem(COOLDOWN_KEY, now.toString());
    setLastSpinTime(now);

    setSpinning(true);
    setShowResult(false);
    setResult(null);

    // 1. تحديد الجائزة الفائزة بناءً على الاحتمالات
    const winningPrize = spinWheel(segments);
    const winnerIdx = segments.findIndex((p) => p.label === winningPrize.label);

    // 2. حساب الزاوية المطلوبة لتقف العجلة عند winnerIdx في الأعلى (المؤشر ▼)
    const arc = (2 * Math.PI) / segments.length;
    const targetPointerAngle = (winnerIdx + 0.5) * arc; // منتصف شريحة الفائز
    const finalNormalizedRot = (2 * Math.PI - targetPointerAngle) % (2 * Math.PI);

    const currentNormalized = ((rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    let diff = finalNormalizedRot - currentNormalized;
    if (diff <= 0) {
      diff += 2 * Math.PI;
    }

    const extraSpins = 5 + Math.floor(Math.random() * 5); // عدد لفات كاملة إضافية (من 5 إلى 9)
    const targetAngle = extraSpins * 2 * Math.PI + diff;

    const duration = 4000;
    const startTime = performance.now();
    const startRot = rotation;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const currentRot = startRot + targetAngle * easeOut(progress);

      setRotation(currentRot);
      paintWheel(currentRot, segments);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // تعيين النتيجة وحفظ الجائزة لتبقى ظاهرة حتى انتهاء فترة الانتظار
        const prizeName = winningPrize.label;
        setResult(prizeName);
        setLastPrize(prizeName);
        try {
          localStorage.setItem(PRIZE_KEY, prizeName);
        } catch {}
        setShowResult(true);
        setSpinning(false);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const canvasRefCb = (el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
    if (el && segments.length > 0) drawWheel(el, segments, rotation);
  };

  if (!mounted) return null;

  return (
    <section
      id="lucky-wheel"
      dir="rtl"
      className="relative overflow-hidden bg-gradient-to-b from-white via-[#fff8f0] to-white py-14 sm:py-20"
    >
      {/* زخرفة خلفية */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.03]">
        <div className="h-[600px] w-[600px] rounded-full border-[60px] border-black" />
      </div>

      <div className="relative mx-auto max-w-4xl px-5 sm:px-8">
        {/* العنوان */}
        <div className="mb-10 text-center">
          <h2
            style={{ fontFamily: "'Lalezar', serif" }}
            className="text-3xl sm:text-5xl text-black"
          >
            🎡 دولاب الحظ
          </h2>
          <div className="mx-auto mt-3 h-px w-20 bg-gradient-to-r from-transparent via-[#FF6B6B]/60 to-transparent" />
          <p className="mt-3 text-sm text-black/50">دوّر الدولاب واربح!</p>
        </div>

        <div className="flex flex-col items-center gap-8">
          {/* الدولاب */}
          <div className="relative flex flex-col items-center gap-5">
            {/* المؤشر ▼ */}
            <div className="relative">
              <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -22 }}>
                <svg width="36" height="36" viewBox="0 0 28 28">
                  <polygon
                    points="14,26 2,2 26,2"
                    fill="#111"
                    stroke="#fff"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {segments.length === 0 ? (
                <div className="flex h-[320px] w-[320px] sm:h-[400px] sm:w-[400px] md:h-[460px] md:w-[460px] items-center justify-center rounded-full border-4 border-dashed border-black/20 bg-[#fafafa]">
                  <div className="text-center px-4">
                    <div className="text-5xl mb-2">🎡</div>
                    <p className="text-base text-black/40 font-semibold">الدولاب فارغ</p>
                    <p className="text-xs text-black/30 mt-1">المشرف لم يضف خيارات بعد</p>
                  </div>
                </div>
              ) : (
                <canvas
                  ref={canvasRefCb}
                  width={700}
                  height={700}
                  className="h-[320px] w-[320px] sm:h-[400px] sm:w-[400px] md:h-[460px] md:w-[460px] drop-shadow-2xl"
                  style={{ borderRadius: "50%" }}
                />
              )}
            </div>

            {/* زر الدوران / اسم الجائزة بعد الدوران */}
            <button
              type="button"
              onClick={spin}
              disabled={spinning || segments.length < 2 || isCooldownActive}
              className={`rounded-2xl px-10 py-4 text-base font-bold tracking-wide shadow-xl transition-all duration-200 ${
                isCooldownActive
                  ? "bg-black text-white cursor-default border border-white/10 shadow-lg"
                  : "bg-black text-white hover:bg-neutral-800 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {spinning ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  جاري الدوران...
                </span>
              ) : isCooldownActive ? (
                <span className="flex items-center justify-center gap-2">
                  <span>🎁</span>
                  <span>{lastPrize || result || "تم السحب"}</span>
                </span>
              ) : (
                "🎲 دوّر!"
              )}
            </button>

            {/* نتيجة السحب الفورية عند انتهاء الدوران */}
            {showResult && result && (
              <div
                className="rounded-2xl bg-black px-8 py-4 text-center shadow-2xl"
                style={{ animation: "wheelBounceIn 0.5s ease-out forwards" }}
              >
                <p className="text-xs text-white/60 mb-1 tracking-widest uppercase">الفائز</p>
                <p
                  style={{ fontFamily: "'Lalezar', serif" }}
                  className="text-2xl sm:text-3xl text-white"
                >
                  🎉 {result}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
