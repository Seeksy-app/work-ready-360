import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Heart, CheckCircle2, GripVertical, MousePointer, ListOrdered } from 'lucide-react';
import {
  ITEM_CATALOG,
  ITEM_MAP,
  BLOCK_DEFINITIONS,
  computeWipResult,
  type BlockRanking,
  type ImportanceChoice,
} from '@/lib/wip';
import type { RankableItem } from '@/components/wip/types';
import RankingDragDrop from '@/components/wip/RankingDragDrop';
import RankingClickAssign from '@/components/wip/RankingClickAssign';
import RankingSequential from '@/components/wip/RankingSequential';
import PreferencesPhase from '@/components/wip/PreferencesPhase';

type RankingMode = 'drag' | 'click' | 'sequential';
type Phase = 'ranking' | 'preferences';

export default function WorkImportance() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>('ranking');
  const [rankingMode, setRankingMode] = useState<RankingMode>('drag');
  const [currentBlock, setCurrentBlock] = useState(0);
  // blockRankings: blockIndex → { "itemId": rank(1-5) }
  const [blockRankings, setBlockRankings] = useState<Record<number, Record<string, number>>>({});
  const [preferences, setPreferences] = useState<Record<number, boolean>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      if (!user || sessionId) return;
      const { data, error } = await supabase
        .from('wip_sessions')
        .insert({ user_id: user.id, status: 'in_progress' })
        .select('id')
        .single();
      if (data) setSessionId(data.id);
      if (error) console.error('Failed to create session:', error);
    };
    createSession();
  }, [user, sessionId]);

  // Current block items as RankableItem[]
  const currentBlockItemIds = BLOCK_DEFINITIONS[currentBlock] || [];
  const currentBlockRankableItems: RankableItem[] = currentBlockItemIds
    .map(id => {
      const item = ITEM_MAP.get(id);
      return item ? { key: String(id), text: item.statement } : null;
    })
    .filter(Boolean) as RankableItem[];

  const isCurrentBlockRanked = blockRankings[currentBlock] &&
    Object.keys(blockRankings[currentBlock]).length === currentBlockRankableItems.length;

  const completedBlocks = Object.keys(blockRankings).filter(
    k => blockRankings[parseInt(k)] && Object.keys(blockRankings[parseInt(k)]).length === 5
  ).length;

  const preferencesCount = Object.keys(preferences).length;
  const allPreferencesSet = preferencesCount === ITEM_CATALOG.length;

  const overallProgress = phase === 'ranking'
    ? (completedBlocks / BLOCK_DEFINITIONS.length) * 70
    : 70 + (preferencesCount / ITEM_CATALOG.length) * 30;

  // Auto-save block ranking to DB
  const saveBlockToDb = useCallback(async (blockIndex: number, rankings: Record<string, number>) => {
    if (!sessionId) return;
    const rows = Object.entries(rankings).map(([itemIdStr, rank]) => ({
      session_id: sessionId,
      block_number: blockIndex,
      item_id: Number(itemIdStr),
      assigned_rank: rank,
    }));

    // Upsert: delete existing then insert
    await supabase
      .from('wip_block_responses')
      .delete()
      .eq('session_id', sessionId)
      .eq('block_number', blockIndex);

    await supabase.from('wip_block_responses').insert(rows);
  }, [sessionId]);

  const handleBlockRanking = useCallback((rankings: Record<string, number>) => {
    setBlockRankings(prev => ({ ...prev, [currentBlock]: rankings }));
    saveBlockToDb(currentBlock, rankings);
  }, [currentBlock, saveBlockToDb]);

  const handleNextBlock = () => {
    if (currentBlock < BLOCK_DEFINITIONS.length - 1) {
      setCurrentBlock(currentBlock + 1);
    } else {
      setPhase('preferences');
    }
  };

  const handlePrevBlock = () => {
    if (currentBlock > 0) setCurrentBlock(currentBlock - 1);
  };

  const handlePreferenceChange = (itemId: number, value: boolean) => {
    setPreferences(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async () => {
    if (!user || !sessionId) return;
    setIsSubmitting(true);

    try {
      // Convert block rankings to BlockRanking[]
      const blockRankingsList: BlockRanking[] = Object.entries(blockRankings).map(([idx, rankings]) => ({
        blockIndex: Number(idx),
        rankings: Object.fromEntries(
          Object.entries(rankings).map(([k, v]) => [Number(k), v])
        ),
      }));

      // Convert preferences to ImportanceChoice[]
      const importanceChoices: ImportanceChoice[] = ITEM_CATALOG.map(item => ({
        itemId: item.id,
        isImportant: preferences[item.id] ?? false,
      }));

      // Score
      const result = computeWipResult({
        sessionId,
        blockRankings: blockRankingsList,
        importanceChoices,
      });

      // Save importance responses
      const impRows = importanceChoices.map(c => ({
        session_id: sessionId,
        item_id: c.itemId,
        is_important: c.isImportant,
      }));
      await supabase.from('wip_importance_responses').insert(impRows);

      // Save item scores
      const itemScoreRows = result.itemScores.map(is => ({
        session_id: sessionId,
        item_id: is.itemId,
        raw_votes: is.rawVotes,
        adjusted_votes: is.adjustedVotes,
        proportion_p: is.p,
        initial_z: is.initialZ,
        final_score: is.finalScore,
      }));
      await supabase.from('wip_item_scores').insert(itemScoreRows);

      // Save scale scores
      const scaleRows = result.scaleScores.map(ss => ({
        session_id: sessionId,
        scale_key: ss.key,
        scale_label: ss.label,
        score: ss.score,
        rank_order: ss.rank,
      }));
      await supabase.from('wip_scale_scores').insert(scaleRows);

      // Update session
      await supabase
        .from('wip_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          consistency_score: result.consistencyScore,
          consistency_flag: result.consistencyFlag,
          zero_point_raw_votes: result.zeroPointRawVotes,
          zero_point_z: result.zeroPointZ,
          top_scale_1: result.topScales[0],
          top_scale_2: result.topScales[1],
          result_payload: result as any,
        })
        .eq('id', sessionId);

      // Also save to legacy work_importance_results table for backward compat
      const valueScoresObj: Record<string, number> = {};
      const needScoresObj: Record<string, number> = {};
      for (const ss of result.scaleScores) {
        valueScoresObj[ss.label] = ss.score;
      }
      for (const is of result.itemScores) {
        needScoresObj[is.needLabel] = is.finalScore;
      }
      await supabase.from('work_importance_results').insert({
        user_id: user.id,
        responses: { blockRankings, preferences, sessionId },
        scores: { values: valueScoresObj, needs: needScoresObj },
        top_values: result.topScales,
      });

      toast.success('Assessment complete!');
      navigate(`/assessment/work-importance/results?session=${sessionId}`);
    } catch (error) {
      console.error('Scoring error:', error);
      toast.error('Failed to calculate results. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
              <Heart className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Work Importance Profiler</h1>
              <p className="text-muted-foreground">
                {phase === 'ranking' ? ':: Rounds' : ':: Preferences'}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}% complete</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        </div>

        {/* Ranking Phase */}
        {phase === 'ranking' && (
          <>
            <Card className="mb-6 animate-fade-in">
              <CardHeader>
                <p className="text-sm text-muted-foreground mb-2">
                  Please order the following statements with 1 being the <strong>most</strong> important to you and 5 being the <strong>least</strong>
                </p>
                <CardTitle className="text-lg">
                  Round {currentBlock + 1} of {BLOCK_DEFINITIONS.length}
                </CardTitle>

                <Tabs value={rankingMode} onValueChange={(v) => setRankingMode(v as RankingMode)} className="mt-3">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="drag" className="text-xs gap-1"><GripVertical className="h-3 w-3" />Drag</TabsTrigger>
                    <TabsTrigger value="click" className="text-xs gap-1"><MousePointer className="h-3 w-3" />Click</TabsTrigger>
                    <TabsTrigger value="sequential" className="text-xs gap-1"><ListOrdered className="h-3 w-3" />Pick</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-accent/5 p-3 mb-4">
                  <p className="text-sm font-semibold text-center text-accent-foreground">
                    For my IDEAL JOB it is important that:
                  </p>
                </div>

                {rankingMode === 'drag' && (
                  <RankingDragDrop key={`drag-${currentBlock}`} items={currentBlockRankableItems}
                    onRankingComplete={handleBlockRanking} currentRankings={blockRankings[currentBlock]} />
                )}
                {rankingMode === 'click' && (
                  <RankingClickAssign key={`click-${currentBlock}`} items={currentBlockRankableItems}
                    onRankingComplete={handleBlockRanking} currentRankings={blockRankings[currentBlock]} />
                )}
                {rankingMode === 'sequential' && (
                  <RankingSequential key={`seq-${currentBlock}`} items={currentBlockRankableItems}
                    onRankingComplete={handleBlockRanking} currentRankings={blockRankings[currentBlock]} />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevBlock} disabled={currentBlock === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" />Previous
              </Button>
              <Button variant="accent" onClick={handleNextBlock} disabled={!isCurrentBlockRanked}>
                {currentBlock < BLOCK_DEFINITIONS.length - 1 ? (
                  <>Next <ArrowRight className="h-4 w-4" /></>
                ) : (
                  <>Go to Preferences <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Preferences Phase */}
        {phase === 'preferences' && (
          <>
            <Card className="mb-6 animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">Work Importance Profiler :: Preferences</CardTitle>
                <CardDescription>{preferencesCount} of {ITEM_CATALOG.length} answered</CardDescription>
              </CardHeader>
              <CardContent>
                <PreferencesPhase items={ITEM_CATALOG} preferences={preferences} onPreferenceChange={handlePreferenceChange} />
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setPhase('ranking'); setCurrentBlock(BLOCK_DEFINITIONS.length - 1); }}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back to Ranking
              </Button>
              <Button variant="accent" onClick={handleSubmit} disabled={!allPreferencesSet || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>Complete Assessment <CheckCircle2 className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
