import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  Loader2, ArrowLeft, ArrowRight, Briefcase, RefreshCw, Heart,
  ChevronDown, ChevronUp, Download, AlertTriangle,
} from 'lucide-react';
import { ITEM_MAP, SCALE_MAP } from '@/lib/wip';
import { getInterpretation, type WipResultPayload } from '@/lib/wip/scoring';

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

/** Build the canonical result payload shape from DB records */
function buildResultPayload(
  session: any,
  itemScores: any[],
  scaleScores: any[],
  importanceMap: Map<number, boolean>
): WipResultPayload {
  return {
    sessionId: session.id,
    zeroPointRawVotes: session.zero_point_raw_votes ?? 0,
    zeroPointZ: session.zero_point_z ?? 0,
    consistencyScore: session.consistency_score,
    consistencyFlag: session.consistency_flag ?? false,
    itemScores: itemScores.map((is: any) => {
      const item = ITEM_MAP.get(is.item_id);
      return {
        itemId: is.item_id,
        needKey: item?.needKey ?? '',
        needLabel: item?.needLabel ?? `Item ${is.item_id}`,
        scaleKey: item?.scaleKey ?? '',
        rawVotes: is.raw_votes,
        adjustedVotes: is.adjusted_votes,
        p: is.proportion_p,
        initialZ: is.initial_z,
        finalScore: is.final_score,
        isImportant: importanceMap.get(is.item_id) ?? false,
      };
    }).sort((a, b) => b.finalScore - a.finalScore),
    scaleScores: scaleScores.map((ss: any) => ({
      key: ss.scale_key,
      label: ss.scale_label,
      score: ss.score,
      rank: ss.rank_order,
      interpretation: getInterpretation(ss.score),
      itemScores: [],
    })),
    topScales: [session.top_scale_1 ?? '', session.top_scale_2 ?? ''],
  };
}

export default function WorkImportanceResults() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');

  const [loading, setLoading] = useState(true);
  const [resultPayload, setResultPayload] = useState<WipResultPayload | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [showDetailedNeeds, setShowDetailedNeeds] = useState(false);
  const [matchingCareers, setMatchingCareers] = useState<MatchingCareer[]>([]);
  const [loadingCareers, setLoadingCareers] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!user) return;

    const fetchFromWipTables = async () => {
      // Determine session: from param or latest completed
      let sessionId = sessionParam;
      if (!sessionId) {
        const { data } = await supabase
          .from('wip_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single();
        sessionId = data?.id || null;
      }

      if (!sessionId) {
        // Fallback: try legacy table
        navigate('/assessment/work-importance');
        return;
      }

      // Load all data in parallel
      const [sRes, isRes, ssRes, irRes] = await Promise.all([
        supabase.from('wip_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('wip_item_scores').select('*').eq('session_id', sessionId).order('final_score', { ascending: false }),
        supabase.from('wip_scale_scores').select('*').eq('session_id', sessionId).order('rank_order'),
        supabase.from('wip_importance_responses').select('item_id, is_important').eq('session_id', sessionId),
      ]);

      if (!sRes.data || !isRes.data?.length) {
        navigate('/assessment/work-importance');
        return;
      }

      const importanceMap = new Map((irRes.data || []).map((r: any) => [r.item_id, r.is_important]));
      const payload = buildResultPayload(sRes.data, isRes.data, ssRes.data || [], importanceMap);

      setResultPayload(payload);
      setIsDemo(!!(sRes.data as any).is_demo);
      setCompletedAt(sRes.data.completed_at);
      setLoading(false);

      // Fetch matching careers
      const valScores: Record<string, number> = {};
      for (const ss of payload.scaleScores) valScores[ss.label] = ss.score;
      fetchMatchingCareers(valScores);
    };

    fetchFromWipTables();
  }, [user, authLoading, navigate, sessionParam]);

  const fetchMatchingCareers = async (scores: Record<string, number>) => {
    setLoadingCareers(true);
    try {
      const { data, error } = await supabase.functions.invoke('onet-work-values', {
        body: { action: 'match_careers', userValues: scores, keyword: 'software', limit: 10 },
      });
      if (!error && data?.matches) setMatchingCareers(data.matches);
    } catch { /* silently skip */ } finally {
      setLoadingCareers(false);
    }
  };

  const downloadJson = () => {
    if (!resultPayload) return;
    const blob = new Blob([JSON.stringify(resultPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wip-result-${resultPayload.sessionId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!resultPayload) return null;

  const sortedScales = [...resultPayload.scaleScores].sort((a, b) => a.rank - b.rank);
  const topValues = resultPayload.topScales;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Work Importance Profiler :: Summary</h1>
            {isDemo && <Badge variant="outline">Seeded Demo Result</Badge>}
          </div>
          {completedAt && (
            <p className="text-sm text-muted-foreground">Completed {new Date(completedAt).toLocaleDateString()}</p>
          )}
        </div>

        {/* Consistency Warning */}
        {resultPayload.consistencyFlag && (
          <Card className="mb-6 border-destructive">
            <CardContent className="py-4 flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Low Consistency Warning</p>
                <p className="text-sm">Your responses showed inconsistent patterns. Consider retaking the assessment for more reliable results.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Scale scores */}
          <Card className="animate-scale-in">
            <CardHeader>
              <CardTitle className="text-lg">Your Work Values</CardTitle>
              <CardDescription>Ranked from highest to lowest importance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {topValues[0] && topValues[1] && (
                <div className="space-y-2">
                  <p className="font-semibold text-sm">Your top two work values:</p>
                  <ol className="list-decimal list-inside space-y-1 pl-2">
                    <li className="text-base font-semibold text-accent">{topValues[0]}</li>
                    <li className="text-base font-semibold text-accent">{topValues[1]}</li>
                  </ol>
                </div>
              )}

              {/* All 6 scale cards */}
              <div className="space-y-2 pt-2">
                {sortedScales.map((scale, i) => {
                  const interp = scale.interpretation || getInterpretation(scale.score);
                  const isTop = i < 2;
                  return (
                    <div
                      key={scale.key}
                      className={`flex items-center justify-between p-3 rounded-lg border ${isTop ? 'border-accent bg-accent/5' : 'border-border'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${isTop ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                          {scale.rank}
                        </span>
                        <span className="font-medium text-sm">{scale.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono">{scale.score.toFixed(3)}</span>
                        <Badge variant={interp === 'High' ? 'default' : interp === 'Moderately High' ? 'secondary' : 'outline'} className="text-xs">
                          {interp}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button variant="accent" className="w-full mt-4" onClick={() => navigate('/careers')}>
                View Occupations
              </Button>

              {/* Expandable item detail */}
              <Collapsible open={showDetailedNeeds} onOpenChange={setShowDetailedNeeds}>
                <CollapsibleTrigger className="text-sm text-accent underline cursor-pointer hover:text-accent/80 flex items-center gap-1 pt-3 border-t w-full">
                  {showDetailedNeeds ? 'Hide' : 'View'} detailed needs
                  {showDetailedNeeds ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="space-y-1">
                    {resultPayload.itemScores.map((item, idx) => (
                      <div key={item.itemId} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-6 text-right">{idx + 1}.</span>
                          <span className="text-sm font-medium">{item.needLabel}</span>
                        </div>
                        <span className="text-sm font-mono tabular-nums">{item.finalScore.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Right: Descriptions */}
          <Card className="border-dashed animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <CardContent className="pt-6">
              <p className="text-lg font-serif mb-3">
                <span className="text-2xl font-bold">Remember,</span> happiness in a job or occupational industry increases when a person considers their work values and work needs.
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

        {/* Matching Careers */}
        {matchingCareers.length > 0 && (
          <Card className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Briefcase className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="text-lg">Careers Matching Your Values</CardTitle>
                  <CardDescription>Occupations that align with what matters to you</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCareers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <span className="ml-2 text-muted-foreground">Finding matching careers…</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {matchingCareers.map((career, index) => (
                    <div key={career.occupation_code}
                      className="flex items-center justify-between p-3 rounded-lg border hover:border-accent/30 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/careers?code=${career.occupation_code}`)}>
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">{index + 1}</span>
                        <div>
                          <p className="font-medium text-sm">{career.occupation_title}</p>
                          <p className="text-xs text-muted-foreground">{career.occupation_code}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">{Math.round(career.similarity * 100)}% match</Badge>
                    </div>
                  ))}
                </div>
              )}
              <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/careers')}>
                Explore More Careers<ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={downloadJson}>
            <Download className="h-4 w-4 mr-2" />Download JSON
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate('/assessment/work-importance')}>
            <RefreshCw className="h-4 w-4 mr-2" />Retake Assessment
          </Button>
          <Button variant="hero" className="flex-1" onClick={() => navigate('/podcast')}>
            Generate Podcast<ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
