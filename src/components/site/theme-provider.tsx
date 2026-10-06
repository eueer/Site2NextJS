"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
export type ThemeChoice = "light" | "dark";
const themeKey = "site2nextjs_theme";
export const themeScript = `(()=>{let t="dark";try{if(localStorage.getItem("${themeKey}")==="light")t="light";}catch{}document.documentElement.dataset.theme=t;})();`;
const ThemeContext = createContext<{
  choice: ThemeChoice;
  setChoice: (value: ThemeChoice) => void;
}>({ choice: "dark", setChoice: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>("dark");
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
    document.documentElement.dataset.theme = choice;
    try {
      localStorage.setItem(themeKey, choice);
    } catch {}
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
