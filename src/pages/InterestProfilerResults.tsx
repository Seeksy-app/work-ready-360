import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import wowWheelImage from '@/assets/wow-wheel.png';

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

// Map RIASEC codes to approximate rotation angles on the WOW wheel image
const categoryAngles: Record<string, number> = {
  S: 0,
  A: 60,
  R: 120,
  I: 180,
  E: 300,
  C: 240,
};

const categoryColors: Record<string, string> = {
  R: 'hsl(var(--primary))',
  I: 'hsl(45, 93%, 47%)',
  A: 'hsl(45, 93%, 58%)',
  S: 'hsl(45, 93%, 47%)',
  E: 'hsl(var(--primary))',
  C: 'hsl(45, 93%, 58%)',
};

export default function InterestProfilerResults() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [results, setResults] = useState<{ category: string; score: number }[]>([]);
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
        navigate('/assessment/interest');
        return;
      }

      const rawScores = data.scores as Record<string, number>;
      setScores(rawScores);
      const sortedResults = Object.entries(rawScores)
        .map(([category, score]) => ({ category, score }))
        .sort((a, b) => b.score - a.score);

      setResults(sortedResults);
      setCompletedAt(data.completed_at);
      setLoading(false);
    };

    fetchResults();
  }, [user, authLoading, navigate]);

  const topCodes = results.slice(0, 3).map(r => r.category);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Your Interest Profiler Results</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Based on the RIASEC model
              {completedAt && (
                <span className="block text-xs mt-0.5">
                  Completed {new Date(completedAt).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Two-column layout: Results left, WOW right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Score Results */}
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle className="text-lg">Your RIASEC Scores</CardTitle>
              <CardDescription>Ranked by strength of interest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {results.map((result, index) => (
                <div key={result.category} className="space-y-1.5">
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

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2 text-sm">Your Top Interest Areas:</h4>
                <div className="flex flex-wrap gap-2">
                  {topCodes.map(code => (
                    <span key={code} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {categoryNames[code]}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: WOW Wheel Image */}
          <div className="animate-slide-up flex flex-col items-center justify-center" style={{ animationDelay: '0.05s' }}>
            <h3 className="text-lg font-semibold text-foreground mb-1">Your World of Work</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              See where your interests map to career clusters and job families
            </p>
            <div className="relative w-full mx-auto">
                <img
                  src={wowWheelImage}
                  alt="World of Work wheel showing career clusters mapped to RIASEC interest areas"
                  className="w-full h-auto"
                />
                {/* Overlay highlight markers for top 3 codes */}
                <svg
                  viewBox="0 0 400 400"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {topCodes.map((code, i) => {
                    const angle = categoryAngles[code];
                    const radians = ((angle - 90) * Math.PI) / 180;
                    const cx = 200 + Math.cos(radians) * 145;
                    const cy = 200 + Math.sin(radians) * 145;
                    return (
                      <g key={code}>
                        {/* Pulsing ring */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={22}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2.5}
                          opacity={0.7}
                          className="animate-pulse"
                        />
                        {/* Rank badge */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r={14}
                          fill="hsl(var(--primary))"
                        />
                        <text
                          x={cx}
                          y={cy + 1}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="white"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          #{i + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3 max-w-sm">
                Your top interests are highlighted on the wheel. Each section maps to career families you may want to explore.
              </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => navigate('/assessment/interest')}>
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
