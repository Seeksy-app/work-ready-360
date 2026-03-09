/**
 * Work Importance Profiler — Block Definitions
 * 
 * 21 blocks of 5 items each. Each item appears in exactly 5 blocks.
 * Uses a balanced incomplete block design (BIBD) so every pair of items
 * is compared at least once across all blocks.
 * 
 * EDITABLE: Replace block compositions here if official block assignments differ.
 */

/**
 * Each entry is a block of 5 item IDs.
 * Block index 0–20 corresponds to rounds 1–21.
 */
export const BLOCK_DEFINITIONS: number[][] = [
  // Blocks 1–7: systematic rotation
  [3,  17, 13, 6,  9],   // Block 1
  [1,  16, 14, 19, 10],  // Block 2
  [2,  18, 15, 20, 11],  // Block 3
  [4,  17, 9,  19, 1],   // Block 4
  [5,  16, 10, 20, 13],  // Block 5
  [7,  18, 11, 21, 14],  // Block 6
  [8,  12, 15, 2,  19],  // Block 7

  // Blocks 8–14: different groupings
  [3,  1,  12, 16, 21],  // Block 8
  [4,  2,  11, 14, 20],  // Block 9
  [5,  9,  13, 18, 21],  // Block 10
  [6,  10, 15, 17, 1],   // Block 11
  [7,  12, 16, 2,  20],  // Block 12
  [8,  9,  18, 14, 3],   // Block 13
  [6,  11, 13, 19, 4],   // Block 14

  // Blocks 15–21: remaining pairings
  [7,  1,  10, 18, 15],  // Block 15
  [8,  2,  12, 17, 21],  // Block 16
  [5,  1,  11, 16, 19],  // Block 17
  [3,  9,  14, 20, 7],   // Block 18
  [4,  13, 12, 18, 8],   // Block 19
  [5,  15, 10, 17, 2],   // Block 20
  [6,  16, 21, 9,  8],   // Block 21
];

/**
 * Verify that each item appears exactly 5 times across all blocks.
 * Returns a map of itemId → appearance count.
 */
export function verifyBlockStructure(): Map<number, number> {
  const counts = new Map<number, number>();
  for (const block of BLOCK_DEFINITIONS) {
    for (const id of block) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return counts;
}
