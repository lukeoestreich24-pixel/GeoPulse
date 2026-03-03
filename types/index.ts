export interface GdeltEvent {
  id: string;
  country_code: string;
  event_type: string;
  intensity_score: number;
  latitude: number;
  longitude: number;
  source_url: string;
  created_at: string;
}

export interface Country {
  id: string;
  country_code: string;
  country_name: string;
  risk_score: number;
  latitude: number;
  longitude: number;
  updated_at: string;
}

export interface CountryWithEvents extends Country {
  recent_events: GdeltEvent[];
}

export type RiskLevel = "critical" | "high" | "medium" | "low" | "minimal";

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  if (score >= 20) return "low";
  return "minimal";
}

export function getRiskColor(score: number): string {
  if (score >= 80) return "#ef4444"; // red-500
  if (score >= 60) return "#f97316"; // orange-500
  if (score >= 40) return "#eab308"; // yellow-500
  if (score >= 20) return "#22c55e"; // green-500
  return "#3b82f6"; // blue-500
}

export function getRiskColorHex(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f97316";
  if (score >= 40) return "#eab308";
  if (score >= 20) return "#22c55e";
  return "#6b7280";
}
