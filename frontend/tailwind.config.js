/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Bảng màu riêng của Nebula (không dùng màu "blurple" của Discord)
        ink: {
          950: '#070B17',
          900: '#0B1120',
          850: '#0F172A',
          800: '#121B30',
          750: '#16213A',
          700: '#1C2945',
          600: '#26355A',
          500: '#344670',
        },
        brand: {
          50: '#EFFEFB',
          100: '#C8FFF4',
          200: '#91FEE9',
          300: '#53F5DB',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
        },
        nova: {
          300: '#F9A8D4',
          400: '#F472B6',
          500: '#EC4899',
        },
        aurora: {
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
        },
        muted: '#8FA0BF',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        display: ['"Lexend"', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(45,212,191,.35), 0 8px 30px -8px rgba(45,212,191,.45)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(var(--r, 0deg))' },
          '50%': { transform: 'translateY(-14px) rotate(var(--r, 0deg))' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulsering: {
          '0%': { boxShadow: '0 0 0 0 rgba(45,212,191,.7)' },
          '100%': { boxShadow: '0 0 0 10px rgba(45,212,191,0)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'fade-in': 'fade-in .18s ease-out',
        pulsering: 'pulsering 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
