"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { Country, GdeltEvent } from "@/types";
import CountrySidebar from "./CountrySidebar";
import Legend from "./Legend";

// Leaflet cannot run on SSR
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
}

export default function MapClient({ initialCountries }: MapClientProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [events, setEvents] = useState<GdeltEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCountryClick = useCallback(async (country: Country) => {
    setSelectedCountry(country);
    setSidebarOpen(true);
    setLoadingEvents(true);
    setEvents([]);

    try {
      const res = await fetch(
        `/api/events?country_code=${country.country_code}`
      );
      if (!res.ok) throw new Error("Failed to fetch events");
      const data: GdeltEvent[] = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setSidebarOpen(false);
    setTimeout(() => {
      setSelectedCountry(null);
      setEvents([]);
    }, 300);
  }, []);

  return (
    <div className="relative w-full h-full">
      <LeafletMap
        countries={initialCountries}
        onCountryClick={handleCountryClick}
        selectedCountry={selectedCountry}
      />

      <Legend />

      <CountrySidebar
        country={selectedCountry}
        events={events}
        loading={loadingEvents}
        isOpen={sidebarOpen}
        onClose={handleClose}
      />

      {initialCountries.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#161b27] border border-[#1e2533] rounded-lg px-4 py-3 text-sm text-gray-400 max-w-sm text-center z-[1000]">
          No data yet. Trigger{" "}
          <code className="text-blue-400">/api/update-events</code> to fetch
          GDELT data.
        </div>
      )}
    </div>
  );
}
