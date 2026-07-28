import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  weight: ['400', '700'] 
});

export default function Logo({ className = "items-center" }: { className?: string }) {
  return (
    <div className={`flex flex-col justify-center ${className}`}>
      <span className={`${playfair.className} text-3xl md:text-4xl tracking-[0.15em] uppercase text-charcoal leading-none`}>
        JULY
      </span>
      <span className={`${playfair.className} text-[11px] md:text-[13px] tracking-[0.35em] uppercase text-charcoal/70 -mt-0.5 font-normal`}>
        Accessories
      </span>
    </div>
  );
}
