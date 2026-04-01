import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { supabase, GameResult } from "../lib/supabase";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const COUNTRY_NAME_MAP: Record<string, string> = {
  "United States of America": "United States of America",
  "Dem. Rep. Congo": "Dem. Rep. Congo",
  "Dominican Rep.": "Dominican Rep.",
  "Central African Rep.": "Central African Rep.",
  "S. Sudan": "S. Sudan",
  "Bosnia and Herz.": "Bosnia and Herz.",
  "Côte d'Ivoire": "Côte d'Ivoire",
  "Solomon Is.": "Solomon Is.",
  "Eq. Guinea": "Eq. Guinea",
  eSwatini: "eSwatini",
  "N. Cyprus": "N. Cyprus",
  Somaliland: "Somaliland",
  "Fr. S. Antarctic Lands": "Fr. S. Antarctic Lands",
  Falkland: "Falkland Is.",
  "W. Sahara": "W. Sahara",
};

const colorScale = scaleLinear<string>()
  .domain([2, 6, 10])
  .range(["#22c55e", "#eab308", "#ef4444"])
  .clamp(true);

// Animated counter hook
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    prevTarget.current = target;
    if (target === 0) {
      setValue(0);
      return;
    }
    const startTime = performance.now();
    let raf: number;
    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + (target - start) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

// Stat card with count-up animation
function StatCard({
  label,
  value,
  subtitle,
  decimals = 0,
  delay = 0,
}: {
  label: string;
  value: number;
  subtitle?: string;
  decimals?: number;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  const animated = useCountUp(visible ? value : 0);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className="bg-white rounded-xl shadow-md px-6 py-5 text-center transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <p className="text-sm font-medium text-bnb-text/60 mb-1">{label}</p>
      <p className="text-5xl font-extrabold font-heading leading-tight">
        {value > 0 ? animated.toFixed(decimals) : "--"}
      </p>
      {subtitle && (
        <p className="text-xs text-bnb-text/40 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// Animated chart card wrapper
function ChartCard({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      ref={ref}
      className="bg-white rounded-xl shadow-md p-5 transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
      }}
    >
      <h3 className="text-lg font-bold font-heading mb-3">{title}</h3>
      <div className="h-72">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState("");

  // Map tooltip state
  const [mapTooltip, setMapTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    data: { totalGuesses: number; count: number } | null;
  } | null>(null);

  useEffect(() => {
    async function fetchResults() {
      const { data, error: fetchError } = await supabase
        .from("game_results")
        .select("*")
        .order("date");
      if (fetchError) {
        setError("Failed to load results.");
        setLoading(false);
        return;
      }
      setResults(data || []);
      setLoading(false);
    }
    fetchResults();
  }, []);

  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(results.map((r) => parseInt(r.date.slice(0, 4))))
    );
    years.sort((a, b) => b - a);
    return years;
  }, [results]);

  const filteredResults = useMemo(
    () => results.filter((r) => r.date.startsWith(String(selectedYear))),
    [results, selectedYear]
  );

  // Stats
  const avgGuesses = useMemo(() => {
    if (filteredResults.length === 0) return 0;
    const sum = filteredResults.reduce((s, r) => s + r.num_guesses, 0);
    return Math.round((sum / filteredResults.length) * 100) / 100;
  }, [filteredResults]);

  const bestScore = useMemo(() => {
    if (filteredResults.length === 0) return 0;
    return Math.min(...filteredResults.map((r) => r.num_guesses));
  }, [filteredResults]);

  const totalGames = filteredResults.length;

  const topGuesser = useMemo(() => {
    if (filteredResults.length === 0) return { name: "--", count: 0 };
    const counts: Record<string, number> = {};
    filteredResults.forEach((r) => {
      counts[r.correct_guesser] = (counts[r.correct_guesser] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { name: sorted[0][0], count: sorted[0][1] };
  }, [filteredResults]);

  const uniqueCountries = useMemo(() => {
    return Array.from(
      new Set(filteredResults.map((r) => r.country))
    ).length;
  }, [filteredResults]);

  // Guesses over time — month pagination
  const currentMonth = new Date().getMonth(); // 0-indexed
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const availableMonths = useMemo(() => {
    const months = Array.from(
      new Set(filteredResults.map((r) => parseInt(r.date.slice(5, 7)) - 1))
    );
    months.sort((a, b) => a - b);
    return months;
  }, [filteredResults]);

  // Reset month selection when year changes
  useEffect(() => {
    setSelectedMonth(currentMonth);
  }, [selectedYear, currentMonth]);

  const guessesOverTime = useMemo(() => {
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    return filteredResults
      .filter((r) => r.date.slice(5, 7) === monthStr)
      .map((r) => ({
        date: r.date.slice(8), // DD
        guesses: r.num_guesses,
        fullDate: r.date,
        country: r.country,
      }));
  }, [filteredResults, selectedMonth]);

  const guesserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredResults.forEach((r) => {
      counts[r.correct_guesser] = (counts[r.correct_guesser] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredResults]);

  const continentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredResults.forEach((r) => {
      counts[r.continent] = (counts[r.continent] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredResults]);

  const avgByContinent = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    filteredResults.forEach((r) => {
      if (!sums[r.continent]) sums[r.continent] = { total: 0, count: 0 };
      sums[r.continent].total += r.num_guesses;
      sums[r.continent].count += 1;
    });
    return Object.entries(sums)
      .map(([name, { total, count }]) => ({
        name,
        avg: Math.round((total / count) * 100) / 100,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [filteredResults]);

  // Map data: year-filtered results grouped by country
  const countryMapData = useMemo(() => {
    const map: Record<string, { totalGuesses: number; count: number }> = {};
    filteredResults.forEach((r) => {
      if (!map[r.country]) map[r.country] = { totalGuesses: 0, count: 0 };
      map[r.country].totalGuesses += r.num_guesses;
      map[r.country].count += 1;
    });
    return map;
  }, [filteredResults]);

  const getCountryColor = useCallback(
    (geoName: string): string => {
      let match = countryMapData[geoName];
      if (!match) {
        const gameEntry = Object.entries(COUNTRY_NAME_MAP).find(
          ([, topoName]) => topoName === geoName
        );
        if (gameEntry) match = countryMapData[gameEntry[0]];
      }
      if (!match) {
        for (const gameName of Object.keys(countryMapData)) {
          if (
            gameName.toLowerCase() === geoName.toLowerCase() ||
            COUNTRY_NAME_MAP[gameName]?.toLowerCase() ===
              geoName.toLowerCase()
          ) {
            match = countryMapData[gameName];
            break;
          }
        }
      }
      if (!match) return "#d1d5db";
      const avg = match.totalGuesses / match.count;
      return colorScale(avg);
    },
    [countryMapData]
  );

  // Import handler
  async function handleImport() {
    setImportErrors([]);
    setImportSuccess("");
    const lines = csvText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;

    let startIdx = 0;
    if (lines[0].toLowerCase().includes("date")) {
      startIdx = 1;
    }

    const rows: GameResult[] = [];
    const errors: string[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length < 5) {
        errors.push(`Row ${i + 1}: Expected 5 columns, got ${parts.length}`);
        continue;
      }
      const [dateStr, country, continent, guessesStr, guesser] = parts;

      const dateParts = dateStr.split("/");
      if (dateParts.length !== 3) {
        errors.push(`Row ${i + 1}: Invalid date format "${dateStr}"`);
        continue;
      }
      const [day, month, year] = dateParts;
      const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      const numGuesses = parseInt(guessesStr, 10);
      if (isNaN(numGuesses) || numGuesses < 1) {
        errors.push(`Row ${i + 1}: Invalid guess count "${guessesStr}"`);
        continue;
      }

      rows.push({
        date: isoDate,
        country,
        continent,
        num_guesses: numGuesses,
        correct_guesser: guesser,
      });
    }

    if (rows.length === 0) {
      setImportErrors(errors.length > 0 ? errors : ["No valid rows found."]);
      return;
    }

    // Deduplicate by date — keep last occurrence
    const byDate = new Map<string, GameResult>();
    rows.forEach((r) => byDate.set(r.date, r));
    const dedupedRows = Array.from(byDate.values());
    if (dedupedRows.length < rows.length) {
      errors.push(
        `${rows.length - dedupedRows.length} duplicate date(s) found — keeping last entry for each`
      );
    }

    setImportProgress({ current: 0, total: dedupedRows.length });

    const BATCH_SIZE = 100;
    let imported = 0;
    for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
      const batch = dedupedRows.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await supabase
        .from("game_results")
        .upsert(batch, { onConflict: "date" });
      if (upsertError) {
        errors.push(
          `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertError.message}`
        );
      } else {
        imported += batch.length;
      }
      setImportProgress({ current: imported, total: dedupedRows.length });
    }

    setImportErrors(errors);
    setImportSuccess(`Imported ${imported} of ${dedupedRows.length} rows.`);
    setImportProgress(null);

    const { data } = await supabase
      .from("game_results")
      .select("*")
      .order("date");
    if (data) setResults(data);
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-bnb-text">
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center text-red-600">
        <p className="text-lg">{error}</p>
      </div>
    );
  }

  const chartFill = "var(--color-bg-action-primary)";

  return (
    <div className="py-6 text-bnb-text">
      {/* Year filter */}
      <div className="flex items-center gap-3 mb-6">
        <label htmlFor="year-filter" className="font-medium">
          Year:
        </label>
        <select
          id="year-filter"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="border border-bnb-border-input rounded-lg px-3 py-2
            bg-white text-bnb-text focus:outline-none focus:border-bnb-text"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Average Guesses"
          value={avgGuesses}
          decimals={2}
          subtitle={`${totalGames} games`}
          delay={0}
        />
        <StatCard
          label="Total Games"
          value={totalGames}
          delay={100}
        />
        <StatCard
          label="Best Score"
          value={bestScore}
          subtitle="fewest guesses"
          delay={200}
        />
        <StatCard
          label="Countries Seen"
          value={uniqueCountries}
          delay={300}
        />
        <StatCard
          label="Top Guesser"
          value={topGuesser.count}
          subtitle={topGuesser.name}
          delay={400}
        />
      </div>

      {/* World Map — full width top card */}
      <div
        className="bg-white rounded-xl shadow-md p-5 mb-6 transition-all duration-700 relative"
        style={{ opacity: 1 }}
        onMouseLeave={() => setMapTooltip(null)}
      >
        <h3 className="text-lg font-bold font-heading mb-3">World Map</h3>
        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          width={800}
          height={400}
          className="w-full h-auto"
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const geoName = geo.properties.name;
                const fill = getCountryColor(geoName);
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="#fff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none", cursor: "default" },
                      hover: { outline: "none", opacity: 0.8, cursor: "default" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={(e) => {
                      const data = countryMapData[geoName] || null;
                      setMapTooltip({
                        x: e.clientX,
                        y: e.clientY,
                        name: geoName,
                        data,
                      });
                    }}
                    onMouseLeave={() => setMapTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>
        {/* Floating tooltip */}
        {mapTooltip && (
          <div
            className="fixed z-50 pointer-events-none bg-white border border-gray-200
              rounded-lg shadow-lg px-3 py-2 text-sm"
            style={{
              left: mapTooltip.x + 12,
              top: mapTooltip.y - 12,
              transform: "translateY(-100%)",
            }}
          >
            <p className="font-bold text-bnb-text">{mapTooltip.name}</p>
            {mapTooltip.data ? (
              <>
                <p className="text-bnb-text/70">
                  Avg guesses:{" "}
                  <span className="font-semibold text-bnb-text">
                    {(mapTooltip.data.totalGuesses / mapTooltip.data.count).toFixed(1)}
                  </span>
                </p>
                <p className="text-bnb-text/70">
                  Games:{" "}
                  <span className="font-semibold text-bnb-text">
                    {mapTooltip.data.count}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-bnb-text/40 italic">No data</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-xs">2</span>
          <div
            className="h-3 w-48 rounded"
            style={{
              background:
                "linear-gradient(to right, #22c55e, #eab308, #ef4444)",
            }}
          />
          <span className="text-xs">10+</span>
          <span className="text-xs text-bnb-text/50 ml-2">guesses</span>
        </div>
      </div>

      {/* Charts grid — 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <ChartCard title="" delay={200}>
          <div className="-mt-3 mb-2 flex items-center justify-between">
            <h3 className="text-lg font-bold font-heading">
              Guesses — {MONTH_NAMES[selectedMonth]}
            </h3>
            <div className="flex items-center gap-1">
              <button
                className="px-2 py-1 rounded text-sm font-bold text-bnb-text/60
                  hover:bg-gray-100 disabled:opacity-30"
                onClick={() => {
                  const prev = availableMonths.filter((m) => m < selectedMonth);
                  if (prev.length > 0) setSelectedMonth(prev[prev.length - 1]);
                }}
                disabled={!availableMonths.some((m) => m < selectedMonth)}
                aria-label="Previous month"
              >
                &larr;
              </button>
              <button
                className="px-2 py-1 rounded text-sm font-bold text-bnb-text/60
                  hover:bg-gray-100 disabled:opacity-30"
                onClick={() => {
                  const next = availableMonths.filter((m) => m > selectedMonth);
                  if (next.length > 0) setSelectedMonth(next[0]);
                }}
                disabled={!availableMonths.some((m) => m > selectedMonth)}
                aria-label="Next month"
              >
                &rarr;
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={guessesOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload) {
                    const d = payload[0].payload;
                    return `${d.fullDate} — ${d.country}`;
                  }
                  return "";
                }}
              />
              <Bar
                dataKey="guesses"
                fill={chartFill}
                animationDuration={800}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Correct Guesser Count" delay={350}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={guesserCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill={chartFill}
                animationDuration={1400}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Countries by Continent" delay={500}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={continentCounts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill={chartFill}
                animationDuration={1400}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Average Guesses by Continent" delay={650}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avgByContinent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="avg"
                fill={chartFill}
                animationDuration={1400}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Import Section */}
      <div className="bg-white rounded-xl shadow-md p-5">
        <button
          className="text-white bg-bnb-action hover:bg-bnb-action-hover
            focus:ring-4 focus:ring-bnb-action-inverse rounded-lg text-sm
            px-4 py-2.5 font-medium"
          onClick={() => setShowImport(!showImport)}
        >
          {showImport ? "Hide Import" : "Import Data"}
        </button>

        {showImport && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-bnb-text/70">
              Paste CSV data in the format:{" "}
              <code className="bg-gray-100 px-1 rounded">
                DD/MM/YYYY,country,continent,num_guesses,correct_guesser
              </code>
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={8}
              className="w-full border border-bnb-border-input rounded-lg p-3
                text-sm font-mono focus:outline-none focus:border-bnb-text
                bg-white text-bnb-text"
              placeholder={`Date,Country,Continent,Number Of Guesses,Correct Guesser\n02/01/2025,Colombia,South America,5,Hallam`}
            />
            <div className="flex items-center gap-4">
              <button
                className="text-white bg-bnb-action hover:bg-bnb-action-hover
                  disabled:bg-bnb-action-disabled focus:ring-4
                  focus:ring-bnb-action-inverse rounded-lg text-sm
                  px-6 py-2.5 font-medium"
                onClick={handleImport}
                disabled={!csvText.trim() || importProgress !== null}
              >
                Import
              </button>
              {importProgress && (
                <span className="text-sm">
                  Importing {importProgress.current} of {importProgress.total}
                  ...
                </span>
              )}
            </div>
            {importSuccess && (
              <p className="text-green-700 text-sm font-medium">
                {importSuccess}
              </p>
            )}
            {importErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                {importErrors.map((err, i) => (
                  <p key={i} className="text-red-600 text-sm">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
