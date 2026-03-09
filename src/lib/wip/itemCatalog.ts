/**
 * Work Importance Profiler — Item Catalog
 * 
 * 21 work-need items based on the O*NET / DOL Work Importance Profiler.
 * Each item maps to one of 6 work-value scales.
 * 
 * REPLACE placeholder text with official DOL-style assessment content as needed.
 * Structure is designed to be editable without changing scoring logic.
 */

export interface WipItemConfig {
  /** Unique numeric ID (1–21) */
  id: number;
  /** Short identifier for the work need */
  needKey: string;
  /** Human-readable need label */
  needLabel: string;
  /** The scale (work value) this item belongs to */
  scaleKey: string;
  /** Full statement shown to the user during ranking */
  statement: string;
}

/**
 * The 21 work-need items.
 * INSERT OFFICIAL WORDING HERE — each `statement` field is the user-facing text.
 */
export const ITEM_CATALOG: WipItemConfig[] = [
  // Achievement (2 items)
  { id: 1,  needKey: "ability_utilization", needLabel: "Ability Utilization",          scaleKey: "achievement",        statement: "I make use of my abilities" },
  { id: 2,  needKey: "achievement",         needLabel: "Achievement",                  scaleKey: "achievement",        statement: "The work could give me a feeling of accomplishment" },

  // Working Conditions (6 items)
  { id: 3,  needKey: "activity",            needLabel: "Activity",                     scaleKey: "working_conditions", statement: "I could be busy all the time" },
  { id: 4,  needKey: "independence_wc",     needLabel: "Independence",                 scaleKey: "working_conditions", statement: "I could work alone" },
  { id: 5,  needKey: "variety",             needLabel: "Variety",                      scaleKey: "working_conditions", statement: "I could do something different every day" },
  { id: 6,  needKey: "compensation",        needLabel: "Compensation",                 scaleKey: "working_conditions", statement: "My pay would compare well with that of other workers" },
  { id: 7,  needKey: "security",            needLabel: "Security",                     scaleKey: "working_conditions", statement: "The job would provide for steady employment" },
  { id: 8,  needKey: "working_conditions",  needLabel: "Working Conditions",           scaleKey: "working_conditions", statement: "The job would have good working conditions" },

  // Recognition (4 items)
  { id: 9,  needKey: "advancement",         needLabel: "Advancement",                  scaleKey: "recognition",        statement: "The job would provide an opportunity for advancement" },
  { id: 10, needKey: "authority",           needLabel: "Authority",                    scaleKey: "recognition",        statement: "I could give directions and instructions to others" },
  { id: 11, needKey: "recognition",         needLabel: "Recognition",                  scaleKey: "recognition",        statement: "I could receive recognition for the work I do" },
  { id: 12, needKey: "social_status",       needLabel: "Social Status",                scaleKey: "recognition",        statement: "I would be looked up to by others in my company and my community" },

  // Independence (3 items)
  { id: 13, needKey: "creativity",          needLabel: "Creativity",                   scaleKey: "independence",       statement: "I could try out my own ideas" },
  { id: 14, needKey: "responsibility",      needLabel: "Responsibility",               scaleKey: "independence",       statement: "I could make decisions on my own" },
  { id: 15, needKey: "autonomy",            needLabel: "Autonomy",                     scaleKey: "independence",       statement: "I could plan my work with little supervision" },

  // Relationships (3 items)
  { id: 16, needKey: "coworkers",           needLabel: "Co-workers",                   scaleKey: "relationships",      statement: "My co-workers would be easy to get along with" },
  { id: 17, needKey: "social_service",      needLabel: "Social Service",               scaleKey: "relationships",      statement: "I could do things for other people" },
  { id: 18, needKey: "moral_values",        needLabel: "Moral Values",                 scaleKey: "relationships",      statement: "I would never be pressured to do things that go against my sense of right and wrong" },

  // Support (3 items)
  { id: 19, needKey: "company_policies",    needLabel: "Company Policies and Practices", scaleKey: "support",          statement: "I would be treated fairly by the company" },
  { id: 20, needKey: "supervision_hr",      needLabel: "Supervision, Human Relations",   scaleKey: "support",          statement: "I have supervisors who would back up their workers with management" },
  { id: 21, needKey: "supervision_tech",    needLabel: "Supervision, Technical",          scaleKey: "support",          statement: "I have supervisors who train their workers well" },
];

/** Lookup map: item id → item config */
export const ITEM_MAP = new Map(ITEM_CATALOG.map(item => [item.id, item]));
