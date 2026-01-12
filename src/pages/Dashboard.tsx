import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  Target, 
  Heart, 
  FileText, 
  Mic, 
  CheckCircle2, 
  Circle, 
  ArrowRight,
  LogOut,
  User,
  Sparkles,
  Play
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function Dashboard() {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mock progress data - will be replaced with real data
  const assessments = [
    {
      id: 'interest',
      title: 'Interest Profiler',
      description: 'Discover careers that match your interests',
      icon: Target,
      completed: false,
      href: '/assessment/interest',
    },
    {
      id: 'work-importance',
      title: 'Work Importance',
      description: 'Identify what matters most in your career',
      icon: Heart,
      completed: false,
      href: '/assessment/work-importance',
    },
  ];

  const steps = [
    { id: 1, title: 'Complete Assessments', completed: false },
    { id: 2, title: 'Upload Resume', completed: false },
    { id: 3, title: 'Generate Podcast', completed: false },
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Mic className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">WorkReady360</span>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm">
                  Admin Panel
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">
                {profile?.full_name || user?.email}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">
            Welcome{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's create your personalized career podcast
          </p>
        </div>

        {/* Progress Card */}
        <Card className="border-2 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Your Progress
            </CardTitle>
            <CardDescription>
              Complete these steps to generate your custom podcast
            </CardDescription>
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
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                    step.completed
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span>{step.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assessment Cards */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Career Assessments</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {assessments.map((assessment, index) => (
              <Link key={assessment.id} to={assessment.href}>
                <Card 
                  className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/30 cursor-pointer group animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      assessment.completed ? 'bg-success/10' : 'bg-primary/10'
                    }`}>
                      <assessment.icon className={`h-6 w-6 ${
                        assessment.completed ? 'text-success' : 'text-primary'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{assessment.title}</h3>
                        {assessment.completed && (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {assessment.description}
                      </p>
                      <div className="flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all">
                        {assessment.completed ? 'View Results' : 'Start Assessment'}
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Resume & Podcast Section */}
        <div className="grid md:grid-cols-2 gap-4">
          <Link to="/resume">
            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary/30 cursor-pointer group animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-secondary">
                  <FileText className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Upload Resume</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload your resume for personalized insights
                  </p>
                  <div className="flex items-center text-sm text-primary font-medium group-hover:gap-2 transition-all">
                    Upload Now
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/podcast">
            <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-accent/30 cursor-pointer group border-2 border-dashed animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <CardContent className="p-6 flex items-start gap-4">
                <div className="p-3 rounded-xl gradient-accent">
                  <Mic className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Generate Podcast</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create your personalized career podcast
                  </p>
                  <div className="flex items-center text-sm text-accent font-medium group-hover:gap-2 transition-all">
                    <Play className="h-4 w-4 mr-1" />
                    Generate Now
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
