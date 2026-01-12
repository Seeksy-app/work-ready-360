import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { searchCareers, getCareerDetails, OnetCareer, OnetCareerDetail } from '@/lib/onet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  Search,
  Briefcase,
  Clock,
  Download,
  Share2,
  Star,
  CheckCircle2
} from 'lucide-react';

export default function Podcast() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [jobSearch, setJobSearch] = useState('');
  const [searchResults, setSearchResults] = useState<OnetCareer[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<OnetCareerDetail | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCareer, setIsLoadingCareer] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcastReady, setPodcastReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [transcript, setTranscript] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load occupation from URL params
  useEffect(() => {
    const occupationCode = searchParams.get('occupation');
    const occupationTitle = searchParams.get('title');
    
    if (occupationCode) {
      loadCareerFromParams(occupationCode, occupationTitle || '');
    }
  }, [searchParams]);

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

  const handleGenerate = async () => {
    if (!selectedCareer) {
      toast.error('Please select a career first');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Fetch user's assessment results for personalization
      let userInterests: string[] = [];
      let userValues: string[] = [];
      
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
            .select('top_values')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(1)
            .single()
        ]);
        
        userInterests = interestResult.data?.top_interests || [];
        userValues = valuesResult.data?.top_values || [];
      }
      
      // Call the edge function to generate podcast
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
            careerTitle: selectedCareer.title,
            careerDescription: selectedCareer.description || '',
            whatTheyDo: selectedCareer.what_they_do,
            skills: selectedCareer.skills?.slice(0, 5).map((s) => s.name) || [],
            knowledge: selectedCareer.knowledge?.slice(0, 3).map((k) => k.name) || [],
            outlook: selectedCareer.outlook?.description,
            salary: selectedCareer.outlook?.salary,
            userInterests,
            userValues,
          }),
        }
      );
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate podcast');
      }
      
      // Create audio element with base64 data
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      const audio = new Audio(audioUrl);
      setAudioElement(audio);
      setTranscript(data.transcript || '');
      
      setPodcastReady(true);
      toast.success('Your podcast is ready!');
      
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
    link.download = `career-podcast-${selectedCareer?.title?.replace(/\s+/g, '-').toLowerCase() || 'episode'}.mp3`;
    link.click();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = audioElement ? audioElement.currentTime : 0;

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
            {/* Career Search/Selection */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Generate Your Podcast
                </CardTitle>
                <CardDescription>
                  Search for a career or use one from your assessment results
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

                {/* What the podcast includes */}
                <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                  <h4 className="font-medium text-sm">Your podcast will include:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      How your interests align with this career
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Work values match analysis
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Key skills and knowledge needed
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Job outlook and salary information
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Personalized recommendations
                    </li>
                  </ul>
                </div>

                <Button
                  variant="accent"
                  size="lg"
                  className="w-full"
                  onClick={handleGenerate}
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
                      Generate Podcast
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
          </div>
        ) : (
          /* Podcast Player */
          <div className="space-y-6 animate-scale-in">
            <Card className="overflow-hidden">
              <div className="gradient-hero p-8 text-center">
                <div className="w-24 h-24 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <Mic className="h-12 w-12 text-accent-foreground" />
                </div>
                <h2 className="text-xl font-bold text-primary-foreground mb-1">
                  Your Career Podcast
                </h2>
                <p className="text-primary-foreground/70 flex items-center justify-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {selectedCareer?.title || jobSearch}
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
                      title: `Career Podcast: ${selectedCareer?.title}`,
                      text: `Check out this career podcast about ${selectedCareer?.title}`,
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
                  onClick={() => {
                    audioElement?.pause();
                    setAudioElement(null);
                    setPodcastReady(false);
                    setProgress(0);
                    setIsPlaying(false);
                    setSelectedCareer(null);
                    setJobSearch('');
                    setTranscript('');
                  }}
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
