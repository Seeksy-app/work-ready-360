import { useState, useEffect } from 'react';
import OnetAttribution from '@/components/OnetAttribution';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  searchCareers, 
  getCareersByInterest, 
  getCareerDetails,
  OnetCareer,
  OnetCareerDetail,
  RIASEC_NAMES,
} from '@/lib/onet';
import { 
  Loader2, 
  ArrowLeft, 
  Search, 
  Briefcase,
  Star,
  Leaf,
  TrendingUp,
  BookOpen,
  Lightbulb,
  Target,
  X,
  DollarSign,
  GraduationCap,
  Sparkles
} from 'lucide-react';

export default function CareerExplorer() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [careers, setCareers] = useState<OnetCareer[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<OnetCareerDetail | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendedCareers, setRecommendedCareers] = useState<OnetCareer[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load user's interest profiler results and get recommendations
  useEffect(() => {
    const loadUserInterests = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('interest_profiler_results')
        .select('top_interests, scores')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        const interests = data.top_interests as string[];
        setUserInterests(interests);
        
        // Get recommended careers based on interests
        setIsLoadingRecommendations(true);
        try {
          // Convert full names to codes for the API
          const result = await getCareersByInterest(interests, undefined, 0, 10);
          setRecommendedCareers(result.careers || []);
        } catch (err) {
          console.error('Failed to load recommendations:', err);
        } finally {
          setIsLoadingRecommendations(false);
        }
      }
    };

    loadUserInterests();
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSelectedCareer(null);
    
    try {
      const result = await searchCareers(searchQuery);
      setCareers(result.career || []);
      
      if (result.total === 0) {
        toast.info('No careers found. Try different keywords.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Search failed');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCareer = async (code: string) => {
    setIsLoadingDetails(true);
    
    try {
      const details = await getCareerDetails(code);
      setSelectedCareer(details);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load career details');
      console.error(error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const formatSalary = (salary?: number) => {
    if (!salary) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(salary);
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
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Career Explorer</h1>
              <p className="text-muted-foreground">Discover careers using O*NET data</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Search & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Search Careers</CardTitle>
                <CardDescription>
                  Search for careers by job title, skills, or keywords
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g., Software Developer, Nurse, Marketing..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" variant="hero" disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Search'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Personalized Recommendations */}
            {userInterests.length > 0 && recommendedCareers.length > 0 && !careers.length && (
              <Card className="border-primary/20 animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    Recommended For You
                  </CardTitle>
                  <CardDescription>
                    Based on your top interests: {userInterests.slice(0, 3).join(', ')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingRecommendations ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recommendedCareers.map((career) => (
                        <button
                          key={career.code}
                          onClick={() => handleSelectCareer(career.code)}
                          className="w-full text-left p-3 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-3">
                            <Briefcase className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                            <div>
                              <p className="font-medium">{career.title}</p>
                              <p className="text-xs text-muted-foreground">{career.code}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {career.tags?.bright_outlook && (
                              <Badge variant="secondary" className="gap-1">
                                <Star className="h-3 w-3" />
                                Bright
                              </Badge>
                            )}
                            {career.tags?.green && (
                              <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
                                <Leaf className="h-3 w-3" />
                                Green
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Search Results */}
            {careers.length > 0 && (
              <Card className="animate-fade-in">
                <CardHeader>
                  <CardTitle className="text-lg">Search Results</CardTitle>
                  <CardDescription>
                    Found {careers.length} careers matching "{searchQuery}"
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {careers.map((career) => (
                      <button
                        key={career.code}
                        onClick={() => handleSelectCareer(career.code)}
                        className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
                          selectedCareer?.code === career.code
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                          <div>
                            <p className="font-medium">{career.title}</p>
                            <p className="text-xs text-muted-foreground">{career.code}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {career.tags?.bright_outlook && (
                            <Badge variant="secondary" className="gap-1">
                              <Star className="h-3 w-3" />
                              Bright
                            </Badge>
                          )}
                          {career.tags?.green && (
                            <Badge variant="secondary" className="gap-1 bg-success/10 text-success">
                              <Leaf className="h-3 w-3" />
                              Green
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Career Details */}
          <div className="lg:col-span-1">
            {isLoadingDetails ? (
              <Card className="animate-fade-in">
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
              </Card>
            ) : selectedCareer ? (
              <Card className="sticky top-4 animate-slide-in-right">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedCareer.title}</CardTitle>
                      <CardDescription>{selectedCareer.code}</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedCareer(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Description */}
                  {selectedCareer.what_they_do && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        What They Do
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedCareer.what_they_do}
                      </p>
                    </div>
                  )}

                  {/* Outlook & Salary */}
                  {selectedCareer.outlook && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3" />
                          Outlook
                        </div>
                        <p className="font-medium text-sm">{selectedCareer.outlook.category || 'Average'}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <DollarSign className="h-3 w-3" />
                          Median Salary
                        </div>
                        <p className="font-medium text-sm">
                          {formatSalary(selectedCareer.outlook.salary?.annual_median)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {selectedCareer.education && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        Typical Education
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedCareer.education.typical_education || selectedCareer.education.category}
                      </p>
                    </div>
                  )}

                  {/* Top Skills */}
                  {selectedCareer.skills.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        Top Skills
                      </h4>
                      <div className="space-y-2">
                        {selectedCareer.skills.slice(0, 5).map((skill, i) => (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>{skill.name}</span>
                              {skill.score && (
                                <span className="text-muted-foreground">{Math.round(skill.score.value)}%</span>
                              )}
                            </div>
                            {skill.score && (
                              <Progress value={skill.score.value} className="h-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Knowledge */}
                  {selectedCareer.knowledge.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Key Knowledge Areas
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedCareer.knowledge.slice(0, 6).map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {item.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    variant="accent"
                    className="w-full"
                    onClick={() => navigate(`/podcast?occupation=${selectedCareer.code}&title=${encodeURIComponent(selectedCareer.title)}`)}
                  >
                    Generate Podcast for This Career
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="animate-fade-in">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-2">Select a Career</h3>
                  <p className="text-sm text-muted-foreground">
                    Search or select a career to view detailed information
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        <OnetAttribution />
      </div>
    </div>
  );
}
