import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "suri-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [spin, setSpin] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    const root = document.documentElement;
    root.classList.add("theme-fade");
    root.classList.toggle("dark", next);
    localStorage.setItem(KEY, next ? "dark" : "light");
    setDark(next);
    setSpin((s) => s + 1);
    window.setTimeout(() => root.classList.remove("theme-fade"), 500);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="btn-pop relative h-9 w-9 shrink-0 rounded-full border border-border bg-card grid place-items-center overflow-hidden hover:border-accent"
    >
      <span key={spin} className="theme-icon grid place-items-center">
        {dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  );
}
