// tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
export default {
    content: [
      './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
      './src/components/**/*.{js,ts,jsx,tsx,mdx}',
      './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
      extend: {
        colors: {
          'simbie-purple': '#7B5CF0',
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif'],
        },
        boxShadow: {
          'neomorphic': '4px 4px 10px 0px rgba(0,0,0,0.1), -4px -4px 10px 0px rgba(255,255,255,0.9)',
        }
      },
    },
    plugins: [],
  }