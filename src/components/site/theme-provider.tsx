"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
export type ThemeChoice = "system" | "light" | "dark";
const themeKey = "site2nextjs_theme";
export const themeScript = `(()=>{try{const t=localStorage.getItem("${themeKey}");const dark=t==="dark"||((t!=="light")&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=dark?"dark":"light";}catch{document.documentElement.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}})();`;
const ThemeContext = createContext<{
  choice: ThemeChoice;
  setChoice: (value: ThemeChoice) => void;
}>({ choice: "system", setChoice: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(themeKey);
      if (saved === "light" || saved === "dark") setChoice(saved);
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        choice === "system" ? (media.matches ? "dark" : "light") : choice;
    };
    apply();
    media.addEventListener("change", apply);
    try {
      localStorage.setItem(themeKey, choice);
    } catch {}
    return () => media.removeEventListener("change", apply);
  }, [choice, ready]);
  return (
    <ThemeContext.Provider value={{ choice, setChoice }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
