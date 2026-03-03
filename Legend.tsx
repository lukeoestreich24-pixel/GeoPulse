"use client";

const LEGEND_ITEMS = [
  { label: "Minimal", color: "#6b7280", range: "0–19" },
  { label: "Low", color: "#22c55e", range: "20–39" },
  { label: "Medium", color: "#eab308", range: "40–59" },
  { label: "High", color: "#f97316", range: "60–79" },
  { label: "Critical", color: "#ef4444", range: "80–100" },
];

export default function Legend() {
  return (
    <div className="absolute bottom-6 left-4 z-[1000] bg-[#161b27]/90 border border-[#1e2533] rounded-xl px-4 py-3 backdrop-blur-sm shadow-xl shadow-black/40">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">
        Risk Level
      </p>
      <div className="space-y-1.5">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-400">{item.label}</span>
            <span className="text-[10px] text-gray-600 ml-auto">
              {item.range}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
