/**
 * WIP Demo Seed Utility
 * 
 * Seeds one completed WIP session for Appletonab@gmail.com
 * with exact item-level final scores and computed scale scores.
 * Idempotent: updates existing demo session if present.
 */

import { supabase } from '@/integrations/supabase/client';
import { ITEM_CATALOG } from './itemCatalog';
import { SCALE_MAP } from './scaleMap';
import { getInterpretation } from './scoring';

/** Exact seeded item scores by needLabel */
const SEEDED_ITEM_SCORES: Record<string, number> = {
  "Creativity": 2.538,
  "Ability Utilization": 1.536,
  "Independence": 1.536,
  "Autonomy": 1.536,
  "Achievement": 1.363,
  "Responsibility": 1.363,
  "Social Service": 0.710,
  "Company Policies and Practices": 0.710,
  "Working Conditions": 0.595,
  "Advancement": 0.595,
  "Security": 0.481,
  "Variety": 0.249,
  "Compensation": 0.249,
  "Recognition": 0.249,
  "Co-workers": 0.249,
  "Supervision, Technical": 0.128,
  "Activity": -0.136,
  "Social Status": -0.136,
  "Supervision, Human Relations": -0.136,
  "Moral Values": -0.287,
  "Authority": -0.669,
};

const DEMO_EMAIL = 'appletonab@gmail.com';

interface ScaleResult {
  key: string;
  label: string;
  score: number;
  rank: number;
  interpretation: string;
}

export function computeScaleScoresFromSeededItems(): ScaleResult[] {
  const results: ScaleResult[] = SCALE_MAP.map(scale => {
    const items = ITEM_CATALOG.filter(i => scale.itemIds.includes(i.id));
    const scores = items.map(i => SEEDED_ITEM_SCORES[i.needLabel] ?? 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      key: scale.key,
      label: scale.label,
      score: Math.round(avg * 10000) / 10000,
      rank: 0,
      interpretation: getInterpretation(avg),
    };
  });

  results.sort((a, b) => b.score - a.score);
  results.forEach((s, i) => { s.rank = i + 1; });
  return results;
}

export async function seedAndrewWipScores(): Promise<{
  sessionId: string;
  topScales: [string, string];
  scaleScores: ScaleResult[];
}> {
  // 1. Find or create user profile for demo email
  const { data: profileData } = await supabase
    .from('profiles')
    .select('user_id')
    .ilike('email', DEMO_EMAIL)
    .limit(1)
    .single();

  if (!profileData) {
    throw new Error(`No user found with email ${DEMO_EMAIL}. The user must sign up first.`);
  }

  const userId = profileData.user_id;

  // 2. Check for existing demo session
  const { data: existingSession } = await supabase
    .from('wip_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('is_demo' as any, true)
    .limit(1)
    .single();

  let sessionId: string;

  if (existingSession) {
    sessionId = existingSession.id;
    // Clean existing scores
    await supabase.from('wip_item_scores').delete().eq('session_id', sessionId);
    await supabase.from('wip_scale_scores').delete().eq('session_id', sessionId);
  } else {
    // Create new session
    const { data: newSession, error } = await supabase
      .from('wip_sessions')
      .insert({
        user_id: userId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        source: 'manual_seed',
        is_demo: true,
        consistency_score: null,
        consistency_flag: false,
        zero_point_raw_votes: null,
        zero_point_z: null,
      } as any)
      .select('id')
      .single();

    if (error || !newSession) throw new Error(`Failed to create session: ${error?.message}`);
    sessionId = newSession.id;
  }

  // 3. Insert item scores
  const itemScoreRows = ITEM_CATALOG.map(item => ({
    session_id: sessionId,
    item_id: item.id,
    raw_votes: 0,
    adjusted_votes: 0,
    proportion_p: 0,
    initial_z: 0,
    final_score: SEEDED_ITEM_SCORES[item.needLabel] ?? 0,
  }));

  const { error: itemError } = await supabase.from('wip_item_scores').insert(itemScoreRows);
  if (itemError) throw new Error(`Failed to insert item scores: ${itemError.message}`);

  // 4. Compute and insert scale scores
  const scaleScores = computeScaleScoresFromSeededItems();

  const scaleRows = scaleScores.map(ss => ({
    session_id: sessionId,
    scale_key: ss.key,
    scale_label: ss.label,
    score: ss.score,
    rank_order: ss.rank,
  }));

  const { error: scaleError } = await supabase.from('wip_scale_scores').insert(scaleRows);
  if (scaleError) throw new Error(`Failed to insert scale scores: ${scaleError.message}`);

  // 5. Update session with top scales and result payload
  const topScales: [string, string] = [scaleScores[0].label, scaleScores[1].label];

  const resultPayload = {
    sessionId,
    zeroPointRawVotes: null,
    zeroPointZ: null,
    consistencyScore: null,
    consistencyFlag: false,
    itemScores: ITEM_CATALOG.map(item => ({
      itemId: item.id,
      needKey: item.needKey,
      needLabel: item.needLabel,
      scaleKey: item.scaleKey,
      rawVotes: 0,
      adjustedVotes: 0,
      p: 0,
      initialZ: 0,
      finalScore: SEEDED_ITEM_SCORES[item.needLabel] ?? 0,
      isImportant: false,
    })).sort((a, b) => b.finalScore - a.finalScore),
    scaleScores: scaleScores.map(s => ({
      key: s.key,
      label: s.label,
      score: s.score,
      rank: s.rank,
      interpretation: s.interpretation,
    })),
    topScales,
  };

  await supabase
    .from('wip_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      top_scale_1: topScales[0],
      top_scale_2: topScales[1],
      source: 'manual_seed',
      is_demo: true,
      consistency_score: null,
      consistency_flag: false,
      result_payload: resultPayload as any,
    } as any)
    .eq('id', sessionId);

  // 6. Also write to legacy work_importance_results for backward compat
  const valueScoresObj: Record<string, number> = {};
  const needScoresObj: Record<string, number> = {};
  for (const ss of scaleScores) valueScoresObj[ss.label] = ss.score;
  for (const item of ITEM_CATALOG) needScoresObj[item.needLabel] = SEEDED_ITEM_SCORES[item.needLabel] ?? 0;

  // Upsert: delete existing then insert
  await supabase.from('work_importance_results').delete().eq('user_id', userId);
  await supabase.from('work_importance_results').insert({
    user_id: userId,
    responses: { seeded: true, source: 'manual_seed' },
    scores: { values: valueScoresObj, needs: needScoresObj },
    top_values: topScales,
  });

  return { sessionId, topScales, scaleScores };
}
