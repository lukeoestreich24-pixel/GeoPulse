// Fetches World Bank Rule of Law indicator (RL.EST) for all countries.
// RL.EST measures perceptions of the rule of law, property rights,
// police and courts quality — a good proxy for domestic safety/crime risk.
// Range: -2.5 (worst) to +2.5 (best). We normalize to 0-100 safety score.

let cachedSafetyScores: Record<string, number> | null = null;

export async function getSafetyScores(): Promise<Record<string, number>> {
  if (cachedSafetyScores) return cachedSafetyScores;

  try {
    const res = await fetch(
      "https://api.worldbank.org/v2/country/all/indicator/RL.EST?format=json&mrv=1&per_page=300",
      { cache: "default" }
    );
    if (!res.ok) throw new Error(`World Bank RL.EST: ${res.status}`);

    const json = await res.json();
    const data: Array<{ country: { id: string }; value: number | null }> = json[1];

    const scores: Record<string, number> = {};
    for (const row of data) {
      if (row.value === null) continue;
      const iso2 = row.country?.id?.toUpperCase();
      if (!iso2 || iso2.length !== 2) continue;
      // Normalize -2.5→+2.5 to 0→100 (100 = safest)
      const safety = Math.round(((row.value + 2.5) / 5) * 100);
      scores[iso2] = Math.max(0, Math.min(100, safety));
    }

    cachedSafetyScores = scores;
    return scores;
  } catch {
    return {};
  }
}

export function getSafetyLabel(score: number): string {
  if (score >= 80) return "Very Safe";
  if (score >= 60) return "Relatively Safe";
  if (score >= 40) return "Moderate Concerns";
  if (score >= 20) return "Significant Concerns";
  return "High Risk";
}

export function getSafetyColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#eab308";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}
