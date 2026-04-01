import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import Game from "./pages/Game";
import Header from "./components/Header";
import Statistics from "./components/Statistics";
import Fade from "./transitions/Fade";
import Settings from "./pages/Settings";

const Dashboard = lazy(() => import("./pages/Dashboard"));

function App() {
  const [reSpin, setReSpin] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  useEffect(() => {
    if (reSpin) setTimeout(() => setReSpin(false), 1);
  }, [reSpin]);

  if (isDashboard) {
    return (
      <div className="max-w-6xl mx-auto px-4 z-20 relative">
        <Header setReSpin={setReSpin} setShowStats={setShowStats} />
        <Suspense
          fallback={<p className="text-bnb-text py-20">Loading...</p>}
        >
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

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
