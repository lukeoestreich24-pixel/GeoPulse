// Military data layer — conflict zones, bases, live military aircraft
// Aircraft source: adsb.lol/v2/mil (free, no API key, military-squawk filtered)

export interface ConflictZone {
  id: string;
  name: string;
  status: "active-war" | "high-tension" | "occupation";
  description: string;
  // Bounding box [south, west, north, east] for the overlay rectangle
  bounds: [number, number, number, number];
  color: string;
}

export interface MilitaryBase {
  id: string;
  name: string;
  country: string;
  operator: "US" | "NATO" | "Russia" | "China" | "Other";
  lat: number;
  lng: number;
  type: "airbase" | "naval" | "army" | "joint";
  personnel?: string;
}

export interface MilitaryAircraft {
  icao24: string;
  callsign: string;
  country: string;
  lat: number;
  lng: number;
  altitude: number;
  heading: number;
  speed: number;
}

// ── Active conflict zones ─────────────────────────────────────────────────────
export const CONFLICT_ZONES: ConflictZone[] = [
  {
    id: "ukraine",
    name: "Ukraine War",
    status: "active-war",
    description: "Russia–Ukraine armed conflict. Active front lines in eastern and southern Ukraine.",
    bounds: [44.0, 22.0, 52.5, 40.5],
    color: "#ef4444",
  },
  {
    id: "gaza",
    name: "Gaza Conflict",
    status: "active-war",
    description: "Israel–Hamas armed conflict. Active operations in Gaza Strip.",
    bounds: [31.2, 34.2, 31.6, 34.6],
    color: "#ef4444",
  },
  {
    id: "sudan",
    name: "Sudan Civil War",
    status: "active-war",
    description: "SAF vs RSF armed conflict. Heavy fighting in Khartoum, Darfur, and Kordofan.",
    bounds: [10.0, 22.0, 20.0, 38.0],
    color: "#ef4444",
  },
  {
    id: "myanmar",
    name: "Myanmar Civil War",
    status: "active-war",
    description: "Junta vs resistance forces. Multi-front conflict across most of the country.",
    bounds: [10.0, 92.0, 28.5, 101.5],
    color: "#ef4444",
  },
  {
    id: "yemen",
    name: "Yemen Conflict",
    status: "active-war",
    description: "Houthi forces vs Saudi-led coalition. Active airstrikes and ground conflict.",
    bounds: [12.0, 42.5, 19.0, 54.0],
    color: "#ef4444",
  },
  {
    id: "somalia",
    name: "Somalia — Al-Shabaab",
    status: "active-war",
    description: "AMISOM/SNA vs Al-Shabaab. Ongoing insurgency across southern Somalia.",
    bounds: [-1.5, 40.5, 12.0, 51.5],
    color: "#ef4444",
  },
  {
    id: "sahel",
    name: "Sahel Insurgency",
    status: "active-war",
    description: "Jihadist insurgencies in Mali, Burkina Faso, Niger. Multiple active fronts.",
    bounds: [10.0, -6.0, 21.0, 16.0],
    color: "#ef4444",
  },
  {
    id: "drc",
    name: "DRC — M23 Conflict",
    status: "active-war",
    description: "M23/Rwanda-backed forces vs DRC army. Active in North Kivu.",
    bounds: [-5.0, 27.0, 2.0, 31.0],
    color: "#ef4444",
  },
  {
    id: "taiwan-strait",
    name: "Taiwan Strait Tensions",
    status: "high-tension",
    description: "PRC military exercises and incursions. Elevated risk of escalation.",
    bounds: [22.0, 118.0, 27.0, 123.0],
    color: "#f97316",
  },
  {
    id: "south-china-sea",
    name: "South China Sea",
    status: "high-tension",
    description: "China vs Philippines/Vietnam/others. Contested maritime territory.",
    bounds: [3.0, 109.0, 22.0, 121.0],
    color: "#f97316",
  },
  {
    id: "korea",
    name: "Korean Peninsula",
    status: "high-tension",
    description: "DPRK missile tests and military provocations. Ongoing armistice.",
    bounds: [34.5, 124.0, 42.5, 130.5],
    color: "#f97316",
  },
  {
    id: "kashmir",
    name: "Kashmir",
    status: "high-tension",
    description: "India–Pakistan disputed territory. Regular exchanges of fire along LoC.",
    bounds: [32.0, 73.0, 37.5, 78.5],
    color: "#f97316",
  },
  {
    id: "west-bank",
    name: "West Bank",
    status: "occupation",
    description: "Israeli military operations in the occupied West Bank.",
    bounds: [31.3, 34.9, 32.6, 35.6],
    color: "#eab308",
  },
  {
    id: "nagorno",
    name: "Nagorno-Karabakh",
    status: "occupation",
    description: "Azerbaijani control following 2023 offensive. Ethnic Armenian displacement.",
    bounds: [39.0, 45.5, 40.5, 47.5],
    color: "#eab308",
  },
];

// ── Major military bases ──────────────────────────────────────────────────────
export const MILITARY_BASES: MilitaryBase[] = [
  // US bases
  { id: "ramstein",    name: "Ramstein AB",           country: "Germany",      operator: "US",     lat: 49.44,  lng: 7.60,    type: "airbase",  personnel: "50,000+" },
  { id: "incirlik",    name: "Incirlik AB",            country: "Turkey",       operator: "US",     lat: 37.00,  lng: 35.43,   type: "airbase",  personnel: "5,000" },
  { id: "kadena",      name: "Kadena AB",              country: "Japan",        operator: "US",     lat: 26.35,  lng: 127.77,  type: "airbase",  personnel: "18,000" },
  { id: "camp-humphreys", name: "Camp Humphreys",      country: "South Korea",  operator: "US",     lat: 36.96,  lng: 126.99,  type: "army",     personnel: "36,000+" },
  { id: "diego-garcia", name: "Diego Garcia",          country: "BIOT",         operator: "US",     lat: -7.32,  lng: 72.41,   type: "joint",    personnel: "3,000" },
  { id: "al-udeid",    name: "Al Udeid AB",            country: "Qatar",        operator: "US",     lat: 25.12,  lng: 51.31,   type: "airbase",  personnel: "10,000" },
  { id: "al-dhafra",   name: "Al Dhafra AB",           country: "UAE",          operator: "US",     lat: 24.25,  lng: 54.55,   type: "airbase",  personnel: "5,000" },
  { id: "camp-lemonnier", name: "Camp Lemonnier",      country: "Djibouti",     operator: "US",     lat: 11.55,  lng: 43.16,   type: "joint",    personnel: "4,000" },
  { id: "yokosuka",    name: "Yokosuka Naval Base",    country: "Japan",        operator: "US",     lat: 35.29,  lng: 139.67,  type: "naval",    personnel: "20,000" },
  { id: "guam-ab",     name: "Andersen AFB",           country: "Guam",         operator: "US",     lat: 13.58,  lng: 144.93,  type: "airbase",  personnel: "5,000" },
  { id: "aviano",      name: "Aviano AB",              country: "Italy",        operator: "US",     lat: 46.03,  lng: 12.60,   type: "airbase",  personnel: "5,000" },
  { id: "sigonella",   name: "NAS Sigonella",          country: "Italy",        operator: "US",     lat: 37.40,  lng: 14.92,   type: "naval",    personnel: "4,500" },
  { id: "rota",        name: "Naval Station Rota",     country: "Spain",        operator: "US",     lat: 36.64,  lng: -6.35,   type: "naval",    personnel: "4,000" },
  { id: "osan",        name: "Osan AB",                country: "South Korea",  operator: "US",     lat: 37.09,  lng: 127.03,  type: "airbase",  personnel: "10,000" },
  { id: "manama",      name: "NSA Bahrain",            country: "Bahrain",      operator: "US",     lat: 26.23,  lng: 50.59,   type: "naval",    personnel: "7,000" },
  // Russian bases
  { id: "hmeimim",     name: "Hmeimim AB",             country: "Syria",        operator: "Russia", lat: 35.40,  lng: 35.95,   type: "airbase" },
  { id: "tartus",      name: "Tartus Naval Base",      country: "Syria",        operator: "Russia", lat: 34.90,  lng: 35.87,   type: "naval" },
  { id: "kant",        name: "Kant AB",                country: "Kyrgyzstan",   operator: "Russia", lat: 42.85,  lng: 74.85,   type: "airbase" },
  { id: "gyumri",      name: "102nd Military Base",    country: "Armenia",      operator: "Russia", lat: 40.79,  lng: 43.85,   type: "army" },
  { id: "sebastopol",  name: "Sevastopol Fleet HQ",    country: "Ukraine",      operator: "Russia", lat: 44.62,  lng: 33.53,   type: "naval" },
  // Chinese bases
  { id: "djibouti-cn", name: "PLA Support Base",       country: "Djibouti",     operator: "China",  lat: 11.52,  lng: 43.01,   type: "naval" },
  { id: "woody-island", name: "Woody Island",          country: "S. China Sea", operator: "China",  lat: 16.84,  lng: 112.34,  type: "airbase" },
  { id: "fiery-cross",  name: "Fiery Cross Reef",      country: "S. China Sea", operator: "China",  lat: 9.55,   lng: 114.22,  type: "airbase" },
  { id: "mischief",    name: "Mischief Reef",          country: "S. China Sea", operator: "China",  lat: 9.91,   lng: 115.53,  type: "joint" },
  // NATO bases
  { id: "mons",        name: "SHAPE HQ",               country: "Belgium",      operator: "NATO",   lat: 50.45,  lng: 3.96,    type: "joint" },
  { id: "brunssum",    name: "JFC Brunssum",           country: "Netherlands",  operator: "NATO",   lat: 50.95,  lng: 5.97,    type: "joint" },
  { id: "naples-nato", name: "JFC Naples",             country: "Italy",        operator: "NATO",   lat: 40.92,  lng: 14.32,   type: "joint" },
];

// Operator colors
export const BASE_COLORS: Record<MilitaryBase["operator"], string> = {
  US:     "#3b82f6",
  NATO:   "#8b5cf6",
  Russia: "#ef4444",
  China:  "#f97316",
  Other:  "#6b7280",
};

// ── Live military aircraft via adsb.lol ──────────────────────────────────────
let cachedMilAircraft: MilitaryAircraft[] | null = null;
let milFetchedAt = 0;
const MIL_CACHE_MS = 30_000; // refresh every 30s

export async function fetchMilitaryAircraft(): Promise<MilitaryAircraft[]> {
  const now = Date.now();
  if (cachedMilAircraft && now - milFetchedAt < MIL_CACHE_MS) {
    return cachedMilAircraft;
  }

  try {
    // adsb.lol /v2/mil returns military-registered aircraft worldwide, no key needed
    const res = await fetch("https://api.adsb.lol/v2/mil", {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`adsb.lol: ${res.status}`);
    const data = await res.json();

    const aircraft: MilitaryAircraft[] = (data.ac || [])
      .filter((a: Record<string, unknown>) =>
        typeof a.lat === "number" &&
        typeof a.lon === "number" &&
        a.lat !== 0 && a.lon !== 0
      )
      .map((a: Record<string, unknown>) => ({
        icao24:   (a.hex as string) ?? "",
        callsign: ((a.flight as string) ?? "").trim() || (a.hex as string),
        country:  (a.ownOp as string) ?? (a.r as string) ?? "",
        lat:      a.lat as number,
        lng:      a.lon as number,
        altitude: (a.alt_baro as number) ?? 0,
        heading:  (a.track as number) ?? 0,
        speed:    (a.gs as number) ?? 0,
      }));

    cachedMilAircraft = aircraft;
    milFetchedAt = now;
    return aircraft;
  } catch {
    return cachedMilAircraft ?? [];
  }
}
