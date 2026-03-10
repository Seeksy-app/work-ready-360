import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { searchCareers, getCareerDetails, OnetCareer, OnetCareerDetail } from '@/lib/onet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SavedPodcasts from '@/components/SavedPodcasts';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  ArrowLeft, 
  Mic, 
  Play, 
  Pause, 
  Sparkles,
  Search,
  Briefcase,
  Clock,
  Download,
  Share2,
  Star,
  CheckCircle2,
  User,
  FileText,
  Heart,
  Library,
  Save
} from 'lucide-react';

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

type PodcastType = 'profile' | 'career';

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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'saved' | 'profile' | 'career'>('saved');
  
  // Podcast type state
  const [podcastType, setPodcastType] = useState<PodcastType>('profile');
  
  // Career search state
  const [jobSearch, setJobSearch] = useState('');
  const [searchResults, setSearchResults] = useState<OnetCareer[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<OnetCareerDetail | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCareer, setIsLoadingCareer] = useState(false);
  
  // Profile data state
  const [hasProfileData, setHasProfileData] = useState(false);
  const [profileSummary, setProfileSummary] = useState<{
    hasResume: boolean;
    hasInterests: boolean;
    hasValues: boolean;
    topInterests: string[];
    topValues: string[];
  } | null>(null);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcastReady, setPodcastReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  const [generatedType, setGeneratedType] = useState<PodcastType>('profile');
  const [currentPodcastTitle, setCurrentPodcastTitle] = useState<string>('');
  
  // Voice selection
  const [selectedHostVoice, setSelectedHostVoice] = useState(ELEVENLABS_VOICES[0].id);
  const [selectedGuestVoice, setSelectedGuestVoice] = useState(ELEVENLABS_VOICES[1].id);
  
  // Saved podcast playback state
  const [playingSavedPodcast, setPlayingSavedPodcast] = useState<SavedPodcast | null>(null);
  const [savedPodcastKey, setSavedPodcastKey] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load user profile data for profile podcast
  useEffect(() => {
    if (user) {
      loadProfileData();
    }
  }, [user]);

  // Load occupation from URL params
  useEffect(() => {
    const occupationCode = searchParams.get('occupation');
    const occupationTitle = searchParams.get('title');
    
    if (occupationCode) {
      setActiveTab('career');
      setPodcastType('career');
      loadCareerFromParams(occupationCode, occupationTitle || '');
    }
  }, [searchParams]);

  // Handle playing a saved podcast
  const handlePlaySavedPodcast = useCallback((podcast: SavedPodcast) => {
    audioElement?.pause();
    setPlayingSavedPodcast(podcast);
    
    const audio = new Audio(podcast.audio_url);
    setAudioElement(audio);
    setTranscript(podcast.transcript || '');
    setAudioDuration(podcast.duration_seconds || 0);
    setCurrentPodcastTitle(podcast.title);
    setGeneratedType(podcast.occupation_code ? 'career' : 'profile');
    setPodcastReady(true);
    setProgress(0);
    setIsPlaying(false);
  }, [audioElement]);

  const loadProfileData = useCallback(async () => {
    if (!user) return;
    
    try {
      const [interestResult, valuesResult, resumeResult] = await Promise.all([
        supabase
          .from('interest_profiler_results')
          .select('top_interests, scores')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('work_importance_results')
          .select('top_values, scores')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('resumes')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
      ]);
      
      const hasInterests = !!interestResult.data;
      const hasValues = !!valuesResult.data;
      const hasResume = !!resumeResult.data;
      
      setProfileSummary({
        hasResume,
        hasInterests,
        hasValues,
        topInterests: interestResult.data?.top_interests || [],
        topValues: valuesResult.data?.top_values || [],
      });
      
      setHasProfileData(hasInterests || hasValues);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    }
  }, [user]);

  const loadCareerFromParams = async (code: string, title: string) => {
    setIsLoadingCareer(true);
    setJobSearch(title);
    
    try {
      const details = await getCareerDetails(code);
      setSelectedCareer(details);
    } catch (error) {
      console.error('Failed to load career:', error);
      toast.error('Failed to load career details');
    } finally {
      setIsLoadingCareer(false);
    }
  };

  // Audio playback progress
  useEffect(() => {
    if (!audioElement) return;
    
    const handleTimeUpdate = () => {
      if (audioElement.duration) {
        setProgress((audioElement.currentTime / audioElement.duration) * 100);
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(100);
    };
    
    const handleLoadedMetadata = () => {
      setAudioDuration(audioElement.duration);
    };
    
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioElement]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobSearch.trim()) return;

    setIsSearching(true);
    setSelectedCareer(null);
    
    try {
      const result = await searchCareers(jobSearch);
      setSearchResults(result.career || []);
      
      if ((result.career?.length || 0) === 0) {
        toast.info('No careers found. Try different keywords.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Search failed');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCareer = async (career: OnetCareer) => {
    setIsLoadingCareer(true);
    
    try {
      const details = await getCareerDetails(career.code);
      setSelectedCareer(details);
      setSearchResults([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load career details');
      console.error(error);
    } finally {
      setIsLoadingCareer(false);
    }
  };

  const handleGenerateProfile = async () => {
    if (!user) {
      toast.error('Please sign in to generate your podcast');
      return;
    }
    
    if (!hasProfileData) {
      toast.error('Please complete at least one assessment first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Fetch all user data
      const [interestResult, valuesResult, resumeResult, profileResult] = await Promise.all([
        supabase
          .from('interest_profiler_results')
          .select('top_interests, scores')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('work_importance_results')
          .select('top_values, scores')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('resumes')
          .select('parsed_content')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single()
      ]);
      
      // Prepare request body with save options
      const requestBody: any = {
        type: 'profile',
        userName: profileResult.data?.full_name || 'our listener',
        userId: user.id,
        savePodcast: true,
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
        requestBody.resumeContent = typeof parsedContent === 'string' 
          ? parsedContent 
          : JSON.stringify(parsedContent);
      }
      
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
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate podcast');
      }
      
      // Use saved audio URL if available, otherwise use base64
      let audio: HTMLAudioElement;
      if (data.audioUrl) {
        audio = new Audio(data.audioUrl);
      } else {
        const audioDataUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        audio = new Audio(audioDataUrl);
      }
      setAudioElement(audio);
      setTranscript(data.transcript || '');
      setGeneratedType('profile');
      setCurrentPodcastTitle('Your Career Profile');
      
      setPodcastReady(true);
      setSavedPodcastKey(prev => prev + 1); // Refresh saved podcasts list
      toast.success('Your career profile podcast is ready and saved!');
      
    } catch (error: any) {
      console.error('Podcast generation error:', error);
      toast.error(error.message || 'Failed to generate podcast');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCareer = async () => {
    if (!selectedCareer) {
      toast.error('Please select a career first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Fetch user's assessment results for personalization
      let userInterests: string[] = [];
      let userValues: string[] = [];
      let userValuesScores: Record<string, number> | undefined;
      let careerWorkValues: Record<string, number> | undefined;
      
      if (user) {
        const [interestResult, valuesResult] = await Promise.all([
          supabase
            .from('interest_profiler_results')
            .select('top_interests')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(1)
            .single(),
          supabase
            .from('work_importance_results')
            .select('top_values, scores')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(1)
            .single()
        ]);
        
        userInterests = interestResult.data?.top_interests || [];
        userValues = valuesResult.data?.top_values || [];
        
        // Extract normalized scores for work values matching explanation
        if (valuesResult.data?.scores) {
          const scores = valuesResult.data.scores as Record<string, { normalized?: number; raw?: number }>;
          userValuesScores = {};
          for (const [key, value] of Object.entries(scores)) {
            userValuesScores[key] = value.normalized ?? value.raw ?? 50;
          }
        }
        
        // Fetch career work values from O*NET
        try {
          const workValuesResponse = await supabase.functions.invoke('onet-work-values', {
            body: {
              action: 'get_occupation_values',
              occupation_code: selectedCareer.code,
            },
          });
          
          if (workValuesResponse.data?.success && workValuesResponse.data?.profile?.values) {
            careerWorkValues = {};
            const values = workValuesResponse.data.profile.values;
            for (const [key, value] of Object.entries(values)) {
              careerWorkValues[key] = (value as { importance_0_100: number }).importance_0_100;
            }
          }
        } catch (err) {
          console.log('Could not fetch career work values, continuing without:', err);
        }
      }
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-podcast`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: 'career',
            careerTitle: selectedCareer.title,
            careerDescription: selectedCareer.description || '',
            whatTheyDo: selectedCareer.what_they_do,
            skills: selectedCareer.skills?.slice(0, 5).map((s) => s.name) || [],
            knowledge: selectedCareer.knowledge?.slice(0, 3).map((k) => k.name) || [],
            outlook: selectedCareer.outlook?.description,
            salary: selectedCareer.outlook?.salary,
            userInterests,
            userValues,
            userValuesScores,
            careerWorkValues,
            occupationCode: selectedCareer.code,
            userId: user?.id,
            savePodcast: !!user,
          }),
        }
      );
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate podcast');
      }
      
      let audio: HTMLAudioElement;
      if (data.audioUrl) {
        audio = new Audio(data.audioUrl);
      } else {
        const audioDataUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        audio = new Audio(audioDataUrl);
      }
      setAudioElement(audio);
      setTranscript(data.transcript || '');
      setGeneratedType('career');
      setCurrentPodcastTitle(selectedCareer.title);
      
      setPodcastReady(true);
      setSavedPodcastKey(prev => prev + 1);
      toast.success('Your podcast is ready and saved!');
      
    } catch (error: any) {
      console.error('Podcast generation error:', error);
      toast.error(error.message || 'Failed to generate podcast');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioElement) return;
    
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play();
    }
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
    const title = generatedType === 'profile' 
      ? 'my-career-profile' 
      : selectedCareer?.title?.replace(/\s+/g, '-').toLowerCase() || 'episode';
    link.download = `career-podcast-${title}.mp3`;
    link.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = audioElement ? audioElement.currentTime : 0;

  const resetPodcast = () => {
    audioElement?.pause();
    setAudioElement(null);
    setPodcastReady(false);
    setProgress(0);
    setIsPlaying(false);
    setSelectedCareer(null);
    setJobSearch('');
    setTranscript('');
    setSearchResults([]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
              <Mic className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Career Podcast</h1>
              <p className="text-muted-foreground">Your personalized career guidance</p>
            </div>
          </div>
        </div>

        {!podcastReady ? (
          <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'saved' | 'profile' | 'career')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="saved" className="gap-2">
                  <Library className="h-4 w-4" />
                  My Podcasts
                </TabsTrigger>
                <TabsTrigger value="profile" className="gap-2">
                  <User className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="career" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Career
                </TabsTrigger>
              </TabsList>

              {/* Saved Podcasts Tab */}
              <TabsContent value="saved" className="space-y-6">
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Library className="h-5 w-5 text-accent" />
                      Your Saved Podcasts
                    </CardTitle>
                    <CardDescription>
                      Listen to your previously generated podcasts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SavedPodcasts key={savedPodcastKey} onPlayPodcast={handlePlaySavedPodcast} />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Profile Podcast Tab */}
              <TabsContent value="profile" className="space-y-6">
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-accent" />
                      Your Career Profile Podcast
                    </CardTitle>
                    <CardDescription>
                      Get AI-generated career guidance based on your unique profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Profile Data Summary */}
                    <div className="space-y-3">
                      <Label>Your Profile Data</Label>
                      <div className="grid gap-2">
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileSummary?.hasInterests ? 'bg-success/5 border-success/20' : 'bg-muted/50'}`}>
                          <Heart className={`h-5 w-5 ${profileSummary?.hasInterests ? 'text-success' : 'text-muted-foreground'}`} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">Interest Profiler</p>
                            {profileSummary?.hasInterests ? (
                              <p className="text-xs text-muted-foreground">
                                Top interests: {profileSummary.topInterests.slice(0, 3).join(', ')}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not completed</p>
                            )}
                          </div>
                          {profileSummary?.hasInterests ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => navigate('/interest-profiler')}>
                              Take Now
                            </Button>
                          )}
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileSummary?.hasValues ? 'bg-success/5 border-success/20' : 'bg-muted/50'}`}>
                          <Star className={`h-5 w-5 ${profileSummary?.hasValues ? 'text-success' : 'text-muted-foreground'}`} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">Work Values</p>
                            {profileSummary?.hasValues ? (
                              <p className="text-xs text-muted-foreground">
                                Top values: {profileSummary.topValues.slice(0, 3).join(', ')}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not completed</p>
                            )}
                          </div>
                          {profileSummary?.hasValues ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => navigate('/work-importance')}>
                              Take Now
                            </Button>
                          )}
                        </div>

                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${profileSummary?.hasResume ? 'bg-success/5 border-success/20' : 'bg-muted/50'}`}>
                          <FileText className={`h-5 w-5 ${profileSummary?.hasResume ? 'text-success' : 'text-muted-foreground'}`} />
                          <div className="flex-1">
                            <p className="font-medium text-sm">Resume</p>
                            <p className="text-xs text-muted-foreground">
                              {profileSummary?.hasResume ? 'Uploaded' : 'Not uploaded (optional)'}
                            </p>
                          </div>
                          {profileSummary?.hasResume ? (
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => navigate('/resume')}>
                              Upload
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* What the podcast includes */}
                    <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                      <h4 className="font-medium text-sm">Your AI-generated podcast will cover:</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Your personality and work style insights
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Career paths that match your interests
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Work environments you'd thrive in
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          Personalized career recommendations
                        </li>
                        {profileSummary?.hasResume && (
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                            Analysis of your experience & skills
                          </li>
                        )}
                      </ul>
                    </div>

                    <Button
                      variant="accent"
                      size="lg"
                      className="w-full"
                      onClick={handleGenerateProfile}
                      disabled={isGenerating || !hasProfileData}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generating your podcast...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5" />
                          Generate My Career Profile Podcast
                        </>
                      )}
                    </Button>

                    {!hasProfileData && (
                      <p className="text-center text-sm text-muted-foreground">
                        Complete at least one assessment to generate your podcast
                      </p>
                    )}

                    {isGenerating && (
                      <div className="text-center text-sm text-muted-foreground animate-pulse">
                        This may take a minute. Our AI is crafting personalized content just for you...
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Career Podcast Tab */}
              <TabsContent value="career" className="space-y-6">
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-accent" />
                      Career-Focused Podcast
                    </CardTitle>
                    <CardDescription>
                      Learn about a specific career with personalized insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Search Form */}
                    <form onSubmit={handleSearch} className="space-y-2">
                      <Label htmlFor="job-search">Search Careers</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="job-search"
                            placeholder="e.g., Software Developer, Nurse, Marketing..."
                            value={jobSearch}
                            onChange={(e) => setJobSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Button type="submit" variant="outline" disabled={isSearching}>
                          {isSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </form>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        <Label>Select a Career</Label>
                        <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                          {searchResults.map((career) => (
                            <button
                              key={career.code}
                              onClick={() => handleSelectCareer(career)}
                              className="w-full text-left p-2 rounded-md hover:bg-primary/5 transition-colors flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{career.title}</span>
                              </div>
                              {career.tags?.bright_outlook && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <Star className="h-3 w-3" />
                                  Bright
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Loading Career */}
                    {isLoadingCareer && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}

                    {/* Selected Career */}
                    {selectedCareer && (
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              {selectedCareer.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">{selectedCareer.code}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCareer(null);
                              setJobSearch('');
                            }}
                          >
                            Change
                          </Button>
                        </div>
                        {selectedCareer.what_they_do && (
                          <p className="text-sm text-muted-foreground">
                            {selectedCareer.what_they_do}
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      variant="accent"
                      size="lg"
                      className="w-full"
                      onClick={handleGenerateCareer}
                      disabled={isGenerating || !selectedCareer}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generating your podcast...
                        </>
                      ) : (
                        <>
                          <Mic className="h-5 w-5" />
                          Generate Career Podcast
                        </>
                      )}
                    </Button>

                    {isGenerating && (
                      <div className="text-center text-sm text-muted-foreground animate-pulse">
                        This may take a minute. We're crafting personalized content just for you...
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Browse Careers Link */}
                <Card>
                  <CardContent className="p-4">
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => navigate('/careers')}
                    >
                      <Briefcase className="h-4 w-4 mr-2" />
                      Browse All Careers with O*NET Data
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* Podcast Player */
          <div className="space-y-6 animate-scale-in">
            <Card className="overflow-hidden">
              <div className="gradient-hero p-8 text-center">
                <div className="w-24 h-24 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 shadow-xl">
                  {generatedType === 'profile' ? (
                    <User className="h-12 w-12 text-accent-foreground" />
                  ) : (
                    <Mic className="h-12 w-12 text-accent-foreground" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-primary-foreground mb-1">
                  {generatedType === 'profile' ? 'Your Career Profile' : 'Career Spotlight'}
                </h2>
                <p className="text-primary-foreground/70 flex items-center justify-center gap-2">
                  {generatedType === 'profile' ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI-Generated Personal Guidance
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-4 w-4" />
                      {selectedCareer?.title || jobSearch}
                    </>
                  )}
                </p>
              </div>
              
              <CardContent className="p-6 space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full gradient-primary transition-all duration-100"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(audioDuration)}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={() => handleSeek(-10)}
                  >
                    <span className="text-xs font-medium">-10s</span>
                  </Button>
                  
                  <Button
                    variant="accent"
                    size="icon"
                    className="h-16 w-16 rounded-full shadow-lg"
                    onClick={handlePlayPause}
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8" />
                    ) : (
                      <Play className="h-8 w-8 ml-1" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={() => handleSeek(10)}
                  >
                    <span className="text-xs font-medium">+10s</span>
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => {
                    navigator.share?.({
                      title: generatedType === 'profile' ? 'My Career Profile Podcast' : `Career Podcast: ${selectedCareer?.title}`,
                      text: generatedType === 'profile' 
                        ? 'Check out my personalized career guidance podcast!'
                        : `Check out this career podcast about ${selectedCareer?.title}`,
                    }).catch(() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Link copied to clipboard!');
                    });
                  }}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transcript */}
            {transcript && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Transcript</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-48 overflow-y-auto text-sm text-muted-foreground whitespace-pre-wrap">
                    {transcript}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generate Another */}
            <Card>
              <CardContent className="p-4">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={resetPodcast}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Another Podcast
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
