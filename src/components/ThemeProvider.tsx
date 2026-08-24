import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Toaster } from "sonner";
import {
  applyTheme,
  persistTheme,
  readStoredTheme,
  toColorTheme,
  type ColorTheme,
} from "../lib/theme";
import { useAppSelector } from "../store/auth";

interface ThemeContextValue {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ColorTheme>(readStoredTheme);
  const preferenceTheme = useAppSelector(
    (state) => state.auth.preferences?.theme,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!preferenceTheme) return;
    const next = toColorTheme(preferenceTheme);
    persistTheme(next);
    setThemeState(next);
  }, [preferenceTheme]);

  const setTheme = useCallback((next: ColorTheme) => {
    persistTheme(next);
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        theme={theme}
        richColors
        closeButton
      />
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
