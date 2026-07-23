"use client";

import { createContext } from "react";
import { ThemeContextData } from "@/types/theme";

export const ThemeContext = createContext<ThemeContextData>({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
});