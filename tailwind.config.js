/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        creme: '#FAF9F6',
        oliva: { 50: '#F3F5EE', 100: '#E4E9D8', 200: '#C9D3B1', 300: '#A3B47F', 400: '#7C9455', 500: '#66803D', 600: '#556B2F', 700: '#445625', 800: '#34421D', DEFAULT: '#556B2F' },
        terracota: { 50: '#FBF1EC', 100: '#F5DDD1', 200: '#EBB9A3', 300: '#DD8E6C', 400: '#D3734D', 500: '#CC6439', 600: '#C85A32', 700: '#A44825', 800: '#7F381D', DEFAULT: '#C85A32' },
      },
      fontFamily: { sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { suave: '0 1px 2px rgba(60,50,30,.04), 0 4px 16px rgba(60,50,30,.06)' },
      keyframes: {
        fade: { from: { opacity: 0 }, to: { opacity: 1 } },
        up: { from: { opacity: 0, transform: 'translateY(24px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { fade: 'fade .18s ease-out', up: 'up .22s ease-out' },
    },
  },
  plugins: [],
}
