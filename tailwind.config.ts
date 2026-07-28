import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FFFFFF",
        "paper-2": "#FFFFFF",
        "paper-3": "#FFFFFF",
        charcoal: "#000000",
        mauve: "#000000",
        steel: "#9DA3A8",
        rose: "#FFFFFF",
        "rose-dark": "#F3F4F6",
        blush: "#FFFFFF",

        // Compatibility aliases for other components
        ink: "#FFFFFF",
        "ink-2": "#F9FAFB",
        "ink-3": "#F3F4F6",
        bone: "#000000",
        "steel-light": "#E5E7EB", // rose steel light
        amber: "#FFFFFF",
        ember: "#F3F4F6",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      fontSize: {
        xs:    ['0.75rem',  { lineHeight: '1.5'  }],
        sm:    ['0.875rem', { lineHeight: '1.6'  }],
        base:  ['1rem',     { lineHeight: '1.75' }],
        lg:    ['1.125rem', { lineHeight: '1.75' }],
        xl:    ['1.25rem',  { lineHeight: '1.6'  }],
        '2xl': ['1.5rem',   { lineHeight: '1.4'  }],
        '3xl': ['1.875rem', { lineHeight: '1.3'  }],
        '4xl': ['2.25rem',  { lineHeight: '1.2'  }],
        '5xl': ['3rem',     { lineHeight: '1.1'  }],
        '6xl': ['3.75rem',  { lineHeight: '1.05' }],
        '7xl': ['4.5rem',   { lineHeight: '1.0'  }],
        '8xl': ['6rem',     { lineHeight: '1.0'  }],
        '9xl': ['8rem',     { lineHeight: '1.0'  }],
      },
      keyframes: {
        sheen: {
          "0%": { backgroundPosition: "-150% 0" },
          "60%": { backgroundPosition: "150% 0" },
          "100%": { backgroundPosition: "150% 0" },
        },
        "sheen-line": {
          "0%": { transform: "translateX(-110%)" },
          "55%": { transform: "translateX(110%)" },
          "100%": { transform: "translateX(110%)" },
        },
        float: {
          "0%": { transform: "translateY(100vh) scale(0)", opacity: "0" },
          "20%": { opacity: "0.8" },
          "80%": { opacity: "0.8" },
          "100%": { transform: "translateY(-20vh) scale(1.5)", opacity: "0" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(3deg)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        sheen: "sheen 5s ease-in-out infinite",
        "sheen-line": "sheen-line 4.5s ease-in-out infinite",
        drift: "drift 7s ease-in-out infinite",
        "fade-up": "fade-up 0.7s ease-out both",
        float: "float 15s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
