import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const THEME_KEY = "devlog_theme";

/** Dark Mode ist Standard (wie in DevTrack). Die Wahl wird lokal gemerkt. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );

  const setTheme = useCallback((next: Theme) => {
    const root = document.documentElement;
    root.classList.add("theme-transition");
    root.dataset.theme = next;
    window.setTimeout(() => root.classList.remove("theme-transition"), 350);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // z. B. privater Modus: dann gilt die Wahl nur für diese Sitzung.
    }
    setThemeState(next);
  }, []);

  return { theme, setTheme };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
