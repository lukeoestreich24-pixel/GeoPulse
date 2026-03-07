// GDELT Event root codes we care about (first 2 digits of CAMEO code)
const RELEVANT_ROOT_CODES = ["14", "17", "18", "19", "20"];

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

  const csvZipUrl = exportLine.trim().split(" ")[2];

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
    actor1country: firstCols[7],
    actiongeo_country: firstCols[53],
    lat: firstCols[56],
    lng: firstCols[57],
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
// https://www.gdeltproject.org/data/documentation/GDELT-Event_Codebook-V2.0.pdf
const COL = {
  GLOBALEVENTID: 0,
  EVENTCODE: 26,
  GOLDSTEINSCALE: 30,
  ACTOR1COUNTRYCODE: 7,
  ACTOR2COUNTRYCODE: 17,
  ACTIONGEO_COUNTRYCODE: 53,
  SOURCEURL: 60,
  ACTIONGEO_LAT: 56,
  ACTIONGEO_LONG: 57,
};

function parseGdeltCsv(csv: string): RawGdeltEvent[] {
  const lines = csv.trim().split("\n");
  const results: RawGdeltEvent[] = [];

  for (const line of lines) {
    const cols = line.split("\t");
    if (cols.length < 58) continue;

    const eventCode = cols[COL.EVENTCODE]?.trim();
    if (!eventCode) continue;

    const goldstein = parseFloat(cols[COL.GOLDSTEINSCALE]);
    if (isNaN(goldstein)) continue;

    // Only keep destabilizing events (negative Goldstein scale)
    if (goldstein >= -1) continue;

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

    // Normalize intensity: Goldstein -10 → intensity 100, -1 → intensity 10
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
