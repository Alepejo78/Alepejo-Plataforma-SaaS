export type ThemeMode = "light" | "dark";

export interface ThemeContextData {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}