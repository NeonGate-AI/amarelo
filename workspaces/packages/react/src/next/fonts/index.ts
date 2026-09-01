import localFont from 'next/font/local'

export const satoshi = localFont({
  src: [
    {
      path: '../../fonts/Satoshi-Variable.woff2',
      weight: '100 900',
      style: 'normal'
    },
    {
      path: '../../fonts/Satoshi-VariableItalic.woff2',
      weight: '100 900',
      style: 'italic'
    }
  ],
  variable: '--font-satoshi',
  display: 'swap',
  preload: true
})
