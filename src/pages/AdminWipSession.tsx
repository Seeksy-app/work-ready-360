import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowLeft, Download, AlertTriangle } from 'lucide-react';
import { ITEM_MAP } from '@/lib/wip';
import { getInterpretation } from '@/lib/wip/scoring';

export default function AdminWipSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<any>(null);
  const [blockResponses, setBlockResponses] = useState<any[]>([]);
  const [importanceResponses, setImportanceResponses] = useState<any[]>([]);
  const [itemScores, setItemScores] = useState<any[]>([]);
  const [scaleScores, setScaleScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate(user ? '/dashboard' : '/auth');
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin || !sessionId) return;
    const load = async () => {
      const [sRes, bRes, iRes, isRes, ssRes] = await Promise.all([
        supabase.from('wip_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('wip_block_responses').select('*').eq('session_id', sessionId).order('block_number').order('assigned_rank'),
        supabase.from('wip_importance_responses').select('*').eq('session_id', sessionId).order('item_id'),
        supabase.from('wip_item_scores').select('*').eq('session_id', sessionId).order('final_score', { ascending: false }),
        supabase.from('wip_scale_scores').select('*').eq('session_id', sessionId).order('rank_order'),
      ]);
      setSession(sRes.data);
      setBlockResponses(bRes.data || []);
      setImportanceResponses(iRes.data || []);
      setItemScores(isRes.data || []);
      setScaleScores(ssRes.data || []);
      setLoading(false);
    };
    load();
  }, [isAdmin, sessionId]);

  const downloadJson = () => {
    const payload = session?.result_payload || {
      sessionId, session, blockResponses, importanceResponses, itemScores, scaleScores,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wip-session-${sessionId?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importanceMap = new Map(importanceResponses.map((r: any) => [r.item_id, r.is_important]));

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!session) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Session not found</div>;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate('/admin/wip')} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />Back to Sessions
            </Button>
            <h1 className="text-2xl font-bold">Session Detail</h1>
            <p className="text-sm text-muted-foreground font-mono">{sessionId}</p>
          </div>
          <Button variant="outline" onClick={downloadJson}>
            <Download className="h-4 w-4 mr-2" />Download JSON
          </Button>
        </div>

        {/* A. Session Summary */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg">Session Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                ['Status', session.status],
                ['Created', new Date(session.created_at).toLocaleString()],
                ['Completed', session.completed_at ? new Date(session.completed_at).toLocaleString() : '—'],
                ['Zero Point Raw Votes', session.zero_point_raw_votes ?? '—'],
                ['Zero Point Z', session.zero_point_z?.toFixed(3) ?? '—'],
                ['Consistency Score', session.consistency_score?.toFixed(3) ?? '—'],
                ['Top Scale 1', session.top_scale_1 ?? '—'],
                ['Top Scale 2', session.top_scale_2 ?? '—'],
              ].map(([label, val]) => (
                <div key={label as string}>
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="font-medium">{val}</p>
                </div>
              ))}
            </div>
            {session.consistency_flag && (
              <div className="mt-4 flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />Low consistency — possible random responding
              </div>
            )}
            {session.is_demo && <Badge variant="outline" className="mt-3">Demo / Manually Seeded</Badge>}
          </CardContent>
        </Card>

        <Tabs defaultValue="scales" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scales">Scales</TabsTrigger>
            <TabsTrigger value="items">Item Scores</TabsTrigger>
            <TabsTrigger value="blocks">Block Rankings</TabsTrigger>
            <TabsTrigger value="importance">Importance</TabsTrigger>
          </TabsList>

          {/* E. Scale Scores */}
          <TabsContent value="scales">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Scale</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Interpretation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scaleScores.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>{s.rank_order}</TableCell>
                        <TableCell className="font-medium">{s.scale_label}</TableCell>
                        <TableCell className="font-mono text-xs">{s.scale_key}</TableCell>
                        <TableCell className="font-mono">{s.score.toFixed(4)}</TableCell>
                        <TableCell>
                          <Badge variant={getInterpretation(s.score) === 'High' ? 'default' : 'secondary'}>
                            {getInterpretation(s.score)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* D. Item Scores */}
          <TabsContent value="items">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Need</TableHead>
                      <TableHead>Raw Votes</TableHead>
                      <TableHead>Adj. Votes</TableHead>
                      <TableHead>p</TableHead>
                      <TableHead>Initial Z</TableHead>
                      <TableHead>Final Score</TableHead>
                      <TableHead>Important?</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemScores.map((is: any) => {
                      const item = ITEM_MAP.get(is.item_id);
                      return (
                        <TableRow key={is.id}>
                          <TableCell>{is.item_id}</TableCell>
                          <TableCell className="font-medium">{item?.needLabel ?? `Item ${is.item_id}`}</TableCell>
                          <TableCell className="font-mono">{is.raw_votes}</TableCell>
                          <TableCell className="font-mono">{is.adjusted_votes.toFixed(1)}</TableCell>
                          <TableCell className="font-mono">{is.proportion_p.toFixed(4)}</TableCell>
                          <TableCell className="font-mono">{is.initial_z.toFixed(3)}</TableCell>
                          <TableCell className="font-mono font-bold">{is.final_score.toFixed(3)}</TableCell>
                          <TableCell>
                            {importanceMap.has(is.item_id)
                              ? (importanceMap.get(is.item_id) ? '✓ Yes' : '✗ No')
                              : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* B. Block Rankings */}
          <TabsContent value="blocks">
            <Card>
              <CardContent className="p-0">
                {blockResponses.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground">No block ranking data (demo/seeded session)</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Block</TableHead>
                        <TableHead>Item ID</TableHead>
                        <TableHead>Need</TableHead>
                        <TableHead>Assigned Rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blockResponses.map((b: any) => {
                        const item = ITEM_MAP.get(b.item_id);
                        return (
                          <TableRow key={b.id}>
                            <TableCell>{b.block_number + 1}</TableCell>
                            <TableCell>{b.item_id}</TableCell>
                            <TableCell>{item?.needLabel ?? `Item ${b.item_id}`}</TableCell>
                            <TableCell className="font-mono">{b.assigned_rank}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* C. Importance Responses */}
          <TabsContent value="importance">
            <Card>
              <CardContent className="p-0">
                {importanceResponses.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground">No importance data (demo/seeded session)</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item ID</TableHead>
                        <TableHead>Need</TableHead>
                        <TableHead>Important?</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importanceResponses.map((r: any) => {
                        const item = ITEM_MAP.get(r.item_id);
                        return (
                          <TableRow key={r.id}>
                            <TableCell>{r.item_id}</TableCell>
                            <TableCell>{item?.needLabel ?? `Item ${r.item_id}`}</TableCell>
                            <TableCell>{r.is_important ? '✓ Yes' : '✗ No'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
