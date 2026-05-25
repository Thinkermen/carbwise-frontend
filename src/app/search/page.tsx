"use client";

import { useState } from "react";
import { searchFoods, type FoodSearchResult } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Food Search</h1>
      <Input
        placeholder="Search any food (e.g. chicken breast, oatmeal, Caesar salad)..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="text-base"
      />
      {loading && <p className="text-stone-400 text-sm">Searching 507K foods...</p>}
      {!loading && total > 0 && <p className="text-stone-400 text-sm">{total.toLocaleString()} results</p>}

      <div className="space-y-2">
        {results.map((food) => (
          <Card
            key={food.fdc_id}
            className={`cursor-pointer transition-colors hover:border-emerald-300 ${selected?.fdc_id === food.fdc_id ? "border-emerald-500 ring-1 ring-emerald-200" : ""}`}
            onClick={() => setSelected(selected?.fdc_id === food.fdc_id ? null : food)}
          >
            <CardContent className="py-3 px-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{food.name}</p>
                  <p className="text-xs text-stone-400">
                    {food.category || food.source?.replace(/_/g, " ")} · {food.serving_desc || `${food.serving_g || 100}g`}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 ml-2">
                  {Math.round(food.relevance * 100)}%
                </Badge>
              </div>

              {selected?.fdc_id === food.fdc_id && (
                <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-xs">
                  {[
                    ["Calories", food.energy_kcal, "kcal"],
                    ["Protein", food.protein_g, "g"],
                    ["Carbs", food.carb_g, "g"],
                    ["Fat", food.fat_g, "g"],
                    ["Fiber", food.fiber_g, "g"],
                    ["Sugar", food.sugar_g, "g"],
                  ].map(([label, value, unit]) => (
                    <div key={label as string} className="text-center">
                      <p className="text-stone-400">{label}</p>
                      <p className="font-semibold">{value != null ? `${value}${unit}` : "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {!loading && query.length >= 2 && results.length === 0 && (
          <p className="text-stone-400 text-center py-8">No foods found. Try a different search.</p>
        )}
      </div>
    </div>
  );
}
