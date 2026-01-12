import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Briefcase, RefreshCw } from 'lucide-react';
import { getMatchingCareers } from '@/lib/onet';

const categoryNames: Record<string, string> = {
  R: "Realistic",
  I: "Investigative", 
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

const categoryDescriptions: Record<string, string> = {
  R: "Hands-on, practical work with tools, machines, or nature",
  I: "Research, analysis, and problem-solving",
  A: "Creative expression and design",
  S: "Helping, teaching, and serving others",
  E: "Leading, persuading, and business",
  C: "Organizing data, records, and processes",
};

interface MatchingCareer {
  code: string;
  title: string;
  fit?: string;
}

export default function InterestProfilerResults() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<{ category: string; score: number }[]>([]);
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
        .from('interest_profiler_results')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // No results found, redirect to assessment
        navigate('/assessment/interest');
        return;
      }

      const scores = data.scores as Record<string, number>;
      const sortedResults = Object.entries(scores)
        .map(([category, score]) => ({ category, score }))
        .sort((a, b) => b.score - a.score);

      setResults(sortedResults);
      setCompletedAt(data.completed_at);
      setLoading(false);

      // Fetch matching careers based on the scores
      fetchMatchingCareers(scores);
    };

    fetchResults();
  }, [user, authLoading, navigate]);

  const fetchMatchingCareers = async (scores: Record<string, number>) => {
    setLoadingCareers(true);
    try {
      // Convert scores to answer format (1-5 scale per question, 6 questions per category)
      // The O*NET API expects answers array with values 1-5 for each question
      const answers: number[] = [];
      const categories = ['R', 'I', 'A', 'S', 'E', 'C'];
      
      categories.forEach(cat => {
        const score = scores[cat] || 0;
        // Convert category score (0-30) to 6 individual answers (1-5)
        const avgScore = Math.round(score / 6);
        for (let i = 0; i < 6; i++) {
          answers.push(Math.max(1, Math.min(5, avgScore)));
        }
      });

      const result = await getMatchingCareers(answers, undefined, 0, 10);
      
      if (result?.career) {
        setMatchingCareers(result.career);
      }
    } catch (error) {
      console.error('Failed to fetch matching careers:', error);
      toast.error('Failed to load matching careers');
    } finally {
      setLoadingCareers(false);
    }
  };

  const handleRetakeAssessment = () => {
    navigate('/assessment/interest');
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
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl">Your Interest Profiler Results</CardTitle>
            <CardDescription>
              Based on the RIASEC model
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
                <div key={result.category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-medium">{categoryNames[result.category]}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{result.score}/30</span>
                  </div>
                  <Progress value={(result.score / 30) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {categoryDescriptions[result.category]}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Your Top Interest Areas:</h4>
              <div className="flex flex-wrap gap-2">
                {results.slice(0, 3).map(r => (
                  <span key={r.category} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {categoryNames[r.category]}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Matching Careers Card */}
        <Card className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Matching Careers</CardTitle>
                <CardDescription>
                  Occupations that align with your vocational preferences
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingCareers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Finding matching careers...</span>
              </div>
            ) : matchingCareers.length > 0 ? (
              <div className="space-y-3">
                {matchingCareers.map((career, index) => (
                  <div 
                    key={career.code} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/careers?code=${career.code}`)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{career.title}</p>
                        <p className="text-xs text-muted-foreground">{career.code}</p>
                      </div>
                    </div>
                    {career.fit && (
                      <Badge variant="secondary" className="text-xs">
                        {career.fit}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No matching careers found. Try exploring careers manually.
              </p>
            )}

            {matchingCareers.length > 0 && (
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate('/careers')}
              >
                Explore More Careers
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={handleRetakeAssessment}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retake Assessment
          </Button>
          <Button variant="hero" className="flex-1" onClick={() => navigate('/assessment/work-importance')}>
            Continue to Work Values
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
