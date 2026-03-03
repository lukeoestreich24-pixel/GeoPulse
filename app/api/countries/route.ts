import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 300; // revalidate every 5 minutes

export async function GET() {
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .order("risk_score", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
