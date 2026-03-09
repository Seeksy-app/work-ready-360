/**
 * Shared types for WIP ranking components.
 * Components accept this generic item shape so they work
 * with both old WipItem and new WipItemConfig.
 */
export interface RankableItem {
  /** Unique string key used in ranking maps */
  key: string;
  /** Display text */
  text: string;
}
