import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { data, error, count } = await supabase
    .from("countries")
    .select("*", { count: "exact" })
    .limit(3);

  return NextResponse.json({
    url_set: !!url,
    url_value: url?.substring(0, 30),
    key_set: !!key,
    key_prefix: key?.substring(0, 20),
    data,
    error,
    count,
  });
}
