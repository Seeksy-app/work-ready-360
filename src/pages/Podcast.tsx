import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Share2
} from 'lucide-react';

export default function Podcast() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [jobSearch, setJobSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcastReady, setPodcastReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Simulate playback progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && progress < 100) {
      interval = setInterval(() => {
        setProgress(p => Math.min(p + 0.5, 100));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, progress]);

  const handleGenerate = async () => {
    if (!jobSearch.trim()) {
      toast.error('Please enter a job title or occupation');
      return;
    }
    
    setIsGenerating(true);
    
    // Simulate podcast generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsGenerating(false);
    setPodcastReady(true);
    toast.success('Your podcast is ready!');
  };

  const formatTime = (percentage: number) => {
    const totalSeconds = 240; // 4 minutes
    const currentSeconds = Math.floor((percentage / 100) * totalSeconds);
    const minutes = Math.floor(currentSeconds / 60);
    const seconds = currentSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
          /* Generation Form */
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Generate Your Podcast
              </CardTitle>
              <CardDescription>
                Enter a job title or occupation to create a personalized 3-5 minute podcast
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="job-search">Job Title or Occupation</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="job-search"
                    placeholder="e.g., Software Developer, Registered Nurse, Marketing Manager"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll match this with O*NET occupations and your assessment results
                </p>
              </div>

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
                    Skills from your resume that apply
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Recommendations and next steps
                  </li>
                </ul>
              </div>

              <Button
                variant="accent"
                size="lg"
                className="w-full"
                onClick={handleGenerate}
                disabled={isGenerating || !jobSearch.trim()}
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
                  {jobSearch}
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
                    <span>{formatTime(progress)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      4:00
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={() => setProgress(Math.max(0, progress - 10))}
                  >
                    <span className="text-xs font-medium">-10s</span>
                  </Button>
                  
                  <Button
                    variant="accent"
                    size="icon"
                    className="h-16 w-16 rounded-full shadow-lg"
                    onClick={() => setIsPlaying(!isPlaying)}
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
                    onClick={() => setProgress(Math.min(100, progress + 10))}
                  >
                    <span className="text-xs font-medium">+10s</span>
                  </Button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Generate Another */}
            <Card>
              <CardContent className="p-4">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setPodcastReady(false);
                    setProgress(0);
                    setIsPlaying(false);
                    setJobSearch('');
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
