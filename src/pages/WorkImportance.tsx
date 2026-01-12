import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Heart, CheckCircle2 } from 'lucide-react';
import { 
  WIP_ITEMS, 
  WORK_VALUES,
  WORK_VALUE_LABELS,
  WORK_VALUE_DESCRIPTIONS,
  scoreWipRatingsOnly,
  WorkValue,
  ValueScore 
} from '@/lib/wip';

const responseOptions = [
  { value: "1", label: "Not Important" },
  { value: "2", label: "Somewhat Important" },
  { value: "3", label: "Important" },
  { value: "4", label: "Very Important" },
  { value: "5", label: "Most Important" },
];

const QUESTIONS_PER_PAGE = 4;

export default function WorkImportance() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<{ value: WorkValue; score: ValueScore }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const totalPages = Math.ceil(WIP_ITEMS.length / QUESTIONS_PER_PAGE);
  const startIndex = currentPage * QUESTIONS_PER_PAGE;
  const currentQuestions = WIP_ITEMS.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);
  const progress = (Object.keys(responses).length / WIP_ITEMS.length) * 100;

  const allCurrentAnswered = currentQuestions.every(q => responses[q.item_id] !== undefined);
  const allAnswered = Object.keys(responses).length === WIP_ITEMS.length;

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      // Use the new scoring algorithm
      const scoreResult = scoreWipRatingsOnly({
        response_id: crypto.randomUUID(),
        user_id: user.id,
        items: WIP_ITEMS,
        ratings: responses,
      });
      
      // Format results for display (sorted by normalized score)
      const sortedResults = scoreResult.rank_order.map(r => ({
        value: r.work_value,
        score: scoreResult.value_scores[r.work_value],
      }));
      
      // Prepare data for database (using display-friendly labels for top_values)
      const topValues = sortedResults.slice(0, 3).map(r => WORK_VALUE_LABELS[r.value]);
      
      // Store both normalized scores and raw scores
      const scoresObj: Record<string, number> = {};
      const normalizedScoresObj: Record<string, number> = {};
      
      for (const v of WORK_VALUES) {
        const displayLabel = WORK_VALUE_LABELS[v];
        scoresObj[displayLabel] = Math.round(scoreResult.value_scores[v].raw * 100) / 100;
        normalizedScoresObj[displayLabel] = Math.round(scoreResult.value_scores[v].normalized);
      }

      const { error } = await supabase
        .from('work_importance_results')
        .insert({
          user_id: user.id,
          responses: responses,
          scores: normalizedScoresObj, // Store normalized 0-100 scores
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
                        {result.score.z !== 0 && (
                          <span className={`ml-2 text-xs ${result.score.z > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                            (z: {result.score.z > 0 ? '+' : ''}{result.score.z.toFixed(2)})
                          </span>
                        )}
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
        <div className="mb-8">
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
              <p className="text-muted-foreground">Identify what matters most in your career</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Questions */}
        <Card className="mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">
              How important are these work values to you?
            </CardTitle>
            <CardDescription>
              Questions {startIndex + 1} - {Math.min(startIndex + QUESTIONS_PER_PAGE, WIP_ITEMS.length)} of {WIP_ITEMS.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {currentQuestions.map((question) => (
              <div key={question.item_id} className="space-y-3">
                <p className="font-medium">{question.text}</p>
                <RadioGroup
                  value={responses[question.item_id]?.toString() || ''}
                  onValueChange={(value) => setResponses(prev => ({ 
                    ...prev, 
                    [question.item_id]: parseInt(value) 
                  }))}
                  className="flex flex-wrap gap-2"
                >
                  {responseOptions.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <RadioGroupItem
                        value={option.value}
                        id={`q${question.item_id}-${option.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`q${question.item_id}-${option.value}`}
                        className="px-3 py-2 rounded-lg border-2 cursor-pointer transition-all hover:border-accent/50 peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/10 text-sm"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {currentPage < totalPages - 1 ? (
            <Button
              variant="accent"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!allCurrentAnswered}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="accent"
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
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
      </div>
    </div>
  );
}