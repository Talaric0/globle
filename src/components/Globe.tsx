import { useEffect, useRef, useState } from "react";
import ReactGlobe, { GlobeMethods } from "react-globe.gl";
import { Country } from "../lib/country";
import { answerCountry } from "../util/answer";
import { findCentre, globeImg, turnGlobe } from "../util/globe";
import { getColour } from "../util/colour";
import { isMobile } from "react-device-detect";
const territoryData: Country[] = require("../data/territories.json").features;

type Props = {
  guesses: Country[];
  globeRef: React.MutableRefObject<GlobeMethods>;
  practiceMode: boolean;
};

const ZOOM_SPEED = 0.2;

export default function Globe({ guesses, globeRef, practiceMode }: Props) {
  // State
  const [places, setPlaces] = useState(guesses);

  // Globe size settings
  const size = isMobile ? 320 : 600; // px on one side
  const extraStyle = {
    width: `${size}px`,
    clipPath: `circle(${size / 2}px at ${size / 2}px ${size / 2}px)`,
  };

  // On first render
  useEffect(() => {
    const controls: any = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1;
    setTimeout(() => {
      globeRef.current.pointOfView({ lat: 0, lng: 0, altitude: 1.5 });
    }, 400);
  }, [globeRef]);

  // After each guess
  useEffect(() => {
    // Add territories to guesses to make shapes
    const territories: Country[] = [];
    guesses.forEach((guess) => {
      const foundTerritories = territoryData.filter((territory) => {
        return guess.properties.NAME === territory.properties.SOVEREIGNT;
      });
      if (foundTerritories) territories.push(...foundTerritories);
    });
    setPlaces(guesses.concat(territories));

    // Turn globe to new spot
    const newGuess = [...guesses].pop();
    if (newGuess) {
      const controls: any = globeRef.current.controls();
      controls.autoRotate = false;
      const newSpot = findCentre(newGuess);
      turnGlobe(newSpot, globeRef, "zoom");
    }
  }, [guesses, globeRef]);

  // Stop rotate on drag
  const containerRef = useRef<HTMLDivElement>(null!);
  useEffect(() => {
    const controls: any = globeRef.current.controls();
    containerRef.current.addEventListener("mouseup", () => {
      controls.autoRotate = false;
    });
    containerRef.current.addEventListener("touchend", () => {
      controls.autoRotate = false;
    });
  }, [globeRef]);

  // Polygon colour
  function polygonColour(country: Country) {
    if (practiceMode) {
      const answerCountry = JSON.parse(
        localStorage.getItem("practice") as string
      );
      return getColour(country, answerCountry);
    }
    return getColour(country, answerCountry);
  }

  // Label colour
  function getLabel(country: Country) {
    const name = country.properties.ADMIN;
    const prox = country.proximity;
    const colour = prox < 750_000 ? "gray-300" : "gray-900";
    const label = `<b class="text-${colour}">${name}</b>`;
    return label;
  }

  // Polygon altitude
  function getAltitude() {
    return 0.01;
  }

  // Clicking the zoom buttons on mobile
  function zoom(z: number) {
    const controls: any = globeRef.current.controls();
    controls.autoRotate = false;
    const coords = globeRef.current.pointOfView();
    const { altitude } = globeRef.current.pointOfView();
    coords["altitude"] = Math.max(altitude + z, 0.05);
    globeRef.current.pointOfView(coords, 250);
  }

  // Called when the globe position changes
  function globeOnZoom() {
    overrideGlobeZooming();
  }

  // Override the zoomSpeed mutation in globe.gl
  function overrideGlobeZooming() {
    const controls: any = globeRef.current?.controls();
    if (controls != null) controls.zoomSpeed = ZOOM_SPEED;
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="globe mx-auto cursor-grab text-center select-none"
        style={extraStyle}
      >
        <ReactGlobe
          className="select-none decoration-transparent cursor-grab "
          style={{ "-webkit-tap-highlight-color": "transparent" }}
          ref={globeRef}
          globeImageUrl={globeImg()}
          width={size}
          height={size}
          backgroundColor="#00000000"
          polygonsData={places}
          // @ts-ignore
          polygonCapColor={polygonColour}
          // @ts-ignore
          polygonLabel={getLabel}
          // @ts-ignore
          polygonAltitude={getAltitude}
          polygonSideColor="blue"
          onGlobeClick={(d) => turnGlobe(d, globeRef)}
          onPolygonClick={(p, e, c) => turnGlobe(c, globeRef)}
          polygonStrokeColor="#00000000"
          atmosphereColor="lightskyblue"
          onZoom={globeOnZoom}
        />
      </div>
      {isMobile && (
        <div className="w-full flex justify-between text-md ">
          <button
            className="border-[1px] rounded-md select-none bg-bnb-brand px-4 border-bnb-text"
            onTouchStart={() => zoom(0.2)}
          >
            -
          </button>
          <button
            className="border-[1px] rounded-md select-none bg-bnb-brand px-4 border-bnb-text"
            onTouchStart={() => zoom(-0.2)}
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
