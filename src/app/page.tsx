"use client";

import { useState, useEffect, useRef } from "react";
import { generateMealPlanStream, fetchQuota, swapFood, type MealPlan, type SwapResult, type QuotaInfo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  BarChart3, Microscope, FolderSearch, ShieldCheck, Scale,
  Target, RefreshCw, Sparkles, Lightbulb, Lock, ChevronRight,
  MessageCircle, Zap, ArrowRightLeft,
  Coffee, Apple, Fish, UtensilsCrossed, Cookie, ShoppingCart,
} from "lucide-react";

const MEAL_BADGE: Record<string, string> = {
  breakfast: "bg-[#FFF5F0] text-[#E05A16]",
  lunch: "bg-[#ECFDF5] text-[#059669]",
  dinner: "bg-[#ECFDF5] text-[#059669]",
  snack: "bg-[#F5F3FF] text-[#7C3AED]",
};

const MEAL_ICONS: Record<string, React.ComponentType<{className?: string}>> = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  dinner: Fish,
  snack: Cookie,
};

const MEAL_ICON_BG: Record<string, string> = {
  breakfast: "bg-[#FFFDF5]",
  lunch: "bg-[#FFFDF5]",
  dinner: "bg-[#FFFDF5]",
  snack: "bg-[#FFFDF5]",
};

const RITUAL_STEPS = [
  { text: "Aligning with 2,091 international GI standards...", Icon: BarChart3 },
  { text: "Calculating glycemic load for each meal...", Icon: Microscope },
  { text: "Filtering 507,318 USDA foods for optimal matches...", Icon: FolderSearch },
  { text: "Validating food safety — hallucination guard active...", Icon: ShieldCheck },
  { text: "Balancing carbs, protein, and micronutrients...", Icon: Scale },
  { text: "Personalizing for your diabetes profile...", Icon: Target },
  { text: "Cross-referencing low-GI ingredient alternatives...", Icon: RefreshCw },
  { text: "Finalizing your precision meal plan...", Icon: Sparkles },
];

export default function Home() {
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [streamPhase, setStreamPhase] = useState("");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [emailUnlocked, setEmailUnlocked] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");

  // Restore unlock state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("carbwise_email");
    if (saved) { setWaitlistEmail(saved); setEmailUnlocked(true); }
  }, []);

  // Fetch quota on mount
  useEffect(() => {
    const email = localStorage.getItem("carbwise_email") || undefined;
    fetchQuota(email).then(setQuota).catch(() => {});
  }, []);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPlan = useRef<MealPlan | null>(null);
  const streamDone = useRef(false);
  const revealed = useRef(false);

  const handleUnlock = async () => {
    if (!waitlistEmail.includes("@")) return;
    try {
      await fetch("http://localhost:8000/waitlist", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      localStorage.setItem("carbwise_email", waitlistEmail);
      setEmailUnlocked(true);
      fetchQuota(waitlistEmail).then(setQuota).catch(() => {});
      toast.success("99 generations unlocked!");
    } catch { toast.error("Failed. Try again."); }
  };

  const submitFeedback = async () => {
    if (!feedbackMsg.trim()) return;
    try {
      await fetch("http://localhost:8000/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: feedbackMsg, email: feedbackEmail }),
      });
      setFeedbackSent(true);
      toast.success("Feedback sent — thank you!");
      setTimeout(() => { setShowFeedback(false); setFeedbackSent(false); setFeedbackMsg(""); }, 2000);
    } catch { toast.error("Failed. Try again."); }
  };
  const [profile, setProfile] = useState({
    diabetes_type: "Type 2",
    carb_target_g: 150,
    calorie_target: 1800,
    preferences: "balanced",
    cuisine: "American",
  });

  const handleDiabetesTypeChange = (v: string) => {
    const defaults: Record<string, { carb: number; cal: number }> = {
      "Type 1": { carb: 180, cal: 2000 },
      "Type 2": { carb: 150, cal: 1800 },
      "Prediabetes": { carb: 130, cal: 1600 },
      "Gestational": { carb: 160, cal: 2000 },
    };
    const d = defaults[v] || { carb: 150, cal: 1800 };
    setProfile(p => ({ ...p, diabetes_type: v, carb_target_g: d.carb, calorie_target: d.cal }));
  };

  // Helper: calculate GL from carb, fiber, GI
  const calcGL = (carb: number, fiber: number, gi?: number | null) => {
    const available = Math.max(carb - fiber, 0);
    const effectiveGi = gi ?? (fiber / Math.max(carb, 1) > 0.2 ? 35 : 50);
    return Math.round((effectiveGi * available) / 100 * 10) / 10;
  };

  // Strip USDA boilerplate, AI artifacts, and redundant descriptors for clean display
  const cleanFoodName = (name: string) => {
    if (!name) return "";
    let cleaned = name
      // Strip "Spike Blunter" if AI accidentally appended it to food name
      .replace(/\s*Spike\s+Blunter\b\s*/gi, "")
      // Strip USDA food distribution parentheticals
      .replace(/\s*\((?:Includes|incl\.?)\s+foods?\s+for\s+USDA'?s?\s+Food\s+Distribution\s+Program\)\s*/gi, "")
      .replace(/\s*\([^)]*(?:USDA|Food Distribution|foods for)[^)]*\)\s*/gi, "")
      // Strip redundant descriptors: "without salt", vitamin declarations, "NS as to form"
      .replace(/,?\s*without\s+(?:added\s+)?salt(?:\s+added)?\b\s*/gi, "")
      .replace(/,?\s*without\s+added\s+vitamin\s+[^,]*/gi, "")
      .replace(/,?\s*NS\s+as\s+to\s+(?:form|type)\b[^,]*/gi, "")
      // Strip "unsweetened" (redundant for frozen fruit)
      .replace(/,?\s*unsweetened\b\s*/gi, " ")
      // Fix "rawraw" / "cookedcooked" duplication artifacts
      .replace(/rawraw/gi, "raw")
      .replace(/cookedcooked/gi, "cooked")
      // Strip ALL-CAPS brand prefix
      .replace(/^[A-Z][A-Z &'-]+ - /, "")
      // Collapse repeated commas/spaces from all the stripping above
      .replace(/,\s*,/g, ",")
      .replace(/\s{2,}/g, " ")
      .replace(/,\s*$/g, "")
      .replace(/^\s*,\s*/g, "")
      .trim();
    return cleaned.length > 65 ? cleaned.slice(0, 62) + "..." : cleaned;
  };
  const handleSwap = async (mealIdx: number, foodIdx: number, currentFdcId?: number) => {
    if (!currentFdcId || !plan) return;
    try {
      const result = await swapFood(currentFdcId);
      if (result.swaps.length > 0) {
        const swap = result.swaps[0];
        // Use the lower-GL swap (already sorted by gi_diff in backend)
        const newGl = swap.glycemic_load ?? calcGL(swap.carb_g || 0, swap.fiber_g || 0, swap.glycemic_index);
        let newTotalGl = 0;
        const newMeals = plan.meals.map((m, mi) => {
          if (mi !== mealIdx) {
            m.foods.forEach((f: any) => { newTotalGl += f.estimated_gl || 0; });
            return m;
          }
          return {
            ...m,
            foods: m.foods.map((f, fi) => {
              if (fi !== foodIdx) {
                newTotalGl += f.estimated_gl || 0;
                return f;
              }
              newTotalGl += newGl;
              return {
                name: swap.name,
                portion_g: f.portion_g,
                fdc_id: swap.fdc_id,
                db_name: swap.name,
                nutrition: {
                  energy_kcal: swap.energy_kcal || 0,
                  protein_g: swap.protein_g || 0,
                  fat_g: swap.fat_g || 0,
                  carb_g: swap.carb_g || 0,
                  fiber_g: swap.fiber_g || 0,
                  sugar_g: null,
                },
                glycemic_index: swap.glycemic_index,
                estimated_gl: newGl,
                cooked_state: undefined,
              };
            }),
          };
        });
        setPlan({ ...plan, meals: newMeals, total_estimated_gl: Math.round(newTotalGl * 10) / 10 });
        toast.success(`Swapped: ${swap.name} (GL: ${newGl})`);
      }
    } catch {
      toast.error("Swap failed");
    }
  };

  // Progress bar: advance steps, reveal plan only when bar reaches final step
  useEffect(() => {
    if (loading) {
      setLoadingStep(0);
      setProgressPercent(0);
      pendingPlan.current = null;
      streamDone.current = false;
      revealed.current = false;
      timerRef.current = setInterval(() => {
        setLoadingStep((prev) => {
          const next = prev < RITUAL_STEPS.length - 1 ? prev + 1 : prev;
          setProgressPercent(Math.round((next / RITUAL_STEPS.length) * 100));
          if (next === RITUAL_STEPS.length - 1 && streamDone.current && pendingPlan.current && !revealed.current) {
            revealed.current = true;
            setPlan(pendingPlan.current);
            toast.success("Meal plan ready!", { style: { background: "#EAF6ED", color: "#2E7D32", border: "none" } });
            setLoading(false);
          }
          return next;
        });
      }, 3000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const handleGenerate = async () => {
    if (quota && !quota.whitelisted && quota.remaining <= 0) {
      toast.error(`今日生成次数已用完（${quota.limit}次/天），请明天再来`);
      return;
    }
    setPlan(null);
    setStreamPhase("");
    setLoading(true);
    try {
      const email = localStorage.getItem("carbwise_email") || undefined;
      for await (const event of generateMealPlanStream({ ...profile, email })) {
        switch (event.phase) {
          case "thinking":
            setStreamPhase("AI is reasoning about your nutrition profile...");
            break;
          case "generating":
            setStreamPhase("Writing your personalized meal plan...");
            break;
          case "validating":
            setStreamPhase("Verifying foods against USDA database...");
            break;
          case "done":
            if (event.plan) {
              pendingPlan.current = event.plan;
              streamDone.current = true;
              fetchQuota(email).then(setQuota).catch(() => {});
            }
            break;
          case "error":
            toast.error(event.message || "Generation failed");
            setLoading(false);
            break;
        }
      }
    } catch (e: any) {
      if (e.message?.includes("429")) {
        toast.error("今日生成次数已用完，请明天再来");
        setQuota((prev) => prev ? { ...prev, remaining: 0 } : null);
      } else {
        toast.error("生成失败，请检查网络连接后重试");
      }
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-stone-400 flex items-center gap-1.5">
          Tuesday, May 27 &middot; Personalized for you
        </span>
        <span className="text-[11px] font-semibold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-full tracking-[0.02em]">ADA 2026</span>
      </div>

      <Card className="shadow-[0_10px_40px_rgba(0,0,0,0.02)] border-0">
        <CardHeader className="pb-3"><CardTitle className="text-base font-semibold tracking-[-0.01em] text-[#1A1A1A]">Your Profile</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-semibold text-[#8C8C85] uppercase tracking-[0.04em]">Diabetes Type</label>
            <Select value={profile.diabetes_type} onValueChange={(v) => v && handleDiabetesTypeChange(v)}>
              <SelectTrigger className="mt-1.5 w-full !bg-[#FAFAF7] border-0 rounded-xl text-sm py-3 px-4 h-auto focus:ring-2 focus:ring-[#1B4332]/20 [&>svg]:text-stone-400"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Type 1">Type 1</SelectItem>
                <SelectItem value="Type 2">Type 2</SelectItem>
                <SelectItem value="Prediabetes">Prediabetes</SelectItem>
                <SelectItem value="Gestational">Gestational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#8C8C85] uppercase tracking-[0.04em]">Cuisine</label>
            <Select value={profile.cuisine} onValueChange={(v) => v && setProfile({ ...profile, cuisine: v })}>
              <SelectTrigger className="mt-1.5 w-full !bg-[#FAFAF7] border-0 rounded-xl text-sm py-3 px-4 h-auto focus:ring-2 focus:ring-[#1B4332]/20 [&>svg]:text-stone-400"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="American">American</SelectItem>
                <SelectItem value="Mediterranean">Mediterranean</SelectItem>
                <SelectItem value="Asian">Asian</SelectItem>
                <SelectItem value="Mexican">Mexican</SelectItem>
                <SelectItem value="Indian">Indian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#8C8C85] uppercase tracking-[0.04em]">Carb Target (g/day)</label>
            <Input type="number" value={profile.carb_target_g} onChange={(e) => setProfile({ ...profile, carb_target_g: +e.target.value })} className="mt-1.5 !bg-[#FAFAF7] border-0 rounded-xl text-sm py-3 px-4 h-auto focus:ring-2 focus:ring-[#1B4332]/20" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#8C8C85] uppercase tracking-[0.04em]">Calorie Target (kcal)</label>
            <Input type="number" value={profile.calorie_target} onChange={(e) => setProfile({ ...profile, calorie_target: +e.target.value })} className="mt-1.5 !bg-[#FAFAF7] border-0 rounded-xl text-sm py-3 px-4 h-auto focus:ring-2 focus:ring-[#1B4332]/20" />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleGenerate}
        disabled={loading || (!!quota && !quota.whitelisted && quota.remaining <= 0)}
        className="w-full bg-[#133D2D] hover:bg-[#1A4E3B] rounded-full py-3.5 text-base font-semibold transition-all duration-300"
      >
        {loading
          ? "Generating..."
          : (quota && !quota.whitelisted && quota.remaining <= 0)
            ? "No Generations Left Today"
            : "Generate Today's Meal Plan"}
      </Button>

      {quota && (
        <p className="text-[11px] text-center text-[#A3A39C]">
          {quota.whitelisted
            ? "Unlimited generations (whitelisted)"
            : `${quota.remaining} of ${quota.limit} generations left today`}
          {!quota.whitelisted && quota.limit === 3 && (
            <> &mdash; <button type="button" onClick={() => document.getElementById("email-input")?.focus()} className="underline hover:text-emerald-600">submit email for 99/day</button></>
          )}
        </p>
      )}

      {/* Loading Ritual */}
      {loading && (
        <Card className="border-stone-200/60 bg-[#F5F7F4] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
          <CardContent className="py-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-5 h-5 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-stone-600">
                {streamPhase || "Preparing your meal plan..."}
              </span>
            </div>
            <div className="space-y-3">
              {RITUAL_STEPS.map((step, i) => {
                const state = i < loadingStep ? "done" : i === loadingStep ? "active" : "pending";
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                      state === "pending" ? "opacity-25" : "opacity-100"
                    }`}
                  >
                    <step.Icon className={`w-4 h-4 ${state === "active" ? "text-emerald-700" : state === "done" ? "text-emerald-500" : "text-stone-400"}`} />
                    <span className={state === "active" ? "text-stone-700 font-medium" : "text-stone-500"}>
                      {step.text}
                    </span>
                    {state === "done" && <span className="text-emerald-500 ml-auto text-xs">✓</span>}
                    {state === "active" && (
                      <span className="ml-auto flex gap-1">
                        <span className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 h-1 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-700 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${((loadingStep + 1) / RITUAL_STEPS.length) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {plan && (
        <div className="space-y-4">
          {/* GL Progress Bar with gamification */}
          {plan.total_estimated_gl != null && (
            <Card className="border-stone-200/60 bg-[#F5F7F4] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-emerald-800">Daily Glycemic Load</span>
                  <span className="text-xs font-bold text-emerald-700 tabular-nums">
                    {plan.total_estimated_gl} / 120
                  </span>
                </div>
                <div className="h-2 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      plan.total_estimated_gl <= 80 ? "bg-emerald-600" :
                      plan.total_estimated_gl <= 100 ? "bg-amber-500" : "bg-red-400"
                    }`}
                    style={{ width: `${Math.min((plan.total_estimated_gl / 120) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  {plan.total_estimated_gl <= 60 && "Excellent — well within the safe zone"}
                  {plan.total_estimated_gl > 60 && plan.total_estimated_gl <= 80 && "Good — moderate glycemic load"}
                  {plan.total_estimated_gl > 80 && plan.total_estimated_gl <= 100 && "Borderline — consider swapping high-GL items"}
                  {plan.total_estimated_gl > 100 && "High — try swapping some items for lower-GL alternatives"}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2.5 flex-wrap">
            <div className="flex flex-col items-center px-4 py-2.5 rounded-full bg-[#EAF6ED] text-[#2E7D32] flex-1 min-w-[72px]">
              <span className="text-lg font-bold tracking-[-0.03em] tabular-nums">{plan.total_carb_g}<span className="text-[11px] font-medium">g</span></span>
              <span className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.04em]">Carbs</span>
            </div>
            {plan.total_protein_g != null && (
              <div className="flex flex-col items-center px-4 py-2.5 rounded-full bg-[#E8F1FC] text-[#1565C0] flex-1 min-w-[72px]">
                <span className="text-lg font-bold tracking-[-0.03em] tabular-nums">{plan.total_protein_g}<span className="text-[11px] font-medium">g</span></span>
                <span className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.04em]">Protein</span>
              </div>
            )}
            {plan.total_fat_g != null && (
              <div className="flex flex-col items-center px-4 py-2.5 rounded-full bg-[#FFF3E0] text-[#E65100] flex-1 min-w-[72px]">
                <span className="text-lg font-bold tracking-[-0.03em] tabular-nums">{plan.total_fat_g}<span className="text-[11px] font-medium">g</span></span>
                <span className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.04em]">Fat</span>
              </div>
            )}
            <div className="flex flex-col items-center px-4 py-2.5 rounded-full bg-[#FFEBEE] text-[#C62828] flex-1 min-w-[72px]">
              <span className="text-lg font-bold tracking-[-0.03em] tabular-nums">{plan.total_calories ?? "—"}</span>
              <span className="text-[10px] font-medium text-stone-400 uppercase tracking-[0.04em]">Kcal</span>
            </div>
          </div>
          {plan.meals?.map((meal, i) => {
            const IconComp = MEAL_ICONS[meal.type] || Cookie;
            return (
            <Card key={i} className="animate-meal-reveal shadow-[0_4px_24px_rgba(0,0,0,0.02)] border-stone-200/60" style={{ animationDelay: `${i * 0.2}s` }}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FFFDF5]">
                    <IconComp className="w-5 h-5 text-stone-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${MEAL_BADGE[meal.type] || "bg-stone-100 text-stone-600"}`}>{meal.type}</span>
                    </div>
                    <div className="text-lg font-bold tracking-[-0.02em] text-[#1A1A1A] leading-tight">{meal.name}</div>
                    {meal.foods && (
                      <p className="text-[11px] text-[#2E7D32] font-medium mt-1">
                        {Math.round(meal.foods.reduce((sum, f) => sum + (f.nutrition?.carb_g || 0), 0))}g carbs this meal
                      </p>
                    )}
                  </div>
                </div>
                <ul className="space-y-0.5">
                  {meal.foods?.map((food, j) => {
                    const isSpikeBlunter = meal.spike_blunter_pair?.includes(food.name) ||
                                          meal.spike_blunter_pair?.some(p => (food.db_name || food.name).toLowerCase().includes(p.toLowerCase()));
                    const gl = food.estimated_gl;
                    return (
                    <li key={j} className={`flex justify-between text-sm items-center px-3 py-2.5 rounded-[10px] hover:bg-stone-50/50 transition-colors ${isSpikeBlunter ? "bg-amber-50/20" : ""}`}>
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSpikeBlunter ? "bg-[#E05A16]" : "bg-stone-300"}`} />
                        <span className="text-[14px] font-medium text-[#2D2D2D] truncate" title={food.db_name || food.name}>
                          {cleanFoodName(food.ai_name || food.db_name || food.name)}
                        </span>
                        {food.hallucinated && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 ml-0.5 text-amber-700 border-amber-400 flex-shrink-0">
                            auto-fixed
                          </Badge>
                        )}
                      </div>
                      <span className="flex gap-3 items-center shrink-0 text-xs tabular-nums">
                        {gl != null && <span className="font-semibold text-[#2D7A57]">GL {gl}</span>}
                        <span className="font-normal text-[#8C8C85]">{food.portion_g}g</span>
                      </span>
                    </li>
                    );
                  })}
                </ul>

                {/* AI Insight */}
                {meal.ai_insight && (
                  emailUnlocked ? (
                    <div className="mt-3 p-3.5 bg-[#F4F7F5] rounded-xl text-[13px] text-[#2D2D2D] leading-relaxed flex gap-2.5">
                      <span className="text-base flex-shrink-0 mt-px">💡</span>
                      <span>{meal.ai_insight}</span>
                    </div>
                  ) : (
                    <details className="mt-3 group/blur">
                      <summary className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#F8F8F7] text-[#8C8C85] rounded-xl text-[13px] font-medium hover:bg-[#EAF6ED] hover:text-[#2E7D32] transition-colors cursor-pointer list-none">
                        <Lock className="w-3.5 h-3.5" /> Unlock insight — free with email
                      </summary>
                      <div className="mt-2.5 p-3 bg-stone-50 rounded-xl border border-stone-100 space-y-2 text-center">
                        <div className="blur-[2px] select-none pointer-events-none opacity-20 text-[11px] text-stone-500 leading-snug line-clamp-2">
                          {meal.ai_insight}
                        </div>
                        <p className="text-[11px] font-medium text-stone-600">Enter your email to unlock</p>
                        <div className="flex gap-1.5 justify-center">
                          <input
                            type="email"
                            id={`unlock-${i}`}
                            placeholder="your@email.com"
                            value={waitlistEmail}
                            onChange={(e) => setWaitlistEmail(e.target.value)}
                            className="text-[11px] px-2.5 py-1.5 border border-stone-200 rounded-lg w-36 focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-white"
                          />
                          <button
                            onClick={handleUnlock}
                            className="text-[11px] px-3 py-1.5 bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 transition-colors font-medium"
                          >
                            Unlock
                          </button>
                        </div>
                        <p className="text-[10px] text-stone-400">No credit card — early access</p>
                      </div>
                    </details>
                  )
                )}
              </CardContent>
            </Card>
          )})}
        </div>
      )}

      {plan && (
        <div
          className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-[#F8F8F7] text-[#A3A39C] rounded-full text-sm font-semibold cursor-not-allowed"
        >
          <ShoppingCart className="w-4 h-4" />
          Grocery Delivery — Coming Soon
        </div>
      )}

      {/* Floating Feedback Button — mobile-friendly */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-6 z-50 w-11 h-11 bg-emerald-800 text-white rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:bg-emerald-900 transition-all hover:scale-105 flex items-center justify-center"
        title="Send feedback"
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30" onClick={() => setShowFeedback(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
            {feedbackSent ? (
              <div className="text-center py-4">
                <p className="text-2xl mb-2">✅</p>
                <p className="font-medium text-stone-700">Thank you!</p>
                <p className="text-xs text-stone-400">Your feedback helps make this better.</p>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-stone-800 mb-1">Send Feedback</h3>
                <p className="text-xs text-stone-400 mb-3">What would make this app more useful for you?</p>
                <Textarea
                  placeholder="e.g. I wish it could..."
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  className="text-sm mb-2"
                  rows={3}
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  className="text-xs px-3 py-2 border border-stone-200 rounded-lg w-full mb-3 focus:outline-none focus:ring-1 focus:ring-emerald-300"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowFeedback(false)} className="flex-1 text-sm py-2 text-stone-400 hover:text-stone-600">Cancel</button>
                  <button onClick={submitFeedback} className="flex-1 text-sm py-2 bg-emerald-800 text-white rounded-lg hover:bg-emerald-900 transition-colors font-medium">Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
