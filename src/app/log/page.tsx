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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Food Log</h1>

      {!userEmail && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-4 text-center space-y-2">
            <p className="text-sm font-medium text-stone-700">Set your email to track personal logs</p>
            <div className="flex gap-1 justify-center">
              <input
                type="email" placeholder="your@email.com"
                value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                className="text-xs px-2 py-1.5 border border-amber-300 rounded w-44 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <button onClick={handleSetEmail}
                className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors">
                Save
              </button>
            </div>
            <p className="text-[10px] text-stone-400">Same email unlocks Insights on the Meal Plan page</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Log a Meal</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {MEAL_TYPES.map((t) => (
              <Badge
                key={t}
                variant={form.meal_type === t ? "default" : "outline"}
                className={`cursor-pointer capitalize ${form.meal_type === t ? "bg-emerald-600" : ""}`}
                onClick={() => setForm({ ...form, meal_type: t })}
              >
                {t}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Food name"
              value={form.food_name}
              onChange={(e) => setForm({ ...form, food_name: e.target.value })}
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Grams"
              value={form.actual_serving}
              onChange={(e) => setForm({ ...form, actual_serving: +e.target.value })}
              className="w-24"
            />
          </div>
          <Button onClick={addEntry} className="w-full bg-emerald-600 hover:bg-emerald-700">
            Log Food
          </Button>
        </CardContent>
      </Card>

      {/* Daily summary */}
      {entries.length > 0 && (
        <div className="flex gap-4 text-sm">
          <Badge variant="outline" className="text-emerald-700">Est. {Math.round(totals.carbs)}g carbs</Badge>
          <Badge variant="outline">Est. {Math.round(totals.cals)} kcal</Badge>
          <Badge variant="outline">{entries.length} items</Badge>
        </div>
      )}

      {/* Log entries */}
      <div className="space-y-2">
        {entries.map((e, i) => (
          <Card key={i}>
            <CardContent className="py-3 px-4 flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{e.food_name}</p>
                <p className="text-xs text-stone-400 capitalize">{e.meal_type} · {e.actual_serving}g</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
