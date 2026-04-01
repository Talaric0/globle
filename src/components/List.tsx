import { SyntheticEvent, useEffect, useState } from "react";
import { GlobeMethods } from "react-globe.gl";
import { Country } from "../lib/country";
import { answerName } from "../util/answer";
import { findCentre, turnGlobe } from "../util/globe";
import Toggle from "./Toggle";

type Props = {
  guesses: Country[];
  win: boolean;
  globeRef: React.MutableRefObject<GlobeMethods>;
  practiceMode: boolean;
};

function reorderGuesses(guessList: Country[], practiceMode: boolean) {
  return [...guessList].sort((a, b) => {
    if (practiceMode) {
      const answerCountry = JSON.parse(
        localStorage.getItem("practice") as string
      ) as Country;
      const answerName = answerCountry.properties.NAME;
      if (a.properties.NAME === answerName) {
        return -1;
      } else if (b.properties.NAME === answerName) {
        return 1;
      } else {
        return a.proximity - b.proximity;
      }
    }

    if (a.properties.NAME === answerName) {
      return -1;
    } else if (b.properties.NAME === answerName) {
      return 1;
    } else {
      return a.proximity - b.proximity;
    }
  });
}

const ADJACENT_THRESHOLD = 10_000;

function formatDistance(m: number, miles: boolean) {
  if (m < ADJACENT_THRESHOLD) return "Adjacent";

  const METERS_PER_MILE = 1609.34;
  const BIN = 10;
  const value = miles ? m / METERS_PER_MILE : m / 1000;
  const unit = miles ? "mi" : "km";
  if (value < BIN) return `< ${BIN} ${unit}`;

  const rounded = Math.round(value / BIN) * BIN;
  const formatted = rounded.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `~ ${formatted} ${unit}`;
}

export default function List({ guesses, win, globeRef, practiceMode }: Props) {
  const [orderedGuesses, setOrderedGuesses] = useState(
    reorderGuesses(guesses, practiceMode)
  );
  const [miles, setMiles] = useState(false);

  useEffect(() => {
    setOrderedGuesses(reorderGuesses(guesses, practiceMode));
  }, [guesses, practiceMode]);

  function turnToCountry(e: SyntheticEvent, idx: number) {
    const clickedCountry = isSortedByDistance
      ? orderedGuesses[idx]
      : guesses[idx];
    const { lat, lng, altitude } = findCentre(clickedCountry);
    turnGlobe({ lat, lng, altitude }, globeRef, "zoom");
  }

  const [isSortedByDistance, setIsSortedByDistance] = useState(true);
  const guessesToDisplay = isSortedByDistance ? orderedGuesses : guesses;

  return (
    <div className="md:ml-10 md:mr-0 py-8 text-bnb-text z-30 mb-20">
      {orderedGuesses.length > 0 && (
        <div className="flex items-center justify-between mb-2">
          <b>{isSortedByDistance ? (win ? "Answer" : "Closest") : "Guessed"}</b>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSortedByDistance(!isSortedByDistance)}
            >
              <span className="text-sm underline">
                {isSortedByDistance
                  ? "Sort by order of guesses"
                  : "Sort by distance"}
              </span>
            </button>
            <Toggle
              name="miles"
              setToggle={setMiles}
              toggle={miles}
              on="km"
              off="mi"
            />
          </div>
        </div>
      )}
      <table className="w-full text-sm">
        <tbody>
          {guessesToDisplay.map((guess, idx) => {
            const { NAME, FLAG } = guess.properties;
            const flag = (FLAG || "").toLowerCase();
            const isAnswer =
              guess.properties.NAME === answerName ||
              (practiceMode &&
                guess.properties.NAME ===
                  (
                    JSON.parse(
                      localStorage.getItem("practice") as string
                    ) as Country
                  )?.properties.NAME);

            return (
              <tr
                key={idx}
                className="border-b border-bnb-border-input last:border-b-0 cursor-pointer hover:bg-bnb-surface-secondary"
                onClick={(e) => turnToCountry(e, idx)}
              >
                <td className="py-2 pr-2 w-8">
                  <img
                    src={`https://flagcdn.com/w20/${flag}.png`}
                    alt={NAME}
                  />
                </td>
                <td className="py-2 font-medium">{NAME}</td>
                <td className="py-2 text-right text-bnb-text/70">
                  {isAnswer ? "🎯" : formatDistance(guess.proximity, miles)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
