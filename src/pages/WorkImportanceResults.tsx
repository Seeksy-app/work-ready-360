import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Briefcase, RefreshCw, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { SCALE_MAP } from '@/lib/wip';

interface MatchingCareer {
  occupation_code: string;
  occupation_title: string;
  similarity: number;
}

const VALUE_EXTENDED_DESCRIPTIONS: Record<string, string> = {
  "Achievement": "The Achievement work value involves the need to use your individual abilities and have a feeling of accomplishment.",
  "Independence": "The Independence work value refers to the need to do tasks on your own and use creativity in the workplace. It also involves the need to get a job where you can make your own decisions.",
  "Recognition": "The Recognition work value involves the need to have the opportunity for advancement, obtain prestige, and have the potential for leadership.",
  "Relationships": "The Relationships work value includes the need for friendly co-workers, to be able to help others, and not be forced to go against your sense of right and wrong.",
  "Support": "The Support work value involves the need for a supportive company, be comfortable with management's style of supervision, and a competent, considerate, and fair management.",
  "Working Conditions": "The Working Conditions work value refers to the need to have your pay comparable to others, and have job security and good working conditions. You also need to be busy all the time and have many different types of tasks on the job.",
};

export default function WorkImportanceResults() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [valueResults, setValueResults] = useState<{ value: string; score: number }[]>([]);
  const [needResults, setNeedResults] = useState<{ need: string; score: number }[]>([]);
  const [topValues, setTopValues] = useState<string[]>([]);
  const [matchingCareers, setMatchingCareers] = useState<MatchingCareer[]>([]);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [showDetailedNeeds, setShowDetailedNeeds] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    const fetchResults = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('work_importance_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        navigate('/assessment/work-importance');
        return;
      }

      const scores = data.scores as any;
      
      // Handle both new format (with values/needs) and legacy format
      if (scores.values && scores.needs) {
        // New format
        const sortedValues = Object.entries(scores.values as Record<string, number>)
          .map(([value, score]) => ({ value, score }))
          .sort((a, b) => b.score - a.score);
        setValueResults(sortedValues);

        const sortedNeeds = Object.entries(scores.needs as Record<string, number>)
          .map(([need, score]) => ({ need, score }))
          .sort((a, b) => b.score - a.score);
        setNeedResults(sortedNeeds);
      } else {
        // Legacy format (flat normalized scores)
        const sortedResults = Object.entries(scores as Record<string, number>)
          .map(([value, score]) => ({ value, score }))
          .sort((a, b) => b.score - a.score);
        setValueResults(sortedResults);
      }

      setTopValues(data.top_values);
      setCompletedAt(data.completed_at);
      setLoading(false);

      // Fetch matching careers
      if (scores.values) {
        fetchMatchingCareers(scores.values);
      } else {
        fetchMatchingCareers(scores as Record<string, number>);
      }
    };

    fetchResults();
  }, [user, authLoading, navigate]);

  const fetchMatchingCareers = async (scores: Record<string, number>) => {
    setLoadingCareers(true);
    try {
      const { data, error } = await supabase.functions.invoke('onet-work-values', {
        body: {
          action: 'match_careers',
          userValues: scores,
          keyword: 'software',
          limit: 10,
        },
      });

      if (error) throw error;
      if (data?.matches) {
        setMatchingCareers(data.matches);
      }
    } catch (error) {
      console.error('Failed to fetch matching careers:', error);
    } finally {
      setLoadingCareers(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isNewFormat = needResults.length > 0;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <h1 className="text-2xl font-bold mb-1">Work Importance Profiler :: Summary</h1>
          {completedAt && (
            <p className="text-sm text-muted-foreground">
              Completed {new Date(completedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Work Values Summary */}
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle className="text-lg">Your Work Values</CardTitle>
              <CardDescription>
                The work values are a summary of your Work Importance Profiler responses.
                {isNewFormat 
                  ? " Hover over the values to see its definition and the needs it encompasses."
                  : ""
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topValues.length >= 2 && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Your top two work values in order of importance are:</p>
                  <ol className="list-decimal list-inside space-y-1 pl-2">
                    {topValues.slice(0, 2).map((v, i) => (
                      <li key={i} className="text-base font-semibold text-accent">{v}</li>
                    ))}
                  </ol>
                </div>
              )}

              {valueResults.length > 2 && (
                <div className="space-y-2">
                  <p className="font-medium text-sm text-muted-foreground">Your other work values in order of importance are:</p>
                  <ol start={3} className="list-decimal list-inside space-y-1 pl-2">
                    {valueResults.slice(2).map((r, i) => (
                      <li key={i} className="text-sm">{r.value}</li>
                    ))}
                  </ol>
                </div>
              )}

              <Button 
                variant="accent" 
                className="w-full mt-4"
                onClick={() => navigate('/careers')}
              >
                View Occupations
              </Button>

              {isNewFormat && (
                <div className="pt-3 border-t">
                  <button
                    className="text-sm text-accent underline cursor-pointer hover:text-accent/80"
                    onClick={() => setShowDetailedNeeds(!showDetailedNeeds)}
                  >
                    {showDetailedNeeds ? 'Hide' : 'View'} your detailed needs
                    {showDetailedNeeds ? <ChevronUp className="inline h-3 w-3 ml-1" /> : <ChevronDown className="inline h-3 w-3 ml-1" />}
                  </button>
                  <p className="text-xs text-muted-foreground mt-1">
                    Which you can write down and re-enter into the system at a later point.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Remember box */}
          <Card className="border-dashed animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="pt-6">
              <p className="text-lg font-serif mb-3">
                <span className="text-2xl font-bold">Remember,</span> happiness in a job or occupational industry increases when a person considers their work values and work needs. Each work value comprises several needs as shown below:
              </p>
              <ul className="space-y-3 text-sm">
                {Object.entries(VALUE_EXTENDED_DESCRIPTIONS).map(([value, desc]) => (
                  <li key={value}>
                    <span className="font-bold text-accent">The {value}</span> {desc.replace(`The ${value} `, '')}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Needs Table */}
        {isNewFormat && showDetailedNeeds && (
          <Card className="mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Your detailed needs are:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {needResults.map((need, index) => (
                  <div
                    key={need.need}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6 text-right">{index + 1}.</span>
                      <span className="text-sm font-medium">{need.need}</span>
                    </div>
                    <span className="text-sm font-mono tabular-nums">{need.score.toFixed(3)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                To re-enter your scores later, write down each need statement and its corresponding score. 
                When you return, enter the Work Importance Profiler and input your scores.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Matching Careers Card */}
        {matchingCareers.length > 0 && (
          <Card className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Briefcase className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Careers Matching Your Values</CardTitle>
                  <CardDescription>
                    Occupations that align with what matters to you
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCareers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <span className="ml-2 text-muted-foreground">Finding matching careers...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchingCareers.map((career, index) => (
                    <div 
                      key={career.occupation_code} 
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-accent/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/careers?code=${career.occupation_code}`)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{career.occupation_title}</p>
                          <p className="text-xs text-muted-foreground">{career.occupation_code}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(career.similarity * 100)}% match
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/careers')}
              >
                Explore More Careers
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/assessment/work-importance')}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retake Assessment
          </Button>
          <Button variant="hero" className="flex-1" onClick={() => navigate('/podcast')}>
            Generate Podcast
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
