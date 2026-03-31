import { useNavigate } from "react-router-dom";
import { Country } from "../lib/country";
const countryData: Country[] = require("../data/country_data.json").features;

export default function Settings() {
  const navigate = useNavigate();

  function enterPracticeMode() {
    const practiceAnswer =
      countryData[Math.floor(Math.random() * countryData.length)];
    localStorage.setItem("practice", JSON.stringify(practiceAnswer));
    navigate("/game?practice_mode=true");
  }

  return (
    <div
      className="flex-col items-center align-middle space-y-8 mx-auto my-10
    min-w-[300px] sm:min-w-[400px] w-fit text-lg max-w-md"
    >
      <button
        onClick={enterPracticeMode}
        className="bg-bnb-action hover:bg-bnb-action-hover
         disabled:bg-bnb-action-disabled text-white
        focus:ring-4 focus:ring-bnb-action-inverse rounded-lg text-sm
        px-4 py-2.5 text-center items-center
        w-32 justify-center self-center mx-auto block"
      >
        <span className="font-medium">Practice</span>
      </button>
    </div>
  );
}
