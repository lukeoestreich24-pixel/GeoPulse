"use client";

import { useEffect, useRef, useCallback } from "react";
import { Country, getRiskColorHex } from "@/types";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, LayerGroup } from "leaflet";
import type { GeoJsonObject } from "geojson";
import { MapMode } from "./AppShell";
import {
  TRAVEL_ADVISORIES, AIRSPACE_CLOSURES, ADVISORY_COLORS, ADVISORY_LABELS,
  fetchLiveFlights, type LiveFlight,
} from "@/lib/travel";
import { getSafetyColor, getSafetyLabel } from "@/lib/safety-client";

interface LeafletMapProps {
  countries: Country[];
  onCountryClick: (country: Country) => void;
  selectedCountry: Country | null;
  mode: MapMode;
  safetyScores: Record<string, number>;
}

const FIPS_TO_ISO2: Record<string, string> = {
  AF: "AF", AG: "DZ", AJ: "AZ", AL: "AL", AM: "AM", AO: "AO", AR: "AR",
  AS: "AU", AU: "AT",
  BA: "BH", BB: "BB", BC: "BW", BD: "BM",
  BE: "BE", BF: "BS", BG: "BD", BH: "BZ", BK: "BA",
  BL: "BO", BM: "MM", BN: "BJ", BO: "BY", BR: "BR", BT: "BT", BU: "BG",
  BX: "BN", BY: "BI",
  CA: "CA", CB: "KH", CD: "TD", CF: "CG", CG: "CD", CH: "CN",
  CI: "CL", CM: "CM", CN: "KM",
  CO: "CO", CS: "CR", CT: "CF", CU: "CU", CV: "CV", CY: "CY",
  DA: "DK", DJ: "DJ", DO: "DM", DR: "DO",
  EC: "EC", EG: "EG", EI: "IE", EK: "GQ", EN: "EE", ER: "ER",
  ES: "SV", ET: "ET", EZ: "CZ",
  FI: "FI", FJ: "FJ", FR: "FR",
  GA: "GM", GB: "GA", GG: "GE", GH: "GH", GJ: "GD", GM: "DE",
  GR: "GR", GT: "GT", GV: "GN", GY: "GY",
  HA: "HT", HN: "HN", HU: "HU",
  IC: "IS", ID: "ID", IN: "IN", IQ: "IQ", IR: "IR", IS: "IL",
  IT: "IT", IV: "CI", IZ: "IQ",
  JA: "JP", JM: "JM", JO: "JO",
  KE: "KE", KG: "KG", KN: "KP", KO: "KR", KS: "XK", KU: "KW", KZ: "KZ",
  LA: "LA", LE: "LB", LG: "LV", LH: "LT", LI: "LR", LO: "SK",
  LS: "LI", LT: "LS", LU: "LU", LY: "LY",
  MA: "MG", MC: "MO", MD: "MD", MG: "MN", MI: "MW", MK: "MK",
  ML: "ML", MN: "MC", MO: "MA", MP: "MU", MR: "MR", MT: "MT",
  MU: "OM", MV: "MV", MX: "MX", MY: "MY", MZ: "MZ",
  NA: "AN",
  NG: "NE", NH: "VU", NI: "NG", NL: "NL", NO: "NO", NP: "NP",
  NS: "SR", NU: "NI", NZ: "NZ",
  PA: "PY", PE: "PE", PK: "PK", PL: "PL", PM: "PA", PO: "PT",
  PP: "PG", PS: "PW", PU: "GW",
  QA: "QA",
  RO: "RO", RP: "PH", RS: "RU", RW: "RW",
  SA: "SA", SC: "KN", SE: "SC", SF: "ZA", SG: "SN", SI: "SI",
  SL: "SL", SN: "SG", SO: "SO", SP: "ES", SR: "RS", SS: "SS",
  SU: "SD", SW: "SE", SY: "SY", SZ: "CH",
  TD: "TT", TH: "TH", TI: "TJ", TN: "TO", TO: "TG", TS: "TN",
  TT: "TL", TU: "TR", TX: "TM", TZ: "TZ",
  UG: "UG", UK: "GB", UP: "UA", US: "US", UY: "UY", UZ: "UZ",
  VE: "VE", VM: "VN",
  WA: "NA", WE: "PS", WS: "WS", WZ: "SZ",
  YM: "YE",
  ZA: "ZM", ZI: "ZW",
  GL: "GL", MF: "YT", RE: "RE",
};

let cachedGeoJson: GeoJsonObject | null = null;
async function getGeoJson(): Promise<GeoJsonObject> {
  if (cachedGeoJson) return cachedGeoJson;
  const res = await fetch(
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
  );
  cachedGeoJson = (await res.json()) as GeoJsonObject;
  return cachedGeoJson;
}

function buildCountryLookup(countries: Country[]): Record<string, Country> {
  const lookup: Record<string, Country> = {};
  for (const c of countries) {
    const iso2 = FIPS_TO_ISO2[c.country_code] ?? c.country_code;
    lookup[iso2] = c;
  }
  return lookup;
}

const CLOSED_ISO2 = new Set(
  AIRSPACE_CLOSURES.filter((c) => c.severity === "closed").map((c) => c.iso2)
);
const RESTRICTED_ISO2 = new Set(
  AIRSPACE_CLOSURES.filter((c) => c.severity === "restricted").map((c) => c.iso2)
);

export default function LeafletMapComponent({
  countries,
  onCountryClick,
  selectedCountry,
  mode,
  safetyScores,
}: LeafletMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const geoJsonLayerRef = useRef<LeafletGeoJSON | null>(null);
  const flightLayerRef = useRef<LayerGroup | null>(null);
  const flightIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync so event handler closures always read the latest values
  const modeRef = useRef<MapMode>(mode);
  const safetyScoresRef = useRef<Record<string, number>>(safetyScores);
  const countriesRef = useRef<Country[]>(countries);
  const selectedCountryRef = useRef<Country | null>(selectedCountry);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { safetyScoresRef.current = safetyScores; }, [safetyScores]);
  useEffect(() => { countriesRef.current = countries; }, [countries]);
  useEffect(() => { selectedCountryRef.current = selectedCountry; }, [selectedCountry]);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    import("leaflet").then((L) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const map = L.map(containerRef.current!, {
        center: [20, 10],
        zoom: 2.5,
        minZoom: 2,
        maxZoom: 8,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      mapRef.current = map;

      // Build initial layer once map is ready
      buildLayer(L, map);
    });

    return () => {
      if (flightIntervalRef.current) clearInterval(flightIntervalRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Rebuild layer when data changes ───────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (mode === "safety" && Object.keys(safetyScores).length === 0) return;

    import("leaflet").then((L) => {
      if (!mapRef.current) return;
      buildLayer(L, mapRef.current);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, mode, safetyScores]);

  // ── Render flights ────────────────────────────────────────────────────────
  const renderFlights = useCallback(async () => {
    if (!mapRef.current) return;
    import("leaflet").then(async (L) => {
      const map = mapRef.current!;
      if (flightLayerRef.current) {
        flightLayerRef.current.remove();
        flightLayerRef.current = null;
      }

      let flights: LiveFlight[] = [];
      try { flights = await fetchLiveFlights(); } catch { return; }

      const canvas = L.canvas({ padding: 0.5 });
      const markers = flights.map((f) =>
        L.circleMarker([f.latitude, f.longitude], {
          renderer: canvas,
          radius: 1.5,
          color: "#60a5fa",
          fillColor: "#93c5fd",
          fillOpacity: 0.85,
          weight: 0,
        }).bindTooltip(
          `<div class="font-medium">${f.callsign || f.icao24}</div>
           <div class="text-xs text-gray-400">${f.origin_country}</div>
           <div class="text-xs">Alt: ${Math.round(f.altitude)}m</div>`,
          { className: "geopulse-tooltip", sticky: true }
        )
      );
      const layer = L.layerGroup(markers);
      layer.addTo(map);
      flightLayerRef.current = layer;
    });
  }, []);

  // ── Core layer builder — reads from refs so it's always current ───────────
  function buildLayer(L: typeof import("leaflet"), map: LeafletMap) {
    // Clean up old layers
    if (geoJsonLayerRef.current) { geoJsonLayerRef.current.remove(); geoJsonLayerRef.current = null; }
    if (flightLayerRef.current)  { flightLayerRef.current.remove();  flightLayerRef.current = null;  }
    if (flightIntervalRef.current) { clearInterval(flightIntervalRef.current); flightIntervalRef.current = null; }

    getGeoJson().then((geojson) => {
      const currentMode = modeRef.current;
      const currentSafety = safetyScoresRef.current;
      const currentCountries = countriesRef.current;
      const lookup = buildCountryLookup(currentCountries);

      const layer = L.geoJSON(geojson, {
        style: (feature) => {
          const iso2: string = feature?.properties?.["ISO3166-1-Alpha-2"] ?? "";
          return getFeatureStyle(iso2, lookup, currentMode, currentSafety, selectedCountryRef.current);
        },
        onEachFeature: (feature, featureLayer) => {
          const iso2: string = feature?.properties?.["ISO3166-1-Alpha-2"] ?? "";

          featureLayer.on("mouseover", () => {
            // Always read latest values from refs
            const latestLookup = buildCountryLookup(countriesRef.current);
            const country = latestLookup[iso2];
            const el = featureLayer as unknown as { setStyle: (s: object) => void };
            el.setStyle({ fillOpacity: 0.9 });
            featureLayer
              .bindTooltip(
                buildTooltip(iso2, country, modeRef.current, safetyScoresRef.current, feature),
                { className: "geopulse-tooltip", sticky: true }
              )
              .openTooltip();
          });

          featureLayer.on("mouseout", () => {
            const latestLookup = buildCountryLookup(countriesRef.current);
            const el = featureLayer as unknown as { setStyle: (s: object) => void };
            const style = getFeatureStyle(iso2, latestLookup, modeRef.current, safetyScoresRef.current, selectedCountryRef.current);
            el.setStyle({ fillOpacity: style.fillOpacity });
            featureLayer.closeTooltip();
          });

          featureLayer.on("click", () => {
            const latestLookup = buildCountryLookup(countriesRef.current);
            const country = latestLookup[iso2];
            if (country) onCountryClick(country);
          });
        },
      });

      layer.addTo(map);
      geoJsonLayerRef.current = layer;

      if (currentMode === "travel") {
        renderFlights();
        flightIntervalRef.current = setInterval(renderFlights, 60_000);
      }
    });
  }

  // ── Re-style on selection change ──────────────────────────────────────────
  useEffect(() => {
    if (!geoJsonLayerRef.current) return;
    const lookup = buildCountryLookup(countries);
    geoJsonLayerRef.current.eachLayer((featureLayer) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const iso2: string = (featureLayer as any).feature?.properties?.["ISO3166-1-Alpha-2"] ?? "";
      const style = getFeatureStyle(iso2, lookup, mode, safetyScores, selectedCountry);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (featureLayer as any).setStyle(style);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>{`
        .geopulse-tooltip {
          background: #161b27;
          border: 1px solid #1e2533;
          border-radius: 6px;
          color: #f3f4f6;
          font-size: 12px;
          padding: 6px 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .geopulse-tooltip::before { display: none; }
        .leaflet-container { background: #0a0d14; }
        .leaflet-control-zoom a {
          background: #161b27 !important;
          color: #9ca3af !important;
          border-color: #1e2533 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #1e2533 !important;
          color: #f3f4f6 !important;
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full" />
    </>
  );
}

// ── Style helper ──────────────────────────────────────────────────────────────

function getFeatureStyle(
  iso2: string,
  lookup: Record<string, Country>,
  mode: MapMode,
  safetyScores: Record<string, number>,
  selectedCountry: Country | null
) {
  const country = lookup[iso2];
  const isSelected =
    selectedCountry != null &&
    iso2 === (FIPS_TO_ISO2[selectedCountry.country_code] ?? selectedCountry.country_code);

  const base = { weight: isSelected ? 2 : 0.5, color: isSelected ? "#ffffff" : "#1e2533" };

  if (mode === "geopolitical") {
    return country
      ? { ...base, fillColor: getRiskColorHex(country.risk_score), fillOpacity: isSelected ? 0.9 : 0.65 }
      : { ...base, fillColor: "#1e2533", fillOpacity: 0.4 };
  }

  if (mode === "safety") {
    const score = safetyScores[iso2];
    return score !== undefined
      ? { ...base, fillColor: getSafetyColor(score), fillOpacity: isSelected ? 0.9 : 0.65 }
      : { ...base, fillColor: "#1e2533", fillOpacity: 0.4 };
  }

  if (mode === "travel") {
    const advisory = TRAVEL_ADVISORIES[iso2];
    const level = advisory?.level ?? 1;
    const fillColor = ADVISORY_COLORS[level];
    const fillOpacity = level === 1 ? 0.35 : isSelected ? 0.9 : 0.65;

    if (CLOSED_ISO2.has(iso2)) {
      return { fillColor, fillOpacity, color: "#ef4444", weight: 2.5, dashArray: "6 3" };
    }
    if (RESTRICTED_ISO2.has(iso2)) {
      return { fillColor, fillOpacity, color: "#f97316", weight: 2, dashArray: "5 4" };
    }
    return { ...base, fillColor, fillOpacity };
  }

  return { ...base, fillColor: "#1e2533", fillOpacity: 0.4 };
}

// ── Tooltip builder ───────────────────────────────────────────────────────────

function buildTooltip(
  iso2: string,
  country: Country | undefined,
  mode: MapMode,
  safetyScores: Record<string, number>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feature: any
): string {
  const name = country?.country_name ?? feature?.properties?.name ?? iso2;

  if (mode === "geopolitical") {
    return country
      ? `<div class="font-medium">${name}</div><div class="text-xs">Risk: ${country.risk_score}/100</div>`
      : `<div class="font-medium">${name}</div><div class="text-xs text-gray-500">No data</div>`;
  }

  if (mode === "safety") {
    const score = safetyScores[iso2];
    return score !== undefined
      ? `<div class="font-medium">${name}</div><div class="text-xs">Safety: ${score}/100 — ${getSafetyLabel(score)}</div>`
      : `<div class="font-medium">${name}</div><div class="text-xs text-gray-500">No data</div>`;
  }

  if (mode === "travel") {
    const advisory = TRAVEL_ADVISORIES[iso2];
    const level = advisory?.level ?? 1;
    const closure = AIRSPACE_CLOSURES.find((c) => c.iso2 === iso2);

    let html = `<div class="font-medium">${name}</div>
                <div class="text-xs">Level ${level}: ${ADVISORY_LABELS[level]}</div>`;
    if (advisory?.reason) html += `<div class="text-xs text-gray-400">${advisory.reason}</div>`;
    if (closure) {
      const badge = closure.severity === "closed" ? "🚫 Airspace Closed" : "⚠️ Airspace Restricted";
      html += `<div class="text-xs mt-1">${badge}: ${closure.reason}</div>`;
    }
    return html;
  }

  return `<div class="font-medium">${name}</div>`;
}
