import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Share2,
  Download,
  Copy,
  CheckCircle2,
  Briefcase,
  Globe,
} from 'lucide-react';
import DashboardNav from '@/components/DashboardNav';
import wowWheelImage from '@/assets/wow-wheel.png';

const categoryNames: Record<string, string> = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social', E: 'Enterprising', C: 'Conventional',
};

const categoryDescriptions: Record<string, string> = {
  R: 'Hands-on, practical work with tools, machines, or nature',
  I: 'Research, analysis, and problem-solving',
  A: 'Creative expression and design',
  S: 'Helping, teaching, and serving others',
  E: 'Leading, persuading, and business',
  C: 'Organizing data, records, and processes',
};

const categoryAngles: Record<string, number> = {
  S: 0, A: 60, R: 120, I: 180, E: 300, C: 240,
};

const valueDescriptions: Record<string, string> = {
  Achievement: 'Feeling a sense of accomplishment and using your abilities',
  Independence: 'Working autonomously and trying your own ideas',
  Recognition: 'Receiving advancement, authority, and social status',
  Relationships: 'Working with supportive co-workers in a moral workplace',
  Support: 'Having fair company policies and good supervision',
  Working_Conditions: 'Good pay, job security, variety, and activity',
};

interface SummaryData {
  profile: { full_name: string | null; email: string; linkedin_data: any; share_token: string | null };
  interestResults: { scores: Record<string, number>; top_interests: string[] } | null;
  wipResults: { scores: Record<string, number>; top_values: string[] } | null;
  podcast: { id: string; title: string; audio_url: string; transcript: string | null; duration_seconds: number | null } | null;
  resume: { file_name: string; parsed_content: any } | null;
}

export default function MySummary() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SummaryData | null>(null);
  const [copied, setCopied] = useState(false);

  // Audio player
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
    if (!user) return;

    const load = async () => {
      const [profileRes, ipRes, wipRes, podcastRes, resumeRes] = await Promise.all([
        supabase.from('profiles').select('full_name, email, linkedin_data, share_token').eq('user_id', user.id).single(),
        supabase.from('interest_profiler_results').select('scores, top_interests').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1).single(),
        supabase.from('work_importance_results').select('scores, top_values').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1).single(),
        supabase.from('podcasts').select('id, title, audio_url, transcript, duration_seconds').eq('user_id', user.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('resumes').select('file_name, parsed_content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
      ]);

      setData({
        profile: profileRes.data as any || { full_name: null, email: user.email || '', linkedin_data: null, share_token: null },
        interestResults: ipRes.data ? { scores: ipRes.data.scores as Record<string, number>, top_interests: ipRes.data.top_interests } : null,
        wipResults: wipRes.data ? { scores: wipRes.data.scores as Record<string, number>, top_values: wipRes.data.top_values } : null,
        podcast: podcastRes.data || null,
        resume: resumeRes.data || null,
      });
      setLoading(false);
    };
    load();
  }, [user, authLoading, navigate]);

  // Audio handlers
  useEffect(() => {
    if (!data?.podcast?.audio_url) return;
    const audio = new Audio(data.podcast.audio_url);
    audioRef.current = audio;
    const onTime = () => { if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100); };
    const onMeta = () => setDuration(audio.duration);
    const onEnd = () => { setIsPlaying(false); setProgress(100); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [data?.podcast?.audio_url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const seek = (delta: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + delta));
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const handleShare = async () => {
    const token = data?.profile?.share_token;
    if (!token) { toast.error('Share link not available'); return; }
    const url = `${window.location.origin}/summary/public/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Share link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!audioRef.current) return;
    const link = document.createElement('a');
    link.href = audioRef.current.src;
    link.download = 'my-career-podcast.mp3';
    link.click();
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!data) return null;

  const ipScores = data.interestResults
    ? Object.entries(data.interestResults.scores)
        .map(([cat, score]) => ({ category: cat, score }))
        .sort((a, b) => b.score - a.score)
    : [];
  const topCodes = ipScores.slice(0, 3).map(r => r.category);

  const wipScores = data.wipResults
    ? Object.entries(data.wipResults.scores)
        .map(([key, score]) => ({ key, score }))
        .sort((a, b) => b.score - a.score)
    : [];

  const linkedIn = data.profile.linkedin_data as any;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />

      <main className="flex-1 py-8 animate-fade-in">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {data.profile.full_name ? `${data.profile.full_name}'s Career Profile` : 'My Career Profile'}
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Your personalized career summary — interests, values, and podcast
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                {copied ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
                {copied ? 'Copied!' : 'Share'}
              </Button>
              {data.podcast && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" /> Download
                </Button>
              )}
            </div>
          </div>

          {/* Podcast Player */}
          {data.podcast && (
            <Card className="mb-6 border-primary/20 animate-fade-in">
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{data.podcast.title}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground w-10 text-right">
                        {formatTime(audioRef.current?.currentTime || 0)}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
                        onClick={(e) => {
                          if (!audioRef.current) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pct = (e.clientX - rect.left) / rect.width;
                          audioRef.current.currentTime = pct * audioRef.current.duration;
                        }}
                      >
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10">
                        {formatTime(duration)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => seek(-15)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <SkipBack className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => seek(15)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                      <SkipForward className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Two-column: IP + WOW */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Interest Profiler Results */}
            {data.interestResults && (
              <Card className="animate-slide-up">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold text-lg">Interest Profile</h2>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {topCodes.map((code, i) => (
                      <Badge key={code} variant="secondary" className="text-xs font-semibold">
                        #{i + 1} {categoryNames[code]}
                      </Badge>
                    ))}
                  </div>
                  {ipScores.map((r, i) => (
                    <div key={r.category} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>{i + 1}</span>
                          <span className="text-sm font-medium">{categoryNames[r.category]}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{r.score}/30</span>
                      </div>
                      <Progress value={(r.score / 30) * 100} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* WOW Wheel */}
            {data.interestResults && (
              <div className="animate-slide-up flex flex-col items-center justify-center" style={{ animationDelay: '0.05s' }}>
                <h3 className="text-lg font-semibold text-foreground mb-2">World of Work</h3>
                <div className="relative w-full mx-auto">
                  <img src={wowWheelImage} alt="World of Work wheel" className="w-full h-auto" />
                  <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full pointer-events-none">
                    {topCodes.map((code, i) => {
                      const angle = categoryAngles[code];
                      const rad = ((angle - 90) * Math.PI) / 180;
                      const cx = 200 + Math.cos(rad) * 145;
                      const cy = 200 + Math.sin(rad) * 145;
                      return (
                        <g key={code}>
                          <circle cx={cx} cy={cy} r={22} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} opacity={0.7} className="animate-pulse" />
                          <circle cx={cx} cy={cy} r={14} fill="hsl(var(--primary))" />
                          <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="11" fontWeight="bold">#{i + 1}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Work Values */}
          {data.wipResults && (
            <Card className="mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-lg">Work Values</h2>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {data.wipResults.top_values.slice(0, 3).map((v, i) => (
                    <Badge key={v} variant="secondary" className="text-xs font-semibold">
                      #{i + 1} {v.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {wipScores.map((s, i) => (
                    <div key={s.key} className="p-3 rounded-lg border space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{s.key.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-muted-foreground">{typeof s.score === 'number' ? s.score.toFixed(1) : s.score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{valueDescriptions[s.key] || ''}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* LinkedIn snapshot */}
          {linkedIn && (
            <Card className="mb-6 animate-slide-up" style={{ animationDelay: '0.15s' }}>
              <CardContent className="p-5">
                <h2 className="font-semibold text-lg mb-3">Professional Background</h2>
                <div className="space-y-2 text-sm">
                  {linkedIn.job_title && (
                    <p><span className="text-muted-foreground">Current Role:</span> <strong>{linkedIn.job_title}</strong>{linkedIn.job_company_name ? ` at ${linkedIn.job_company_name}` : ''}</p>
                  )}
                  {linkedIn.headline && <p><span className="text-muted-foreground">Headline:</span> {linkedIn.headline}</p>}
                  {linkedIn.industry && <p><span className="text-muted-foreground">Industry:</span> {linkedIn.industry}</p>}
                  {linkedIn.skills && linkedIn.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {linkedIn.skills.slice(0, 12).map((skill: string) => (
                        <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
            <Button variant="hero" className="flex-1" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" /> Share My Profile
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
