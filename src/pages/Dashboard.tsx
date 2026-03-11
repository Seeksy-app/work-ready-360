import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import mascot from '@/assets/agent360-mascot.png';
import logo360 from '@/assets/logo-360.jpg';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Loader2,
  CheckCircle2,
  Circle,
  ArrowRight,
  LogOut,
  PanelRightClose,
  Lock,
  SkipForward,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import AgentChat from '@/components/AgentChat';
import ProfileSheet from '@/components/ProfileSheet';

function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getFormattedTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function Dashboard() {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(true);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  const [hasProfileComplete, setHasProfileComplete] = useState(false);
  const [completionChecked, setCompletionChecked] = useState(false);
  const [hasInterestResults, setHasInterestResults] = useState(false);
  const [hasWorkImportanceResults, setHasWorkImportanceResults] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [hasPodcasts, setHasPodcasts] = useState(false);
  const [resumeSkipped, setResumeSkipped] = useState(() => localStorage.getItem('wr360_resume_skipped') === 'true');
  const [podcastSkipped, setPodcastSkipped] = useState(() => localStorage.getItem('wr360_podcast_skipped') === 'true');
  const prevCompleted = useRef<Set<string>>(new Set());
  const [weather, setWeather] = useState<string | null>(null);

  const fireConfetti = () => {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#f59e0b', '#10b981', '#6366f1', '#ec4899'] });
  };

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || '';

  // Fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      const zip = (profile as any)?.zip_code;
      if (!zip) return;
      try {
        const res = await fetch(`https://wttr.in/${zip}?format=%C+%t&m`);
        if (res.ok) setWeather((await res.text()).trim());
      } catch {}
    };
    fetchWeather();
  }, [profile]);

  // Confetti on new completions
  useEffect(() => {
    const currentCompleted = new Set<string>();
    if (hasProfileComplete) currentCompleted.add('profile');
    if (hasInterestResults) currentCompleted.add('interest');
    if (hasWorkImportanceResults) currentCompleted.add('wip');
    if (hasResume || resumeSkipped) currentCompleted.add('resume');
    if (hasPodcasts || podcastSkipped) currentCompleted.add('podcast');

    if (prevCompleted.current.size > 0) {
      for (const key of currentCompleted) {
        if (!prevCompleted.current.has(key)) { fireConfetti(); break; }
      }
    }
    prevCompleted.current = currentCompleted;
  }, [hasProfileComplete, hasInterestResults, hasWorkImportanceResults, hasResume, hasPodcasts, resumeSkipped, podcastSkipped]);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

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
    setCompletionChecked(true);

  useEffect(() => { checkCompletionStatus(); }, [user]);

  // Auto-open profile sheet for new users who haven't completed their profile
  useEffect(() => {
    if (completionChecked && !loading && user && !hasProfileComplete && !profileSheetOpen) {
      const timer = setTimeout(() => setProfileSheetOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [completionChecked, loading, user, hasProfileComplete]);

  const handleSkipResume = () => {
    setResumeSkipped(true);
    localStorage.setItem('wr360_resume_skipped', 'true');
  };

  const handleSkipPodcast = () => {
    setPodcastSkipped(true);
    localStorage.setItem('wr360_podcast_skipped', 'true');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Steps — resume and podcast can be skipped
  const resumeCompleted = hasResume || resumeSkipped;
  const podcastCompleted = hasPodcasts || podcastSkipped;

  const steps = [
    { id: 1, title: 'Complete Profile', completed: hasProfileComplete, skipped: false, canSkip: false },
    { id: 2, title: 'Interest Profiler', completed: hasInterestResults, skipped: false, canSkip: false },
    { id: 3, title: 'Work Importance', completed: hasWorkImportanceResults, skipped: false, canSkip: false },
    { id: 4, title: 'Upload Resume', completed: resumeCompleted, skipped: resumeSkipped && !hasResume, canSkip: true },
    { id: 5, title: 'Career Podcast', completed: podcastCompleted, skipped: podcastSkipped && !hasPodcasts, canSkip: true },
  ];

  const isSequentiallyCompleted = (index: number): boolean => {
    for (let i = 0; i <= index; i++) {
      if (!steps[i].completed) return false;
    }
    return true;
  };

  const currentStepIndex = steps.findIndex((_, i) => !isSequentiallyCompleted(i));
  const isStepUnlocked = (index: number) => isSequentiallyCompleted(index) || index === currentStepIndex;
  const completedSteps = steps.filter((_, i) => isSequentiallyCompleted(i)).length;
  const progress = (completedSteps / steps.length) * 100;

  // Podcast Library unlocks when podcast is generated OR both resume+podcast are skipped
  const podcastLibraryUnlocked = hasPodcasts || (resumeSkipped && podcastSkipped);

  // Step navigation handlers
  const stepActions: Record<number, () => void> = {
    0: () => setProfileSheetOpen(true),
    1: () => navigate(hasInterestResults ? '/assessment/interest/results' : '/assessment/interest'),
    2: () => navigate(hasWorkImportanceResults ? '/assessment/work-importance/results' : '/assessment/work-importance'),
    3: () => navigate('/resume'),
    4: () => navigate('/podcast'),
  };

  const stepTooltips = [
    hasProfileComplete ? 'Profile complete ✓' : 'Add your zip code and LinkedIn to get started',
    isStepUnlocked(1)
      ? (hasInterestResults ? 'View your interest results' : 'Take the Interest Profiler')
      : 'Complete your profile to unlock this step',
    isStepUnlocked(2)
      ? (hasWorkImportanceResults ? 'View your work values' : 'Take the Work Importance assessment')
      : 'Complete the Interest Profiler to unlock this step',
    isStepUnlocked(3)
      ? (hasResume ? 'View your resume' : resumeSkipped ? 'Skipped — click to upload' : 'Upload your resume')
      : 'Complete Work Importance to unlock this step',
    isStepUnlocked(4)
      ? (hasPodcasts ? 'Listen to your podcasts' : podcastSkipped ? 'Skipped — click to generate' : 'Generate your career podcast')
      : 'Complete or skip Resume to unlock this step',
  ];

  // 6-card grid
  const cards = [
    {
      id: 'profile',
      title: 'Complete Profile',
      description: 'Add your zip code, LinkedIn, and preferences',
      emoji: '👤',
      completed: isSequentiallyCompleted(0),
      skipped: false,
      stepIndex: 0,
      onClick: () => setProfileSheetOpen(true),
    },
    {
      id: 'interest',
      title: 'Interest Profiler',
      description: 'Discover careers that match your interests',
      emoji: '🧭',
      completed: isSequentiallyCompleted(1),
      skipped: false,
      stepIndex: 1,
      href: hasInterestResults ? '/assessment/interest/results' : '/assessment/interest',
    },
    {
      id: 'work-importance',
      title: 'Work Importance',
      description: 'Identify what matters most in your career',
      emoji: '⚖️',
      completed: isSequentiallyCompleted(2),
      skipped: false,
      stepIndex: 2,
      href: hasWorkImportanceResults ? '/assessment/work-importance/results' : '/assessment/work-importance',
    },
    {
      id: 'resume',
      title: 'Upload Resume',
      description: 'Upload your resume for AI-powered tips',
      emoji: '📄',
      completed: isSequentiallyCompleted(3),
      skipped: steps[3].skipped,
      stepIndex: 3,
      href: '/resume',
      canSkip: true,
    },
    {
      id: 'podcast',
      title: 'Career Podcast',
      description: 'Generate a personalized career podcast',
      emoji: '🎙️',
      completed: isSequentiallyCompleted(4),
      skipped: steps[4].skipped,
      stepIndex: 4,
      href: '/podcast',
      canSkip: true,
    },
    {
      id: 'curated',
      title: 'Podcast Library',
      description: 'Browse curated career podcasts',
      emoji: '🎧',
      completed: false,
      skipped: false,
      stepIndex: -1,
      href: '/podcast?tab=curated',
      isResource: true,
      resourceLocked: !podcastLibraryUnlocked,
    },
    {
      id: 'knowledge',
      title: 'Knowledge Base',
      description: 'Explore occupations, education, reading & tips',
      emoji: '📚',
      completed: false,
      skipped: false,
      stepIndex: -1,
      href: '/knowledge',
      isResource: true,
      resourceLocked: !(hasInterestResults && hasWorkImportanceResults),
    },
  ];

  const CompletionBadge = ({ completed, skipped, label }: { completed: boolean; skipped?: boolean; label?: string }) => {
    if (skipped) {
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-dashed gap-1 text-xs">
          <SkipForward className="h-3 w-3" />
          Skipped
        </Badge>
      );
    }
    if (!completed) return null;
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        {label || 'Done'}
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
              <img src={logo360} alt="WorkReady360" className="h-9 w-9 rounded-lg object-cover" />
              <span className="text-xl font-bold text-accent-foreground tracking-tight">WorkReady360</span>
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
                {chatOpen ? <PanelRightClose className="h-4 w-4" /> : <img src={mascot} alt="Chat" className="h-5 w-5 rounded-full" />}
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
            <h1 className="text-3xl font-bold mb-1">
              {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
            </h1>
            <p className="text-muted-foreground text-sm">
              {getFormattedDate()} · {getFormattedTime()}{weather ? ` · ${weather}` : ''}
            </p>
          </div>

          {/* Progress */}
          <Card className="border-2 animate-slide-up">
            <CardContent className="p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
                  <span>✨</span> Your Progress
                </h2>
                <p className="text-sm text-muted-foreground">Complete these steps to generate your custom podcast</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{completedSteps} of {steps.length} steps completed</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              <div className="flex flex-wrap gap-3">
                {steps.map((step, index) => {
                  const seqCompleted = isSequentiallyCompleted(index);
                  const isCurrent = index === currentStepIndex;
                  const unlocked = isStepUnlocked(index);

                  return (
                    <div key={step.id} className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => unlocked && stepActions[index]?.()}
                            disabled={!unlocked}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                              step.skipped
                                ? 'bg-muted text-muted-foreground border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/80'
                                : seqCompleted
                                  ? 'bg-success/15 text-success cursor-pointer hover:bg-success/25'
                                  : isCurrent
                                    ? 'bg-primary/30 text-primary-foreground ring-2 ring-primary animate-pulse cursor-pointer hover:bg-primary/40'
                                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                          >
                            {step.skipped
                              ? <SkipForward className="h-4 w-4" />
                              : seqCompleted
                                ? <CheckCircle2 className="h-4 w-4" />
                                : unlocked
                                  ? <Circle className="h-4 w-4" />
                                  : <Lock className="h-3.5 w-3.5" />}
                            <span>{step.title}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[200px] text-center">
                          <p>{stepTooltips[index]}</p>
                        </TooltipContent>
                      </Tooltip>
                      {/* Skip button for skippable steps that are current and not yet completed/skipped */}
                      {step.canSkip && isCurrent && !seqCompleted && !step.skipped && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => index === 3 ? handleSkipResume() : handleSkipPodcast()}
                              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <SkipForward className="h-3 w-3" />
                              Skip
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            <p>Skip this step for now</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 6-card grid */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Resources</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card, index) => {
                const locked = card.isResource
                  ? card.resourceLocked
                  : card.stepIndex >= 0 && !isStepUnlocked(card.stepIndex);
                const isClickable = !locked;

                const cardContent = (
                  <Card
                    className={`h-full transition-all duration-300 animate-slide-up ${
                      locked
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:shadow-lg hover:border-primary/30 cursor-pointer group'
                    } ${card.completed && !card.skipped ? 'border-success/30' : ''} ${card.skipped ? 'border-dashed' : ''}`}
                    style={{ animationDelay: `${index * 0.08}s` }}
                    onClick={isClickable && card.onClick ? card.onClick : undefined}
                  >
                    <CardContent className="p-5 flex items-start gap-4">
                      <div className="w-10 h-10 flex items-center justify-center text-xl flex-shrink-0">
                        {locked ? <Lock className="h-5 w-5 text-muted-foreground" /> : card.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <h3 className="font-semibold text-sm">{card.title}</h3>
                          {card.isResource ? (
                            locked ? null : <Badge variant="secondary" className="text-xs">Resource</Badge>
                          ) : (
                            <CompletionBadge completed={card.completed} skipped={card.skipped} />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{card.description}</p>
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center text-xs font-medium group-hover:gap-2 transition-all ${
                            locked ? 'text-muted-foreground' : card.skipped ? 'text-muted-foreground' : card.completed ? 'text-success' : 'text-primary'
                          }`}>
                            {locked
                              ? 'Complete previous steps'
                              : card.skipped
                                ? 'Skipped — click to complete'
                                : card.completed
                                  ? 'View Results'
                                  : card.isResource
                                    ? 'Browse'
                                    : 'Start'}
                            {!locked && <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />}
                          </div>
                          {/* Skip button on card for skippable, unlocked, not-yet-completed cards */}
                          {card.canSkip && !locked && !card.completed && !card.skipped && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                card.id === 'resume' ? handleSkipResume() : handleSkipPodcast();
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <SkipForward className="h-3 w-3" />
                              Skip
                            </button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );

                if (locked || card.onClick) {
                  return <div key={card.id}>{cardContent}</div>;
                }

                return (
                  <Link key={card.id} to={card.href!}>
                    {cardContent}
                  </Link>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Sidebar chat */}
      <aside className={`${chatOpen ? 'w-[380px]' : 'w-0'} hidden md:flex flex-col border-l border-border bg-card transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="flex items-center justify-between px-4 h-16 border-b border-border">
          <div className="flex items-center gap-2">
            <img src={mascot} alt="Agent360" className="h-7 w-7 rounded-full object-cover" />
            <span className="font-semibold text-sm">Agent360</span>
            <span className="text-xs font-bold text-primary">360</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setChatOpen(false)} className="h-7 w-7">
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <AgentChat onboardingComplete={completedSteps >= 4} />
        </div>
      </aside>

      {/* Chat toggle */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105 overflow-hidden border-2 border-primary/30"
        >
          <img src={mascot} alt="Open Agent360" className="h-full w-full object-cover" />
        </button>
      )}

      {/* Profile Sheet */}
      <ProfileSheet
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        onSaved={checkCompletionStatus}
      />
    </div>
  );
}
