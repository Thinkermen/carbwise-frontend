"use client";

import { useState } from "react";
import { searchFoods, type FoodSearchResult } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

function giLabel(gi: number | null): { text: string; color: string } {
  if (gi == null) return { text: "—", color: "text-stone-300" };
  if (gi <= 55) return { text: "Low", color: "text-[#2E7D32]" };
  if (gi <= 69) return { text: "Medium", color: "text-[#E65100]" };
  return { text: "High", color: "text-[#C62828]" };
}

function glLabel(gl: number | null): { text: string; color: string } {
  if (gl == null) return { text: "—", color: "text-stone-300" };
  if (gl <= 10) return { text: "Low", color: "text-[#2E7D32]" };
  if (gl <= 19) return { text: "Medium", color: "text-[#E65100]" };
  return { text: "High", color: "text-[#C62828]" };
}

const nutritionChips: { key: keyof FoodSearchResult; label: string; unit: string; bg: string; fg: string }[] = [
  { key: "energy_kcal", label: "Calories", unit: "kcal", bg: "#FFEBEE", fg: "#C62828" },
  { key: "carb_g", label: "Carbs", unit: "g", bg: "#EAF6ED", fg: "#2E7D32" },
  { key: "protein_g", label: "Protein", unit: "g", bg: "#E8F1FC", fg: "#1565C0" },
  { key: "fat_g", label: "Fat", unit: "g", bg: "#FFF3E0", fg: "#E65100" },
  { key: "fiber_g", label: "Fiber", unit: "g", bg: "#F5F3FF", fg: "#7C3AED" },
  { key: "sugar_g", label: "Sugar", unit: "g", bg: "#FFF8E1", fg: "#F57F17" },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (fdcId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(fdcId)) next.delete(fdcId); else next.add(fdcId);
      return next;
    });
  };

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); setTotal(0); return; }
    setLoading(true);
    try {
      const data = await searchFoods(q, 15);
      setResults(data.results);
      setTotal(data.total);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-[-0.02em] text-stone-800">Food Search</h1>
          <p className="text-[11px] text-[#8C8C85] mt-0.5">Search 507K USDA foods with glycemic index data</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8C8C85] bg-[#F4F7F5] px-2 py-1 rounded-full">ADA 2026</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300" />
        <Input
          placeholder="Search any food (e.g. chicken breast, oatmeal, Caesar salad)..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="!bg-[#FAFAF7] border-0 rounded-xl !pl-10 py-3 px-4 h-auto text-sm focus:ring-2 focus:ring-[#1B4332]/20"
        />
      </div>

      {/* Status line */}
      {loading && <p className="text-[11px] text-stone-400 text-center">Searching 507K foods...</p>}
      {!loading && total > 0 && (
        <p className="text-[11px] text-stone-400">
          {total.toLocaleString()} result{total !== 1 ? "s" : ""} for <span className="font-medium text-stone-600">"{query}"</span>
        </p>
      )}

      {/* Results */}
      <div className="space-y-2.5">
        {results.map((food) => {
          const isOpen = expanded.has(food.fdc_id);
          return (
            <Card
              key={food.fdc_id}
              className="border-stone-100 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_16px_rgba(0,0,0,0.04)] transition-shadow cursor-pointer"
              onClick={() => toggleExpand(food.fdc_id)}
            >
              <CardContent className="py-3.5 px-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-stone-800 leading-snug">{food.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-[#A3A39C]">
                        {food.category || food.source?.replace(/_/g, " ")}
                      </span>
                      <span className="text-[11px] text-stone-300">·</span>
                      <span className="text-[11px] text-[#A3A39C]">
                        {food.serving_desc || `${food.serving_g || 100}g`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* GI pill */}
                    {food.glycemic_index != null ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${(() => {
                        const g = giLabel(food.glycemic_index);
                        return g.color === "text-[#2E7D32]" ? "bg-[#EAF6ED] text-[#2E7D32]"
                          : g.color === "text-[#E65100]" ? "bg-[#FFF3E0] text-[#E65100]"
                          : "bg-[#FFEBEE] text-[#C62828]";
                      })()}`}>
                        GI {food.glycemic_index}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-300">GI —</span>
                    )}
                    {/* GL pill */}
                    {food.glycemic_load != null ? (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${(() => {
                        const g = glLabel(food.glycemic_load);
                        return g.color === "text-[#2E7D32]" ? "bg-[#EAF6ED] text-[#2E7D32]"
                          : g.color === "text-[#E65100]" ? "bg-[#FFF3E0] text-[#E65100]"
                          : "bg-[#FFEBEE] text-[#C62828]";
                      })()}`}>
                        GL {food.glycemic_load}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-300">GL —</span>
                    )}
                    {isOpen
                      ? <ChevronUp className="w-3.5 h-3.5 text-stone-300" />
                      : <ChevronDown className="w-3.5 h-3.5 text-stone-300" />
                    }
                  </div>
                </div>

                {/* Expanded nutrition detail */}
                {isOpen && (
                  <div className="mt-3.5 pt-3.5 border-t border-stone-100">
                    <div className="grid grid-cols-3 gap-2">
                      {nutritionChips.map(({ key, label, unit, bg, fg }) => {
                        const val = food[key] as number | null;
                        return (
                          <div
                            key={label}
                            className="text-center py-2 rounded-lg text-[11px]"
                            style={{ background: bg, color: fg }}
                          >
                            <p className="opacity-70 text-[10px]">{label}</p>
                            <p className="font-semibold text-xs mt-0.5">
                              {val != null ? `${val} ${unit}` : "—"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    {/* GI/GL detail row */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-center py-2 rounded-lg text-[11px]" style={{ background: food.glycemic_index != null ? (food.glycemic_index <= 55 ? "#EAF6ED" : food.glycemic_index <= 69 ? "#FFF3E0" : "#FFEBEE") : "#F5F5F5", color: food.glycemic_index != null ? (food.glycemic_index <= 55 ? "#2E7D32" : food.glycemic_index <= 69 ? "#E65100" : "#C62828") : "#A3A39C" }}>
                        <p className="opacity-70 text-[10px]">Glycemic Index (GI)</p>
                        <p className="font-semibold text-xs mt-0.5">
                          {food.glycemic_index != null ? `${food.glycemic_index} · ${giLabel(food.glycemic_index).text}` : "—"}
                        </p>
                      </div>
                      <div className="text-center py-2 rounded-lg text-[11px]" style={{ background: food.glycemic_load != null ? (food.glycemic_load <= 10 ? "#EAF6ED" : food.glycemic_load <= 19 ? "#FFF3E0" : "#FFEBEE") : "#F5F5F5", color: food.glycemic_load != null ? (food.glycemic_load <= 10 ? "#2E7D32" : food.glycemic_load <= 19 ? "#E65100" : "#C62828") : "#A3A39C" }}>
                        <p className="opacity-70 text-[10px]">Glycemic Load (GL)</p>
                        <p className="font-semibold text-xs mt-0.5">
                          {food.glycemic_load != null ? `${food.glycemic_load} · ${glLabel(food.glycemic_load).text}` : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!loading && query.length >= 2 && results.length === 0 && (
          <p className="text-[#A3A39C] text-center py-12 text-sm">No foods found. Try a different search.</p>
        )}
      </div>
    </div>
  );
}
