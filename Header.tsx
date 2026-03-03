"use client";

import { useState, useEffect } from "react";

interface HeaderProps {
  countryCount: number;
}

export default function Header({ countryCount }: HeaderProps) {
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => setTime(new Date().toUTCString());
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-[#161b27] border-b border-[#1e2533] z-10 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo / brand */}
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

      <div className="flex items-center gap-4 text-xs text-gray-500">
        {countryCount > 0 && (
          <span>
            <span className="text-gray-300 font-medium">{countryCount}</span>{" "}
            countries tracked
          </span>
        )}
        {time && (
          <span className="hidden md:block font-mono">{time}</span>
        )}
        <span className="text-gray-600">Powered by GDELT</span>
      </div>
    </header>
  );
}
