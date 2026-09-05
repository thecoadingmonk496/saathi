import defaultTheme from 'tailwindcss/defaultTheme';

const newSpacing = {};
for (const [key, value] of Object.entries(defaultTheme.spacing)) {
  if (typeof value === 'string' && value.endsWith('rem')) {
    const num = parseFloat(value.replace('rem', ''));
    newSpacing[key] = `${(num * 1.25).toFixed(4)}rem`;
  } else {
    newSpacing[key] = value;
  }
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
            fontFamily: {
        sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
      },
      spacing: newSpacing,
      fontSize: {
        'xs': ['0.8125rem', { lineHeight: '1.25rem' }],
        'sm': ['0.9375rem', { lineHeight: '1.5rem' }],
        'base': ['1.0625rem', { lineHeight: '1.75rem' }],
        'lg': ['1.1875rem', { lineHeight: '2rem' }],
        'xl': ['1.3125rem', { lineHeight: '2rem' }],
        '2xl': ['1.625rem', { lineHeight: '2.5rem' }],
      },
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
