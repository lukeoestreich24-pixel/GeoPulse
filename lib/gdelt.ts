// GDELT CAMEO root codes for geopolitical risk events only
const RELEVANT_ROOT_CODES = [
  "13", // Threaten
  "14", // Protest
  "15", // Exhibit force
  "17", // Coerce
  "18", // Assault
  "19", // Fight
  "20", // Engage in unconventional mass violence
];

// Block known entertainment/lifestyle/non-news domains
const BLOCKED_DOMAINS = [
  "imdb.com", "rottentomatoes.com", "variety.com", "hollywood",
  "entertainment", "celebrity", "gossip", "sport", "football",
  "soccer", "nba.com", "nfl.com", "music", "lyrics", "recipe",
  "cooking", "fashion", "beauty", "lifestyle", "travel", "tourism",
  "weather.com", "horoscope", "astrology", "gaming", "anime",
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

  // Process all rows but apply strict filters
  const maxLines = Math.min(lines.length, 800);

  for (let i = 0; i < maxLines; i++) {
    const line = lines[i];
    const cols = line.split("\t");
    if (cols.length < 58) continue;

    const eventCode = cols[COL.EVENTCODE]?.trim();
    if (!eventCode) continue;

    // Only keep relevant CAMEO root codes
    const rootCode = eventCode.substring(0, 2);
    if (!RELEVANT_ROOT_CODES.includes(rootCode)) continue;

    const goldstein = parseFloat(cols[COL.GOLDSTEINSCALE]);
    if (isNaN(goldstein)) continue;

    // Only keep significantly destabilizing events (below -3)
    if (goldstein > -3) continue;

    const sourceUrl = cols[COL.SOURCEURL]?.trim();
    if (!sourceUrl) continue;

    // Block non-news sources
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

    // Intensity: Goldstein -10 → 100, -3 → 30
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
  if (code.startsWith("15")) return "force";
  if (code.startsWith("14")) return "protest";
  if (code.startsWith("13")) return "threat";
  return "other";
}

// Recalibrated risk score formula
// Designed so:
// - 1-2 serious events = 20-30 (low risk)
// - 5-10 events = 50-70 (medium-high risk)  
// - 15+ events with high intensity = 90-100 (critical)
export function calculateRiskScore(
  eventsLast48h: number,
  avgIntensity: number
): number {
  // Log scale for events so each additional event matters less at high counts
  const eventScore = Math.min(70, Math.log1p(eventsLast48h) * 20);
  // Intensity on a 0-30 scale
  const intensityScore = Math.min(30, (avgIntensity / 10) * 30);
  return Math.min(100, Math.round(eventScore + intensityScore));
}
// Note: calculateRiskScore is already defined above

