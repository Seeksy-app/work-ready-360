import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Heart, CheckCircle2, GripVertical, MousePointer, ListOrdered } from 'lucide-react';
import { 
  WIP_ITEMS, 
  WIP_ROUNDS,
  WORK_VALUES,
  WORK_VALUE_LABELS,
  WORK_VALUE_DESCRIPTIONS,
  scoreWipFull,
  WorkValue,
  ValueScore 
} from '@/lib/wip';
import RankingDragDrop from '@/components/wip/RankingDragDrop';
import RankingClickAssign from '@/components/wip/RankingClickAssign';
import RankingSequential from '@/components/wip/RankingSequential';
import RatingPhase from '@/components/wip/RatingPhase';

type RankingMode = 'drag' | 'click' | 'sequential';
type Phase = 'ranking' | 'rating';

const RATING_ITEMS_PER_PAGE = 5;

export default function WorkImportance() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Assessment state
  const [phase, setPhase] = useState<Phase>('ranking');
  const [rankingMode, setRankingMode] = useState<RankingMode>('drag');
  const [currentRound, setCurrentRound] = useState(0);
  const [roundRankings, setRoundRankings] = useState<Record<number, Record<string, number>>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [ratingPage, setRatingPage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<{ value: WorkValue; score: ValueScore }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Current round items
  const currentRoundItemIds = WIP_ROUNDS[currentRound] || [];
  const currentRoundItems = currentRoundItemIds.map(id => WIP_ITEMS.find(i => i.item_id === id)!).filter(Boolean);

  // Check if current round is ranked
  const isCurrentRoundRanked = roundRankings[currentRound] && 
    Object.keys(roundRankings[currentRound]).length === currentRoundItems.length;

  // Progress calculations
  const completedRounds = Object.keys(roundRankings).filter(
    k => roundRankings[parseInt(k)] && Object.keys(roundRankings[parseInt(k)]).length === 5
  ).length;
  
  const ratingTotalPages = Math.ceil(WIP_ITEMS.length / RATING_ITEMS_PER_PAGE);
  const ratedCount = Object.keys(ratings).length;
  const allRated = ratedCount === WIP_ITEMS.length;

  const overallProgress = phase === 'ranking'
    ? (completedRounds / WIP_ROUNDS.length) * 50
    : 50 + (ratedCount / WIP_ITEMS.length) * 50;

  const handleRoundRanking = useCallback((rankings: Record<string, number>) => {
    setRoundRankings(prev => ({ ...prev, [currentRound]: rankings }));
  }, [currentRound]);

  const handleNextRound = () => {
    if (currentRound < WIP_ROUNDS.length - 1) {
      setCurrentRound(currentRound + 1);
    } else {
      // Move to rating phase
      setPhase('rating');
      setRatingPage(0);
    }
  };

  const handlePrevRound = () => {
    if (currentRound > 0) {
      setCurrentRound(currentRound - 1);
    }
  };

  const handleRatingChange = (itemId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [itemId]: rating }));
  };

  const currentPageRatingItems = WIP_ITEMS.slice(
    ratingPage * RATING_ITEMS_PER_PAGE,
    (ratingPage + 1) * RATING_ITEMS_PER_PAGE
  );
  const allCurrentRated = currentPageRatingItems.every(i => ratings[i.item_id] !== undefined);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const scoreResult = scoreWipFull({
        response_id: crypto.randomUUID(),
        user_id: user.id,
        roundRankings,
        ratings,
      });
      
      const sortedResults = scoreResult.rank_order.map(r => ({
        value: r.work_value,
        score: scoreResult.value_scores[r.work_value],
      }));
      
      const topValues = sortedResults.slice(0, 3).map(r => WORK_VALUE_LABELS[r.value]);
      const normalizedScoresObj: Record<string, number> = {};
      for (const v of WORK_VALUES) {
        normalizedScoresObj[WORK_VALUE_LABELS[v]] = Math.round(scoreResult.value_scores[v].normalized);
      }

      const { error } = await supabase
        .from('work_importance_results')
        .insert({
          user_id: user.id,
          responses: { roundRankings, ratings },
          scores: normalizedScoresObj,
          top_values: topValues,
        });

      if (error) {
        toast.error('Failed to save results. Please try again.');
        console.error(error);
      } else {
        setResults(sortedResults);
        setIsComplete(true);
        toast.success('Assessment complete!');
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

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="animate-scale-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
              <CardDescription>
                Here are your Work Importance results (normalized 0-100 scale)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={result.value} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium">{WORK_VALUE_LABELS[result.value]}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {Math.round(result.score.normalized)}
                        </span>
                        /100
                      </div>
                    </div>
                    <Progress value={result.score.normalized} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {WORK_VALUE_DESCRIPTIONS[result.value]}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Your Top Work Values:</h4>
                <div className="flex flex-wrap gap-2">
                  {results.slice(0, 3).map(r => (
                    <span key={r.value} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                      {WORK_VALUE_LABELS[r.value]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
                <Button variant="hero" className="flex-1" onClick={() => navigate('/resume')}>
                  Upload Resume
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
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
                {phase === 'ranking' ? 'Phase 1: Ranking' : 'Phase 2: Rating'}
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      Round {currentRound + 1} of {WIP_ROUNDS.length}
                    </CardTitle>
                    <CardDescription>
                      Order statements with 1 being the <strong>most</strong> important and 5 being the <strong>least</strong>
                    </CardDescription>
                  </div>
                </div>

                {/* Ranking mode selector */}
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
                  <>Go to Rating Phase <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Rating Phase */}
        {phase === 'rating' && (
          <>
            <Card className="mb-6 animate-fade-in">
              <CardHeader>
                <CardTitle className="text-lg">
                  Rate Each Statement
                </CardTitle>
                <CardDescription>
                  Page {ratingPage + 1} of {ratingTotalPages} — Rate how important each is independently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RatingPhase
                  items={WIP_ITEMS}
                  ratings={ratings}
                  onRatingChange={handleRatingChange}
                  currentPage={ratingPage}
                  itemsPerPage={RATING_ITEMS_PER_PAGE}
                />
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  if (ratingPage > 0) {
                    setRatingPage(ratingPage - 1);
                  } else {
                    setPhase('ranking');
                    setCurrentRound(WIP_ROUNDS.length - 1);
                  }
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              {ratingPage < ratingTotalPages - 1 ? (
                <Button
                  variant="accent"
                  onClick={() => setRatingPage(ratingPage + 1)}
                  disabled={!allCurrentRated}
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="accent"
                  onClick={handleSubmit}
                  disabled={!allRated || isSubmitting}
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
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
