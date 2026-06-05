/**
 * Inline, render-blocking script that sets data-theme on <html> before paint,
 * so dark mode never flashes. Reads the persisted choice, falling back to the
 * OS preference. The toggle (ThemeToggle) keeps localStorage in sync.
 */
export function ThemeScript() {
  const js = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
