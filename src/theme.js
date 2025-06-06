import { DefaultTheme } from "react-native-paper"

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#0284c7", // Sky blue 600
    accent: "#38bdf8", // Sky blue 400
    background: "#f8fafc", // Slate 50
    surface: "#ffffff",
    text: "#0f172a", // Slate 900
    error: "#ef4444",
    success: "#10b981",
    warning: "#f59e0b",
    info: "#0ea5e9", // Sky blue 500
  },
  roundness: 10,
}
