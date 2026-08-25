/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--red-accent, #E51B2A)',
          dark: 'var(--navy-theme, #13233A)',
          theme: 'var(--primary-theme, #212121)',
        },
        'primary-dark': 'var(--navy-theme, #13233A)',
        accent: {
          DEFAULT: 'var(--red-accent, #E51B2A)',
          dark: 'var(--saathi-accent-dark, #B71C1C)',
        },
        'accent-dark': 'var(--saathi-accent-dark, #B71C1C)',
      },
    },
  },
  plugins: [],
};
