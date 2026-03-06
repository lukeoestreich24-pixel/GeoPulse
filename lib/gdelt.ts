// GDELT Event Codes we care about (military, conflict, sanctions, protest)
const RELEVANT_EVENT_CODES = [
  "19",  // Appeal for military force
  "20",  // Use unconventional mass violence
  "193", // Fight with small arms and light weapons
  "194", // Fight with artillery and tanks
  "195", // Employ aerial weapons
  "196", // Violate ceasefire
  "14",  // Protest
  "141", // Demonstrate or rally
  "142", // Conduct hunger strike
  "143", // Conduct strike or boycott
  "145", // Protest violently
  "17",  // Impose sanctions
  "171", // Impose embargo
  "172", // Impose blockade
  "18",  // Threaten
  "180", // Threaten
  "181", // Threaten non-force
  "182", // Threaten to boycott
  "185", // Threaten military
  "186", // Threaten to fight with small arms
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

// GDELT GKG / CSV feed uses tab-separated values
// We use the GDELT 2.0 events CSV (15-minute updates)
export async function fetchLatestGdeltEvents(): Promise<RawGdeltEvent[]> {
  // GDELT publishes a master CSV feed updated every 15 min
  // We fetch the latest file list from the GDELT 2.0 last update
  const lastUpdateUrl =
    "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";

  const listRes = await fetch(lastUpdateUrl, {
    next: { revalidate: 0 },
    cache: "no-store",
  });

  if (!listRes.ok) {
    throw new Error(`Failed to fetch GDELT update list: ${listRes.status}`);
  }

  const listText = await listRes.text();
  const lines = listText.trim().split("\n");

  // Find the export (events) CSV zip URL
  const exportLine = lines.find((l) => l.includes(".export.CSV.zip"));
  if (!exportLine) throw new Error("Could not find GDELT export CSV URL");

  // URL is the third field
  const csvZipUrl = exportLine.trim().split(" ")[2];

  // Fetch the zip
  const zipRes = await fetch(csvZipUrl, { cache: "no-store" });
  if (!zipRes.ok) {
    throw new Error(`Failed to fetch GDELT CSV: ${zipRes.status}`);
  }

  // Parse zipped CSV in memory using adm-zip
  const arrayBuffer = await zipRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const csvText = extractZip(buffer);

  return parseGdeltCsv(csvText);
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
// https://www.gdeltproject.org/data/documentation/GDELT-Event_Codebook-V2.0.pdf
const COL = {
  GLOBALEVENTID: 0,
  EVENTCODE: 26,
  GOLDSTEINSCALE: 30, // -10 to +10 (negative = destabilizing)
  ACTOR1COUNTRYCODE: 7,
  ACTOR2COUNTRYCODE: 17,
  ACTIONGEO_COUNTRYCODE: 51,
  SOURCEURL: 60,
  ACTIONGEO_LAT: 53,
  ACTIONGEO_LONG: 54,
};

function parseGdeltCsv(csv: string): RawGdeltEvent[] {
  const lines = csv.trim().split("\n");
  const results: RawGdeltEvent[] = [];

  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 61) continue;

    const eventCode = cols[COL.EVENTCODE]?.trim();
    if (!eventCode) continue;

    // Check if event code starts with any relevant code
    const isRelevant = RELEVANT_EVENT_CODES.some(
      (code) => eventCode === code || eventCode.startsWith(code)
    );
    if (!isRelevant) continue;

    const goldstein = parseFloat(cols[COL.GOLDSTEINSCALE]);
    if (isNaN(goldstein)) continue;

    // Only keep destabilizing events (negative Goldstein)
    if (goldstein >= 0) continue;

    const countryCode =
      cols[COL.ACTIONGEO_COUNTRYCODE]?.trim() ||
      cols[COL.ACTOR1COUNTRYCODE]?.trim();
    if (!countryCode || countryCode.length < 2) continue;

    const lat = parseFloat(cols[COL.ACTIONGEO_LAT]);
    const lng = parseFloat(cols[COL.ACTIONGEO_LONG]);
    if (isNaN(lat) || isNaN(lng)) continue;

    const sourceUrl = cols[COL.SOURCEURL]?.trim();
    if (!sourceUrl) continue;

    const eventId = cols[COL.GLOBALEVENTID]?.trim();
    if (!eventId) continue;

    // Normalize intensity: Goldstein -10 → intensity 10, 0 → intensity 0
    const intensityScore = Math.abs(goldstein) * 10; // 0–100

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
  if (code.startsWith("19") || code.startsWith("20")) return "conflict";
  if (code.startsWith("14")) return "protest";
  if (code.startsWith("17")) return "sanctions";
  if (code.startsWith("18")) return "threat";
  return "other";
}

// Calculate risk score per country from events in last 48 hours
export function calculateRiskScore(
  eventsLast48h: number,
  avgIntensity: number
): number {
  const raw = eventsLast48h * 5 + avgIntensity * 2;
  return Math.min(100, Math.round(raw));
}
