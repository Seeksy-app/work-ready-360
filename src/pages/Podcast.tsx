import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import mascot from '@/assets/agent360-mascot.png';
import logo360 from '@/assets/logo-360.jpg';
import AgentChat from '@/components/AgentChat';
import SavedPodcasts from '@/components/SavedPodcasts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Mic,
  Play,
  Pause,
  Sparkles,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
  SkipBack,
  SkipForward,
  PanelRightClose,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ELEVENLABS_VOICES = [
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', desc: 'Professional male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', desc: 'Engaging female' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', desc: 'Warm male' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', desc: 'Friendly female' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', desc: 'Casual male' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', desc: 'British male' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', desc: 'Young male' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', desc: 'Soft female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', desc: 'Warm female' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', desc: 'Authoritative male' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', desc: 'Gentle female' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', desc: 'Narrator male' },
];

interface SavedPodcast {
  id: string;
  title: string;
  audio_url: string;
  transcript: string | null;
  duration_seconds: number | null;
  occupation_code: string | null;
  occupation_title: string | null;
  created_at: string;
}

export default function Podcast() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedHostVoice, setSelectedHostVoice] = useState(ELEVENLABS_VOICES[0].id);
  const [selectedGuestVoice, setSelectedGuestVoice] = useState(ELEVENLABS_VOICES[1].id);
  const [savedPodcastKey, setSavedPodcastKey] = useState(0);

  // Player state
  const [podcastReady, setPodcastReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [currentPodcastTitle, setCurrentPodcastTitle] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);

  // Panel state
  const [showGeneratePanel, setShowGeneratePanel] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentPodcastId, setCurrentPodcastId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Audio playback
  useEffect(() => {
    if (!audioElement) return;
    const handleTimeUpdate = () => {
      if (audioElement.duration) setProgress((audioElement.currentTime / audioElement.duration) * 100);
    };
    const handleEnded = () => { setIsPlaying(false); setProgress(100); };
    const handleLoadedMetadata = () => setAudioDuration(audioElement.duration);

    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioElement]);

  const handlePlaySavedPodcast = useCallback((podcast: SavedPodcast) => {
    audioElement?.pause();
    const audio = new Audio(podcast.audio_url);
    setAudioElement(audio);
    setTranscript(podcast.transcript || '');
    setAudioDuration(podcast.duration_seconds || 0);
    setCurrentPodcastTitle(podcast.title);
    setCurrentPodcastId(podcast.id);
    setPodcastReady(true);
    setProgress(0);
    setIsPlaying(false);
  }, [audioElement]);

  const handleDeletePodcast = useCallback((podcastId: string) => {
    if (currentPodcastId === podcastId) {
      audioElement?.pause();
      setAudioElement(null);
      setPodcastReady(false);
      setIsPlaying(false);
      setProgress(0);
      setCurrentPodcastTitle('');
      setCurrentPodcastId(null);
      setTranscript('');
    }
  }, [currentPodcastId, audioElement]);

  const handlePlayPause = () => {
    if (!audioElement) return;
    if (isPlaying) audioElement.pause();
    else audioElement.play();
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (delta: number) => {
    if (!audioElement) return;
    audioElement.currentTime = Math.max(0, Math.min(audioElement.duration, audioElement.currentTime + delta));
  };

  const handleDownload = () => {
    if (!audioElement) return;
    const link = document.createElement('a');
    link.href = audioElement.src;
    link.download = `career-podcast-${currentPodcastTitle.replace(/\s+/g, '-').toLowerCase()}.mp3`;
    link.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const doGenerateProfile = async () => {
    if (!user) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const [interestResult, valuesResult, resumeResult, profileResult] = await Promise.all([
        supabase.from('interest_profiler_results').select('top_interests, scores').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1).single(),
        supabase.from('work_importance_results').select('top_values, scores').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(1).single(),
        supabase.from('resumes').select('parsed_content').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('profiles').select('full_name, linkedin_data').eq('user_id', user.id).single(),
      ]);

      const requestBody: any = {
        type: 'profile',
        userName: profileResult.data?.full_name || 'our listener',
        userId: user.id,
        savePodcast: true,
        hostVoiceId: selectedHostVoice,
        guestVoiceId: selectedGuestVoice,
      };

      if (interestResult.data) {
        requestBody.interestProfilerResults = {
          scores: interestResult.data.scores as Record<string, number>,
          topInterests: interestResult.data.top_interests,
        };
      }
      if (valuesResult.data) {
        requestBody.workImportanceResults = {
          scores: valuesResult.data.scores as Record<string, number>,
          topValues: valuesResult.data.top_values,
        };
      }
      if (resumeResult.data?.parsed_content) {
        const parsedContent = resumeResult.data.parsed_content as any;
        requestBody.resumeContent = typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent);
      }
      const linkedInData = (profileResult.data as any)?.linkedin_data;
      if (linkedInData) requestBody.linkedinData = linkedInData;

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `Server error (${response.status})`;
        // Friendly messages for known errors
        if (errorMsg.includes('TTS') || errorMsg.includes('401') || errorMsg.includes('payment')) {
          throw new Error('Audio generation service is temporarily unavailable. Please try again later or contact support.');
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (!data.success) {
        const errorMsg = data.error || 'Failed to generate podcast';
        if (errorMsg.includes('TTS') || errorMsg.includes('401') || errorMsg.includes('payment')) {
          throw new Error('Audio generation service is temporarily unavailable. Please try again later or contact support.');
        }
        throw new Error(errorMsg);
      }

      const audio = data.audioUrl ? new Audio(data.audioUrl) : new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      setAudioElement(audio);
      setTranscript(data.transcript || '');
      setCurrentPodcastTitle('Your Career Profile');
      setPodcastReady(true);
      setSavedPodcastKey(prev => prev + 1);
      setShowGeneratePanel(false);
      toast.success('Your career podcast is ready and saved!');
    } catch (error: any) {
      console.error('Podcast generation error:', error);
      const msg = error.message || 'Failed to generate podcast. Please try again.';
      setGenerationError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentTime = audioElement ? audioElement.currentTime : 0;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const PODCAST_STARTERS = [
    { emoji: '🎙️', label: 'Generate my career podcast' },
    { emoji: '🎯', label: 'What kind of podcast can you make for me?' },
    { emoji: '📊', label: 'How are my assessments used in the podcast?' },
    { emoji: '🎧', label: 'Show me my saved podcasts' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-accent backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-accent-foreground hover:bg-accent-foreground/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-accent-foreground">Career Podcast</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setChatOpen(!chatOpen)}
              className="md:hidden text-accent-foreground hover:bg-accent-foreground/10"
            >
              {chatOpen ? <PanelRightClose className="h-4 w-4" /> : <img src={mascot} alt="Chat" className="h-5 w-5 rounded-full" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Player bar — shown when podcast is ready */}
          {podcastReady && (
            <div className="border-b bg-card p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={() => handleSeek(-10)} className="h-8 w-8">
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button size="icon" onClick={handlePlayPause} className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90">
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleSeek(10)} className="h-8 w-8">
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentPodcastTitle}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground w-10">{formatTime(currentTime)}</span>
                    <div className="flex-1 bg-muted rounded-full h-1.5 cursor-pointer" onClick={(e) => {
                      if (!audioElement) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pct = (e.clientX - rect.left) / rect.width;
                      audioElement.currentTime = pct * audioElement.duration;
                    }}>
                      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{formatTime(audioDuration)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={handleDownload} className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setShowTranscript(!showTranscript)} className="h-8 w-8">
                    {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {showTranscript && transcript && (
                <div className="bg-muted rounded-lg p-4 max-h-48 overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap">
                  {transcript}
                </div>
              )}
            </div>
          )}

          {/* Content area: saved podcasts + generate panel */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Saved Podcasts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  🎧 Your Podcasts
                </CardTitle>
                <CardDescription>Listen to your previously generated podcasts</CardDescription>
              </CardHeader>
              <CardContent>
                <SavedPodcasts key={savedPodcastKey} onPlayPodcast={handlePlaySavedPodcast} onDeletePodcast={handleDeletePodcast} />
              </CardContent>
            </Card>

            {/* Generate Panel */}
            <Card>
              <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowGeneratePanel(!showGeneratePanel)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Generate New Podcast
                  </CardTitle>
                  {showGeneratePanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
                <CardDescription>Create a personalized career podcast based on your profile</CardDescription>
              </CardHeader>
              {showGeneratePanel && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Host Voice</Label>
                      <Select value={selectedHostVoice} onValueChange={setSelectedHostVoice}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ELEVENLABS_VOICES.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name} — {v.desc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Co-host Voice</Label>
                      <Select value={selectedGuestVoice} onValueChange={setSelectedGuestVoice}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ELEVENLABS_VOICES.map(v => (
                            <SelectItem key={v.id} value={v.id}>{v.name} — {v.desc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={doGenerateProfile}
                    disabled={isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating your podcast...
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Generate Career Podcast
                      </>
                    )}
                  </Button>
                  {isGenerating && (
                    <p className="text-xs text-muted-foreground text-center">
                      This may take 1-2 minutes. Please don't close this page.
                    </p>
                  )}
                  {generationError && !isGenerating && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive text-center">
                      {generationError}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          </div>
        </div>

        {/* Agent360 Chat Sidebar */}
        <aside className={`${chatOpen ? 'w-[420px]' : 'w-0'} hidden md:flex flex-col border-l border-border bg-card transition-all duration-300 overflow-hidden flex-shrink-0`}>
          <div className="flex items-center justify-between px-4 h-14 border-b border-border">
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
            <AgentChat onboardingComplete={true} />
          </div>
        </aside>
      </div>

      {/* Chat toggle for mobile / when closed */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-105 overflow-hidden border-2 border-primary/30"
        >
          <img src={mascot} alt="Open Agent360" className="h-full w-full object-cover" />
        </button>
      )}
    </div>
  );
}
