"use client";

import { useState, useEffect } from "react";
import { MapMode } from "./AppShell";

interface HeaderProps {
  countryCount: number;
  mode: MapMode;
  onModeChange: (mode: MapMode) => void;
}

const TABS: { id: MapMode; label: string; icon: string }[] = [
  { id: "geopolitical", label: "Geopolitical",  icon: "⚡" },
  { id: "safety",       label: "Safety",         icon: "🛡" },
  { id: "travel",       label: "Travel",         icon: "✈" },
];

export default function Header({ countryCount, mode, onModeChange }: HeaderProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => setTime(new Date().toUTCString());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-[#161b27] border-b border-[#1e2533] z-10 flex-shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-[180px]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <span className="font-bold text-lg tracking-tight">GeoPulse</span>
        </div>
        <span className="text-xs text-gray-500 hidden sm:block">
          Global Geopolitical Risk Tracker
        </span>
      </div>

      {/* Mode tabs — centered */}
      <div className="flex items-center gap-1 bg-[#0f1117] rounded-lg p-1 border border-[#1e2533]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onModeChange(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
              transition-all duration-150
              ${mode === tab.id
                ? "bg-[#1e2533] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300 hover:bg-[#161b27]"
              }
            `}
          >
            <span className="text-sm leading-none">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Right side info */}
      <div className="flex items-center gap-4 text-xs text-gray-500 min-w-[180px] justify-end">
        {countryCount > 0 && (
          <span>
            <span className="text-gray-300 font-medium">{countryCount}</span>{" "}
            countries tracked
          </span>
        )}
        {time && (
          <span className="hidden md:block font-mono">{time}</span>
        )}
        <span className="text-gray-600 hidden lg:block">Powered by GDELT</span>
      </div>
    </header>
  );
}
