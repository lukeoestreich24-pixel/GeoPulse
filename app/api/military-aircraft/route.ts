import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    const res = await fetch("https://api.adsb.lol/v2/mil", {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`adsb.lol ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=30" },
    });
  } catch (err) {
    return NextResponse.json({ ac: [], error: String(err) }, { status: 200 });
  }
}
