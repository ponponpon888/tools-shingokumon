import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#c9a84c',
          light: 'rgba(201,168,76,0.6)',
          dim: 'rgba(201,168,76,0.3)',
          faint: 'rgba(201,168,76,0.08)',
        },
        ink: {
          DEFAULT: '#080808',
          panel: '#0a0a0a',
          deep: '#0f0d08',
        },
        cream: {
          DEFAULT: '#f0ece4',
          muted: 'rgba(240,236,228,0.55)',
          dim: 'rgba(240,236,228,0.3)',
        },
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        widest2: '0.2em',
        widest3: '0.3em',
      },
    },
  },
  plugins: [],
}

export default config
