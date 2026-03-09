/**
 * Work Importance Profiler — Consistency Module
 * 
 * Placeholder for the full circular-triad coefficient of consistency
 * as used in the MIQ MRO5 scoring methodology.
 * 
 * TODO: Implement exact circular triad counting:
 * 1. From block rankings, derive implied paired comparisons for all C(21,2) = 210 pairs.
 * 2. For each triad of items (A,B,C), check if A>B, B>C, C>A (circular).
 * 3. consistency = 1 - (circularTriads / totalPossibleTriads)
 * 4. totalPossibleTriads for MIQ = 440 (from the specific block structure)
 * 
 * The simplified heuristic in scoring.ts is used until this is fully implemented.
 */

import type { BlockRanking } from './scoring';

/**
 * Derive all implied paired comparisons from block rankings.
 * Within each block, if item A is ranked higher (lower number) than item B,
 * then A > B is implied.
 * 
 * Returns a Map where key is `${winnerItemId}-${loserItemId}` and value is count.
 */
export function derivePairedComparisons(
  blockRankings: BlockRanking[]
): Map<string, number> {
  const comparisons = new Map<string, number>();

  for (const block of blockRankings) {
    const entries = Object.entries(block.rankings).map(([id, rank]) => ({
      id: Number(id),
      rank,
    }));

    // For each pair in this block
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        // Lower rank = more important = "wins"
        const winner = a.rank < b.rank ? a.id : b.id;
        const loser = a.rank < b.rank ? b.id : a.id;
        const key = `${winner}-${loser}`;
        comparisons.set(key, (comparisons.get(key) || 0) + 1);
      }
    }
  }

  return comparisons;
}

/**
 * Count circular triads from paired comparison data.
 * A circular triad exists when: A beats B, B beats C, and C beats A.
 * 
 * TODO: Implement this fully using the derived paired comparison matrix.
 */
export function countCircularTriads(
  _comparisons: Map<string, number>,
  _itemIds: number[]
): { circularTriads: number; totalTriads: number; coefficient: number } {
  // TODO: Full implementation
  // For now, return placeholder
  return {
    circularTriads: 0,
    totalTriads: 1330, // C(21, 3)
    coefficient: 1.0,
  };
}
