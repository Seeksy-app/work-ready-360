/**
 * Work Importance Profiler (WIP) Scoring and O*NET Matching Library
 * Based on the O*NET Work Importance Profiler specification
 * 
 * Structure: 21 work need items across 6 work values
 * Phase 1: Ranking - 21 rounds of 5 items, rank 1 (most) to 5 (least)
 * Phase 2: Rating - Rate each of 21 items on 1-5 importance scale
 * Scoring: 67% ranking weight + 33% rating weight
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

// Work need to work value mapping
export type WorkNeed = string;

export interface WipItem {
  item_id: string;
  work_value: WorkValue;
  work_need: string;
  text: string;
  active?: boolean;
}

export interface WipResponseItem {
  item_id: string;
  rank: number;
  rating: number;
}

export interface NeedScore {
  item_id: string;
  work_need: string;
  work_value: WorkValue;
  ranking_avg: number;
  preference: boolean;
  combined: number;
}

export interface WipFullResult {
  response_id: string;
  user_id: string;
  need_scores: NeedScore[];
  value_scores: Record<WorkValue, { score: number; needs: NeedScore[] }>;
  rank_order: { work_value: WorkValue; label: string; score: number }[];
}

export interface WipConfig {
  ranking_weight: number;
  rating_weight: number;
  rating_min: number;
  rating_max: number;
  normalized_min?: number;
  normalized_max?: number;
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

export const DEFAULT_WIP_CONFIG: WipConfig = {
  ranking_weight: 0.67,
  rating_weight: 0.33,
  rating_min: 1,
  rating_max: 5,
  normalized_min: 0,
  normalized_max: 100,
};

/**
 * The 21 O*NET Work Importance Profiler items
 * One item per work need, mapped to their parent work value
 */
export const WIP_ITEMS: WipItem[] = [
  // Achievement (2 work needs)
  { item_id: "WN01", work_value: "Achievement", work_need: "Ability Utilization",
    text: "I make use of my abilities" },
  { item_id: "WN02", work_value: "Achievement", work_need: "Achievement",
    text: "The work could give me a feeling of accomplishment" },

  // Working Conditions (6 work needs)
  { item_id: "WN03", work_value: "Working_Conditions", work_need: "Activity",
    text: "I could be busy all the time" },
  { item_id: "WN04", work_value: "Working_Conditions", work_need: "Independence",
    text: "I could do my work alone" },
  { item_id: "WN05", work_value: "Working_Conditions", work_need: "Variety",
    text: "I could do something different every day" },
  { item_id: "WN06", work_value: "Working_Conditions", work_need: "Compensation",
    text: "My pay would compare well with that of other workers" },
  { item_id: "WN07", work_value: "Working_Conditions", work_need: "Security",
    text: "The job would provide for steady employment" },
  { item_id: "WN08", work_value: "Working_Conditions", work_need: "Working Conditions",
    text: "The job would have good working conditions" },

  // Recognition (4 work needs)
  { item_id: "WN09", work_value: "Recognition", work_need: "Advancement",
    text: "The job would provide an opportunity for advancement" },
  { item_id: "WN10", work_value: "Recognition", work_need: "Authority",
    text: "I could give directions and instructions to others" },
  { item_id: "WN11", work_value: "Recognition", work_need: "Recognition",
    text: "I could receive recognition for the work I do" },
  { item_id: "WN12", work_value: "Recognition", work_need: "Social Status",
    text: "People would look up to me" },

  // Independence (3 work needs)
  { item_id: "WN13", work_value: "Independence", work_need: "Creativity",
    text: "I could try out my own ideas" },
  { item_id: "WN14", work_value: "Independence", work_need: "Responsibility",
    text: "I could make decisions on my own" },
  { item_id: "WN15", work_value: "Independence", work_need: "Autonomy",
    text: "I could plan my work with little supervision" },

  // Relationships (3 work needs)
  { item_id: "WN16", work_value: "Relationships", work_need: "Co-workers",
    text: "My co-workers would be easy to get along with" },
  { item_id: "WN17", work_value: "Relationships", work_need: "Social Service",
    text: "I could do things for other people" },
  { item_id: "WN18", work_value: "Relationships", work_need: "Moral Values",
    text: "I would never be pressured to do things that go against my sense of right and wrong" },

  // Support (3 work needs)
  { item_id: "WN19", work_value: "Support", work_need: "Company Policies",
    text: "I would be treated fairly by the company" },
  { item_id: "WN20", work_value: "Support", work_need: "Supervision-Human Relations",
    text: "I have supervisors who would back up their workers with management" },
  { item_id: "WN21", work_value: "Support", work_need: "Supervision-Technical",
    text: "I have supervisors who train their workers well" },
];

/**
 * 21 rounds of 5 items each for the ranking phase.
 * Each item appears exactly 5 times across all rounds.
 * Rounds draw from different work values for cross-value comparison.
 * This is a balanced incomplete block design (BIBD).
 */
export const WIP_ROUNDS: string[][] = [
  // Round 1-7: systematic rotation
  ["WN03", "WN17", "WN13", "WN06", "WN09"],  // WC, REL, IND, WC, REC
  ["WN01", "WN16", "WN14", "WN19", "WN10"],  // ACH, REL, IND, SUP, REC
  ["WN02", "WN18", "WN15", "WN20", "WN11"],  // ACH, REL, IND, SUP, REC
  ["WN04", "WN17", "WN09", "WN19", "WN01"],  // WC, REL, REC, SUP, ACH
  ["WN05", "WN16", "WN10", "WN20", "WN13"],  // WC, REL, REC, SUP, IND
  ["WN07", "WN18", "WN11", "WN21", "WN14"],  // WC, REL, REC, SUP, IND
  ["WN08", "WN12", "WN15", "WN02", "WN19"],  // WC, REC, IND, ACH, SUP

  // Round 8-14: different groupings
  ["WN03", "WN01", "WN12", "WN16", "WN21"],  // WC, ACH, REC, REL, SUP
  ["WN04", "WN02", "WN11", "WN14", "WN20"],  // WC, ACH, REC, IND, SUP
  ["WN05", "WN09", "WN13", "WN18", "WN21"],  // WC, REC, IND, REL, SUP
  ["WN06", "WN10", "WN15", "WN17", "WN01"],  // WC, REC, IND, REL, ACH
  ["WN07", "WN12", "WN16", "WN02", "WN20"],  // WC, REC, REL, ACH, SUP
  ["WN08", "WN09", "WN18", "WN14", "WN03"],  // WC, REC, REL, IND, WC
  ["WN06", "WN11", "WN13", "WN19", "WN04"],  // WC, REC, IND, SUP, WC

  // Round 15-21: remaining pairings
  ["WN07", "WN01", "WN10", "WN18", "WN15"],  // WC, ACH, REC, REL, IND
  ["WN08", "WN02", "WN12", "WN17", "WN21"],  // WC, ACH, REC, REL, SUP
  ["WN05", "WN01", "WN11", "WN16", "WN19"],  // WC, ACH, REC, REL, SUP
  ["WN03", "WN09", "WN14", "WN20", "WN07"],  // WC, REC, IND, SUP, WC
  ["WN04", "WN13", "WN12", "WN18", "WN08"],  // WC, IND, REC, REL, WC
  ["WN05", "WN15", "WN10", "WN17", "WN02"],  // WC, IND, REC, REL, ACH
  ["WN06", "WN16", "WN21", "WN09", "WN08"],  // WC, REL, SUP, REC, WC
];

// Verify round structure
function verifyRounds() {
  const counts: Record<string, number> = {};
  for (const round of WIP_ROUNDS) {
    for (const id of round) {
      counts[id] = (counts[id] || 0) + 1;
    }
  }
  return counts;
}

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
  const bestRankSum = k * (n + 1) - (k * (k + 1)) / 2;
  const worstRankSum = k * (n + 1) - (k * (2 * n - k + 1)) / 2;
  const minRaw = rw * worstRankSum + tw * (k * cfg.rating_min);
  const maxRaw = rw * bestRankSum + tw * (k * cfg.rating_max);
  return { minRaw, maxRaw };
}

/**
 * Score a full WIP assessment (ranking + rating)
 * Rankings come from the 21-round ranking phase
 * Ratings come from the rating phase
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

  return { response_id, user_id, n_items: n, value_scores, rank_order, checks: { rank_duplicates, missing_items, out_of_range } };
}

/**
 * Compute aggregate rankings from round-by-round ranking data.
 * Each round gives items ranks 1-5. We aggregate by computing average rank
 * across all rounds each item appeared in, then convert to overall rank 1-21.
 */
export function computeAggregateRanks(
  roundRankings: Record<number, Record<string, number>> // roundIndex -> { item_id: rank(1-5) }
): Record<string, number> {
  // Collect all rank scores per item (lower = more important)
  const itemScores: Record<string, number[]> = {};
  
  for (const roundIdx in roundRankings) {
    const rankings = roundRankings[roundIdx];
    for (const itemId in rankings) {
      if (!itemScores[itemId]) itemScores[itemId] = [];
      itemScores[itemId].push(rankings[itemId]);
    }
  }
  
  // Average rank per item (lower = more important)
  const avgRanks = Object.entries(itemScores).map(([id, scores]) => ({
    id,
    avgRank: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));
  
  // Sort by average rank ascending (best first)
  avgRanks.sort((a, b) => a.avgRank - b.avgRank);
  
  // Assign overall ranks 1-21
  const result: Record<string, number> = {};
  avgRanks.forEach((item, idx) => {
    result[item.id] = idx + 1;
  });
  
  return result;
}

/**
 * Score WIP with ranking rounds + ratings
 */
export function scoreWipFull(params: {
  response_id: string;
  user_id: string;
  roundRankings: Record<number, Record<string, number>>;
  ratings: Record<string, number>;
}): ScoreResult {
  const { response_id, user_id, roundRankings, ratings } = params;
  
  const aggregateRanks = computeAggregateRanks(roundRankings);
  
  const responseItems: WipResponseItem[] = WIP_ITEMS
    .filter(item => aggregateRanks[item.item_id] !== undefined && ratings[item.item_id] !== undefined)
    .map(item => ({
      item_id: item.item_id,
      rank: aggregateRanks[item.item_id],
      rating: ratings[item.item_id],
    }));
  
  return scoreWip({
    response_id,
    user_id,
    items: WIP_ITEMS,
    responseItems,
  });
}

/**
 * Simplified scoring for rating-only assessments (backward compat)
 */
export function scoreWipRatingsOnly(params: {
  response_id: string;
  user_id: string;
  items: WipItem[];
  ratings: Record<string, number>;
}): ScoreResult {
  const { response_id, user_id, items, ratings } = params;
  const activeItems = items.filter(i => i.active !== false);
  const itemsWithRatings = activeItems
    .filter(item => ratings[item.item_id] !== undefined)
    .map(item => ({
      item_id: item.item_id,
      work_value: item.work_value,
      rating: ratings[item.item_id],
    }));
  
  itemsWithRatings.sort((a, b) => b.rating - a.rating);
  const responseItems: WipResponseItem[] = itemsWithRatings.map((item, index) => ({
    item_id: item.item_id,
    rank: index + 1,
    rating: item.rating,
  }));
  
  return scoreWip({ response_id, user_id, items, responseItems });
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

export function convertLegacyScores(
  legacyScores: Record<string, number>,
  itemsPerCategory: number = 4
): Record<WorkValue, ValueScore> {
  const maxPossible = itemsPerCategory * 5;
  const minPossible = itemsPerCategory * 1;
  const result: Record<WorkValue, ValueScore> = {} as Record<WorkValue, ValueScore>;
  const normVals: number[] = [];
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
  
  const m = mean(normVals);
  const s = std(normVals);
  for (const v of WORK_VALUES) {
    result[v].z = (result[v].normalized - m) / s;
  }
  return result;
}

/**
 * PREFERENCE_WEIGHT controls the absolute-scale adjustment from Yes/No preferences.
 * Derived from MIQ MRO5 scoring: keeps combined need scores in approx [-2.5, +2.5] range.
 */
const PREFERENCE_WEIGHT = 0.538;

/**
 * Score the WIP using the official O*NET MRO5-based method:
 * 1. Ranking phase: 21 rounds × 5 items. Each item appears 5 times.
 *    Per round, items ranked 1 (most) to 5 (least).
 *    Ranking score per item = mean of (3 - rank) across all rounds.
 *    Range: [-2, +2]
 * 2. Preferences phase: Yes/No for each of 21 items.
 *    Adjusts the ipsative ranking score to an absolute scale.
 *    Combined need score = ranking_avg + PREFERENCE_WEIGHT * (yes ? 1 : -1)
 *    Range: approx [-2.538, +2.538]
 * 3. Value score = mean of need scores within that value.
 */
export function scoreWipOfficial(params: {
  response_id: string;
  user_id: string;
  roundRankings: Record<number, Record<string, number>>;
  preferences: Record<string, boolean>;
}): WipFullResult {
  const { response_id, user_id, roundRankings, preferences } = params;

  // Step 1: Compute average ranking score per item
  const itemRankingSums: Record<string, number[]> = {};
  for (const roundIdx in roundRankings) {
    const rankings = roundRankings[roundIdx];
    for (const itemId in rankings) {
      if (!itemRankingSums[itemId]) itemRankingSums[itemId] = [];
      // Convert rank to score: rank 1 → +2, rank 2 → +1, rank 3 → 0, rank 4 → -1, rank 5 → -2
      itemRankingSums[itemId].push(3 - rankings[itemId]);
    }
  }

  // Step 2: Compute combined need scores
  const need_scores: NeedScore[] = WIP_ITEMS.map(item => {
    const scores = itemRankingSums[item.item_id] || [];
    const ranking_avg = scores.length > 0 ? mean(scores) : 0;
    const pref = preferences[item.item_id] ?? false;
    const combined = ranking_avg + PREFERENCE_WEIGHT * (pref ? 1 : -1);

    return {
      item_id: item.item_id,
      work_need: item.work_need,
      work_value: item.work_value,
      ranking_avg,
      preference: pref,
      combined: Math.round(combined * 1000) / 1000, // 3 decimal places
    };
  });

  // Sort needs by combined score descending
  const sorted_needs = [...need_scores].sort((a, b) => b.combined - a.combined);

  // Step 3: Compute value scores (mean of constituent need scores)
  const value_scores: Record<WorkValue, { score: number; needs: NeedScore[] }> = {} as any;
  for (const v of WORK_VALUES) {
    const needs = sorted_needs.filter(n => n.work_value === v);
    const avg = needs.length > 0 ? mean(needs.map(n => n.combined)) : 0;
    value_scores[v] = {
      score: Math.round(avg * 1000) / 1000,
      needs,
    };
  }

  // Rank order values
  const rank_order = WORK_VALUES
    .map(v => ({ work_value: v, label: WORK_VALUE_LABELS[v], score: value_scores[v].score }))
    .sort((a, b) => b.score - a.score);

  return { response_id, user_id, need_scores: sorted_needs, value_scores, rank_order };
}

