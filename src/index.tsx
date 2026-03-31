import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { DEFAULT_THEME_OPTIONS } from "@butternutbox/pawprint-tokens";
import BodyStyle from "./components/BodyStyle";
import { BrowserRouter } from "react-router-dom";

const theme = createTheme(DEFAULT_THEME_OPTIONS as any);

// Inject semantic colour tokens as CSS custom properties so Tailwind and
// components can reference them.  When pawprint-tokens is updated the
// values flow through automatically.
const semantics = (DEFAULT_THEME_OPTIONS as any).tokens.semantics.colour;
const cssVars: Record<string, string> = {
  "--color-bg-surface": semantics.background.surface.default,
  "--color-bg-surface-secondary": semantics.background.surface.secondary,
  "--color-bg-container-brand": semantics.background.container.brand,
  "--color-bg-action-primary": semantics.background.action.primary.default,
  "--color-bg-action-primary-hover": semantics.background.action.primary.hover,
  "--color-bg-action-primary-disabled":
    semantics.background.action.primary.disabled,
  "--color-bg-action-secondary-selected":
    semantics.background.action.secondary.selected,
  "--color-text-primary": semantics.text.primary,
  "--color-text-alt": semantics.text.alt,
  "--color-text-action": semantics.text.action.default,
  "--color-text-action-hover": semantics.text.action.hover,
  "--color-text-action-inverse": semantics.text.action.inverse,
  "--color-text-error": semantics.text.error,
  "--color-border-default": semantics.border.default,
  "--color-border-action": semantics.border.action.default,
  "--color-border-action-inverse": semantics.border.action.inverse,
  "--color-border-input": semantics.border.input.default,
  "--color-border-input-hover": semantics.border.input.hover,
  "--color-icon-primary": semantics.icon.primary,
  "--color-icon-secondary": semantics.icon.secondary,
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
