import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import logoColor from '@/assets/logo-color.png';

interface UserStats {
  totalUsers: number;
  totalPodcasts: number;
  totalResumes: number;
  completedAssessments: number;
}

export default function Admin() {
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    totalPodcasts: 0,
    totalResumes: 0,
    completedAssessments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/dashboard');
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!isAdmin) return;
      try {
        setStats({
          totalUsers: 156,
          totalPodcasts: 89,
          totalResumes: 134,
          completedAssessments: 245,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin) {
      fetchStats();
    }
  }, [isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, emoji: '👥' },
    { title: 'Podcasts Generated', value: stats.totalPodcasts, emoji: '🎙️' },
    { title: 'Resumes Uploaded', value: stats.totalResumes, emoji: '📄' },
    { title: 'Assessments Completed', value: stats.completedAssessments, emoji: '🧭' },
  ];

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3">
            <img src={logoColor} alt="WorkReady360" className="h-12 w-auto" />
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage users and view platform statistics</p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <Button variant="outline" onClick={() => navigate('/admin/wip')} className="mr-3">
            🧪 WIP Sessions
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <Card key={stat.title} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{stat.emoji}</span>
                  <span className="text-3xl font-bold">{stat.value}</span>
                </div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Tools */}
        <Card className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <CardHeader>
            <CardTitle>Admin Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/admin/wip')}>
              🧪 View & Manage WIP Sessions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
