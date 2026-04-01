import { useNavigate } from "react-router-dom";
import { getPath } from "../util/svg";

type Props = {
  setReSpin: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function Header({ setReSpin }: Props) {
  const navigate = useNavigate();

  function reRenderGlobe() {
    setReSpin(true);
    navigate("/");
  }

  const svgColour = "var(--color-icon-primary)";

  return (
    <header className="mt-8 h-10 relative text-bnb-text z-10">
      <div className="relative h-full">
        <button
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2"
          onClick={reRenderGlobe}
        >
          <h1 className="text-4xl font-extrabold font-heading">GLOBLE</h1>
        </button>
        <div className="space-x-1 flex absolute right-0 bottom-1">
          <button onClick={() => navigate("/dashboard")} aria-label="Dashboard">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24"
              viewBox="0 0 24 24"
              width="24"
            >
              <path fill={svgColour} d={getPath("dashboard")}></path>
            </svg>
          </button>
          <button onClick={() => navigate("/settings")} aria-label="Settings">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24"
              viewBox="0 0 24 24"
              width="24"
            >
              <path fill={svgColour} d={getPath("settings")}></path>
            </svg>
          </button>
        </div>
      </div>
      <hr className="bottom-0" style={{ borderColor: svgColour }} />
    </header>
  );
}
