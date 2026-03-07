// World Bank Political Stability & Absence of Violence/Terrorism indicator
// Higher PV.EST = more stable. Range is roughly -3 (worst) to +2.5 (best).
// We normalize this to a 0-100 "danger baseline" where 100 = most dangerous.

const WB_INDICATOR = "PV.EST";
const WB_URL = `https://api.worldbank.org/v2/country/all/indicator/${WB_INDICATOR}?format=json&mrv=1&per_page=300`;

// Cache for 24 hours
let cache: { scores: Record<string, number>; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Normalize PV.EST (-3 to +2.5) → danger score (0 to 100)
// PV.EST = +2.5 → danger ≈ 0 (very safe)
// PV.EST = -3.0 → danger ≈ 100 (very dangerous)
function normalizePvEst(pvEst: number): number {
  const MIN = -3.0;
  const MAX = 2.5;
  const clamped = Math.max(MIN, Math.min(MAX, pvEst));
  return Math.round((1 - (clamped - MIN) / (MAX - MIN)) * 100);
}

export async function getBaselineDangerScores(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.scores;
  }

  try {
    const res = await fetch(WB_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`World Bank API error: ${res.status}`);

    const json = await res.json();
    // World Bank returns [metadata, data_array]
    const data: Array<{
      countryiso3code: string;
      country: { id: string; value: string };
      value: number | null;
    }> = json[1];

    if (!Array.isArray(data)) throw new Error("Unexpected World Bank response shape");

    const scores: Record<string, number> = {};
    for (const row of data) {
      if (row.value === null) continue;
      // country.id is the ISO2 code (e.g. "US", "GB")
      const iso2 = row.country?.id?.toUpperCase();
      if (!iso2 || iso2.length !== 2) continue;
      scores[iso2] = normalizePvEst(row.value);
    }

    cache = { scores, fetchedAt: now };
    return scores;
  } catch (err) {
    console.error("Failed to fetch World Bank baseline data:", err);
    // Return empty — caller should fall back to GDELT-only score
    return {};
  }
}

// Get a single country's danger baseline, with a neutral fallback of 50
export async function getCountryBaseline(iso2: string): Promise<number> {
  const scores = await getBaselineDangerScores();
  return scores[iso2.toUpperCase()] ?? 50;
}
