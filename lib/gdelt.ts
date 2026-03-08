// GDELT CAMEO root codes for geopolitical risk events only
// See: https://www.gdeltproject.org/data/documentation/CAMEO.Manual.1.1b3.pdf
//
// DELIBERATELY EXCLUDED:
//   10 (Demand), 11 (Disapprove), 12 (Reject) — far too broad, catches any
//   local politician calling on any other politician to do anything.
//   These only matter at Goldstein <= -5 which we handle via the threshold.
const RELEVANT_ROOT_CODES = [
  "13", // Threaten — explicit threats between state/military actors
  "14", // Protest — mass civil unrest, not lobbying
  "15", // Exhibit force posture — military mobilisation, blockades
  "16", // Reduce relations — sanctions, tariffs, expulsions, embargoes
  "17", // Coerce — ultimatums, blockades, seizures
  "18", // Assault — physical attacks
  "19", // Fight — armed clashes
  "20", // Mass violence — war crimes, genocide, terrorist attacks
];

// Goldstein score thresholds per root code.
// Higher (less negative) = more permissive. Lower = stricter.
const GOLDSTEIN_THRESHOLD: Record<string, number> = {
  "13": -3,  // Threats — only serious ones (not "calls on X to reconsider")
  "14": -3,  // Protests — only significant unrest
  "15": -4,  // Force posture — military movements
  "16": -2,  // Sanctions/tariffs — these legitimately score around -1 to -4
  "17": -4,  // Coercion
  "18": -6,  // Assault
  "19": -7,  // Fighting
  "20": -8,  // Mass violence
};

// Require at least one of these keywords in the source URL path for
// codes 13/14/16 which are most prone to false positives.
// This helps ensure we're getting hard news, not opinion or local politics.
const NEWS_KEYWORDS = [
  "war", "conflict", "sanction", "military", "attack", "bomb", "missile",
  "troops", "ceasefire", "tariff", "embargo", "expel", "protest", "strike",
  "riot", "coup", "nuclear", "terror", "threat", "crisis", "invasion",
  "blockade", "airstrike", "rebel", "insurgent", "diplomat", "geopolit",
];

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
  // Local/soft news that generates noise
  "thejournal.ie", "localnews", "townhall", "citycouncil",
  "electric", "charging", "ev-", "climate-policy", "housing",
  "healthcare", "nhs.", "transport", "infrastructure",
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
  if (!listRes.ok) throw new Error(`Failed to fetch GDELT update list: ${listRes.status}`);

  const listText = await listRes.text();
  const lines = listText.trim().split("\n");

  const exportLine = lines.find((l) => l.includes(".export.CSV.zip"));
  if (!exportLine) throw new Error("Could not find GDELT export CSV URL");

  const parts = exportLine.trim().split(/\s+/);
  const csvZipUrl = parts[parts.length - 1];

  const zipRes = await fetch(csvZipUrl, { cache: "no-store" });
  if (!zipRes.ok) throw new Error(`Failed to fetch GDELT CSV: ${zipRes.status}`);

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

// For noisier codes, require at least one geopolitical keyword in the URL
function isRelevantUrl(url: string, rootCode: string): boolean {
  if (!["13", "14", "16"].includes(rootCode)) return true;
  const lower = url.toLowerCase();
  return NEWS_KEYWORDS.some((kw) => lower.includes(kw));
}

function parseGdeltCsv(csv: string): RawGdeltEvent[] {
  const lines = csv.trim().split("\n");
  const results: RawGdeltEvent[] = [];
  const maxLines = Math.min(lines.length, 800);

  for (let i = 0; i < maxLines; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < 58) continue;

    const eventCode = cols[COL.EVENTCODE]?.trim();
    if (!eventCode) continue;

    const rootCode = eventCode.substring(0, 2);
    if (!RELEVANT_ROOT_CODES.includes(rootCode)) continue;

    const goldstein = parseFloat(cols[COL.GOLDSTEINSCALE]);
    if (isNaN(goldstein)) continue;

    const threshold = GOLDSTEIN_THRESHOLD[rootCode] ?? -3;
    if (goldstein > threshold) continue;

    const sourceUrl = cols[COL.SOURCEURL]?.trim();
    if (!sourceUrl) continue;
    if (isBlockedSource(sourceUrl)) continue;
    if (!isRelevantUrl(sourceUrl, rootCode)) continue;

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
  return "other";
}

/**
 * Blended risk score combining real-time GDELT events with a
 * World Bank political stability baseline.
 *
 * gdeltScore    = log-scaled event count (0-70) + intensity component (0-30)
 * finalScore    = (gdeltScore × 0.6) + (baselineDanger × 0.4)
 */
export function calculateRiskScore(
  eventsLast48h: number,
  avgIntensity: number,
  baselineDanger: number = 50
): number {
  const eventScore = Math.min(70, Math.log1p(eventsLast48h) * 20);
  const intensityScore = Math.min(30, (avgIntensity / 10) * 30);
  const gdeltScore = eventScore + intensityScore;
  return Math.min(100, Math.round(gdeltScore * 0.6 + baselineDanger * 0.4));
}
