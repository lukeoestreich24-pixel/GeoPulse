import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { fetchLatestGdeltEvents, calculateRiskScore, RawGdeltEvent } from "@/lib/gdelt";
import { getCountryInfo } from "@/lib/countries";

export const maxDuration = 60; // 60 second timeout

// Vercel Cron calls this with an Authorization header containing CRON_SECRET
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

    if (deleteError) {
      console.error("Delete old events error:", deleteError);
    }

    // 2. Fetch latest GDELT events
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

    if (rawEvents.length === 0) {
      return NextResponse.json({ message: "No events fetched", results, debug: fetchDebug });
    }

    // 3. Insert events in batches to avoid timeout
    const validEvents = [];
    for (const ev of rawEvents) {
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

    // 4. Recalculate risk scores per country
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    // Get all events from last 48h grouped by country
    const { data: recentEvents } = await supabase
      .from("events")
      .select("country_code, intensity_score")
      .gte("created_at", fortyEightHoursAgo.toISOString());

    if (recentEvents && recentEvents.length > 0) {
      // Group by country
      const byCountry: Record<string, number[]> = {};
      for (const ev of recentEvents) {
        if (!byCountry[ev.country_code]) byCountry[ev.country_code] = [];
        byCountry[ev.country_code].push(ev.intensity_score);
      }

      // Upsert countries table
      for (const [countryCode, scores] of Object.entries(byCountry)) {
        const info = getCountryInfo(countryCode);
        if (!info) continue;

        const avgIntensity = scores.reduce((a, b) => a + b, 0) / scores.length;
        const riskScore = calculateRiskScore(scores.length, avgIntensity);

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

        if (!upsertError) results.countriesUpdated++;
      }
    }

    return NextResponse.json({
      message: "Update complete",
      results,
      timestamp: new Date().toISOString(),
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
