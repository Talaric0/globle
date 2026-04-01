import { useEffect, useState } from "react";
import { supabase, GameResult } from "../lib/supabase";
import { today } from "../util/dates";
import { answerCountry, answerName } from "../util/answer";

const TEAM_MEMBERS = ["Hallam", "Win", "James", "Nay", "MJ", "Alonso", "Bruno", "Rebeca"];

type Props = {
  guessCount: number;
};

export default function GuesserPicker({ guessCount }: Props) {
  const [saved, setSaved] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [savedGuesser, setSavedGuesser] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkExisting() {
      const { data } = await supabase
        .from("game_results")
        .select("correct_guesser")
        .eq("date", today)
        .single();
      if (data) {
        setAlreadySaved(true);
        setSavedGuesser(data.correct_guesser);
      }
    }
    checkExisting();
  }, []);

  async function handleSelect(member: string) {
    setSaving(true);
    setError("");
    const result: Omit<GameResult, "id" | "created_at"> = {
      date: today,
      country: answerName,
      continent: answerCountry.properties.CONTINENT,
      num_guesses: guessCount,
      correct_guesser: member,
    };
    const { error: upsertError } = await supabase
      .from("game_results")
      .upsert(result, { onConflict: "date" });
    setSaving(false);
    if (upsertError) {
      setError("Failed to save result. Please try again.");
      return;
    }
    setSaved(true);
    setSavedGuesser(member);
  }

  const disabled = saved || alreadySaved || saving;

  return (
    <div className="my-4 text-center">
      {alreadySaved ? (
        <p className="text-bnb-text font-medium">
          Today's result saved — <strong>{savedGuesser}</strong> guessed
          correctly!
        </p>
      ) : saved ? (
        <p className="text-green-700 font-bold">
          Saved! {savedGuesser} guessed correctly.
        </p>
      ) : (
        <>
          <p className="text-bnb-text font-medium mb-3">
            Who guessed correctly?
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {TEAM_MEMBERS.map((member) => (
              <button
                key={member}
                className="text-white bg-bnb-action hover:bg-bnb-action-hover
                  disabled:bg-bnb-action-disabled focus:ring-4
                  focus:ring-bnb-action-inverse rounded-lg text-sm
                  px-4 py-2.5 text-center"
                onClick={() => handleSelect(member)}
                disabled={disabled}
              >
                {member}
              </button>
            ))}
          </div>
          {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
        </>
      )}
    </div>
  );
}
