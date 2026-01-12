import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  Target, 
  Heart, 
  Sparkles, 
  ArrowRight, 
  Play,
  CheckCircle2,
  Users,
  Briefcase,
  TrendingUp
} from 'lucide-react';

export default function Index() {
  const features = [
    {
      icon: Target,
      title: 'Interest Profiler',
      description: 'Discover careers that align with your passions using O*NET assessments',
    },
    {
      icon: Heart,
      title: 'Work Values',
      description: 'Identify what matters most to you in your ideal work environment',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Insights',
      description: 'Get personalized recommendations based on your unique profile',
    },
    {
      icon: Mic,
      title: 'Custom Podcasts',
      description: 'Listen to a personalized 3-5 minute podcast about your career path',
    },
  ];

  const stats = [
    { value: '900+', label: 'Occupations', icon: Briefcase },
    { value: '10K+', label: 'Job Seekers', icon: Users },
    { value: '95%', label: 'Satisfaction', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Mic className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">WorkReady360</span>
          </div>
          
          <Link to="/auth">
            <Button variant="hero" size="default">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero text-primary-foreground py-24 lg:py-32 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-accent blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-primary blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-dark text-sm animate-fade-in">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>AI-Powered Career Discovery</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight animate-slide-up">
              Your Career Story,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-orange-300">
                Told Just for You
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Discover your ideal career path with personalized assessments and listen to a custom podcast 
              that speaks directly to your qualifications and aspirations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/auth">
                <Button variant="accent" size="xl" className="w-full sm:w-auto">
                  <Play className="h-5 w-5" />
                  Start Your Journey
                </Button>
              </Link>
              <Button variant="glass" size="xl" className="w-full sm:w-auto">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to{' '}
              <span className="text-primary">Launch Your Career</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Comprehensive tools powered by O*NET data and AI to guide your career journey
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border-2 border-transparent hover:border-primary/20 hover:shadow-lg transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 group-hover:shadow-glow transition-all">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to your personalized career podcast
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: 1, title: 'Complete Assessments', desc: 'Take the Interest Profiler and Work Importance assessments' },
              { step: 2, title: 'Upload Resume', desc: 'Share your experience for personalized recommendations' },
              { step: 3, title: 'Listen & Learn', desc: 'Enjoy your custom podcast about career opportunities' },
            ].map((item, index) => (
              <div 
                key={index} 
                className="relative text-center animate-slide-up"
                style={{ animationDelay: `${index * 0.15}s` }}
              >
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground mx-auto mb-4 shadow-lg">
                  {item.step}
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-transparent" />
                )}
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto gradient-hero rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-accent blur-2xl" />
            </div>
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
                Ready to Discover Your Ideal Career?
              </h2>
              <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto">
                Join thousands of job seekers who have found their path with WorkReady360
              </p>
              <Link to="/auth">
                <Button variant="accent" size="xl">
                  <Play className="h-5 w-5" />
                  Start Free Today
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">WorkReady360</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 WorkReady360. Powered by O*NET and AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
