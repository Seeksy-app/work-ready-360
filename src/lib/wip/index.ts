/**
 * Work Importance Profiler — Module Index
 * 
 * Re-exports all WIP config, scoring, and utility modules.
 */

// Config
export { ITEM_CATALOG, ITEM_MAP, type WipItemConfig } from './itemCatalog';
export { SCALE_MAP, SCALE_KEY_MAP, ITEM_TO_SCALE, type ScaleDefinition } from './scaleMap';
export { BLOCK_DEFINITIONS, verifyBlockStructure } from './blockDefinitions';

// Scoring
export {
  computeRawVotes,
  computeZeroPointRawVotes,
  computeAdjustedVotes,
  computeInitialZ,
  computeZeroPointZ,
  computeFinalItemScore,
  computeScaleScores,
  computeConsistencyScore,
  computeWipResult,
  getInterpretation,
  type BlockRanking,
  type ImportanceChoice,
  type ItemScoreDetail,
  type ScaleScoreDetail,
  type WipResultPayload,
} from './scoring';

// Consistency
export { derivePairedComparisons, countCircularTriads } from './consistency';
