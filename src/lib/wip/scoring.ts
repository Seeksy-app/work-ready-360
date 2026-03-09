/**
 * Work Importance Profiler — Scoring Engine
 * 
 * Implements the exact O*NET / DOL-style forced-ranking scoring methodology.
 * This file is the SOURCE OF TRUTH for all scoring math.
 * 
 * DO NOT simplify or paraphrase the scoring steps.
 * Each step is documented with its formula and range.
 */

import { ITEM_CATALOG } from './itemCatalog';
import { SCALE_MAP, ITEM_TO_SCALE } from './scaleMap';
import { BLOCK_DEFINITIONS } from './blockDefinitions';

// ─── Types ───────────────────────────────────────────────────────────

export interface BlockRanking {
  blockIndex: number;
  /** Map of itemId → rank (1–5, 1 = most important) */
  rankings: Record<number, number>;
}

export interface ImportanceChoice {
  itemId: number;
  isImportant: boolean;
}

export interface ItemScoreDetail {
  itemId: number;
  needKey: string;
  needLabel: string;
  scaleKey: string;
  rawVotes: number;
  adjustedVotes: number;
  p: number;
  initialZ: number;
  finalScore: number;
  isImportant: boolean;
}

export interface ScaleScoreDetail {
  key: string;
  label: string;
  score: number;
  rank: number;
  interpretation: string;
  itemScores: ItemScoreDetail[];
}

export interface WipResultPayload {
  sessionId: string;
  zeroPointRawVotes: number;
  zeroPointZ: number;
  consistencyScore: number | null;
  consistencyFlag: boolean;
  itemScores: ItemScoreDetail[];
  scaleScores: ScaleScoreDetail[];
  topScales: [string, string];
}

// ─── Inverse Normal CDF ──────────────────────────────────────────────
// Rational approximation of the inverse standard normal CDF (probit).
// Based on Peter Acklam's algorithm — accurate to ~1.15e-9.

function inverseNormalCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Coefficients for rational approximation
  const a = [
    -3.969683028665376e1,
     2.209460984245205e2,
    -2.759285104469687e2,
     1.383577518672690e2,
    -3.066479806614716e1,
     2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1,
     1.615858368580409e2,
    -1.556989798598866e2,
     6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838e0,
    -2.549732539343734e0,
     4.374664141464968e0,
     2.938163982698783e0,
  ];
  const d = [
     7.784695709041462e-3,
     3.224671290700398e-1,
     2.445134137142996e0,
     3.754408661907416e0,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;

  if (p < pLow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    // Rational approximation for central region
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
}

// ─── Scoring Functions (pure, unit-testable) ─────────────────────────

/**
 * STEP 1: Compute raw votes for each item.
 * rawVotes = 25 - sumOfRanks
 * 
 * Each item appears in 5 blocks, ranks are 1–5 each time.
 * Sum of ranks ranges from 5 (always ranked 1st) to 25 (always ranked 5th).
 * So rawVotes ranges from 0 to 20.
 */
export function computeRawVotes(
  blockRankings: BlockRanking[]
): Map<number, number> {
  const rankSums = new Map<number, number>();

  for (const block of blockRankings) {
    for (const [itemIdStr, rank] of Object.entries(block.rankings)) {
      const itemId = Number(itemIdStr);
      rankSums.set(itemId, (rankSums.get(itemId) || 0) + rank);
    }
  }

  const rawVotes = new Map<number, number>();
  for (const [itemId, sum] of rankSums) {
    rawVotes.set(itemId, 25 - sum);
  }
  return rawVotes;
}

/**
 * STEP 2: Compute zero-point raw votes.
 * zeroPointRawVotes = count of items marked "Not Important"
 */
export function computeZeroPointRawVotes(
  importanceChoices: ImportanceChoice[]
): number {
  return importanceChoices.filter(c => !c.isImportant).length;
}

/**
 * STEP 3: Compute adjusted votes and proportion p for each item.
 * adjustedVotes = rawVotes + 0.5 + importantFlag
 * p = adjustedVotes / 22
 * 
 * The +0.5 avoids proportions of 0 or 1.
 * The +1 for Important means the item is treated as beating the zero point.
 */
export function computeAdjustedVotes(
  rawVotes: number,
  isImportant: boolean
): { adjustedVotes: number; p: number } {
  const importantFlag = isImportant ? 1 : 0;
  const adjustedVotes = rawVotes + 0.5 + importantFlag;
  const p = adjustedVotes / 22;
  return { adjustedVotes, p };
}

/**
 * STEP 4: Convert proportion p to initial z-score.
 * Uses the inverse standard normal CDF.
 */
export function computeInitialZ(p: number): number {
  return inverseNormalCDF(p);
}

/**
 * STEP 5: Compute zero-point z-score.
 * zeroPointAdjustedVotes = zeroPointRawVotes + 0.5
 * zeroPointP = zeroPointAdjustedVotes / 22
 * zeroPointZ = inverseNormalCDF(zeroPointP)
 */
export function computeZeroPointZ(zeroPointRawVotes: number): {
  zeroPointP: number;
  zeroPointZ: number;
} {
  const zeroPointAdjustedVotes = zeroPointRawVotes + 0.5;
  const zeroPointP = zeroPointAdjustedVotes / 22;
  const zeroPointZ = inverseNormalCDF(zeroPointP);
  return { zeroPointP, zeroPointZ };
}

/**
 * STEP 6: Compute final item score.
 * finalItemScore = initialZ - zeroPointZ
 */
export function computeFinalItemScore(
  initialZ: number,
  zeroPointZ: number
): number {
  return initialZ - zeroPointZ;
}

/**
 * STEP 7: Compute scale scores.
 * Average final item scores within each scale.
 */
export function computeScaleScores(
  itemScores: ItemScoreDetail[]
): ScaleScoreDetail[] {
  const scaleScores: ScaleScoreDetail[] = SCALE_MAP.map(scale => {
    const items = itemScores.filter(i => i.scaleKey === scale.key);
    const avg = items.length > 0
      ? items.reduce((sum, i) => sum + i.finalScore, 0) / items.length
      : 0;
    return {
      key: scale.key,
      label: scale.label,
      score: Math.round(avg * 1000) / 1000,
      rank: 0, // assigned below
      interpretation: getInterpretation(avg),
      itemScores: items,
    };
  });

  // Assign ranks (1 = highest)
  scaleScores.sort((a, b) => b.score - a.score);
  scaleScores.forEach((s, i) => { s.rank = i + 1; });

  return scaleScores;
}

/**
 * Interpretation labels per spec.
 */
export function getInterpretation(score: number): string {
  if (score >= 1.5) return 'High';
  if (score >= 1.0) return 'Moderately High';
  if (score >= 0.0) return 'Low';
  return 'Very Low';
}

// ─── Consistency Check ───────────────────────────────────────────────

/**
 * Coefficient of consistency placeholder.
 * 
 * The full MIQ coefficient of consistency counts circular triads
 * in paired-comparison data derived from the 21 blocks.
 * A circular triad is when A > B, B > C, but C > A.
 * 
 * Full formula: consistency = 1 - (circularTriads / totalTriads)
 * where totalTriads = C(21, 3) = 1330 (or 440 for MIQ's 21-item design)
 * 
 * TODO: Implement exact circular triad counting from block rankings.
 * For now, uses a simplified heuristic based on rank variance.
 */
export function computeConsistencyScore(
  blockRankings: BlockRanking[]
): number | null {
  // Simplified heuristic: measure how consistent each item's rank is
  // across its 5 appearances. Low variance = high consistency.
  const itemRanks = new Map<number, number[]>();

  for (const block of blockRankings) {
    for (const [idStr, rank] of Object.entries(block.rankings)) {
      const id = Number(idStr);
      if (!itemRanks.has(id)) itemRanks.set(id, []);
      itemRanks.get(id)!.push(rank);
    }
  }

  if (itemRanks.size === 0) return null;

  // Compute average rank variance across all items
  let totalVariance = 0;
  let count = 0;
  for (const ranks of itemRanks.values()) {
    if (ranks.length < 2) continue;
    const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    const variance = ranks.reduce((s, r) => s + (r - mean) ** 2, 0) / ranks.length;
    totalVariance += variance;
    count++;
  }

  if (count === 0) return null;

  const avgVariance = totalVariance / count;
  // Max possible variance for uniform ranks 1-5 is about 2.0
  // Normalize to 0-1 scale where 1 = perfectly consistent
  const maxVariance = 2.0;
  const consistency = Math.max(0, Math.min(1, 1 - avgVariance / maxVariance));
  return Math.round(consistency * 1000) / 1000;
}

// ─── Master Scoring Function ─────────────────────────────────────────

/**
 * Compute the complete WIP result payload.
 * This is the single entry point for scoring an entire assessment.
 */
export function computeWipResult(params: {
  sessionId: string;
  blockRankings: BlockRanking[];
  importanceChoices: ImportanceChoice[];
}): WipResultPayload {
  const { sessionId, blockRankings, importanceChoices } = params;

  // Build importance lookup
  const importanceMap = new Map(
    importanceChoices.map(c => [c.itemId, c.isImportant])
  );

  // Step 1: Raw votes
  const rawVotesMap = computeRawVotes(blockRankings);

  // Step 2: Zero-point raw votes
  const zeroPointRawVotes = computeZeroPointRawVotes(importanceChoices);

  // Step 5: Zero-point z
  const { zeroPointZ } = computeZeroPointZ(zeroPointRawVotes);

  // Steps 3–6: Per-item scoring
  const itemScores: ItemScoreDetail[] = ITEM_CATALOG.map(item => {
    const rawVotes = rawVotesMap.get(item.id) ?? 0;
    const isImportant = importanceMap.get(item.id) ?? false;

    // Step 3
    const { adjustedVotes, p } = computeAdjustedVotes(rawVotes, isImportant);

    // Step 4
    const initialZ = computeInitialZ(p);

    // Step 6
    const finalScore = computeFinalItemScore(initialZ, zeroPointZ);

    return {
      itemId: item.id,
      needKey: item.needKey,
      needLabel: item.needLabel,
      scaleKey: item.scaleKey,
      rawVotes,
      adjustedVotes,
      p: Math.round(p * 10000) / 10000,
      initialZ: Math.round(initialZ * 1000) / 1000,
      finalScore: Math.round(finalScore * 1000) / 1000,
      isImportant,
    };
  });

  // Step 7: Scale scores
  const scaleScores = computeScaleScores(itemScores);

  // Consistency
  const consistencyScore = computeConsistencyScore(blockRankings);
  const consistencyFlag = consistencyScore !== null && consistencyScore < 0.30;

  // Top 2 scales
  const sorted = [...scaleScores].sort((a, b) => a.rank - b.rank);
  const topScales: [string, string] = [
    sorted[0]?.label ?? '',
    sorted[1]?.label ?? '',
  ];

  return {
    sessionId,
    zeroPointRawVotes,
    zeroPointZ: Math.round(zeroPointZ * 1000) / 1000,
    consistencyScore,
    consistencyFlag,
    itemScores: itemScores.sort((a, b) => b.finalScore - a.finalScore),
    scaleScores,
    topScales,
  };
}
