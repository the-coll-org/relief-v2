import type { Config } from 'tailwindcss';

/**
 * All colors/spacing map to CSS variables defined in globals.css.
 * Components must use these token-backed utilities — never raw hex.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'accent-red': 'var(--color-accent-red)',
        'accent-gold': 'var(--color-accent-gold)',
        light: 'var(--color-light)',
        surface: 'var(--color-surface)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-inverse': 'var(--color-text-inverse)',
        success: 'var(--color-success)',
        stale: 'var(--color-stale)',
        // tonal tint of primary used for the secondary "Map" button
        'primary-tint': 'var(--color-primary-tint)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        button: 'var(--radius-button)',
        pill: 'var(--radius-pill)',
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },
    },
  },
  plugins: [],
};

export default config;
