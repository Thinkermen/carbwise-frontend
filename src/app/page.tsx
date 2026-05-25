"use client";

import { useState, useEffect, useRef } from "react";
import { generateMealPlan, swapFood, fetchQuota, type MealPlan, type SwapResult, type QuotaInfo } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
} from "lucide-react";

const MEAL_COLORS: Record<string, string> = {
  breakfast: "bg-amber-100 text-amber-900",
  lunch: "bg-emerald-100 text-emerald-900",
  dinner: "bg-indigo-100 text-indigo-900",
  snack: "bg-rose-100 text-rose-900",
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
  const [emailUnlocked, setEmailUnlocked] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  // Restore unlock state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("carbwise_email");
    if (saved) { setWaitlistEmail(saved); setEmailUnlocked(true); }
  }, []);

  // Fetch quota on mount
  useEffect(() => {
    fetchQuota().then(setQuota).catch(() => {});
  }, []);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleUnlock = async () => {
    if (!waitlistEmail.includes("@")) return;
    try {
      await fetch(`${API_BASE}/waitlist`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      localStorage.setItem("carbwise_email", waitlistEmail);
      setEmailUnlocked(true);
      toast.success("Insights unlocked! You're on the early access list.");
    } catch { toast.error("Failed. Try again."); }
  };

  const submitFeedback = async () => {
    if (!feedbackMsg.trim()) return;
    try {
      await fetch(`${API_BASE}/feedback`, {
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

  // Helper: calculate GL from carb, fiber, GI
  const calcGL = (carb: number, fiber: number, gi?: number | null) => {
    const available = Math.max(carb - fiber, 0);
    const effectiveGi = gi ?? (fiber / Math.max(carb, 1) > 0.2 ? 35 : 50);
    return Math.round((effectiveGi * available) / 100 * 10) / 10;
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

  // Phase-locked: text steps drive the progress bar. ~5s/step × 7 steps = ~35s.
  const stepProgressMap = [15, 30, 45, 60, 72, 82, 90, 95];
  const STEP_INTERVAL = 5000; // ms per step

  useEffect(() => {
    if (loading) {
      // Advance steps 0→6. Step 7 stays active until API returns.
      timerRef.current = setInterval(() => {
        setLoadingStep((prev) => {
          const next = prev < RITUAL_STEPS.length - 1 ? prev + 1 : prev;
          setProgressPercent(stepProgressMap[next]);
          return next;
        });
      }, STEP_INTERVAL);
      // Creep progress within final step: 90% → 95% over time
      const creepTimer = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < RITUAL_STEPS.length - 1) return prev;
          setProgressPercent((p) => Math.min(p + 0.12, stepProgressMap[prev]));
          return prev;
        });
      }, 600);
      (timerRef as any).creepCleanup = creepTimer;
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if ((timerRef as any).creepCleanup) clearInterval((timerRef as any).creepCleanup);
      setProgressPercent(100);
      setLoadingStep(RITUAL_STEPS.length);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if ((timerRef as any).creepCleanup) clearInterval((timerRef as any).creepCleanup);
    };
  }, [loading]);

  const handleGenerate = async () => {
    // Check quota before generating
    if (quota && !quota.whitelisted && quota.remaining <= 0) {
      toast.error(`今日生成次数已用完（${quota.limit}次/天），请明天再来`);
      return;
    }

    setPlan(null);
    setProgressPercent(0);
    setLoadingStep(0);
    setLoading(true);
    try {
      const result = await generateMealPlan(profile);
      setPlan(result);
      toast.success("Meal plan ready!");
      // Refresh quota after generation
      fetchQuota().then(setQuota).catch(() => {});
    } catch (e: any) {
      if (e.message?.includes("429") || e.message?.includes("Too Many")) {
        toast.error("今日生成次数已用完，请明天再来");
        setQuota((prev) => prev ? { ...prev, remaining: 0 } : null);
      } else {
        toast.error("生成失败，请检查网络连接后重试");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Meal Planner</h1>
        <p className="text-stone-500 mt-1">
          Personalized diabetes-friendly meal plans based on USDA nutrition data.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Your Profile</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-stone-500">Diabetes Type</label>
            <Select value={profile.diabetes_type} onValueChange={(v) => v && setProfile({ ...profile, diabetes_type: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Type 1">Type 1</SelectItem>
                <SelectItem value="Type 2">Type 2</SelectItem>
                <SelectItem value="Prediabetes">Prediabetes</SelectItem>
                <SelectItem value="Gestational">Gestational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500">Cuisine</label>
            <Select value={profile.cuisine} onValueChange={(v) => v && setProfile({ ...profile, cuisine: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
            <label className="text-xs font-medium text-stone-500">Carb Target (g/day)</label>
            <Input type="number" value={profile.carb_target_g} onChange={(e) => setProfile({ ...profile, carb_target_g: +e.target.value })} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-500">Calorie Target (kcal)</label>
            <Input type="number" value={profile.calorie_target} onChange={(e) => setProfile({ ...profile, calorie_target: +e.target.value })} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleGenerate}
        disabled={loading || (!!quota && !quota.whitelisted && quota.remaining <= 0)}
        className="w-full bg-emerald-600 hover:bg-emerald-700"
        size="lg"
      >
        {loading
          ? "Generating..."
          : (quota && !quota.whitelisted && quota.remaining <= 0)
            ? "No Generations Left Today"
            : "Generate Today's Meal Plan"}
      </Button>

      {/* Quota display */}
      {quota && (
        <p className="text-xs text-center text-stone-400">
          {quota.whitelisted
            ? "Unlimited generations (whitelisted)"
            : `${quota.remaining} of ${quota.limit} generations left today`}
        </p>
      )}

      {/* Loading Ritual */}
      {loading && (
        <Card className="border-emerald-200 bg-emerald-50/50 overflow-hidden">
          <CardContent className="py-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-emerald-700">AI Precision Meal Planning</span>
            </div>
            <div className="space-y-3">
              {RITUAL_STEPS.map((step, i) => {
                const isLast = i === RITUAL_STEPS.length - 1;
                  const state = i < loadingStep ? "done" : i === loadingStep ? "active" : "pending";
                  // Last step never shows "done" until loading completes
                  const displayState = loading && isLast && state === "done" ? "active" : state;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 text-sm transition-all duration-500 ${
                      displayState === "pending" ? "opacity-30" : "opacity-100"
                    }`}
                  >
                    <step.Icon className="w-4 h-4" />
                    <span className={displayState === "active" ? "text-emerald-800 font-medium" : "text-stone-600"}>
                      {step.text}
                    </span>
                    {displayState === "done" && <span className="text-emerald-500 ml-auto">✓</span>}
                    {displayState === "active" && (
                      <span className="ml-auto flex gap-1">
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Progress bar — phase-locked to loadingStep */}
            <div className="mt-4 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full ease-out"
                style={{
                  width: `${loading ? progressPercent : 100}%`,
                  transition: "width 4000ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {plan && (
        <div className="space-y-4">
          {/* GL Progress Bar with gamification */}
          {plan.total_estimated_gl != null && (
            <Card className="border-emerald-200 bg-emerald-50/60">
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-emerald-800">Daily Glycemic Load</span>
                  <span className="text-xs font-bold text-emerald-700 tabular-nums">
                    {plan.total_estimated_gl} / 120
                  </span>
                </div>
                <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      plan.total_estimated_gl <= 80 ? "bg-emerald-500" :
                      plan.total_estimated_gl <= 100 ? "bg-yellow-500" : "bg-red-500"
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

          <div className="flex gap-2 text-sm flex-wrap">
            <Badge variant="outline" className="text-emerald-700 border-emerald-300">{plan.total_carb_g}g carbs</Badge>
            {plan.total_protein_g && <Badge variant="outline" className="text-blue-700 border-blue-300">{plan.total_protein_g}g protein</Badge>}
            {plan.total_fat_g && <Badge variant="outline" className="text-amber-700 border-amber-300">{plan.total_fat_g}g fat</Badge>}
          </div>
          {plan.meals?.map((meal, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm capitalize">{meal.type}</CardTitle>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${MEAL_COLORS[meal.type] || "bg-stone-100 text-stone-700"}`}>
                    {meal.name}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {meal.foods?.map((food, j) => {
                    const isSpikeBlunter = meal.spike_blunter_pair?.includes(food.name) ||
                                          meal.spike_blunter_pair?.some(p => (food.db_name || food.name).toLowerCase().includes(p.toLowerCase()));
                    return (
                    <li key={j} className={`flex justify-between text-sm items-center ${isSpikeBlunter ? "ring-1 ring-amber-200 bg-amber-50/50 rounded px-2 -mx-2 py-1" : ""}`}>
                      <div className="flex-1 min-w-0">
                        <span className={food.hallucinated ? "text-amber-600" : ""}>
                          {food.db_name || food.name}
                          {isSpikeBlunter && <span className="text-[10px] ml-1 text-amber-600 font-medium"><Zap className="w-3 h-3 inline" /> Spike Blunter</span>}
                        </span>
                        {food.ai_name && food.db_name && food.db_name !== food.ai_name && (
                          <span className="text-xs text-stone-500 line-through ml-1 block">
                            AI: {food.ai_name}
                          </span>
                        )}
                        {food.cooked_state && (food.cooked_state === "cooked" || food.cooked_state === "raw") && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 text-stone-500">
                            {food.cooked_state}
                          </Badge>
                        )}
                        {food.hallucinated && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 text-amber-700 border-amber-400">
                            auto-fixed
                          </Badge>
                        )}
                      </div>
                      <span className="text-stone-500 flex gap-1 items-center shrink-0">
                        {food.estimated_gl != null && <Badge variant="secondary" className="text-xs">GL {food.estimated_gl}</Badge>}
                        <span className="tabular-nums">{food.portion_g}g</span>
                        {food.fdc_id && (
                          <button
                            onClick={() => handleSwap(i, j, food.fdc_id)}
                            className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded px-1.5 py-0.5 transition-colors"
                            title="Swap for similar food"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    </li>
                    );
                  })}
                </ul>

                {/* AI Insight — progressive disclosure with paywall */}
                {meal.ai_insight && (
                  emailUnlocked ? (
                    <details className="mt-3 group">
                      <summary className="text-xs text-amber-700 hover:text-amber-900 cursor-pointer font-medium list-none flex items-center gap-1">
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90" />
                        <Lightbulb className="w-3.5 h-3.5 inline" /> Why this works
                      </summary>
                      <p className="mt-2 text-xs text-stone-600 leading-relaxed pl-5 border-l-2 border-amber-200">
                        {meal.ai_insight}
                      </p>
                    </details>
                  ) : (
                    <details className="mt-3 group/blur">
                      <summary className="text-xs text-stone-400 hover:text-amber-700 cursor-pointer list-none flex items-center gap-1">
                        <span className="transition-transform group-open/blur:rotate-90">▶</span>
                        <Lock className="w-3 h-3 inline" /> Unlock Insights
                      </summary>
                      <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200 space-y-1.5 text-center">
                        <div className="blur-[2px] select-none pointer-events-none opacity-25 text-[11px] text-stone-500 leading-snug line-clamp-2">
                          {meal.ai_insight}
                        </div>
                        <p className="text-[11px] font-medium text-stone-700">Unlock AI Nutri-Insights — free</p>
                        <div className="flex gap-1 justify-center">
                          <input
                            type="email"
                            placeholder="your@email.com"
                            value={waitlistEmail}
                            onChange={(e) => setWaitlistEmail(e.target.value)}
                            className="text-[11px] px-2 py-1 border border-amber-300 rounded w-36 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <button
                            onClick={handleUnlock}
                            className="text-[11px] px-2 py-1 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
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
          ))}
        </div>
      )}

      {/* Floating Feedback Button — mobile-friendly */}
      <button
        onClick={() => setShowFeedback(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-amber-500 text-white rounded-full shadow-lg hover:bg-amber-600 transition-all hover:scale-105 flex items-center justify-center text-lg"
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
                  className="text-xs px-3 py-2 border rounded w-full mb-3 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowFeedback(false)} className="flex-1 text-sm py-2 text-stone-500 hover:text-stone-700">Cancel</button>
                  <button onClick={submitFeedback} className="flex-1 text-sm py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors">Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
