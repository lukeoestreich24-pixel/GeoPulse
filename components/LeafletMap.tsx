"use client";

import { useEffect, useRef } from "react";
import { Country, getRiskColorHex } from "@/types";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from "leaflet";
import type { GeoJsonObject } from "geojson";

interface LeafletMapProps {
  countries: Country[];
  onCountryClick: (country: Country) => void;
  selectedCountry: Country | null;
}

// FIPS to ISO2 mapping for GeoJSON matching
const FIPS_TO_ISO2: Record<string, string> = {
  AF: "AF", AG: "DZ", AJ: "AZ", AL: "AL", AM: "AM", AO: "AO", AR: "AR",
  AS: "AU", AU: "AT", BA: "BH", BC: "BW", BE: "BE", BG: "BD", BK: "BA",
  BL: "BO", BM: "MM", BN: "BJ", BO: "BY", BR: "BR", BT: "BT", BU: "BG",
  BX: "BN", BY: "BI", CA: "CA", CB: "KH", CD: "TD", CF: "CG", CG: "CD",
  CH: "CN", CI: "CL", CM: "CM", CO: "CO", CS: "CR", CT: "CF", CU: "CU",
  CV: "CV", CY: "CY", DA: "DK", DJ: "DJ", DR: "DO", EC: "EC", EG: "EG",
  EI: "IE", EK: "GQ", EN: "EE", ER: "ER", ES: "SV", ET: "ET", EZ: "CZ",
  FI: "FI", FJ: "FJ", FR: "FR", GA: "GM", GB: "GA", GG: "GE", GH: "GH",
  GM: "DE", GR: "GR", GT: "GT", GV: "GN", GY: "GY", HA: "HT", HN: "HN",
  HU: "HU", IC: "IS", ID: "ID", IN: "IN", IQ: "IQ", IR: "IR", IS: "IL",
  IT: "IT", IV: "CI", IZ: "IQ", JA: "JP", JM: "JM", JO: "JO", KE: "KE",
  KG: "KG", KN: "KP", KO: "KR", KU: "KW", KZ: "KZ", LA: "LA", LE: "LB",
  LG: "LV", LH: "LT", LI: "LR", LO: "SK", LS: "LI", LT: "LS", LU: "LU",
  LY: "LY", MA: "MG", MC: "MO", MD: "MD", MG: "MN", MI: "MW", MK: "MK",
  ML: "ML", MN: "MC", MO: "MA", MR: "MR", MT: "MT", MU: "OM", MV: "MV",
  MX: "MX", MY: "MY", MZ: "MZ", NG: "NE", NH: "VU", NI: "NG", NL: "NL",
  NO: "NO", NP: "NP", NS: "SR", NU: "NI", NZ: "NZ", PA: "PY", PE: "PE",
  PK: "PK", PL: "PL", PM: "PA", PO: "PT", PP: "PG", PS: "PW", PU: "GW",
  QA: "QA", RO: "RO", RP: "PH", RS: "RU", RW: "RW", SA: "SA", SF: "ZA",
  SG: "SN", SI: "SI", SL: "SL", SN: "SG", SO: "SO", SP: "ES", SR: "RS",
  SS: "SS", SU: "SD", SW: "SE", SY: "SY", SZ: "CH", TD: "TT", TH: "TH",
  TI: "TJ", TN: "TO", TO: "TG", TS: "TN", TT: "TL", TU: "TR", TX: "TM",
  TZ: "TZ", UG: "UG", UK: "GB", UP: "UA", US: "US", UY: "UY", UZ: "UZ",
  VE: "VE", VM: "VN", WA: "NA", WE: "PS", YM: "YE", ZA: "ZM", ZI: "ZW",
  GL: "GL", MF: "YT", RE: "RE",
};

// Cache GeoJSON so we don't re-fetch on every render
let cachedGeoJson: GeoJsonObject | null = null;

async function getGeoJson(): Promise<GeoJsonObject> {
  if (cachedGeoJson) return cachedGeoJson;
  const res = await fetch(
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
  );
  cachedGeoJson = (await res.json()) as GeoJsonObject;
  return cachedGeoJson;
}

export default function LeafletMapComponent({
  countries,
  onCountryClick,
  selectedCountry,
}: LeafletMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const geoJsonLayerRef = useRef<LeafletGeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build a lookup from ISO2 code to country data.
  // Falls back to using country_code directly if it's already ISO2
  // (i.e. not found in FIPS_TO_ISO2).
  const buildCountryLookup = (countries: Country[]) => {
    const lookup: Record<string, Country> = {};
    for (const c of countries) {
      const iso2 = FIPS_TO_ISO2[c.country_code] ?? c.country_code;
      lookup[iso2] = c;
    }
    return lookup;
  };

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
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || countries.length === 0) return;

    import("leaflet").then(async (L) => {
      const map = mapRef.current!;
      const lookup = buildCountryLookup(countries);

      // Remove old GeoJSON layer
      if (geoJsonLayerRef.current) {
        geoJsonLayerRef.current.remove();
        geoJsonLayerRef.current = null;
      }

      // Fetch (or use cached) world GeoJSON
      const geojson = await getGeoJson();

      const layer = L.geoJSON(geojson, {
        style: (feature) => {
          const iso2 = feature?.properties?.["ISO3166-1-Alpha-2"];
          const country = lookup[iso2];
          const isSelected =
            selectedCountry &&
            iso2 === (FIPS_TO_ISO2[selectedCountry.country_code] ?? selectedCountry.country_code);

          if (country) {
            const color = getRiskColorHex(country.risk_score);
            return {
              fillColor: color,
              fillOpacity: isSelected ? 0.85 : 0.6,
              color: isSelected ? "#ffffff" : "#1e2533",
              weight: isSelected ? 2 : 0.5,
            };
          }
          return {
            fillColor: "#1e2533",
            fillOpacity: 0.4,
            color: "#0f1117",
            weight: 0.5,
          };
        },
        onEachFeature: (feature, featureLayer) => {
          const iso2 = feature?.properties?.["ISO3166-1-Alpha-2"];
          const country = lookup[iso2];

          featureLayer.on("mouseover", () => {
            const el = featureLayer as unknown as { setStyle: (s: object) => void };
            if (country) {
              el.setStyle({ fillOpacity: 0.85 });
              featureLayer
                .bindTooltip(
                  `<div class="font-medium">${country.country_name}</div><div class="text-xs">Risk: ${country.risk_score}/100</div>`,
                  { className: "geopulse-tooltip", sticky: true }
                )
                .openTooltip();
            } else {
              el.setStyle({ fillOpacity: 0.6 });
              featureLayer
                .bindTooltip(
                  `<div class="font-medium">${feature.properties?.name || iso2}</div><div class="text-xs text-gray-500">No data</div>`,
                  { className: "geopulse-tooltip", sticky: true }
                )
                .openTooltip();
            }
          });

          featureLayer.on("mouseout", () => {
            const el = featureLayer as unknown as { setStyle: (s: object) => void };
            el.setStyle({
              fillOpacity: country ? 0.6 : 0.4,
            });
            featureLayer.closeTooltip();
          });

          featureLayer.on("click", () => {
            if (country) onCountryClick(country);
          });
        },
      });

      layer.addTo(map);
      geoJsonLayerRef.current = layer;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

  // Re-render layer styles when selected country changes
  useEffect(() => {
    if (!geoJsonLayerRef.current || !mapRef.current) return;
    import("leaflet").then(() => {
      geoJsonLayerRef.current?.resetStyle();
      geoJsonLayerRef.current?.eachLayer((featureLayer) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const feature = (featureLayer as any).feature;
        const iso2 = feature?.properties?.["ISO3166-1-Alpha-2"];
        const lookup = buildCountryLookup(countries);
        const country = lookup[iso2];
        const isSelected =
          selectedCountry &&
          iso2 === (FIPS_TO_ISO2[selectedCountry.country_code] ?? selectedCountry.country_code);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (featureLayer as any).setStyle(
          country
            ? {
                fillColor: getRiskColorHex(country.risk_score),
                fillOpacity: isSelected ? 0.85 : 0.6,
                color: isSelected ? "#ffffff" : "#1e2533",
                weight: isSelected ? 2 : 0.5,
              }
            : {
                fillColor: "#1e2533",
                fillOpacity: 0.4,
                color: "#0f1117",
                weight: 0.5,
              }
        );
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
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
