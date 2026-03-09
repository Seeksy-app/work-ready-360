import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowLeft, Shield, Search, Beaker } from 'lucide-react';
import { toast } from 'sonner';
import { seedAndrewWipScores } from '@/lib/wip/seedDemo';

interface WipSessionRow {
  id: string;
  user_id: string;
  created_at: string;
  completed_at: string | null;
  status: string;
  consistency_score: number | null;
  consistency_flag: boolean | null;
  top_scale_1: string | null;
  top_scale_2: string | null;
  source?: string;
  is_demo?: boolean;
  email?: string;
}

export default function AdminWip() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<WipSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [emailSearch, setEmailSearch] = useState('');
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate(user ? '/dashboard' : '/auth');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchSessions();
  }, [isAdmin]);

  const fetchSessions = async () => {
    setLoading(true);
    // Fetch sessions
    const { data: sessionsData, error } = await supabase
      .from('wip_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      setLoading(false);
      return;
    }

    // Fetch all profiles for email lookup
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, email');

    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.email]));

    const enriched: WipSessionRow[] = (sessionsData || []).map((s: any) => ({
      ...s,
      email: profileMap.get(s.user_id) || 'Unknown',
    }));

    setSessions(enriched);
    setLoading(false);
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const result = await seedAndrewWipScores();
      toast.success(`Demo seeded! Session: ${result.sessionId.slice(0, 8)}… Top: ${result.topScales.join(', ')}`);
      fetchSessions();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed demo');
    } finally {
      setSeeding(false);
    }
  };

  const filtered = sessions.filter(s => {
    if (statusFilter === 'completed' && s.status !== 'completed') return false;
    if (statusFilter === 'incomplete' && s.status === 'completed') return false;
    if (statusFilter === 'demo' && !s.is_demo) return false;
    if (emailSearch && !(s.email || '').toLowerCase().includes(emailSearch.toLowerCase())) return false;
    return true;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/admin')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />Back to Admin
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">WIP Sessions</h1>
                <p className="text-muted-foreground">{sessions.length} total sessions</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleSeedDemo} disabled={seeding}>
              {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Beaker className="h-4 w-4 mr-2" />}
              Seed Andrew WIP Demo
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4 flex flex-wrap gap-4 items-end">
            <div className="w-48">
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="incomplete">Incomplete</SelectItem>
                  <SelectItem value="demo">Demo Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email…"
                  value={emailSearch}
                  onChange={e => setEmailSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Consistency</TableHead>
                  <TableHead>Top Scales</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No sessions found
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(s => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/wip/${s.id}`)}>
                    <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-sm">{s.email}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'completed' ? 'default' : 'secondary'}>
                        {s.status}
                      </Badge>
                      {s.is_demo && <Badge variant="outline" className="ml-1 text-xs">Demo</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs">{s.completed_at ? new Date(s.completed_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      {s.consistency_flag && <Badge variant="destructive" className="text-xs">Low</Badge>}
                      {s.consistency_score != null ? (
                        <span className="text-xs font-mono">{s.consistency_score.toFixed(3)}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.top_scale_1 && s.top_scale_2
                        ? `${s.top_scale_1}, ${s.top_scale_2}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
