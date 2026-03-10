import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Mic, 
  Target, 
  Heart, 
  Sparkles, 
  ArrowRight, 
  Play,
  Users,
  Briefcase,
  TrendingUp
} from 'lucide-react';
import heroImage from '@/assets/hero-workplace.jpg';
import logoImage from '@/assets/logo-180.jpg';

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
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">WorkReady360</span>
          </div>
          
          <Link to="/auth">
            <Button variant="hero" size="default">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section — Full-bleed image with overlay */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        <img
          src={heroImage}
          alt="Diverse professionals collaborating in a bright modern workplace"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent/90 via-accent/70 to-accent/40" />
        {/* Sunshine accent strip at top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold animate-fade-in">
              <Sparkles className="h-4 w-4" />
              AI-Powered Career Discovery
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-accent-foreground animate-slide-up">
              Your Career Story,{' '}
              <span className="text-primary">
                Told Just for You
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-accent-foreground/80 max-w-xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Discover your ideal career path with personalized assessments and listen to a custom podcast 
              that speaks directly to your qualifications and aspirations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link to="/auth">
                <Button variant="hero" size="xl" className="w-full sm:w-auto">
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
      <section className="py-14 bg-primary">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-foreground/15 mb-3">
                  <stat.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-sm text-primary-foreground/70 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Everything You Need to{' '}
              <span className="text-accent">Launch Your Career</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Comprehensive tools powered by O*NET data and AI to guide your career journey
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border-2 border-transparent hover:border-primary/40 hover:shadow-lg transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:shadow-glow transition-all">
                  <feature.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
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
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground mx-auto mb-4 shadow-lg">
                  {item.step}
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/60 to-transparent" />
                )}
                <h3 className="font-semibold text-lg mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-accent rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary blur-2xl" />
              <div className="absolute bottom-0 left-10 w-56 h-56 rounded-full bg-primary blur-3xl" />
            </div>
            <div className="relative z-10 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-accent-foreground">
                Ready to Discover Your Ideal Career?
              </h2>
              <p className="text-accent-foreground/80 text-lg max-w-xl mx-auto">
                Join thousands of job seekers who have found their path with WorkReady360
              </p>
              <Link to="/auth">
                <Button variant="hero" size="xl">
                  <Play className="h-5 w-5" />
                  Start Free Today
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">WorkReady360</span>
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
