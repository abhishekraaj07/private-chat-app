/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nexus: {
          bg: '#090b10',
          card: '#121621',
          border: 'rgba(99, 102, 241, 0.18)',
          accent: '#6366f1',
          cyan: '#22d3ee',
        },
      },
    },
  },
  plugins: [],
};
