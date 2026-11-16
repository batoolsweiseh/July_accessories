"use client";

import { useState, useRef, useEffect } from "react";

const HERO_VIDEOS = [
  "/videos/hero-1.mp4",
  "/videos/hero-2.mp4",
];

export default function Hero() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnded = () => {
    setCurrentVideoIndex((prevIndex) => (prevIndex + 1) % HERO_VIDEOS.length);
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIndex]);

  return (
    <>
      <section className="relative w-full min-h-screen overflow-hidden">
        {/* فيديو الخلفية */}
        <video
          ref={videoRef}
          key={HERO_VIDEOS[currentVideoIndex]}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        >
          <source src={HERO_VIDEOS[currentVideoIndex]} type="video/mp4" />
        </video>

        {/* Overlay */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.10) 100%)",
          }}
        />

        {/* النص المركزي */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-8">
          <h1
            style={{ fontFamily: "'Lalezar', serif" }}
            className="text-white drop-shadow-2xl leading-tight text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
          >
            July Accessories
          </h1>
          <p className="mt-4 sm:mt-6 text-white/80 font-light tracking-wide drop-shadow text-sm sm:text-base md:text-lg lg:text-xl">
            اكتشفي أحدث تشكيلاتنا
          </p>
          <a
            href="#shop-categories"
            className="mt-8 sm:mt-10 inline-block border border-white/60 text-white px-6 py-2.5 sm:px-8 sm:py-3 text-xs sm:text-sm tracking-[0.2em] uppercase font-mono hover:bg-white hover:text-black transition-all duration-300 rounded-full"
          >
            تسوّقي الآن
          </a>
        </div>
      </section>

      <div id="categories" />
    </>
  );
}
