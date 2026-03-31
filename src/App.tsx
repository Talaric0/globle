import { useEffect, useState } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Game from "./pages/Game";
import Header from "./components/Header";
import Settings from "./pages/Settings";
import Statistics from "./components/Statistics";
import Fade from "./transitions/Fade";

function App() {
  const [reSpin, setReSpin] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    if (reSpin) setTimeout(() => setReSpin(false), 1);
  }, [reSpin]);

  return (
    <div
      className="max-w-xs sm:max-w-md md:max-w-2xl mx-auto
      z-20 absolute top-0 bottom-0 left-0 right-0 block"
    >
      <Header setReSpin={setReSpin} setShowStats={setShowStats} />

      <Fade
        show={showStats}
        background="border-4 border-bnb-brand bg-white drop-shadow-xl
      absolute z-10 w-full sm:w-fit inset-x-0 mx-auto py-6 px-6 rounded-md
      space-y-2"
      >
        <Statistics setShowStats={setShowStats} />
      </Fade>
      <Routes>
        <Route
          path="/"
          element={<Game reSpin={reSpin} setShowStats={setShowStats} />}
        />
        <Route
          path="/game"
          element={<Game reSpin={reSpin} setShowStats={setShowStats} />}
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
