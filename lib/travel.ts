// Travel advisory levels, airspace closures, and live flight data
// Advisory data based on US State Dept levels (ISO2 codes)

export type AdvisoryLevel = 1 | 2 | 3 | 4;

export interface TravelAdvisory {
  level: AdvisoryLevel;
  reason: string;
}

export interface AirspaceClosure {
  iso2: string;
  name: string;
  reason: string;
  severity: "closed" | "restricted";
}

export interface LiveFlight {
  icao24: string;
  callsign: string;
  origin_country: string;
  longitude: number;
  latitude: number;
  altitude: number;
  heading: number;
}

export const ADVISORY_COLORS: Record<AdvisoryLevel, string> = {
  1: "#22c55e",  // green  — Exercise Normal Precautions
  2: "#eab308",  // yellow — Exercise Increased Caution
  3: "#f97316",  // orange — Reconsider Travel
  4: "#ef4444",  // red    — Do Not Travel
};

export const ADVISORY_LABELS: Record<AdvisoryLevel, string> = {
  1: "Exercise Normal Precautions",
  2: "Exercise Increased Caution",
  3: "Reconsider Travel",
  4: "Do Not Travel",
};

// US State Dept travel advisory levels by ISO2 code.
// Countries not listed are assumed Level 1 (Normal).
export const TRAVEL_ADVISORIES: Record<string, TravelAdvisory> = {
  // ── Level 4: Do Not Travel ─────────────────────────────────────
  AF: { level: 4, reason: "Terrorism, armed conflict" },
  BY: { level: 4, reason: "Arbitrary arrest, civil unrest" },
  CF: { level: 4, reason: "Armed conflict, crime" },
  CD: { level: 4, reason: "Active armed conflict" },
  HT: { level: 4, reason: "Kidnapping, violent crime" },
  IQ: { level: 4, reason: "Terrorism, armed conflict" },
  IR: { level: 4, reason: "Terrorism, arbitrary arrest" },
  LY: { level: 4, reason: "Terrorism, armed conflict" },
  ML: { level: 4, reason: "Terrorism, armed conflict" },
  MM: { level: 4, reason: "Armed conflict, repression" },
  KP: { level: 4, reason: "Arbitrary detention, nuclear risk" },
  RU: { level: 4, reason: "Armed conflict, arbitrary arrest" },
  SO: { level: 4, reason: "Terrorism, piracy, armed conflict" },
  SS: { level: 4, reason: "Armed conflict, crime" },
  SD: { level: 4, reason: "Armed conflict, famine" },
  SY: { level: 4, reason: "Terrorism, armed conflict" },
  UA: { level: 4, reason: "Active war zone" },
  VE: { level: 4, reason: "Crime, civil unrest, arbitrary arrest" },
  YE: { level: 4, reason: "Terrorism, armed conflict" },

  // ── Level 3: Reconsider Travel ─────────────────────────────────
  BF: { level: 3, reason: "Terrorism, kidnapping" },
  BI: { level: 3, reason: "Armed conflict, crime" },
  CI: { level: 3, reason: "Crime, civil unrest" },
  CN: { level: 3, reason: "Arbitrary enforcement, surveillance" },
  EG: { level: 3, reason: "Terrorism" },
  ET: { level: 3, reason: "Armed conflict, civil unrest" },
  GN: { level: 3, reason: "Civil unrest, crime" },
  KE: { level: 3, reason: "Terrorism, crime" },
  LB: { level: 3, reason: "Terrorism, economic collapse" },
  MX: { level: 3, reason: "Cartel violence, kidnapping (varies by state)" },
  NE: { level: 3, reason: "Terrorism, armed conflict" },
  NG: { level: 3, reason: "Terrorism, kidnapping, crime" },
  PK: { level: 3, reason: "Terrorism, civil unrest" },
  PS: { level: 3, reason: "Armed conflict" },
  TD: { level: 3, reason: "Terrorism, armed conflict" },
  TR: { level: 3, reason: "Terrorism" },
  UG: { level: 3, reason: "Crime, terrorism" },
  ZW: { level: 3, reason: "Crime, civil unrest" },

  // ── Level 2: Exercise Increased Caution ────────────────────────
  DZ: { level: 2, reason: "Terrorism" },
  AM: { level: 2, reason: "Regional conflict" },
  AZ: { level: 2, reason: "Regional conflict" },
  BD: { level: 2, reason: "Political unrest, terrorism" },
  BJ: { level: 2, reason: "Terrorism risk in north" },
  BR: { level: 2, reason: "Crime, civil unrest" },
  CM: { level: 2, reason: "Armed conflict in northwest" },
  CO: { level: 2, reason: "Crime, armed groups" },
  CG: { level: 2, reason: "Crime, political instability" },
  DJ: { level: 2, reason: "Terrorism" },
  EC: { level: 2, reason: "Crime, cartel violence" },
  GE: { level: 2, reason: "Russian occupation concerns" },
  GH: { level: 2, reason: "Terrorism risk in north" },
  GQ: { level: 2, reason: "Political repression" },
  GT: { level: 2, reason: "Crime, gang violence" },
  HN: { level: 2, reason: "Crime" },
  ID: { level: 2, reason: "Terrorism" },
  IN: { level: 2, reason: "Terrorism in border regions" },
  JM: { level: 2, reason: "Crime, gang violence" },
  JO: { level: 2, reason: "Terrorism" },
  KH: { level: 2, reason: "Political repression" },
  KG: { level: 2, reason: "Civil unrest" },
  LA: { level: 2, reason: "Crime" },
  LK: { level: 2, reason: "Economic instability, civil unrest" },
  MA: { level: 2, reason: "Terrorism" },
  MG: { level: 2, reason: "Crime" },
  MR: { level: 2, reason: "Terrorism" },
  MW: { level: 2, reason: "Crime" },
  MZ: { level: 2, reason: "Terrorism in north" },
  NA: { level: 2, reason: "Crime" },
  NP: { level: 2, reason: "Political unrest" },
  PE: { level: 2, reason: "Crime, social unrest" },
  PH: { level: 2, reason: "Terrorism, crime" },
  RW: { level: 2, reason: "Political repression" },
  SL: { level: 2, reason: "Crime" },
  SN: { level: 2, reason: "Political unrest" },
  TG: { level: 2, reason: "Political unrest" },
  TH: { level: 2, reason: "Political unrest" },
  TJ: { level: 2, reason: "Security concerns" },
  TM: { level: 2, reason: "Political repression" },
  TN: { level: 2, reason: "Terrorism" },
  TZ: { level: 2, reason: "Crime, terrorism risk" },
  UZ: { level: 2, reason: "Civil unrest" },
  VN: { level: 2, reason: "Legal and entry restrictions" },
  ZA: { level: 2, reason: "Crime" },
  ZM: { level: 2, reason: "Crime" },
};

// Known active airspace closures and restrictions (as of 2025-2026)
export const AIRSPACE_CLOSURES: AirspaceClosure[] = [
  { iso2: "UA", name: "Ukraine",             reason: "Active conflict — ICAO NOTAM active",       severity: "closed" },
  { iso2: "RU", name: "Russia",              reason: "EU/UK/US/Canada overflight ban",             severity: "closed" },
  { iso2: "BY", name: "Belarus",             reason: "EU airspace ban since 2021",                 severity: "closed" },
  { iso2: "SD", name: "Sudan",               reason: "Active conflict",                            severity: "closed" },
  { iso2: "YE", name: "Yemen",               reason: "Active conflict",                            severity: "closed" },
  { iso2: "SY", name: "Syria",               reason: "Active conflict",                            severity: "closed" },
  { iso2: "KP", name: "North Korea",         reason: "Restricted sovereign airspace",              severity: "closed" },
  { iso2: "AF", name: "Afghanistan",         reason: "Security concerns, Taliban control",         severity: "restricted" },
  { iso2: "LY", name: "Libya",               reason: "Civil conflict, NOTAM restrictions",         severity: "restricted" },
  { iso2: "MM", name: "Myanmar",             reason: "Civil conflict, sanctions",                  severity: "restricted" },
  { iso2: "IR", name: "Iran",                reason: "Security concerns, US sanctions",            severity: "restricted" },
  { iso2: "SO", name: "Somalia",             reason: "Security concerns",                          severity: "restricted" },
  { iso2: "ML", name: "Mali",                reason: "Security concerns",                          severity: "restricted" },
  { iso2: "CF", name: "Cent. African Rep.",  reason: "Active conflict",                            severity: "restricted" },
  { iso2: "SS", name: "South Sudan",         reason: "Security concerns",                          severity: "restricted" },
  { iso2: "IQ", name: "Iraq (northern)",     reason: "Partial flight restrictions",                severity: "restricted" },
];

// Module-level cache to avoid re-fetching within the same session
let cachedFlights: LiveFlight[] | null = null;
let flightFetchedAt = 0;
const FLIGHT_CACHE_MS = 60 * 1000; // refresh every 60s

export async function fetchLiveFlights(): Promise<LiveFlight[]> {
  const now = Date.now();
  if (cachedFlights && now - flightFetchedAt < FLIGHT_CACHE_MS) {
    return cachedFlights;
  }

  try {
    const res = await fetch("https://opensky-network.org/api/states/all", {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`OpenSky API: ${res.status}`);
    const data = await res.json();

    // OpenSky state vector columns:
    // [0] icao24, [1] callsign, [2] origin_country, [3] time_position,
    // [4] last_contact, [5] longitude, [6] latitude, [7] baro_altitude,
    // [8] on_ground, [9] velocity, [10] true_track, ...
    const flights: LiveFlight[] = (data.states || [])
      .filter((s: unknown[]) =>
        s[5] !== null &&
        s[6] !== null &&
        s[8] === false && // not on ground
        typeof s[7] === "number" &&
        (s[7] as number) > 1000 // above 1000m
      )
      .slice(0, 4000) // cap for rendering performance
      .map((s: unknown[]) => ({
        icao24: s[0] as string,
        callsign: ((s[1] as string) || "").trim(),
        origin_country: s[2] as string,
        longitude: s[5] as number,
        latitude: s[6] as number,
        altitude: s[7] as number,
        heading: (s[10] as number) || 0,
      }));

    cachedFlights = flights;
    flightFetchedAt = now;
    return flights;
  } catch {
    // Return stale cache if available, else empty
    return cachedFlights ?? [];
  }
}
