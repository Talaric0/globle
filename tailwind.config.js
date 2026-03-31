module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bnb-text": "var(--color-text-primary)",
        "bnb-action": "var(--color-bg-action-primary)",
        "bnb-action-hover": "var(--color-bg-action-primary-hover)",
        "bnb-action-disabled": "var(--color-bg-action-primary-disabled)",
        "bnb-brand": "var(--color-bg-container-brand)",
        "bnb-surface": "var(--color-bg-surface)",
        "bnb-surface-secondary": "var(--color-bg-surface-secondary)",
        "bnb-border-input": "var(--color-border-input)",
        "bnb-icon-secondary": "var(--color-icon-secondary)",
        "bnb-action-inverse": "var(--color-border-action-inverse)",
      },
      fontFamily: {
        heading: ['"Ida Narrow"', "sans-serif"],
        body: ['"IBM Plex Sans Condensed"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
