import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Map Tailwind colors to our CSS variables so components can use both
      colors: {
        primary:   'var(--primary)',
        secondary: 'var(--secondary)',
        accent:    'var(--accent)',
        success:   'var(--success)',
        warning:   'var(--warning)',
        danger:    'var(--danger)',
        info:      'var(--info)',
        bg:        'var(--bg)',
        bg2:       'var(--bg2)',
        bg3:       'var(--bg3)',
      },
      borderColor: {
        glass:  'var(--glass-border)',
        border: 'var(--border)',
      },
      backgroundColor: {
        glass:  'var(--glass)',
      },
    },
  },
  plugins: [],
} satisfies Config
