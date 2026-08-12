const path = require('node:path')

const workspaceRoot = path.dirname(path.dirname(__dirname))

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    path.join(__dirname, 'app.tsx'),
    path.join(__dirname, 'src/**/*.{ts,tsx}'),
    path.join(workspaceRoot, 'packages/react-mobile/src/**/*.{ts,tsx}')
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        destructive: 'hsl(var(--destructive))',
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))'
      },
      borderRadius: {
        xl: '1.5rem',
        '2xl': '2rem'
      }
    }
  },
  plugins: []
}
