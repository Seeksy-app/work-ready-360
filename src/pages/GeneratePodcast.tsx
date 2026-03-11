import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Sparkles, Music, Mic, CheckCircle2 } from 'lucide-react';

const GENERATING_MESSAGES = [
  { icon: '🧠', text: 'Analyzing your interest profile…' },
  { icon: '⚖️', text: 'Reviewing your work values…' },
  { icon: '📄', text: 'Incorporating your resume insights…' },
  { icon: '✍️', text: 'Writing your personalized script…' },
  { icon: '🎙️', text: 'Recording your podcast…' },
  { icon: '🎶', text: 'Mixing the final audio…' },
];

export default function GeneratePodcast() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!authLoading && !user) { navigate('/auth'); return; }
  }, [user, authLoading, navigate]);

  // Advance stages for animation
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setStage(s => Math.min(s + 1, GENERATING_MESSAGES.length - 1));
    }, 8000);
    return () => clearInterval(timerRef.current);
  }, []);

  // Auto-start generation
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const generate = async () => {
      try {
        // Check if user already has a podcast
        const { data: existing } = await supabase
          .from('podcasts')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .limit(1);

        if (existing && existing.length > 0) {
          // Already have a podcast, skip to summary
          navigate('/summary', { replace: true });
          return;
        }

        // Gather all user data
        const [ipRes, wipRes, resumeRes, profileRes] = await Promise.all([
          supabase.from('interest_profiler_results').select('scores, top_interests').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1).single(),
          supabase.from('work_importance_results').select('scores, top_values').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1).single(),
          supabase.from('resumes').select('parsed_content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
          supabase.from('profiles').select('full_name, linkedin_data').eq('user_id', user.id).single(),
        ]);

        const requestBody: any = {
          type: 'profile',
          userName: profileRes.data?.full_name || 'our listener',
          userId: user.id,
          savePodcast: true,
          // Default voices: George + Sarah
          hostVoiceId: 'JBFqnCBsd6RMkjVDRZzb',
          guestVoiceId: 'EXAVITQu4vr4xnSDxMaL',
        };

        if (ipRes.data) {
          requestBody.interestProfilerResults = {
            scores: ipRes.data.scores as Record<string, number>,
            topInterests: ipRes.data.top_interests,
          };
        }
        if (wipRes.data) {
          requestBody.workImportanceResults = {
            scores: wipRes.data.scores as Record<string, number>,
            topValues: wipRes.data.top_values,
          };
        }
        if (resumeRes.data?.parsed_content) {
          const pc = resumeRes.data.parsed_content as any;
          requestBody.resumeContent = typeof pc === 'string' ? pc : JSON.stringify(pc);
        }
        const li = (profileRes.data as any)?.linkedin_data;
        if (li) requestBody.linkedinData = li;

        setStage(3); // Jump to "writing script"

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-podcast`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (cancelled) return;

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate podcast');
        }

        setDone(true);
        clearInterval(timerRef.current);

        // Brief pause to show success, then navigate
        setTimeout(() => {
          if (!cancelled) navigate('/summary', { replace: true });
        }, 2000);

      } catch (err: any) {
        if (!cancelled) {
          console.error('Podcast generation failed:', err);
          setError(err.message || 'Something went wrong');
          clearInterval(timerRef.current);
        }
      }
    };

    generate();
    return () => { cancelled = true; };
  }, [user, navigate]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Animated icon */}
        <div className="relative mx-auto w-24 h-24">
          {!done && !error && (
            <>
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </>
          )}
          {done && (
            <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
          )}
          {error && (
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-4xl">😔</span>
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {done ? 'Your Podcast is Ready!' : error ? 'Generation Failed' : 'Creating Your Career Podcast'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {done
              ? 'Taking you to your career summary…'
              : error
                ? error
                : 'We\'re synthesizing your assessments, resume, and profile into a personalized podcast.'
            }
          </p>
        </div>

        {/* Stage indicators */}
        {!done && !error && (
          <div className="space-y-3 text-left">
            {GENERATING_MESSAGES.map((msg, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-500 ${
                  i < stage ? 'bg-success/5 text-success' :
                  i === stage ? 'bg-primary/10 text-foreground' :
                  'text-muted-foreground/50'
                }`}
              >
                <span className="text-lg">{i < stage ? '✅' : msg.icon}</span>
                <span className={`text-sm font-medium ${i === stage ? 'animate-pulse' : ''}`}>
                  {msg.text}
                </span>
                {i === stage && <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto text-primary" />}
              </div>
            ))}
          </div>
        )}

        {/* Error retry */}
        {error && (
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
