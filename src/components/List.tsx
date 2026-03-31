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

export default function List({ guesses, win, globeRef, practiceMode }: Props) {
  const [orderedGuesses, setOrderedGuesses] = useState(
    reorderGuesses(guesses, practiceMode)
  );
  const [miles, setMiles] = useState(false);

  useEffect(() => {
    setOrderedGuesses(reorderGuesses(guesses, practiceMode));
  }, [guesses, practiceMode]);

  function formatKm(m: number, miles: boolean) {
    const ADJACENT_THRESHOLD = 10_000; // 10km — countries sharing a border
    if (m < ADJACENT_THRESHOLD) return "Adjacent";

    const METERS_PER_MILE = 1609.34;
    const BIN = 10;
    const value = miles ? m / METERS_PER_MILE : m / 1000;
    if (value < BIN) return "< " + BIN;

    const rounded = Math.round(value / BIN) * BIN;
    const format = (num: number) =>
      num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return `~ ${format(rounded)}`;
  }

  function turnToCountry(e: SyntheticEvent, idx: number) {
    const clickedCountry = isSortedByDistance
      ? orderedGuesses[idx]
      : guesses[idx];
    const { lat, lng, altitude } = findCentre(clickedCountry);
    turnGlobe({ lat, lng, altitude }, globeRef, "zoom");
  }

  const closest = orderedGuesses[0];
  const farthest = orderedGuesses[orderedGuesses.length - 1];

  const [isSortedByDistance, setIsSortedByDistance] = useState(true);
  const guessesToDisplay = isSortedByDistance ? orderedGuesses : guesses;

  return (
    <div className="md:ml-10 md:mr-0 py-8 text-bnb-text z-30 mb-20">
      {orderedGuesses.length > 0 && (
        <p className="my-1">
          <b>{isSortedByDistance ? (win ? "Answer" : "Closest") : "Guessed"}</b>
        </p>
      )}
      <ul className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {guessesToDisplay.map((guess, idx) => {
          const { NAME_LEN, ABBREV, NAME, FLAG } = guess.properties;
          const flag = (FLAG || "").toLocaleLowerCase();
          const name = NAME_LEN >= 10 ? ABBREV : NAME;

          return (
            <li key={idx}>
              <button
                onClick={(e) => turnToCountry(e, idx)}
                className="flex items-center cursor-pointer"
              >
                <img
                  src={`https://flagcdn.com/w20/${flag.toLowerCase()}.png`}
                  alt={name}
                />
                <span className="ml-2 text-md text-left">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {closest && farthest && (
        <div className="mt-8">
          <div className="flex items-center space-x-1">
            <p>
              Closest border: {formatKm(closest?.proximity, miles)}
              {closest?.proximity >= 10_000 && (
                <> {miles ? "miles" : "km"}</>
              )}
            </p>
            {closest?.proximity >= 10_000 && (
              <Toggle
                name="miles"
                setToggle={setMiles}
                toggle={miles}
                on="km"
                off="miles"
              />
            )}
          </div>
          <p>
            <button
              onClick={() => setIsSortedByDistance(!isSortedByDistance)}
              className="mt-2"
            >
              <span className="text-md underline">
                {isSortedByDistance
                  ? "Sort by order of guesses"
                  : "Sort by distance"}
              </span>
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
