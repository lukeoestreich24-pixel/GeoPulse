// GDELT CAMEO root codes for geopolitical risk events only
// See: https://www.gdeltproject.org/data/documentation/CAMEO.Manual.1.1b3.pdf
const RELEVANT_ROOT_CODES = [
  // Diplomatic / political hostility
  "10", // Demand
  "11", // Disapprove
  "12", // Reject
  "13", // Threaten
  // Sanctions, tariffs, trade restrictions, embargoes
  "16", // Reduce relations (includes sanctions, tariffs, expulsions)
  // Force & violence
  "15", // Exhibit force posture
  "17", // Coerce
  "18", // Assault
  "19", // Fight
  "20", // Engage in unconventional mass violence
  // Protests & civil unrest
  "14", // Protest
];

// Goldstein score thresholds per category
// Diplomatic/economic events score closer to 0, violent events score -10
const GOLDSTEIN_THRESHOLD: Record<string, number> = {
  "10": -1,  // Demands
  "11": -1,  // Disapproval
  "12": -1,  // Rejection
  "13": -2,  // Threats
  "14": -2,  // Protests
  "15": -3,  // Force posture
  "16": -1,  // Sanctions/tariffs — typically score -1 to -4
  "17": -3,  // Coercion
  "18": -5,  // Assault
  "19": -7,  // Fighting
  "20": -8,  // Mass violence
};

// Block known entertainment/lifestyle/non-news domains
const BLOCKED_DOMAINS = [
  "imdb.com", "rottentomatoes.com", "variety.com",
  "tmz.com", "people.com", "eonline.com",
  "entertainment", "celebrity", "gossip",
  "nba.com", "nfl.com", "espn.com", "mlb.com", "fifa.com",
  "spotify.com", "lyrics", "genius.com",
  "recipe", "cooking", "allrecipes",
  "fashion", "vogue.com", "beauty",
  "tripadvisor", "booking.com", "airbnb",
  "weather.com", "horoscope", "astrology",
  "gaming", "ign.com", "steam", "anime",
  "obituar", "funeral", "wedding",
];

export interface RawGdeltEvent {
  country_code: string;
  event_type: string;
  intensity_score: number;
  latitude: number;
  longitude: number;
  source_url: string;
  event_id: string;
}

export async function fetchLatestGdeltEvents(): Promise<{ events: RawGdeltEvent[], debug: string }> {
  const lastUpdateUrl = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

  const listRes = await fetch(lastUpdateUrl, { cache: "no-store" });
  if (!listRes.ok) {
    throw new Error(`Failed to fetch GDELT update list: ${listRes.status}`);
  }

  const listText = await listRes.text();
  const lines = listText.trim().split("\n");

  const exportLine = lines.find((l) => l.includes(".export.CSV.zip"));
  if (!exportLine) throw new Error("Could not find GDELT export CSV URL");

  const parts = exportLine.trim().split(/\s+/);
  const csvZipUrl = parts[parts.length - 1];

  const zipRes = await fetch(csvZipUrl, { cache: "no-store" });
  if (!zipRes.ok) {
    throw new Error(`Failed to fetch GDELT CSV: ${zipRes.status}`);
  }

  const arrayBuffer = await zipRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const csvText = extractZip(buffer);

  const csvLines = csvText.split("\n");
  const firstLine = csvLines[0] || "";
  const firstCols = firstLine.split("\t");

  const debug = JSON.stringify({
    totalLines: csvLines.length,
    colCount: firstCols.length,
    eventcode: firstCols[26],
    goldstein: firstCols[30],
    actiongeo_country: firstCols[53],
    csvUrl: csvZipUrl,
  });

  const events = parseGdeltCsv(csvText);
  return { events, debug };
}

function extractZip(buffer: Buffer): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdmZip = require("adm-zip");
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (entries.length === 0) throw new Error("Empty zip file");
  return zip.readAsText(entries[0]);
}

// GDELT 2.0 event CSV columns (tab-separated, 61 columns)
const COL = {
  GLOBALEVENTID: 0,
  EVENTCODE: 26,
  GOLDSTEINSCALE: 30,
  ACTOR1COUNTRYCODE: 7,
  ACTIONGEO_COUNTRYCODE: 53,
  SOURCEURL: 60,
  ACTIONGEO_LAT: 56,
  ACTIONGEO_LONG: 57,
};

function isBlockedSource(url: string): boolean {
  const lower = url.toLowerCase();
  return BLOCKED_DOMAINS.some((domain) => lower.includes(domain));
}

function parseGdeltCsv(csv: string): RawGdeltEvent[] {
  const lines = csv.trim().split("\n");
  const results: RawGdeltEvent[] = [];

  const maxLines = Math.min(lines.length, 800);

  for (let i = 0; i < maxLines; i++) {
    const line = lines[i];
    const cols = line.split("\t");
    if (cols.length < 58) continue;

    const eventCode = cols[COL.EVENTCODE]?.trim();
    if (!eventCode) continue;

    const rootCode = eventCode.substring(0, 2);
    if (!RELEVANT_ROOT_CODES.includes(rootCode)) continue;

    const goldstein = parseFloat(cols[COL.GOLDSTEINSCALE]);
    if (isNaN(goldstein)) continue;

    const threshold = GOLDSTEIN_THRESHOLD[rootCode] ?? -2;
    if (goldstein > threshold) continue;

    const sourceUrl = cols[COL.SOURCEURL]?.trim();
    if (!sourceUrl) continue;

    if (isBlockedSource(sourceUrl)) continue;

    const countryCode =
      cols[COL.ACTIONGEO_COUNTRYCODE]?.trim() ||
      cols[COL.ACTOR1COUNTRYCODE]?.trim();
    if (!countryCode || countryCode.length !== 2) continue;

    const lat = parseFloat(cols[COL.ACTIONGEO_LAT]);
    const lng = parseFloat(cols[COL.ACTIONGEO_LONG]);
    if (isNaN(lat) || isNaN(lng)) continue;

    const eventId = cols[COL.GLOBALEVENTID]?.trim();
    if (!eventId) continue;

    const intensityScore = Math.min(100, Math.abs(goldstein) * 10);

    results.push({
      country_code: countryCode.toUpperCase(),
      event_type: mapEventCode(eventCode),
      intensity_score: intensityScore,
      latitude: lat,
      longitude: lng,
      source_url: sourceUrl,
      event_id: eventId,
    });
  }

  return results;
}

function mapEventCode(code: string): string {
  if (code.startsWith("20") || code.startsWith("19")) return "conflict";
  if (code.startsWith("18")) return "assault";
  if (code.startsWith("17")) return "coercion";
  if (code.startsWith("16")) return "sanctions";
  if (code.startsWith("15")) return "force";
  if (code.startsWith("14")) return "protest";
  if (code.startsWith("13")) return "threat";
  if (code.startsWith("12")) return "rejection";
  if (code.startsWith("11")) return "condemnation";
  if (code.startsWith("10")) return "demand";
  return "other";
}

/**
 * Blended risk score combining real-time GDELT events with a
 * World Bank political stability baseline.
 *
 * @param eventsLast48h  - number of relevant GDELT events in the last 48h
 * @param avgIntensity   - average intensity score of those events (0-100)
 * @param baselineDanger - World Bank danger baseline for this country (0-100)
 *                         where 0 = very safe, 100 = very dangerous
 *                         Defaults to 50 (neutral) if unavailable.
 *
 * Formula:
 *   gdeltScore    = log-scaled event count (0-70) + intensity component (0-30)
 *   finalScore    = (gdeltScore × 0.6) + (baselineDanger × 0.4)
 *
 * This means:
 *   - A safe country (US, baseline ~15) with moderate GDELT activity
 *     won't spike above ~45 just because it generates a lot of news
 *   - A chronically unstable country (Syria, baseline ~90) stays elevated
 *     even in quiet news cycles
 */
export function calculateRiskScore(
  eventsLast48h: number,
  avgIntensity: number,
  baselineDanger: number = 50
): number {
  const eventScore = Math.min(70, Math.log1p(eventsLast48h) * 20);
  const intensityScore = Math.min(30, (avgIntensity / 10) * 30);
  const gdeltScore = eventScore + intensityScore;

  const blended = gdeltScore * 0.6 + baselineDanger * 0.4;
  return Math.min(100, Math.round(blended));
}
