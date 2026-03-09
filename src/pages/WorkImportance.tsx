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
  WIP_ITEMS, 
  WIP_ROUNDS,
  WORK_VALUE_LABELS,
  scoreWipOfficial,
  WipFullResult,
} from '@/lib/wip';
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
  const [currentRound, setCurrentRound] = useState(0);
  const [roundRankings, setRoundRankings] = useState<Record<number, Record<string, number>>>({});
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const currentRoundItemIds = WIP_ROUNDS[currentRound] || [];
  const currentRoundItems = currentRoundItemIds.map(id => WIP_ITEMS.find(i => i.item_id === id)!).filter(Boolean);

  const isCurrentRoundRanked = roundRankings[currentRound] && 
    Object.keys(roundRankings[currentRound]).length === currentRoundItems.length;

  const completedRounds = Object.keys(roundRankings).filter(
    k => roundRankings[parseInt(k)] && Object.keys(roundRankings[parseInt(k)]).length === 5
  ).length;
  
  const preferencesCount = Object.keys(preferences).length;
  const allPreferencesSet = preferencesCount === WIP_ITEMS.length;

  const overallProgress = phase === 'ranking'
    ? (completedRounds / WIP_ROUNDS.length) * 70
    : 70 + (preferencesCount / WIP_ITEMS.length) * 30;

  const handleRoundRanking = useCallback((rankings: Record<string, number>) => {
    setRoundRankings(prev => ({ ...prev, [currentRound]: rankings }));
  }, [currentRound]);

  const handleNextRound = () => {
    if (currentRound < WIP_ROUNDS.length - 1) {
      setCurrentRound(currentRound + 1);
    } else {
      setPhase('preferences');
    }
  };

  const handlePrevRound = () => {
    if (currentRound > 0) {
      setCurrentRound(currentRound - 1);
    }
  };

  const handlePreferenceChange = (itemId: string, value: boolean) => {
    setPreferences(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const result: WipFullResult = scoreWipOfficial({
        response_id: crypto.randomUUID(),
        user_id: user.id,
        roundRankings,
        preferences,
      });
      
      // Store detailed scores for results page
      const needScoresObj: Record<string, number> = {};
      for (const ns of result.need_scores) {
        needScoresObj[ns.work_need] = ns.combined;
      }
      
      const valueScoresObj: Record<string, number> = {};
      for (const ro of result.rank_order) {
        valueScoresObj[ro.label] = ro.score;
      }
      
      const topValues = result.rank_order.slice(0, 2).map(r => r.label);

      const { error } = await supabase
        .from('work_importance_results')
        .insert({
          user_id: user.id,
          responses: { roundRankings, preferences },
          scores: { values: valueScoresObj, needs: needScoresObj },
          top_values: topValues,
        });

      if (error) {
        toast.error('Failed to save results. Please try again.');
        console.error(error);
      } else {
        toast.success('Assessment complete!');
        navigate('/assessment/work-importance/results');
      }
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
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Please order the following statements with 1 being the <strong>most</strong> important to you and 5 being the <strong>least</strong>
                  </p>
                  <CardTitle className="text-lg">
                    Round {currentRound + 1} of {WIP_ROUNDS.length}
                  </CardTitle>
                </div>

                <Tabs value={rankingMode} onValueChange={(v) => setRankingMode(v as RankingMode)} className="mt-3">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="drag" className="text-xs gap-1">
                      <GripVertical className="h-3 w-3" />
                      Drag
                    </TabsTrigger>
                    <TabsTrigger value="click" className="text-xs gap-1">
                      <MousePointer className="h-3 w-3" />
                      Click
                    </TabsTrigger>
                    <TabsTrigger value="sequential" className="text-xs gap-1">
                      <ListOrdered className="h-3 w-3" />
                      Pick
                    </TabsTrigger>
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
                  <RankingDragDrop
                    key={`drag-${currentRound}`}
                    items={currentRoundItems}
                    onRankingComplete={handleRoundRanking}
                    currentRankings={roundRankings[currentRound]}
                  />
                )}
                {rankingMode === 'click' && (
                  <RankingClickAssign
                    key={`click-${currentRound}`}
                    items={currentRoundItems}
                    onRankingComplete={handleRoundRanking}
                    currentRankings={roundRankings[currentRound]}
                  />
                )}
                {rankingMode === 'sequential' && (
                  <RankingSequential
                    key={`seq-${currentRound}`}
                    items={currentRoundItems}
                    onRankingComplete={handleRoundRanking}
                    currentRankings={roundRankings[currentRound]}
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevRound} disabled={currentRound === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="accent"
                onClick={handleNextRound}
                disabled={!isCurrentRoundRanked}
              >
                {currentRound < WIP_ROUNDS.length - 1 ? (
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
                <CardTitle className="text-lg">
                  Work Importance Profiler :: Preferences
                </CardTitle>
                <CardDescription>
                  {preferencesCount} of {WIP_ITEMS.length} answered
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PreferencesPhase
                  items={WIP_ITEMS}
                  preferences={preferences}
                  onPreferenceChange={handlePreferenceChange}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setPhase('ranking');
                  setCurrentRound(WIP_ROUNDS.length - 1);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Ranking
              </Button>
              
              <Button
                variant="accent"
                onClick={handleSubmit}
                disabled={!allPreferencesSet || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Complete Assessment
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
