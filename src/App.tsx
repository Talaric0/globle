import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import Game from "./pages/Game";
import Header from "./components/Header";
import Settings from "./pages/Settings";

const Dashboard = lazy(() => import("./pages/Dashboard"));

function App() {
  const [reSpin, setReSpin] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  useEffect(() => {
    if (reSpin) setTimeout(() => setReSpin(false), 1);
  }, [reSpin]);

  if (isDashboard) {
    return (
      <div className="mx-auto px-6 z-20 relative">
        <Header setReSpin={setReSpin} />
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
      className="mx-auto px-6 z-20 absolute top-0 bottom-0 left-0 right-0 block"
    >
      <Header setReSpin={setReSpin} />
      <Routes>
        <Route
          path="/"
          element={<Game reSpin={reSpin} />}
        />
        <Route
          path="/game"
          element={<Game reSpin={reSpin} />}
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
