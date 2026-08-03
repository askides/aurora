import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";

/**
 * The initial class is applied by the inline script in root.tsx; this only
 * reflects and flips it. `mounted` keeps the server render icon-free so the
 * markup matches before hydration.
 */
export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;

    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("aurora-theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {mounted && (isDark ? <Sun /> : <Moon />)}
    </Button>
  );
}
