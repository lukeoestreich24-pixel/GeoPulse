"use client";

import { Country, GdeltEvent, getRiskLevel, getRiskColor } from "@/types";
import { useEffect, useRef } from "react";

interface CountrySidebarProps {
  country: Country | null;
  events: GdeltEvent[];
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  conflict: "⚔️ Conflict",
  protest: "✊ Protest",
  sanctions: "🚫 Sanctions",
  threat: "⚠️ Threat",
  other: "📌 Event",
};

function RiskBadge({ score }: { score: number }) {
  const level = getRiskLevel(score);
  const color = getRiskColor(score);

  const bgMap: Record<string, string> = {
    critical: "bg-red-500/10 border-red-500/30",
    high: "bg-orange-500/10 border-orange-500/30",
    medium: "bg-yellow-500/10 border-yellow-500/30",
    low: "bg-green-500/10 border-green-500/30",
    minimal: "bg-blue-500/10 border-blue-500/30",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium uppercase tracking-wide ${bgMap[level]}`}
      style={{ color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {level}
    </span>
  );
}

function RiskMeter({ score }: { score: number }) {
  const color = getRiskColor(score);
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <span className="text-4xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-gray-500 text-sm pb-1">/ 100</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[#1e2533] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function EventItem({ event }: { event: GdeltEvent }) {
  const label = EVENT_TYPE_LABELS[event.event_type] ?? "📌 Event";
  const date = new Date(event.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-[#0f1117] rounded-lg p-3 border border-[#1e2533] space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-gray-300">{label}</span>
        <span className="text-[10px] text-gray-600 font-mono">{date}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Intensity:</span>
        <div className="flex-1 h-1 rounded-full bg-[#1e2533] overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500"
            style={{ width: `${Math.min(100, event.intensity_score)}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 font-mono">
          {event.intensity_score.toFixed(0)}
        </span>
      </div>
      {event.source_url && (
        <a
          href={event.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[10px] text-blue-400 hover:text-blue-300 truncate transition-colors"
        >
          {new URL(event.source_url).hostname} ↗
        </a>
      )}
    </div>
  );
}

export default function CountrySidebar({
  country,
  events,
  loading,
  isOpen,
  onClose,
}: CountrySidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="absolute inset-0 bg-black/40 z-[999] md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`
          absolute top-0 right-0 h-full w-full sm:w-96
          bg-[#161b27] border-l border-[#1e2533]
          z-[1000] flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          shadow-2xl shadow-black/50
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2533] flex-shrink-0">
          <div>
            <h2 className="font-semibold text-base text-gray-100">
              {country?.country_name ?? "—"}
            </h2>
            <p className="text-xs text-gray-500 font-mono">
              {country?.country_code ?? ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors p-1.5 rounded-md hover:bg-[#1e2533]"
            aria-label="Close panel"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {country && (
            <>
              {/* Risk score */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                    Risk Score
                  </h3>
                  <RiskBadge score={country.risk_score} />
                </div>
                <RiskMeter score={country.risk_score} />
              </div>

              {/* Last updated */}
              <div className="text-xs text-gray-600 border-t border-[#1e2533] pt-3">
                Last updated:{" "}
                <span className="text-gray-500">
                  {new Date(country.updated_at).toLocaleString()}
                </span>
              </div>

              {/* Recent events */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Recent Events
                </h3>

                {loading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 rounded-lg bg-[#0f1117] animate-pulse border border-[#1e2533]"
                      />
                    ))}
                  </div>
                ) : events.length > 0 ? (
                  <div className="space-y-2">
                    {events.map((ev) => (
                      <EventItem key={ev.id} event={ev} />
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 py-4 text-center bg-[#0f1117] rounded-lg border border-[#1e2533]">
                    No recent events found
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1e2533] flex-shrink-0">
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Risk score based on GDELT event frequency and intensity over the
            past 48 hours.{" "}
            <span className="text-gray-500">Updated hourly.</span>
          </p>
        </div>
      </div>
    </>
  );
}
