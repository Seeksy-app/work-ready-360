/**
 * Work Importance Profiler — Scale Map
 * 
 * Maps the 6 work-value scales to their constituent item IDs.
 * This is the single source of truth for which items belong to which scale.
 * 
 * EDITABLE: Adjust item assignments here without touching scoring logic.
 */

export interface ScaleDefinition {
  key: string;
  label: string;
  description: string;
  itemIds: number[];
}

/**
 * The 6 work-value scales.
 * INSERT OFFICIAL DESCRIPTIONS HERE as needed.
 */
export const SCALE_MAP: ScaleDefinition[] = [
  {
    key: "achievement",
    label: "Achievement",
    description: "Occupations that let you use your best abilities and give a sense of accomplishment.",
    itemIds: [1, 2],
  },
  {
    key: "working_conditions",
    label: "Working Conditions",
    description: "Occupations with good working conditions, job security, good pay, and variety.",
    itemIds: [3, 4, 5, 6, 7, 8],
  },
  {
    key: "recognition",
    label: "Recognition",
    description: "Occupations that provide advancement, leadership opportunities, and prestige.",
    itemIds: [9, 10, 11, 12],
  },
  {
    key: "relationships",
    label: "Relationships",
    description: "Occupations with friendly coworkers, service to others, and moral alignment.",
    itemIds: [16, 17, 18],
  },
  {
    key: "support",
    label: "Support",
    description: "Occupations where management is supportive, fair, and trains workers well.",
    itemIds: [19, 20, 21],
  },
  {
    key: "independence",
    label: "Independence",
    description: "Occupations that let you work autonomously, be creative, and make your own decisions.",
    itemIds: [13, 14, 15],
  },
];

/** Lookup map: scale key → ScaleDefinition */
export const SCALE_KEY_MAP = new Map(SCALE_MAP.map(s => [s.key, s]));

/** Reverse lookup: item id → scale key */
export const ITEM_TO_SCALE = new Map<number, string>();
for (const scale of SCALE_MAP) {
  for (const id of scale.itemIds) {
    ITEM_TO_SCALE.set(id, scale.key);
  }
}
