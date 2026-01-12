/**
 * Work Importance Profiler (WIP) Scoring and O*NET Matching Library
 * Based on the O*NET Work Importance Profiler specification
 */

export type WorkValue =
  | "Achievement"
  | "Independence"
  | "Recognition"
  | "Relationships"
  | "Support"
  | "Working_Conditions";

export const WORK_VALUES: WorkValue[] = [
  "Achievement",
  "Independence",
  "Recognition",
  "Relationships",
  "Support",
  "Working_Conditions",
];

// Display-friendly names for the work values
export const WORK_VALUE_LABELS: Record<WorkValue, string> = {
  Achievement: "Achievement",
  Independence: "Independence",
  Recognition: "Recognition",
  Relationships: "Relationships",
  Support: "Support",
  Working_Conditions: "Working Conditions",
};

export const WORK_VALUE_DESCRIPTIONS: Record<WorkValue, string> = {
  Achievement: "Occupations that let you use your best abilities and give a sense of accomplishment",
  Independence: "Occupations that allow you to work autonomously and make your own decisions",
  Recognition: "Occupations that provide advancement, leadership, and respect from others",
  Relationships: "Occupations with friendly coworkers, teamwork, and helping others",
  Support: "Occupations with supportive supervisors and fair company policies",
  Working_Conditions: "Occupations with good working conditions, job security, and work-life balance",
};

export interface WipItem {
  item_id: string;
  work_value: WorkValue;
  text: string;
  active?: boolean;
}

export interface WipResponseItem {
  item_id: string;
  rank: number;
  rating: number;
}

export interface WipConfig {
  ranking_weight: number;    // e.g., 0.67
  rating_weight: number;     // e.g., 0.33
  rating_min: number;        // 1
  rating_max: number;        // 5
  normalized_min?: number;   // default 0
  normalized_max?: number;   // default 100
}

export interface ValueScore {
  raw: number;
  normalized: number;
  z: number;
}

export interface ScoreResult {
  response_id: string;
  user_id: string;
  n_items: number;
  value_scores: Record<WorkValue, ValueScore>;
  rank_order: { work_value: WorkValue; normalized: number }[];
  checks: { rank_duplicates: boolean; missing_items: boolean; out_of_range: boolean };
}

export interface OnetWorkValuesProfile {
  onet_soc_code: string;
  title: string;
  values: Record<WorkValue, { importance_0_100: number }>;
}

export interface MatchResult {
  onet_soc_code: string;
  title: string;
  score: number;
  explain: {
    top_user_values: WorkValue[];
    top_job_values: WorkValue[];
    overlaps: WorkValue[];
    user_vector: Record<WorkValue, number>;
    job_vector: Record<WorkValue, number>;
  };
}

// Default configuration matching the spec
export const DEFAULT_WIP_CONFIG: WipConfig = {
  ranking_weight: 0.67,
  rating_weight: 0.33,
  rating_min: 1,
  rating_max: 5,
  normalized_min: 0,
  normalized_max: 100,
};

// WIP Assessment Items (21 items, based on O*NET Work Importance Locator)
export const WIP_ITEMS: WipItem[] = [
  // Achievement (4 items)
  { item_id: "ACH1", work_value: "Achievement", text: "I want a job where I can try out my own ideas" },
  { item_id: "ACH2", work_value: "Achievement", text: "I want a job where I can make use of my abilities" },
  { item_id: "ACH3", work_value: "Achievement", text: "I want a job where I can see the results of my work" },
  { item_id: "ACH4", work_value: "Achievement", text: "I want a job that gives me a feeling of accomplishment" },
  
  // Independence (4 items)
  { item_id: "IND1", work_value: "Independence", text: "I want a job where I can plan my work without much supervision" },
  { item_id: "IND2", work_value: "Independence", text: "I want a job where I can make decisions on my own" },
  { item_id: "IND3", work_value: "Independence", text: "I want a job where I can do things my own way" },
  { item_id: "IND4", work_value: "Independence", text: "I want a job where I am responsible for my work" },
  
  // Recognition (4 items)
  { item_id: "REC1", work_value: "Recognition", text: "I want a job where I get recognition for the work I do" },
  { item_id: "REC2", work_value: "Recognition", text: "I want a job where I can give directions to others" },
  { item_id: "REC3", work_value: "Recognition", text: "I want a job where my coworkers respect me" },
  { item_id: "REC4", work_value: "Recognition", text: "I want a job that provides advancement opportunities" },
  
  // Relationships (4 items)
  { item_id: "REL1", work_value: "Relationships", text: "I want a job where I can do things for other people" },
  { item_id: "REL2", work_value: "Relationships", text: "I want a job where my coworkers are friendly" },
  { item_id: "REL3", work_value: "Relationships", text: "I want a job where I can work as part of a team" },
  { item_id: "REL4", work_value: "Relationships", text: "I want a job where I am not asked to do anything against my morals" },
  
  // Support (4 items)
  { item_id: "SUP1", work_value: "Support", text: "I want a job with supervisors who back up their workers" },
  { item_id: "SUP2", work_value: "Support", text: "I want a job with supervisors who train workers well" },
  { item_id: "SUP3", work_value: "Support", text: "I want a job with a company that treats employees fairly" },
  { item_id: "SUP4", work_value: "Support", text: "I want a job that offers steady employment" },
  
  // Working Conditions (4 items - added 1 to make 24 total for better balance)
  { item_id: "WC1", work_value: "Working_Conditions", text: "I want a job where I am busy all the time" },
  { item_id: "WC2", work_value: "Working_Conditions", text: "I want a job with good working conditions" },
  { item_id: "WC3", work_value: "Working_Conditions", text: "I want a job with enough time for my family" },
  { item_id: "WC4", work_value: "Working_Conditions", text: "I want a job where I can work on my own" },
];

// Helper functions
function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
}

function std(xs: number[]): number {
  const m = mean(xs);
  const v = mean(xs.map(x => (x - m) ** 2));
  return Math.sqrt(v) || 1;
}

function minMaxRawForValue(n: number, k: number, cfg: WipConfig): { minRaw: number; maxRaw: number } {
  const rw = cfg.ranking_weight;
  const tw = cfg.rating_weight;

  // ranking_points = (n + 1) - rank
  // Best ranks: 1..k
  const bestRankSum = k * (n + 1) - (k * (k + 1)) / 2;
  // Worst ranks: (n-k+1)..n
  const worstRankSum = k * (n + 1) - (k * (2 * n - k + 1)) / 2;

  const minRaw = rw * worstRankSum + tw * (k * cfg.rating_min);
  const maxRaw = rw * bestRankSum + tw * (k * cfg.rating_max);

  return { minRaw, maxRaw };
}

/**
 * Score a WIP assessment response
 * Uses combined ranking (67%) and rating (33%) scoring with normalization
 */
export function scoreWip(params: {
  response_id: string;
  user_id: string;
  items: WipItem[];
  responseItems: WipResponseItem[];
  cfg?: WipConfig;
}): ScoreResult {
  const { response_id, user_id, items, responseItems, cfg = DEFAULT_WIP_CONFIG } = params;

  const normalizedMin = cfg.normalized_min ?? 0;
  const normalizedMax = cfg.normalized_max ?? 100;

  const activeItems = items.filter(i => i.active !== false);
  const n = activeItems.length;

  const respMap = new Map(responseItems.map(r => [r.item_id, r]));

  const ranks = responseItems.map(r => r.rank);
  const rank_duplicates = new Set(ranks).size !== ranks.length;
  const missing_items = activeItems.some(i => !respMap.has(i.item_id));
  const out_of_range = responseItems.some(
    r => r.rank < 1 || r.rank > n || r.rating < cfg.rating_min || r.rating > cfg.rating_max
  );

  const rw = cfg.ranking_weight;
  const tw = cfg.rating_weight;

  const perValueRaw: Record<WorkValue, number> = Object.fromEntries(
    WORK_VALUES.map(v => [v, 0])
  ) as Record<WorkValue, number>;

  const counts: Record<WorkValue, number> = Object.fromEntries(
    WORK_VALUES.map(v => [v, 0])
  ) as Record<WorkValue, number>;

  for (const itm of activeItems) {
    const r = respMap.get(itm.item_id);
    if (!r) continue;

    const ranking_points = (n + 1) - r.rank;
    const combined = rw * ranking_points + tw * r.rating;

    perValueRaw[itm.work_value] += combined;
    counts[itm.work_value] += 1;
  }

  const value_scores: Record<WorkValue, ValueScore> = {} as Record<WorkValue, ValueScore>;
  const normVals: number[] = [];

  for (const v of WORK_VALUES) {
    const k = counts[v] || 0;
    const raw = perValueRaw[v] || 0;

    const { minRaw, maxRaw } = minMaxRawForValue(n, k, cfg);

    const normalized =
      k === 0 || maxRaw === minRaw
        ? normalizedMin
        : normalizedMin + ((raw - minRaw) / (maxRaw - minRaw)) * (normalizedMax - normalizedMin);

    const clamped = Math.max(normalizedMin, Math.min(normalizedMax, normalized));
    value_scores[v] = { raw, normalized: clamped, z: 0 };
    normVals.push(clamped);
  }

  const m = mean(normVals);
  const s = std(normVals);
  for (const v of WORK_VALUES) {
    value_scores[v].z = (value_scores[v].normalized - m) / s;
  }

  const rank_order = WORK_VALUES
    .map(v => ({ work_value: v, normalized: value_scores[v].normalized }))
    .sort((a, b) => b.normalized - a.normalized);

  return {
    response_id,
    user_id,
    n_items: n,
    value_scores,
    rank_order,
    checks: { rank_duplicates, missing_items, out_of_range },
  };
}

/**
 * Simplified scoring for rating-only assessments
 * Used when we only have ratings (1-5) without separate rankings
 */
export function scoreWipRatingsOnly(params: {
  response_id: string;
  user_id: string;
  items: WipItem[];
  ratings: Record<string, number>; // item_id -> rating (1-5)
}): ScoreResult {
  const { response_id, user_id, items, ratings } = params;
  
  // Convert ratings to response items with implicit ranking based on rating order
  const activeItems = items.filter(i => i.active !== false);
  
  // Create items with ratings
  const itemsWithRatings = activeItems
    .filter(item => ratings[item.item_id] !== undefined)
    .map(item => ({
      item_id: item.item_id,
      work_value: item.work_value,
      rating: ratings[item.item_id],
    }));
  
  // Sort by rating descending to derive implicit rank
  itemsWithRatings.sort((a, b) => b.rating - a.rating);
  
  // Assign ranks (1 = highest rating)
  const responseItems: WipResponseItem[] = itemsWithRatings.map((item, index) => ({
    item_id: item.item_id,
    rank: index + 1,
    rating: item.rating,
  }));
  
  return scoreWip({
    response_id,
    user_id,
    items,
    responseItems,
  });
}

// Vector math helpers
function dot(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

function norm(a: number[]): number {
  return Math.sqrt(dot(a, a)) || 1;
}

function cosine(a: number[], b: number[]): number {
  return dot(a, b) / (norm(a) * norm(b));
}

function pearson(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  const da = a.map(x => x - ma);
  const db = b.map(x => x - mb);
  return dot(da, db) / (norm(da) * norm(db));
}

function vectorFromScores(scores: Record<WorkValue, ValueScore>): number[] {
  return WORK_VALUES.map(v => scores[v].normalized);
}

function vectorFromOnet(profile: OnetWorkValuesProfile): number[] {
  return WORK_VALUES.map(v => profile.values[v]?.importance_0_100 ?? 50);
}

function topKValuesFromVector(vec: number[], k: number): WorkValue[] {
  return WORK_VALUES
    .map((v, i) => ({ v, x: vec[i] }))
    .sort((a, b) => b.x - a.x)
    .slice(0, k)
    .map(o => o.v);
}

/**
 * Match user's work values against O*NET occupation profiles
 */
export function matchOnetOccupations(params: {
  userScores: Record<WorkValue, ValueScore>;
  onetProfiles: OnetWorkValuesProfile[];
  method?: "cosine" | "pearson" | "hybrid_weighted_topk";
  topk?: number;
}): {
  method: string;
  matches: MatchResult[];
} {
  const method = params.method ?? "hybrid_weighted_topk";
  const topk = params.topk ?? 3;

  const userVec = vectorFromScores(params.userScores);
  const userTop = topKValuesFromVector(userVec, topk);

  const matches = params.onetProfiles.map(p => {
    const jobVec = vectorFromOnet(p);
    const jobTop = topKValuesFromVector(jobVec, topk);

    let score = 0;
    if (method === "cosine") {
      score = cosine(userVec, jobVec);
    } else if (method === "pearson") {
      score = pearson(userVec, jobVec);
    } else {
      // hybrid_weighted_topk
      const base = pearson(userVec, jobVec);
      const overlap = userTop.filter(v => jobTop.includes(v));
      const bonus = (overlap.length / topk) * 0.08;
      score = Math.max(-1, Math.min(1, base + bonus));
    }

    const overlaps = userTop.filter(v => jobTop.includes(v));
    return {
      onet_soc_code: p.onet_soc_code,
      title: p.title,
      score,
      explain: {
        top_user_values: userTop,
        top_job_values: jobTop,
        overlaps,
        user_vector: Object.fromEntries(WORK_VALUES.map((v, i) => [v, userVec[i]])) as Record<WorkValue, number>,
        job_vector: Object.fromEntries(WORK_VALUES.map((v, i) => [v, jobVec[i]])) as Record<WorkValue, number>,
      },
    };
  });

  matches.sort((a, b) => b.score - a.score);
  return { method, matches };
}

/**
 * Convert legacy rating responses (1-5 scale) to normalized scores
 * Used for backward compatibility with existing assessment data
 */
export function convertLegacyScores(
  legacyScores: Record<string, number>, // category -> raw score (sum of 1-5 ratings)
  itemsPerCategory: number = 4
): Record<WorkValue, ValueScore> {
  const maxPossible = itemsPerCategory * 5; // 4 items * max rating 5 = 20
  const minPossible = itemsPerCategory * 1; // 4 items * min rating 1 = 4
  
  const result: Record<WorkValue, ValueScore> = {} as Record<WorkValue, ValueScore>;
  const normVals: number[] = [];
  
  // Map legacy category names to WorkValue enum
  const categoryMap: Record<string, WorkValue> = {
    "Achievement": "Achievement",
    "Independence": "Independence",
    "Recognition": "Recognition",
    "Relationships": "Relationships",
    "Support": "Support",
    "Working Conditions": "Working_Conditions",
    "Working_Conditions": "Working_Conditions",
  };
  
  for (const v of WORK_VALUES) {
    const legacyKey = Object.keys(categoryMap).find(k => categoryMap[k] === v);
    const raw = legacyScores[legacyKey || v] || legacyScores[WORK_VALUE_LABELS[v]] || 0;
    
    const normalized = ((raw - minPossible) / (maxPossible - minPossible)) * 100;
    const clamped = Math.max(0, Math.min(100, normalized));
    
    result[v] = { raw, normalized: clamped, z: 0 };
    normVals.push(clamped);
  }
  
  // Calculate z-scores
  const m = mean(normVals);
  const s = std(normVals);
  for (const v of WORK_VALUES) {
    result[v].z = (result[v].normalized - m) / s;
  }
  
  return result;
}
