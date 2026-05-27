"use client";

import { useState, useEffect } from "react";
import { logFood } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface LogEntry {
  meal_type: string;
  food_name: string;
  food_fdc_id: number;
  actual_serving: number;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_BADGE: Record<string, string> = {
  breakfast: "bg-[#FFF5F0] text-[#E05A16]",
  lunch: "bg-[#ECFDF5] text-[#059669]",
  dinner: "bg-[#ECFDF5] text-[#059669]",
  snack: "bg-[#F5F3FF] text-[#7C3AED]",
};

function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("carbwise_email");
}

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [form, setForm] = useState({ meal_type: "breakfast", food_name: "", food_fdc_id: 0, actual_serving: 100 });

  useEffect(() => {
    const email = getUserEmail();
    if (email) setUserEmail(email);
  }, []);

  const handleSetEmail = () => {
    if (!emailInput.includes("@")) return;
    localStorage.setItem("carbwise_email", emailInput);
    setUserEmail(emailInput);
    toast.success("Email saved — your logs are now personal");
  };

  const addEntry = async () => {
    if (!form.food_name) return;
    if (!userEmail) { toast.error("Set your email first"); return; }
    const entry = { ...form };
    setEntries([entry, ...entries]);

    try {
      await logFood({
        user_id: userEmail,
        log_date: new Date().toISOString().split("T")[0],
        ...entry,
      });
      toast.success(`Logged: ${entry.food_name}`);
    } catch {
      toast.error("Failed to save log");
    }

    setForm({ ...form, food_name: "", food_fdc_id: 0, actual_serving: 100 });
  };

  const totals = entries.reduce(
    (acc, e) => ({ carbs: acc.carbs + (e.actual_serving * 0.1), cals: acc.cals + (e.actual_serving * 0.4) }),
    { carbs: 0, cals: 0 }
  );

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold tracking-[-0.02em] text-stone-800">Food Log</h1>

      {!userEmail && (
        <Card className="shadow-[0_4px_24px_rgba(0,0,0,0.02)] border-stone-200/60 bg-[#F4F7F5]">
          <CardContent className="py-4 text-center space-y-2.5">
            <p className="text-sm font-medium text-stone-600">Set your email to track personal logs</p>
            <div className="flex gap-1.5 justify-center">
              <input
                type="email" placeholder="your@email.com"
                value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-stone-200 rounded-lg w-44 focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-white"
              />
              <button onClick={handleSetEmail}
                className="text-xs px-3 py-1.5 bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 transition-colors font-medium">
                Save
              </button>
            </div>
            <p className="text-[10px] text-stone-400">Same email unlocks Insights on the Meal Plan page</p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-[0_4px_24px_rgba(0,0,0,0.02)] border-stone-200/60">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold tracking-[-0.01em]">Log a Meal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {MEAL_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, meal_type: t })}
                className={`text-xs font-medium capitalize px-3 py-1.5 rounded-full transition-colors ${
                  form.meal_type === t
                    ? MEAL_BADGE[t] || "bg-stone-100 text-stone-700"
                    : "bg-stone-100 text-stone-400 hover:bg-stone-200/60"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Food name"
              value={form.food_name}
              onChange={(e) => setForm({ ...form, food_name: e.target.value })}
              className="flex-1 rounded-xl border-stone-200 text-sm h-9"
            />
            <Input
              type="number"
              placeholder="Grams"
              value={form.actual_serving}
              onChange={(e) => setForm({ ...form, actual_serving: +e.target.value })}
              className="w-24 rounded-xl border-stone-200 text-sm h-9"
            />
          </div>
          <Button onClick={addEntry} className="w-full bg-emerald-800 hover:bg-emerald-900 font-medium">
            Log Food
          </Button>
        </CardContent>
      </Card>

      {/* Daily summary */}
      {entries.length > 0 && (
        <div className="flex gap-2.5 flex-wrap">
          <div className="flex flex-col items-center px-4 py-2.5 rounded-full bg-[#EAF6ED] text-[#2E7D32]">
            <span className="text-lg font-bold tracking-[-0.03em] tabular-nums">{Math.round(totals.carbs)}<span className="text-[11px] font-medium">g</span></span>
            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.04em]">Carbs</span>
          </div>
          <div className="flex flex-col items-center px-4 py-2.5 rounded-full bg-[#FFEBEE] text-[#C62828]">
            <span className="text-lg font-bold tracking-[-0.03em] tabular-nums">{Math.round(totals.cals)}</span>
            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.04em]">Kcal</span>
          </div>
          <div className="flex flex-col items-center px-4 py-2.5 rounded-full bg-stone-100 text-stone-600">
            <span className="text-lg font-bold tracking-[-0.03em] tabular-nums">{entries.length}</span>
            <span className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.04em]">Items</span>
          </div>
        </div>
      )}

      {/* Log entries */}
      <div className="space-y-2">
        {entries.map((e, i) => (
          <Card key={i} className="shadow-[0_4px_24px_rgba(0,0,0,0.02)] border-stone-200/60">
            <CardContent className="py-3 px-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-sm text-[#2D2D2D]">{e.food_name}</p>
                <p className="text-xs text-stone-400 capitalize">{e.meal_type} · {e.actual_serving}g</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${MEAL_BADGE[e.meal_type] || "bg-stone-100 text-stone-600"}`}>{e.meal_type}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
