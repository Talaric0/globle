import { lazy, Suspense, useMemo, useRef, useState, useEffect } from "react";
import { GlobeMethods } from "react-globe.gl";
import { Country } from "../lib/country";
import { answerCountry, answerName } from "../util/answer";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Guesses } from "../lib/localStorage";
import { today } from "../util/dates";
import { polygonDistance } from "../util/distance";
import { useNavigate, useSearchParams } from "react-router-dom";

const Globe = lazy(() => import("../components/Globe"));
const Guesser = lazy(() => import("../components/Guesser"));
const GuesserPicker = lazy(() => import("../components/GuesserPicker"));
const List = lazy(() => import("../components/List"));
const countryData: Country[] = require("../data/country_data.json").features;

type Props = {
  reSpin: boolean;
};

export default function Game({ reSpin }: Props) {
  const [storedGuesses, storeGuesses] = useLocalStorage<Guesses>("guesses", {
    day: today,
    countries: [],
  });

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const practiceMode = !!params.get("practice_mode");

  function enterPracticeMode() {
    const practiceAnswer =
      countryData[Math.floor(Math.random() * countryData.length)];
    localStorage.setItem("practice", JSON.stringify(practiceAnswer));
    navigate("/game?practice_mode=true");
    setGuesses([]);
    setWin(false);
  }

  const storedCountries = useMemo(() => {
    if (today <= storedGuesses.day && !practiceMode) {
      const names = storedGuesses.countries;
      return names.map((guess) => {
        const foundCountry = countryData.find((country) => {
          return country.properties.NAME === guess;
        });
        if (!foundCountry) throw new Error("Country mapping broken");
        foundCountry["proximity"] = polygonDistance(
          foundCountry,
          answerCountry
        );
        return foundCountry;
      });
    }
    return [];
    // eslint-disable-next-line
  }, [practiceMode]);

  const alreadyWon = practiceMode
    ? false
    : storedCountries?.map((c) => c.properties.NAME).includes(answerName);

  const [guesses, setGuesses] = useState<Country[]>(
    practiceMode ? [] : storedCountries
  );
  const [win, setWin] = useState(alreadyWon);
  const globeRef = useRef<GlobeMethods>(null!);

  useEffect(() => {
    if (!practiceMode) {
      const guessNames = guesses.map((country) => country.properties.NAME);
      storeGuesses({
        day: today,
        countries: guessNames,
      });
    }
  }, [guesses, storeGuesses, practiceMode]);

  return (
    <Suspense fallback={<p className="text-bnb-text">Loading...</p>}>
      <div className="flex flex-col md:flex-row md:items-start gap-6 mt-6">
        {/* Left panel: input + guesser picker + list */}
        <div className="md:w-[400px] shrink-0">
          <Guesser
            guesses={guesses}
            setGuesses={setGuesses}
            win={win}
            setWin={setWin}
            practiceMode={practiceMode}
          />
          {win && !practiceMode && (
            <GuesserPicker guessCount={guesses.length} />
          )}
          {!reSpin && (
            <List
              guesses={guesses}
              win={win}
              globeRef={globeRef}
              practiceMode={practiceMode}
            />
          )}
          {practiceMode && (
            <div className="my-4 flex flex-wrap gap-3 items-center">
              <span className="text-bnb-text">You are in practice mode.</span>
              <button
                className="text-white bg-bnb-action hover:bg-bnb-action-hover
                  focus:ring-4 focus:ring-bnb-action-inverse rounded-lg text-sm
                  px-4 py-2.5 text-center items-center"
                onClick={() => navigate("/")}
              >
                Exit practice mode
              </button>
              <button
                className="text-white bg-bnb-action hover:bg-bnb-action-hover
                  focus:ring-4 focus:ring-bnb-action-inverse rounded-lg text-sm
                  px-4 py-2.5 text-center items-center"
                onClick={enterPracticeMode}
              >
                New practice game
              </button>
            </div>
          )}
        </div>

        {/* Right panel: globe */}
        {!reSpin && (
          <div className="flex-1 flex justify-center">
            <Globe
              guesses={guesses}
              globeRef={globeRef}
              practiceMode={practiceMode}
            />
          </div>
        )}
      </div>
    </Suspense>
  );
}
