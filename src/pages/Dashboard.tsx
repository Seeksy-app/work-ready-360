import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  LogOut,
  Sparkles,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Lock,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import logoColor from '@/assets/logo-color-full.png';
import AgentChat from '@/components/AgentChat';

export default function Dashboard() {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(true);

  const [hasProfileComplete, setHasProfileComplete] = useState(false);
  const [hasInterestResults, setHasInterestResults] = useState(false);
  const [hasWorkImportanceResults, setHasWorkImportanceResults] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [hasPodcasts, setHasPodcasts] = useState(false);
  const prevCompleted = useRef<Set<string>>(new Set());

  const fireConfetti = () => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899'] });
  };

  // Track newly completed steps and celebrate
  useEffect(() => {
    const currentCompleted = new Set<string>();
    if (hasProfileComplete) currentCompleted.add('profile');
    if (hasInterestResults) currentCompleted.add('interest');
    if (hasWorkImportanceResults) currentCompleted.add('wip');
    if (hasResume) currentCompleted.add('resume');
    if (hasPodcasts) currentCompleted.add('podcast');

    if (prevCompleted.current.size > 0) {
      for (const key of currentCompleted) {
        if (!prevCompleted.current.has(key)) {
          fireConfetti();
          break;
        }
      }
    }
    prevCompleted.current = currentCompleted;
  }, [hasProfileComplete, hasInterestResults, hasWorkImportanceResults, hasResume, hasPodcasts]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const checkCompletionStatus = async () => {
      if (!user) return;

      const [profileRes, interestRes, workRes, resumeRes, podcastRes] = await Promise.all([
        supabase.from('profiles').select('zip_code').eq('user_id', user.id).single(),
        supabase.from('interest_profiler_results').select('id').eq('user_id', user.id).limit(1),
        supabase.from('work_importance_results').select('id').eq('user_id', user.id).limit(1),
        supabase.from('resumes').select('id').eq('user_id', user.id).limit(1),
        supabase.from('podcasts').select('id').eq('user_id', user.id).eq('status', 'completed').limit(1),
      ]);

      setHasProfileComplete(!!(profileRes.data as any)?.zip_code);
      setHasInterestResults((interestRes.data?.length || 0) > 0);
      setHasWorkImportanceResults((workRes.data?.length || 0) > 0);
      setHasResume((resumeRes.data?.length || 0) > 0);
      setHasPodcasts((podcastRes.data?.length || 0) > 0);
    };

    checkCompletionStatus();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const assessments = [
    {
      id: 'interest',
      title: 'Interest Profiler',
      description: 'Discover careers that match your interests',
      emoji: '🧭',
      completed: hasInterestResults,
      href: hasInterestResults ? '/assessment/interest/results' : '/assessment/interest',
    },
    {
      id: 'work-importance',
      title: 'Work Importance',
      description: 'Identify what matters most in your career',
      emoji: '⚖️',
      completed: hasWorkImportanceResults,
      href: hasWorkImportanceResults ? '/assessment/work-importance/results' : '/assessment/work-importance',
    },
  ];

  const assessmentProgress = ((hasInterestResults ? 1 : 0) + (hasWorkImportanceResults ? 1 : 0)) / 2 * 100;

  const steps = [
    { id: 1, title: 'Complete Profile', completed: hasProfileComplete },
    { id: 2, title: 'Interest Profiler', completed: hasInterestResults },
    { id: 3, title: 'Work Importance', completed: hasWorkImportanceResults },
    { id: 4, title: 'Upload Resume', completed: hasResume },
    { id: 5, title: 'Create Career Podcast', completed: hasPodcasts },
  ];

  // Determine the index of the first incomplete step
  const currentStepIndex = steps.findIndex(s => !s.completed);
  // Helper: is a step unlocked (completed or is the current one)?
  const isStepUnlocked = (index: number) => steps[index].completed || index === currentStepIndex;

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  const CompletionBadge = ({ completed, label }: { completed: boolean; label?: string }) => {
    if (!completed) return null;
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {label || 'Completed'}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b bg-accent backdrop-blur-sm sticky top-0 z-50">
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoColor} alt="WorkReady360" className="h-10 w-auto" />
            </div>
            
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="text-accent-foreground hover:bg-accent-foreground/10">Admin</Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(!chatOpen)}
                className="md:hidden text-accent-foreground hover:bg-accent-foreground/10"
              >
                {chatOpen ? <PanelRightClose className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline text-accent-foreground">
                  {profile?.full_name || user?.email}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} className="text-accent-foreground hover:bg-accent-foreground/10">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8 space-y-8 overflow-auto">
          {/* Welcome */}
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-2">
              Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋
            </h1>
            <p className="text-muted-foreground text-lg">
              Let's create your personalized career podcast
            </p>
          </div>

          {/* Progress */}
          <Card className="border-2 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                Your Progress
              </CardTitle>
              <CardDescription>Complete these steps to generate your custom podcast</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{completedSteps} of {steps.length} steps completed</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              <div className="flex flex-wrap gap-4">
                {steps.map((step, index) => {
                  const isCurrent = index === currentStepIndex;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        step.completed
                          ? 'bg-success/15 text-success'
                          : isCurrent
                            ? 'bg-primary/30 text-primary ring-2 ring-primary animate-pulse'
                            : 'bg-muted/60 text-muted-foreground/50'
                      }`}
                    >
                      {step.completed ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      <span>{step.title}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Assessments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Resources</h2>
              {assessmentProgress > 0 && assessmentProgress < 100 && (
                <Badge variant="secondary" className="gap-1">{Math.round(assessmentProgress)}% Complete</Badge>
              )}
              {assessmentProgress === 100 && <CompletionBadge completed={true} label="All Complete" />}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {assessments.map((assessment, index) => {
                // Interest = step index 1, Work Importance = step index 2
                const stepIndex = index === 0 ? 1 : 2;
                const locked = !isStepUnlocked(stepIndex);
                const Wrapper = locked ? 'div' : Link;
                const wrapperProps = locked ? {} : { to: assessment.href };
                return (
                  <Wrapper key={assessment.id} {...(wrapperProps as any)}>
                    <Card 
                      className={`h-full transition-all duration-300 animate-slide-up ${
                        locked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:border-primary/30 cursor-pointer group'
                      } ${assessment.completed ? 'border-success/30' : ''}`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardContent className="p-6 flex items-start gap-4">
                        <div className="w-12 h-12 flex items-center justify-center text-2xl">
                          {locked ? <Lock className="h-5 w-5 text-muted-foreground" /> : assessment.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <h3 className="font-semibold">{assessment.title}</h3>
                            <CompletionBadge completed={assessment.completed} />
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{assessment.description}</p>
                          <div className={`flex items-center text-sm font-medium group-hover:gap-2 transition-all ${
                            locked ? 'text-muted-foreground' : assessment.completed ? 'text-success' : 'text-primary'
                          }`}>
                            {locked ? 'Complete previous steps first' : assessment.completed ? 'View Results' : 'Start Assessment'}
                            {!locked && <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Wrapper>
                );
              })}
            </div>
          </div>

          {/* Profile & Resume */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Profile card — step index 0 */}
            <Card className={`h-full transition-all duration-300 animate-slide-up ${
              hasProfileComplete ? 'border-success/30' : 'hover:shadow-lg hover:border-primary/30 cursor-pointer group'
            }`} style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center text-2xl">👤</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <h3 className="font-semibold">Complete Profile</h3>
                    <CompletionBadge completed={hasProfileComplete} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">Add your zip code and notification preferences</p>
                  <div className={`flex items-center text-sm font-medium group-hover:gap-2 transition-all ${
                    hasProfileComplete ? 'text-success' : 'text-primary'
                  }`}>
                    {hasProfileComplete ? 'Profile Complete' : 'Complete Now'}
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resume card — step index 3 */}
            {(() => {
              const resumeLocked = !isStepUnlocked(3);
              const ResumeWrapper = resumeLocked ? 'div' : Link;
              const resumeProps = resumeLocked ? {} : { to: '/resume' };
              return (
                <ResumeWrapper {...(resumeProps as any)}>
                  <Card className={`h-full transition-all duration-300 animate-slide-up ${
                    resumeLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:border-primary/30 cursor-pointer group'
                  } ${hasResume ? 'border-success/30' : ''}`} style={{ animationDelay: '0.25s' }}>
                    <CardContent className="p-6 flex items-start gap-4">
                      <div className="w-12 h-12 flex items-center justify-center text-2xl">
                        {resumeLocked ? <Lock className="h-5 w-5 text-muted-foreground" /> : '📄'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <h3 className="font-semibold">Upload Resume</h3>
                          <CompletionBadge completed={hasResume} label="Uploaded" />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">Upload your resume for AI-powered re-write tips</p>
                        <div className={`flex items-center text-sm font-medium group-hover:gap-2 transition-all ${
                          resumeLocked ? 'text-muted-foreground' : hasResume ? 'text-success' : 'text-primary'
                        }`}>
                          {resumeLocked ? 'Complete previous steps first' : hasResume ? 'View Resume' : 'Upload Now'}
                          {!resumeLocked && <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </ResumeWrapper>
              );
            })()}
          </div>

          {/* Career Podcast — step index 4 */}
          {(() => {
            const podcastLocked = !isStepUnlocked(4);
            const PodWrapper = podcastLocked ? 'div' : Link;
            const podProps = podcastLocked ? {} : { to: '/podcast' };
            return (
              <PodWrapper {...(podProps as any)}>
                <Card className={`border-2 animate-slide-up ${
                  podcastLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:border-accent/30 cursor-pointer group'
                } ${hasPodcasts ? 'border-success/30' : 'border-dashed'}`} style={{ animationDelay: '0.3s' }}>
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 flex items-center justify-center text-2xl">
                      {podcastLocked ? <Lock className="h-5 w-5 text-muted-foreground" /> : '🎙️'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <h3 className="font-semibold">Create Your Career Podcast</h3>
                        <CompletionBadge completed={hasPodcasts} label="Generated" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Generate a personalized two-person career podcast using your assessment scores and resume — choose short (2-3 min) or long (5-8 min)
                      </p>
                      <div className={`flex items-center text-sm font-medium group-hover:gap-2 transition-all ${
                        podcastLocked ? 'text-muted-foreground' : hasPodcasts ? 'text-success' : 'text-accent'
                      }`}>
                        {podcastLocked ? 'Complete previous steps first' : (
                          <>
                            <span className="mr-1">▶</span>
                            {hasPodcasts ? 'Listen to Podcasts' : 'Generate Now'}
                            <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </PodWrapper>
            );
          })()}

          {/* Curated Podcasts — under Resources, not a step */}
          <Card className="animate-slide-up hover:shadow-lg hover:border-primary/30 cursor-pointer group transition-all duration-300" style={{ animationDelay: '0.35s' }}>
            <CardContent className="p-6 flex items-start gap-4">
              <div className="w-12 h-12 flex items-center justify-center text-2xl">🎧</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <h3 className="font-semibold">Curated Podcast Library</h3>
                  <Badge variant="secondary" className="text-xs">Resource</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Browse a curated list of career-focused podcasts to listen to
                </p>
                <div className="flex items-center text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  Browse Podcasts
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Sidebar chat — desktop always visible, mobile toggle */}
      <aside className={`${chatOpen ? 'w-[380px]' : 'w-0'} hidden md:flex flex-col border-l border-border bg-card transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="flex items-center justify-between px-4 h-16 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Agent360</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)} className="h-7 w-7">
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <AgentChat />
        </div>
      </aside>

      {/* Chat toggle when closed */}
      {!chatOpen && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90 border-0"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
