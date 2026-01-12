import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Briefcase, RefreshCw, Heart } from 'lucide-react';

const valueDescriptions: Record<string, string> = {
  "Achievement": "Occupations that let you use your strongest abilities and see results",
  "Independence": "Occupations that let you work on your own and make decisions",
  "Recognition": "Occupations that provide advancement, prestige, and leadership roles",
  "Relationships": "Occupations that provide service to others and coworkers you can be friends with",
  "Support": "Occupations where management is supportive and trains workers well",
  "Working Conditions": "Occupations that offer job security, good pay, and a pleasant environment",
};

interface MatchingCareer {
  occupation_code: string;
  occupation_title: string;
  similarity: number;
}

export default function WorkImportanceResults() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<{ value: string; score: number }[]>([]);
  const [topValues, setTopValues] = useState<string[]>([]);
  const [matchingCareers, setMatchingCareers] = useState<MatchingCareer[]>([]);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

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
        // No results found, redirect to assessment
        navigate('/assessment/work-importance');
        return;
      }

      const scores = data.scores as Record<string, number>;
      const sortedResults = Object.entries(scores)
        .map(([value, score]) => ({ value, score }))
        .sort((a, b) => b.score - a.score);

      setResults(sortedResults);
      setTopValues(data.top_values);
      setCompletedAt(data.completed_at);
      setLoading(false);

      // Fetch matching careers based on work values
      fetchMatchingCareers(scores);
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
          keyword: 'software', // Default search term to get some careers
          limit: 10,
        },
      });

      if (error) throw error;

      if (data?.matches) {
        setMatchingCareers(data.matches);
      }
    } catch (error) {
      console.error('Failed to fetch matching careers:', error);
      // Don't show toast - this is a nice-to-have feature
    } finally {
      setLoadingCareers(false);
    }
  };

  const handleRetakeAssessment = () => {
    navigate('/assessment/work-importance');
  };

  if (authLoading || loading) {
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
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Results Card */}
        <Card className="mb-6 animate-scale-in">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-accent" />
            </div>
            <CardTitle className="text-2xl">Your Work Values Results</CardTitle>
            <CardDescription>
              What matters most to you in a career
              {completedAt && (
                <span className="block mt-1 text-xs">
                  Completed {new Date(completedAt).toLocaleDateString()}
                </span>
              )}
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
                      <span className="font-medium">{result.value}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{Math.round(result.score)}</span>/100
                    </span>
                  </div>
                  <Progress value={result.score} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {valueDescriptions[result.value] || ''}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Your Top Work Values:</h4>
              <div className="flex flex-wrap gap-2">
                {topValues.map(v => (
                  <span key={v} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

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
          <Button variant="outline" className="flex-1" onClick={handleRetakeAssessment}>
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
