import { supabase } from "@/lib/supabase";
import { Country } from "@/types";
import MapClient from "@/components/MapClient";
import Header from "@/components/Header";

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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header countryCount={countries.length} />
      <main className="flex-1 relative overflow-hidden">
        <MapClient initialCountries={countries} />
      </main>
    </div>
  );
}
