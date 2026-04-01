# Team Globle Dashboard — PRD

## Overview
Add a Supabase-backed dashboard to the Globle game that replaces the team's spreadsheet for tracking daily game results. The dashboard should provide the same visualizations and data entry capabilities.

## Current State
- React 18, Tailwind CSS, MUI ThemeProvider with Butternutbox Pawprint tokens
- Brand colors injected as CSS custom properties from `@butternutbox/pawprint-tokens` in `src/index.tsx`
- Game logic in `src/pages/Game.tsx` — win detection in a `useEffect` that fires when `win` becomes true
- Country data includes `CONTINENT` field on each country (`src/lib/country.d.ts:75`)
- Answer determined by date-based shuffle in `src/util/answer.ts` — exports `answerCountry` and `answerName`
- Routes: `/` and `/game` (Game), `/settings` (Settings)
- Existing dependencies: `recharts` and `react-simple-maps` already in `package.json`

## Database

### Supabase Setup
- Project URL and anon key stored in `.env` as `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- Client initialized in `src/lib/supabase.ts` using `@supabase/supabase-js` (already in `package.json`)

### Schema — `game_results` table

```sql
create table game_results (
  id uuid primary key default gen_random_uuid(),
  date date unique not null,
  country text not null,
  continent text not null,
  num_guesses integer not null,
  correct_guesser text not null,
  created_at timestamptz default now()
);

alter table game_results enable row level security;
create policy "Allow all access" on game_results for all using (true) with check (true);
```

### TypeScript type

```ts
// src/lib/supabase.ts
export type GameResult = {
  id?: string;
  date: string;       // YYYY-MM-DD
  country: string;
  continent: string;
  num_guesses: number;
  correct_guesser: string;
  created_at?: string;
};
```

## Feature 1: Save Game Results on Win

### Guesser Picker Component (`src/components/GuesserPicker.tsx`)

When a game is won (`win === true` and not practice mode), show a UI asking "Who guessed correctly?" with the team members as options.

**Team members:** Hallam, Win, James, Nay, MJ, Alonso, Bruno

Store this as a constant array in the component for easy updates.

**Behavior:**
- Appears after the win state is set, before/alongside the stats modal
- On selection, upsert to Supabase `game_results` table keyed on `date` (idempotent)
- Data to save:
  - `date`: `today` from `src/util/dates.tsx`
  - `country`: `answerName` from `src/util/answer.ts`
  - `continent`: `answerCountry.properties.CONTINENT` from `src/util/answer.ts`
  - `num_guesses`: `guesses.length` from Game component state
  - `correct_guesser`: selected team member
- Show a confirmation message after successful save
- Disable the picker if today's result has already been saved (check Supabase on mount)

### Integration point (`src/pages/Game.tsx`)

- Import and render `GuesserPicker` when `win === true && !practiceMode`
- Pass `guessCount={guesses.length}` as a prop
- Place it between the Guesser component and the Globe

## Feature 2: Dashboard Page (`src/pages/Dashboard.tsx`)

### Route
- Add `/dashboard` route in `src/App.tsx`
- Add a dashboard icon/link in `src/components/Header.tsx` next to stats and settings buttons

### Data Loading
- On mount, fetch all `game_results` from Supabase
- Year filter dropdown (default: current year) — filter client-side
- Show loading state while fetching

### Dashboard Sections

#### 1. Average Guesses (stat card)
- Large number display showing the mean of `num_guesses` for the filtered year
- Styled as a prominent card at the top

#### 2. Number of Guesses Over Time (bar chart)
- X-axis: date
- Y-axis: num_guesses
- One bar per game day
- Use `recharts` `<BarChart>` / `<Bar>`

#### 3. Count of Correct Guesser (bar chart)
- X-axis: team member names
- Y-axis: count of times each person guessed correctly
- Use `recharts` `<BarChart>` / `<Bar>`

#### 4. Count of Continent (bar chart)
- X-axis: continent names
- Y-axis: count of games where the answer was in that continent

#### 5. Average Guesses by Continent (bar chart)
- X-axis: continent names
- Y-axis: average num_guesses for that continent

#### 6. World Map
- Flat SVG world map using `react-simple-maps`
- Colour each guessed country by `num_guesses` — green (few) → red (many)
- Countries not yet guessed remain grey
- Include a colour scale legend (2 = green, 10 = red)
- Match the spreadsheet's choropleth style

### Layout
- Responsive grid: year filter + average stat at top
- Charts in 2-column grid on desktop, stacked on mobile
- World map full-width below the charts
- Use Tailwind for layout, brand colors from CSS custom properties

## Feature 3: Data Import / Backfill

### Import UI (accessible from Dashboard page)

A simple UI to bulk-import historical data from the spreadsheet:

- "Import Data" button on the dashboard that reveals a textarea
- User pastes CSV data in the format: `date,country,continent,num_guesses,correct_guesser`
  - Date format: `DD/MM/YYYY` (matching the spreadsheet) — parse to `YYYY-MM-DD` for storage
  - Example row: `02/01/2025,Colombia,South America,5,Hallam`
- "Import" button parses the CSV and upserts all rows to Supabase
  - Use upsert on `date` column to avoid duplicates
  - Show progress: "Imported X of Y rows"
- Show error summary for any failed rows
- Header row should be skipped if present (detect by checking if first row contains "Date")

### Historical data format (from spreadsheet)

| Column | Example | Notes |
|--------|---------|-------|
| Date | 02/01/2025 | DD/MM/YYYY format |
| Country | Colombia | Country name as-is |
| Continent | South America | As-is |
| Number Of Guesses | 5 | Integer |
| Correct Guesser | Hallam | Team member name |

## Files to Create
- `src/lib/supabase.ts` — Supabase client + GameResult type
- `src/components/GuesserPicker.tsx` — post-win team member picker
- `src/pages/Dashboard.tsx` — full dashboard with charts, map, and import UI

## Files to Modify
- `src/App.tsx` — add `/dashboard` route
- `src/components/Header.tsx` — add dashboard navigation icon
- `src/pages/Game.tsx` — render GuesserPicker on win

## Dependencies (already in package.json)
- `@supabase/supabase-js` — database client
- `recharts` — charting library
- `react-simple-maps` — flat SVG world map

## Verification Checklist
1. Supabase table created with correct schema
2. `.env` has `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
3. Play a game → win → picker appears → select guesser → row appears in Supabase
4. Duplicate wins on same day upsert (don't create duplicate rows)
5. `/dashboard` renders with year filter, all 5 charts, world map, and average stat
6. Year filter correctly filters all visualizations
7. Paste CSV into import tool → rows appear in Supabase → dashboard updates
8. Import handles DD/MM/YYYY date format correctly
9. Import skips header row and handles duplicates gracefully
10. Dashboard is responsive (2-col desktop, stacked mobile)
