import { isMobile } from "react-device-detect";
import { answerName } from "../util/answer";
import { Country } from "../lib/country";

type Props = {
  win: boolean;
  error: any;
  guesses: number;
  practiceMode: boolean;
};

export function Message({ win, error, guesses, practiceMode }: Props) {
  let name = answerName;
  if (practiceMode) {
    const practiceCountry = JSON.parse(
      localStorage.getItem("practice") as string
    ) as Country;
    name = practiceCountry.properties.NAME;
  }

  if (error) {
    return <p className="text-red-700">{error}</p>;
  } else if (win) {
    return (
      <p className="text-green-800 font-bold">
        The Mystery Country is {name}!
      </p>
    );
  } else if (guesses === 0) {
    return (
      <p className="text-bnb-text/70">
        Enter the name of any country to make your first guess.
      </p>
    );
  } else if (guesses === 1) {
    return (
      <p className="text-bnb-text/70">
        Drag, {isMobile ? "tap" : "click"}, and zoom-in on the globe to help
        you find your next guess.
      </p>
    );
  } else {
    return <p className="text-red-700"></p>;
  }
}
