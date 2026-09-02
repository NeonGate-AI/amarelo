import Script from 'next/script'

const THEME_SCRIPT = `
  (function () {
    try {
      var cookieMatch = document.cookie.match(/(?:^|; )amarelo-theme=(light|dark)/);
      var cookieTheme = cookieMatch ? cookieMatch[1] : null;
      var storedTheme = window.localStorage.getItem('amarelo-theme');
      var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      var theme = cookieTheme || (storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : systemTheme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.dataset.theme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = 'light';
    }
  })();
`

export function ThemeScript() {
  return (
    <Script id="amarelo-theme" strategy="beforeInteractive">
      {THEME_SCRIPT}
    </Script>
  )
}
