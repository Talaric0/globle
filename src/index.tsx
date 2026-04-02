import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import BodyStyle from "./components/BodyStyle";
import { BrowserRouter } from "react-router-dom";

const theme = createTheme();

const cssVars: Record<string, string> = {
  "--color-bg-surface": "#ffffff",
  "--color-bg-surface-secondary": "#fffdf7",
  "--color-bg-container-brand": "#ffd54d",
  "--color-bg-action-primary": "#a43260",
  "--color-bg-action-primary-hover": "#80254a",
  "--color-bg-action-primary-disabled": "#b55173",
  "--color-bg-action-secondary-selected": "#f4c3c8",
  "--color-text-primary": "#522a10",
  "--color-text-alt": "#ffffff",
  "--color-text-action": "#a43260",
  "--color-text-action-hover": "#80254a",
  "--color-text-action-inverse": "#ffffff",
  "--color-text-error": "#99110c",
  "--color-border-default": "#e9e8e6",
  "--color-border-action": "#a43260",
  "--color-border-action-inverse": "#f4c3c8",
  "--color-border-input": "#c9beb9",
  "--color-border-input-hover": "#522a10",
  "--color-icon-primary": "#522a10",
  "--color-icon-secondary": "#ffd54d",
};
Object.entries(cssVars).forEach(([k, v]) =>
  document.documentElement.style.setProperty(k, v)
);

const root = createRoot(document.getElementById("root")!);
root.render(
  <ThemeProvider theme={theme}>
    <BrowserRouter>
      <App />
      <BodyStyle />
    </BrowserRouter>
  </ThemeProvider>
);
