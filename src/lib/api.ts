const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface FoodSearchResult {
  fdc_id: number;
  name: string;
  source: string;
  category: string | null;
  energy_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carb_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  serving_desc: string | null;
  serving_g: number | null;
  relevance: number;
}

export interface FoodDetail {
  fdc_id: number;
  name_en: string;
  source: string;
  category: string | null;
  energy_kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carb_g: number | null;
  fiber_g: number | null;
  sugar_g: number | null;
  saturated_fat_g: number | null;
  sodium_mg: number | null;
  serving_desc: string | null;
  serving_g: number | null;
}

export interface MealPlan {
  date?: string;
  total_carb_g: number;
  total_protein_g?: number;
  total_fat_g?: number;
  total_estimated_gl?: number;
  meals: Meal[];
}

export interface Meal {
  type: string;
  name: string;
  spike_blunter_pair?: string[];
  ai_insight?: string;
  foods: MealFood[];
}

export interface SwapResult {
  original: { fdc_id: number; name: string; carb_g: number | null; glycemic_index: number | null; glycemic_load: number | null };
  swaps: {
    fdc_id: number; name: string; source: string; category: string | null;
    energy_kcal: number | null; protein_g: number | null; fat_g: number | null;
    carb_g: number | null; fiber_g: number | null;
    glycemic_index: number | null; glycemic_load: number | null;
    serving_desc: string | null; serving_g: number | null;
    gi_diff: number | null;
  }[];
}

export interface MealFood {
  name: string;
  portion_g: number;
  notes?: string;
  fdc_id?: number;
  db_name?: string;
  ai_name?: string;
  hallucinated?: boolean;
  cooked_state?: string;
  glycemic_index?: number | null;
  nutrition?: {
    energy_kcal: number;
    protein_g: number;
    fat_g: number;
    carb_g: number;
    fiber_g: number;
    sugar_g: number | null;
  };
  estimated_gl?: number;
}

export async function searchFoods(query: string, limit = 20): Promise<{ total: number; results: FoodSearchResult[] }> {
  const res = await fetch(`${API_BASE}/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

export async function getFood(fdcId: number): Promise<FoodDetail> {
  const res = await fetch(`${API_BASE}/foods/${fdcId}`);
  if (!res.ok) throw new Error("Food not found");
  return res.json();
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  whitelisted: boolean;
}

export interface StreamEvent {
  phase: "thinking" | "generating" | "validating" | "done" | "error";
  message?: string;
  plan?: MealPlan;
}

export async function* generateMealPlanStream(profile: {
  diabetes_type?: string;
  carb_target_g?: number;
  calorie_target?: number;
  allergies?: string[];
  preferences?: string;
  cuisine?: string;
}): AsyncGenerator<StreamEvent> {
  const res = await fetch(`${API_BASE}/meal-plans/generate-stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

  if (!res.ok) {
    const msg = res.status === 429 ? "429 Too Many Requests" : "Generation failed";
    throw new Error(msg);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const event: StreamEvent = JSON.parse(line.slice(6));
          yield event;
          if (event.phase === "done" || event.phase === "error") return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function fetchQuota(): Promise<QuotaInfo> {
  const res = await fetch(`${API_BASE}/meal-plans/quota`);
  if (!res.ok) throw new Error("Quota check failed");
  return res.json();
}

export async function generateMealPlan(profile: {
  diabetes_type?: string;
  carb_target_g?: number;
  calorie_target?: number;
  allergies?: string[];
  preferences?: string;
  cuisine?: string;
}): Promise<MealPlan> {
  const res = await fetch(`${API_BASE}/meal-plans/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const msg = res.status === 429 ? "429 Too Many Requests" : "Generation failed";
    throw new Error(msg);
  }
  return res.json();
}

export async function swapFood(fdcId: number, limit = 5): Promise<SwapResult> {
  const res = await fetch(`${API_BASE}/foods/swap/${fdcId}?limit=${limit}`);
  if (!res.ok) throw new Error("Swap failed");
  return res.json();
}

export async function logFood(entry: {
  user_id: string;
  log_date: string;
  meal_type: string;
  food_fdc_id: number;
  food_name: string;
  actual_serving: number;
}) {
  const res = await fetch(`${API_BASE}/food-logs/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error("Log failed");
  return res.json();
}
