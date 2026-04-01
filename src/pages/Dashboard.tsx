import { useEffect, useMemo, useState } from "react";
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
  ZoomableGroup,
} from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { supabase, GameResult } from "../lib/supabase";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Mapping from game country names to topojson names where they differ
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

  // Tooltip state for map
  const [tooltipContent, setTooltipContent] = useState("");

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

  // Stat: average guesses
  const avgGuesses = useMemo(() => {
    if (filteredResults.length === 0) return 0;
    const sum = filteredResults.reduce((s, r) => s + r.num_guesses, 0);
    return Math.round((sum / filteredResults.length) * 100) / 100;
  }, [filteredResults]);

  // Chart 1: guesses over time
  const guessesOverTime = useMemo(
    () =>
      filteredResults.map((r) => ({
        date: r.date.slice(5), // MM-DD
        guesses: r.num_guesses,
        fullDate: r.date,
        country: r.country,
      })),
    [filteredResults]
  );

  // Chart 2: correct guesser counts
  const guesserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredResults.forEach((r) => {
      counts[r.correct_guesser] = (counts[r.correct_guesser] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredResults]);

  // Chart 3: continent counts
  const continentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredResults.forEach((r) => {
      counts[r.continent] = (counts[r.continent] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredResults]);

  // Chart 4: average guesses by continent
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

  // Map data: all results (not year-filtered) grouped by country
  const countryMapData = useMemo(() => {
    const map: Record<string, { totalGuesses: number; count: number }> = {};
    results.forEach((r) => {
      if (!map[r.country]) map[r.country] = { totalGuesses: 0, count: 0 };
      map[r.country].totalGuesses += r.num_guesses;
      map[r.country].count += 1;
    });
    return map;
  }, [results]);

  function getCountryColor(geoName: string): string {
    // Try direct match first, then check mapping
    let match = countryMapData[geoName];
    if (!match) {
      // Try reverse lookup: find game name that maps to this geo name
      const gameEntry = Object.entries(COUNTRY_NAME_MAP).find(
        ([, topoName]) => topoName === geoName
      );
      if (gameEntry) match = countryMapData[gameEntry[0]];
    }
    if (!match) {
      // Try finding a game country whose name matches geo name
      for (const gameName of Object.keys(countryMapData)) {
        if (
          gameName.toLowerCase() === geoName.toLowerCase() ||
          COUNTRY_NAME_MAP[gameName]?.toLowerCase() === geoName.toLowerCase()
        ) {
          match = countryMapData[gameName];
          break;
        }
      }
    }
    if (!match) return "#d1d5db";
    const avg = match.totalGuesses / match.count;
    return colorScale(avg);
  }

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

      // Parse DD/MM/YYYY to YYYY-MM-DD
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

    setImportProgress({ current: 0, total: rows.length });

    // Batch upsert in chunks of 100
    const BATCH_SIZE = 100;
    let imported = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
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
      setImportProgress({ current: imported, total: rows.length });
    }

    setImportErrors(errors);
    setImportSuccess(`Imported ${imported} of ${rows.length} rows.`);
    setImportProgress(null);

    // Refresh data
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
      {/* Top row: year filter + average stat */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
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
        <div className="bg-white rounded-lg shadow px-6 py-4 text-center">
          <p className="text-sm font-medium text-bnb-text/70">
            Average Guesses
          </p>
          <p className="text-4xl font-extrabold font-heading">
            {filteredResults.length > 0 ? avgGuesses : "--"}
          </p>
          <p className="text-xs text-bnb-text/50">
            {filteredResults.length} games
          </p>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Chart 1: Guesses Over Time */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-bold font-heading mb-2">
            Number of Guesses Over Time
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={guessesOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
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
                <Bar dataKey="guesses" fill={chartFill} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Correct Guesser Count */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-bold font-heading mb-2">
            Correct Guesser Count
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={guesserCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={chartFill} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Continent Count */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-bold font-heading mb-2">
            Countries by Continent
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={continentCounts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill={chartFill} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Average Guesses by Continent */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-bold font-heading mb-2">
            Average Guesses by Continent
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgByContinent}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="avg" fill={chartFill} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* World Map */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-bold font-heading mb-2">World Map</h3>
        <ComposableMap
          projectionConfig={{ rotate: [-10, 0, 0], scale: 147 }}
          width={800}
          height={400}
          className="w-full h-auto"
        >
          <ZoomableGroup>
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
                        default: { outline: "none" },
                        hover: { outline: "none", opacity: 0.8 },
                        pressed: { outline: "none" },
                      }}
                      onMouseEnter={() => {
                        const data = countryMapData[geoName];
                        if (data) {
                          const avg = (
                            data.totalGuesses / data.count
                          ).toFixed(1);
                          setTooltipContent(
                            `${geoName}: ${avg} avg guesses (${data.count} games)`
                          );
                        } else {
                          setTooltipContent(geoName);
                        }
                      }}
                      onMouseLeave={() => setTooltipContent("")}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        {tooltipContent && (
          <p className="text-center text-sm text-bnb-text/70 mt-1">
            {tooltipContent}
          </p>
        )}
        {/* Color legend */}
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

      {/* Import Section */}
      <div className="bg-white rounded-lg shadow p-4">
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
