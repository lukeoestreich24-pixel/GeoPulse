import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { fetchLatestGdeltEvents, calculateRiskScore, RawGdeltEvent } from "@/lib/gdelt";
import { getCountryInfo, COUNTRY_DATA } from "@/lib/countries";
import { getBaselineDangerScores } from "@/lib/baseline";

export const maxDuration = 60;

// FIPS to ISO2 — needed to look up World Bank scores which use ISO2
const FIPS_TO_ISO2: Record<string, string> = {
  AF: "AF", AG: "DZ", AJ: "AZ", AL: "AL", AM: "AM", AO: "AO", AR: "AR",
  AS: "AU", AU: "AT", BA: "BH", BC: "BW", BE: "BE", BG: "BD", BK: "BA",
  BL: "BO", BM: "MM", BN: "BJ", BO: "BY", BR: "BR", BT: "BT", BU: "BG",
  BX: "BN", BY: "BI", CA: "CA", CB: "KH", CD: "TD", CF: "CG", CG: "CD",
  CH: "CN", CI: "CL", CM: "CM", CO: "CO", CS: "CR", CT: "CF", CU: "CU",
  CV: "CV", CY: "CY", DA: "DK", DJ: "DJ", DR: "DO", EC: "EC", EG: "EG",
  EI: "IE", EK: "GQ", EN: "EE", ER: "ER", ES: "SV", ET: "ET", EZ: "CZ",
  FI: "FI", FJ: "FJ", FR: "FR", GA: "GM", GB: "GA", GG: "GE", GH: "GH",
  GM: "DE", GR: "GR", GT: "GT", GV: "GN", GY: "GY", HA: "HT", HN: "HN",
  HU: "HU", IC: "IS", ID: "ID", IN: "IN", IQ: "IQ", IR: "IR", IS: "IL",
  IT: "IT", IV: "CI", IZ: "IQ", JA: "JP", JM: "JM", JO: "JO", KE: "KE",
  KG: "KG", KN: "KP", KO: "KR", KU: "KW", KZ: "KZ", LA: "LA", LE: "LB",
  LG: "LV", LH: "LT", LI: "LR", LO: "SK", LS: "LI", LT: "LS", LU: "LU",
  LY: "LY", MA: "MG", MC: "MO", MD: "MD", MG: "MN", MI: "MW", MK: "MK",
  ML: "ML", MN: "MC", MO: "MA", MR: "MR", MT: "MT", MU: "OM", MV: "MV",
  MX: "MX", MY: "MY", MZ: "MZ", NG: "NE", NH: "VU", NI: "NG", NL: "NL",
  NO: "NO", NP: "NP", NS: "SR", NU: "NI", NZ: "NZ", PA: "PY", PE: "PE",
  PK: "PK", PL: "PL", PM: "PA", PO: "PT", PP: "PG", PS: "PW", PU: "GW",
  QA: "QA", RO: "RO", RP: "PH", RS: "RU", RW: "RW", SA: "SA", SF: "ZA",
  SG: "SN", SI: "SI", SL: "SL", SN: "SG", SO: "SO", SP: "ES", SR: "RS",
  SS: "SS", SU: "SD", SW: "SE", SY: "SY", SZ: "CH", TD: "TT", TH: "TH",
  TI: "TJ", TN: "TO", TO: "TG", TS: "TN", TT: "TL", TU: "TR", TX: "TM",
  TZ: "TZ", UG: "UG", UK: "GB", UP: "UA", US: "US", UY: "UY", UZ: "UZ",
  VE: "VE", VM: "VN", WA: "NA", WE: "PS", YM: "YE", ZA: "ZM", ZI: "ZW",
  GL: "GL", MF: "YT", RE: "RE",
};

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results = { inserted: 0, skipped: 0, errors: 0, countriesUpdated: 0 };

  try {
    // 1. Delete events older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { error: deleteError } = await supabase
      .from("events")
      .delete()
      .lt("created_at", sevenDaysAgo.toISOString());
    if (deleteError) console.error("Delete old events error:", deleteError);

    // 2. Fetch World Bank baseline danger scores (cached 24h)
    const baselineScores = await getBaselineDangerScores();
    console.log(`Loaded World Bank baseline for ${Object.keys(baselineScores).length} countries`);

    // 3. Fetch latest GDELT events
    let rawEvents: RawGdeltEvent[] = [];
    let fetchDebug = "";
    try {
      const { events, debug } = await fetchLatestGdeltEvents();
      rawEvents = events;
      fetchDebug = debug;
    } catch (fetchErr) {
      return NextResponse.json({
        error: "GDELT fetch failed",
        details: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
      }, { status: 500 });
    }

    console.log(`Fetched ${rawEvents.length} relevant GDELT events`);

    // 4. Deduplicate by event_id before inserting
    const seenIds = new Set<string>();
    const validEvents = [];
    for (const ev of rawEvents) {
      if (seenIds.has(ev.event_id)) {
        results.skipped++;
        continue;
      }
      seenIds.add(ev.event_id);

      const countryInfo = getCountryInfo(ev.country_code);
      if (!countryInfo) continue;

      validEvents.push({
        id: ev.event_id,
        country_code: ev.country_code,
        event_type: ev.event_type,
        intensity_score: ev.intensity_score,
        latitude: ev.latitude,
        longitude: ev.longitude,
        source_url: ev.source_url,
        created_at: new Date().toISOString(),
      });
    }

    if (validEvents.length > 0) {
      const { error } = await supabase
        .from("events")
        .upsert(validEvents, { onConflict: "id", ignoreDuplicates: true });
      if (error) {
        results.errors++;
      } else {
        results.inserted = validEvents.length;
      }
    }

    // 5. Recalculate risk scores for countries that have recent GDELT events
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    const { data: recentEvents } = await supabase
      .from("events")
      .select("country_code, intensity_score")
      .gte("created_at", fortyEightHoursAgo.toISOString());

    // Group by country, deduplicating again at the scoring stage
    const byCountry: Record<string, number[]> = {};
    if (recentEvents) {
      const seenEventsByCountry = new Set<string>();
      for (const ev of recentEvents) {
        const key = `${ev.country_code}`;
        if (!byCountry[key]) byCountry[key] = [];
        byCountry[key].push(ev.intensity_score);
      }
      void seenEventsByCountry; // suppress unused warning
    }

    // Track which countries got GDELT-based scores
    const countriesWithGdelt = new Set<string>();

    for (const [countryCode, scores] of Object.entries(byCountry)) {
      const info = getCountryInfo(countryCode);
      if (!info) continue;

      const avgIntensity = scores.reduce((a, b) => a + b, 0) / scores.length;
      const iso2 = FIPS_TO_ISO2[countryCode] ?? countryCode;
      const baselineDanger = baselineScores[iso2] ?? 50;
      const riskScore = calculateRiskScore(scores.length, avgIntensity, baselineDanger);

      const { error: upsertError } = await supabase.from("countries").upsert(
        {
          country_code: countryCode,
          country_name: info.name,
          risk_score: riskScore,
          latitude: info.lat,
          longitude: info.lng,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "country_code" }
      );

      if (!upsertError) {
        results.countriesUpdated++;
        countriesWithGdelt.add(countryCode);
      }
    }

    // 6. Seed ALL remaining countries using World Bank baseline only
    // This ensures every country has a color on the map, even quiet ones
    const allFipsCodes = Object.keys(COUNTRY_DATA);
    const baselineOnlyUpserts = [];

    for (const countryCode of allFipsCodes) {
      if (countriesWithGdelt.has(countryCode)) continue; // already handled above

      const info = getCountryInfo(countryCode);
      if (!info) continue;

      const iso2 = FIPS_TO_ISO2[countryCode] ?? countryCode;
      const baselineDanger = baselineScores[iso2] ?? 50;

      // For countries with no recent events, use baseline as the score directly
      // but scale it down so stable countries aren't over-penalized:
      // baseline-only score = baselineDanger * 0.6 (max 60, never Critical without events)
      const riskScore = Math.round(baselineDanger * 0.6);

      baselineOnlyUpserts.push({
        country_code: countryCode,
        country_name: info.name,
        risk_score: riskScore,
        latitude: info.lat,
        longitude: info.lng,
        updated_at: new Date().toISOString(),
      });
    }

    // Batch upsert baseline-only countries in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < baselineOnlyUpserts.length; i += chunkSize) {
      const chunk = baselineOnlyUpserts.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("countries")
        .upsert(chunk, { onConflict: "country_code", ignoreDuplicates: false });
      if (!error) results.countriesUpdated += chunk.length;
    }

    return NextResponse.json({
      message: "Update complete",
      results,
      timestamp: new Date().toISOString(),
      debug: fetchDebug,
    });
  } catch (err) {
    console.error("update-events error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
