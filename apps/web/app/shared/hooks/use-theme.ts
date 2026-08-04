import { useCallback, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "aurora-theme";

export type Theme = "light" | "dark";

/**
 * The `dark` class is applied by the inline script in root.tsx before first
 * paint, so the class on <html> is the source of truth and this hook only
 * reflects and flips it. `mounted` stays false through the server render,
 * which lets callers hold back anything that would otherwise hydrate with the
 * wrong icon.
 *
 * The preference lives in localStorage rather than a cookie — Aurora ships
 * with no cookies at all, and the UI shouldn't be the thing that breaks that.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () =>
      setThemeState(root.classList.contains("dark") ? "dark" : "light");

    sync();
    setMounted(true);

    // Other tabs and the toggle both write the class; watching it keeps every
    // consumer of this hook in step without a shared store.
    const observer = new MutationObserver(sync);

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  const setTheme = useCallback((next: Theme) => {
    document.documentElement.classList.toggle("dark", next === "dark");

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private-mode storage failures shouldn't stop the theme from changing.
    }

    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme]
  );

  return { theme, setTheme, toggleTheme, mounted };
}
