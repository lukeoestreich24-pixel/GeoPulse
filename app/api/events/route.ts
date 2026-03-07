import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const countryCode = searchParams.get("country_code");

  if (!countryCode) {
    return NextResponse.json({ error: "country_code is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("country_code", countryCode.toUpperCase())
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
