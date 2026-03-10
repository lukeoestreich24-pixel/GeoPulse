"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect } from "react";
import { Country, GdeltEvent } from "@/types";
import { MapMode } from "./AppShell";
import CountrySidebar from "./CountrySidebar";
import { getSafetyScores } from "@/lib/safety-client";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0f1117]">
      <div className="text-center space-y-3">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-500 text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

interface MapClientProps {
  initialCountries: Country[];
  mode: MapMode;
}

export default function MapClient({ initialCountries, mode }: MapClientProps) {
  const [countries, setCountries] = useState<Country[]>(initialCountries);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [events, setEvents] = useState<GdeltEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [safetyScores, setSafetyScores] = useState<Record<string, number>>({});
  const [loadingSafety, setLoadingSafety] = useState(false);

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setCountries(data); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (mode !== "safety") return;
    if (Object.keys(safetyScores).length > 0) return;
    setLoadingSafety(true);
    getSafetyScores().then(setSafetyScores).finally(() => setLoadingSafety(false));
  }, [mode, safetyScores]);

  const handleCountryClick = useCallback(async (country: Country) => {
    setSelectedCountry(country);
    setSidebarOpen(true);
    setLoadingEvents(true);
    setEvents([]);
    try {
      const res = await fetch(`/api/events?country_code=${country.country_code}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      setEvents(await res.json());
    } catch { setEvents([]); }
    finally { setLoadingEvents(false); }
  }, []);

  const handleClose = useCallback(() => {
    setSidebarOpen(false);
    setTimeout(() => { setSelectedCountry(null); setEvents([]); }, 300);
  }, []);

  return (
    <div className="relative w-full h-full">
      {loadingSafety && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-[#161b27] border border-[#1e2533] rounded-lg px-4 py-2 text-xs text-gray-400 flex items-center gap-2">
          <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full" />
          Loading safety data...
        </div>
      )}

      <LeafletMap
        key={mode}
        countries={countries}
        onCountryClick={handleCountryClick}
        selectedCountry={selectedCountry}
        mode={mode}
        safetyScores={safetyScores}
      />

      <ModeLegend mode={mode} />

      <CountrySidebar
        country={selectedCountry}
        events={events}
        loading={loadingEvents}
        isOpen={sidebarOpen}
        onClose={handleClose}
      />
    </div>
  );
}

function ModeLegend({ mode }: { mode: MapMode }) {
  if (mode === "geopolitical") {
    return (
      <div className="absolute bottom-8 left-4 z-[1000] bg-[#161b27]/90 border border-[#1e2533] rounded-lg px-3 py-2.5 text-xs backdrop-blur-sm">
        <div className="text-gray-500 font-medium mb-1.5 uppercase tracking-wider text-[10px]">Conflict Status</div>
        {[
          { color: "#ef4444", label: "Active War" },
          { color: "#f97316", label: "High Tension" },
          { color: "#eab308", label: "Occupation / Disputed" },
          { color: "#a855f7", label: "Heavily Sanctioned" },
          { color: "#22c55e", label: "Stable" },
          ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
              style={{ backgroundColor: color }} />
            <span className="text-gray-300">{label}</span>
          </div>
        ))}
        <div className="border-t border-[#1e2533] mt-2 pt-1.5 space-y-0.5">
          <div className="text-gray-500 font-medium uppercase tracking-wider text-[10px] mb-1">Overlays</div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2 inline-block flex-shrink-0 border border-red-400 border-dashed rounded-sm" />
            <span className="text-gray-400">Active conflict zone</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-blue-500" />
            <span className="text-gray-400">US base</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-purple-500" />
            <span className="text-gray-400">NATO base</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-red-500" />
            <span className="text-gray-400">Russian base</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-orange-500" />
            <span className="text-gray-400">Chinese base</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-yellow-300" />
            <span className="text-gray-400">Military aircraft (live)</span>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "safety") {
    return (
      <div className="absolute bottom-8 left-4 z-[1000] bg-[#161b27]/90 border border-[#1e2533] rounded-lg px-3 py-2.5 text-xs backdrop-blur-sm">
        <div className="text-gray-500 font-medium mb-1.5 uppercase tracking-wider text-[10px]">Safety Score</div>
        {[
          { color: "#22c55e", label: "Very Safe",            range: "80–100" },
          { color: "#84cc16", label: "Relatively Safe",      range: "60–79" },
          { color: "#eab308", label: "Moderate Concerns",    range: "40–59" },
          { color: "#f97316", label: "Significant Concerns", range: "20–39" },
          { color: "#ef4444", label: "High Risk",            range: "0–19"  },
        ].map(({ color, label, range }) => (
          <div key={label} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-300">{label}</span>
            <span className="text-gray-600 ml-auto pl-3">{range}</span>
          </div>
        ))}
        <div className="text-gray-600 mt-1.5 text-[10px]">Source: World Bank Rule of Law</div>
      </div>
    );
  }

  if (mode === "travel") {
    return (
      <div className="absolute bottom-8 left-4 z-[1000] bg-[#161b27]/90 border border-[#1e2533] rounded-lg px-3 py-2.5 text-xs backdrop-blur-sm">
        <div className="text-gray-500 font-medium mb-1.5 uppercase tracking-wider text-[10px]">Travel Advisory</div>
        {[
          { color: "#22c55e", label: "Level 1 — Normal" },
          { color: "#eab308", label: "Level 2 — Increased Caution" },
          { color: "#f97316", label: "Level 3 — Reconsider Travel" },
          { color: "#ef4444", label: "Level 4 — Do Not Travel" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-300">{label}</span>
          </div>
        ))}
        <div className="border-t border-[#1e2533] mt-2 pt-1.5 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2 inline-block flex-shrink-0 border-2 border-red-400 border-dashed rounded-sm" />
            <span className="text-gray-400">Airspace closed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2 inline-block flex-shrink-0 border-2 border-orange-400 border-dashed rounded-sm" />
            <span className="text-gray-400">Airspace restricted</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0 bg-blue-400" />
            <span className="text-gray-400">Live flights</span>
          </div>
        </div>
        <div className="text-gray-600 mt-1.5 text-[10px]">Source: US State Dept · OpenSky Network</div>
      </div>
    );
  }

  return null;
}
