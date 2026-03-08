"use client";

import { useState } from "react";
import { Country } from "@/types";
import Header from "./Header";
import MapClient from "./MapClient";

export type MapMode = "geopolitical" | "safety" | "travel";

interface AppShellProps {
  initialCountries: Country[];
}

export default function AppShell({ initialCountries }: AppShellProps) {
  const [mode, setMode] = useState<MapMode>("geopolitical");

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header
        countryCount={initialCountries.length}
        mode={mode}
        onModeChange={setMode}
      />
      <main className="flex-1 relative overflow-hidden">
        <MapClient initialCountries={initialCountries} mode={mode} />
      </main>
    </div>
  );
}
