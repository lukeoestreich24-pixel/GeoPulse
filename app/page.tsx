import { supabase } from "@/lib/supabase";
import { Country } from "@/types";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from("countries")
    .select("*")
    .order("risk_score", { ascending: false });

  if (error) {
    console.error("Failed to load countries:", error);
    return [];
  }
  return data ?? [];
}

export default async function HomePage() {
  const countries = await getCountries();
  console.log("Server: loaded", countries.length, "countries");
  return <AppShell initialCountries={countries} />;
}
