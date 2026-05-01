import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export type ThemeName = "quiet-pro" | "workshop";
export type Mode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeName;
  mode: Mode;
  setTheme: (t: ThemeName) => void;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = "ui:theme";
const MODE_KEY = "ui:dark";

const readTheme = (): ThemeName => {
  const v = localStorage.getItem(THEME_KEY);
  return v === "workshop" ? "workshop" : "quiet-pro";
};

const readMode = (): Mode => {
  const v = localStorage.getItem(MODE_KEY);
  if (v === "1" || v === "true" || v === "dark") return "dark";
  if (v === "0" || v === "false" || v === "light") return "light";
  // Sin preferencia guardada: respetar el SO.
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => readTheme());
  const [mode, setModeState] = useState<Mode>(() => readMode());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const value: ThemeContextValue = {
    theme,
    mode,
    setTheme: setThemeState,
    setMode: setModeState,
    toggleMode: () => setModeState((m) => (m === "dark" ? "light" : "dark")),
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  }
  return ctx;
};
