"use client";

import { useEffect, useRef } from "react";
import { Country, getRiskColorHex } from "@/types";

// Leaflet is loaded dynamically — types-only import is fine here
import type { Map as LeafletMap, CircleMarker } from "leaflet";

interface LeafletMapProps {
  countries: Country[];
  onCountryClick: (country: Country) => void;
  selectedCountry: Country | null;
}

export default function LeafletMapComponent({
  countries,
  onCountryClick,
  selectedCountry,
}: LeafletMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, CircleMarker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamically import Leaflet (client-only)
    import("leaflet").then((L) => {
      // Fix default marker icon path (broken in Webpack)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [20, 10],
        zoom: 2.5,
        minZoom: 2,
        maxZoom: 10,
        zoomControl: true,
        attributionControl: true,
      });

      // Dark tile layer (CartoDB Dark Matter — free, no token needed)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers whenever countries change
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      const map = mapRef.current!;

      // Remove old markers not in new data
      for (const [code, marker] of markersRef.current.entries()) {
        if (!countries.find((c) => c.country_code === code)) {
          marker.remove();
          markersRef.current.delete(code);
        }
      }

      // Add / update markers
      for (const country of countries) {
        const color = getRiskColorHex(country.risk_score);
        const radius = Math.max(6, Math.min(24, country.risk_score / 4));

        const existing = markersRef.current.get(country.country_code);

        if (existing) {
          existing.setStyle({ color, fillColor: color });
          existing.setRadius(radius);
        } else {
          const marker = L.circleMarker(
            [country.latitude, country.longitude],
            {
              radius,
              color,
              fillColor: color,
              fillOpacity: 0.5,
              weight: 1.5,
              opacity: 0.9,
            }
          );

          marker.on("click", () => onCountryClick(country));
          marker.on("mouseover", () => {
            marker.setStyle({ fillOpacity: 0.8 });
            marker
              .bindTooltip(
                `<div class="font-medium">${country.country_name}</div><div class="text-xs">Risk: ${country.risk_score}/100</div>`,
                { className: "geopulse-tooltip", sticky: true }
              )
              .openTooltip();
          });
          marker.on("mouseout", () => {
            marker.setStyle({ fillOpacity: 0.5 });
            marker.closeTooltip();
          });

          marker.addTo(map);
          markersRef.current.set(country.country_code, marker);
        }
      }
    });
  }, [countries, onCountryClick]);

  // Highlight selected country
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then(() => {
      for (const [code, marker] of markersRef.current.entries()) {
        const country = countries.find((c) => c.country_code === code);
        if (!country) continue;
        const isSelected = selectedCountry?.country_code === code;
        marker.setStyle({
          weight: isSelected ? 3 : 1.5,
          opacity: isSelected ? 1 : 0.9,
          fillOpacity: isSelected ? 0.8 : 0.5,
        });
      }
    });
  }, [selectedCountry, countries]);

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />

      {/* Tooltip styles injected inline */}
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
        .geopulse-tooltip::before {
          display: none;
        }
        .leaflet-tooltip-top.geopulse-tooltip::before {
          display: none;
        }
        .leaflet-container {
          background: #0f1117;
        }
        .leaflet-zoom-box {
          border-color: #3b82f6;
        }
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
