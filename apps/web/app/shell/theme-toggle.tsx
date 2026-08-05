import { Moon, Sun } from "lucide-react";
import { Button } from "~/shared/ui/button";
import { useTheme } from "~/shared/hooks/use-theme";

/**
 * The icon is held back until `mounted` because the theme is read from the
 * <html> class, which only exists in the browser — rendering it on the server
 * would hydrate the wrong side of the toggle.
 */
export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  const target = theme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${target} theme`}
    >
      {mounted && (theme === "dark" ? <Sun /> : <Moon />)}
    </Button>
  );
}
