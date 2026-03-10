import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, Target, Heart, Sparkles, Mic } from 'lucide-react';
import heroImage from '@/assets/hero-workplace.jpg';
import editorialImage from '@/assets/hero-editorial.jpg';
import collabImage from '@/assets/hero-collab.jpg';
import logoColor from '@/assets/logo-color.png';
import logoSmall from '@/assets/logo-180.jpg';

export default function Index() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ─── HERO: Full-bleed image + floating card like Hello Sunshine ─── */}
      <section className="relative min-h-[90vh] flex items-center">
        <img
          src={heroImage}
          alt="Diverse professionals collaborating in a bright modern workplace"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-accent/80 via-accent/50 to-transparent" />

        {/* Floating white card — editorial style */}
        <div className="container mx-auto px-4 relative z-10 flex justify-center">
          <div className="max-w-xl bg-card/80 backdrop-blur-md p-8 md:p-12 rounded-sm shadow-xl animate-slide-up text-center">
            <img
              src={logoColor}
              alt="WorkReady360 Leadership Project"
              className="h-24 md:h-32 mb-6 object-contain mx-auto"
            />
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-foreground font-display">
              Unlock Your{' '}
              <span className="text-primary italic">Potential</span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
              Building Work Readiness with Happiness, Engagement&nbsp;&amp;&nbsp;Productivity.
              Discover your ideal career path through personalized assessments and AI&#8209;powered insights.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth">
                <Button variant="hero" size="xl" className="w-full sm:w-auto uppercase tracking-wider text-sm font-bold">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#discover">
                <Button variant="outline" size="xl" className="w-full sm:w-auto uppercase tracking-wider text-sm font-bold border-accent text-accent hover:bg-accent hover:text-accent-foreground">
                  Learn More
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Gold accent strip at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-primary" />
      </section>

      {/* ─── STRIPE PATTERN + EDITORIAL SECTION (Hello Sunshine style) ─── */}
      <section id="discover" className="relative">
        {/* Navy & gold vertical stripes background */}
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              hsl(225 55% 22%) 0px,
              hsl(225 55% 22%) 40px,
              hsl(225 55% 28%) 40px,
              hsl(225 55% 28%) 80px,
              hsl(225 55% 22%) 80px,
              hsl(225 55% 22%) 120px,
              hsl(45 95% 55%) 120px,
              hsl(45 95% 55%) 140px
            )`,
          }}
        />

        <div className="container mx-auto px-4 relative z-10 py-20 lg:py-28">
          <div className="grid md:grid-cols-2 gap-0 max-w-5xl mx-auto items-center">
            {/* Image side */}
            <div className="relative">
              <img
                src={editorialImage}
                alt="Professional woman working confidently"
                className="w-full h-[500px] object-cover"
              />
            </div>
            {/* White floating card */}
            <div className="bg-card p-8 md:p-12 md:-ml-12 my-8 md:my-16 relative z-10 shadow-xl">
              <p className="uppercase tracking-[0.2em] text-xs font-bold text-primary mb-4">Career Discovery</p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight font-display">
                Where Your<br />
                Career Story<br />
                <span className="italic text-primary">Begins</span>
              </h2>
              <p className="mt-6 text-muted-foreground leading-relaxed">
                WorkReady360 uses research-backed O*NET assessments and AI to match
                you with careers that align with your interests, values, and strengths.
              </p>
              <Link to="/auth" className="mt-8 inline-block">
                <Button variant="hero" className="uppercase tracking-wider text-sm font-bold">
                  Discover Your Path
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES — 4 bold cards on cream ─── */}
      <section className="py-20 lg:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="uppercase tracking-[0.2em] text-xs font-bold text-primary mb-3">Your Toolkit</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-display">
              Everything You Need to{' '}
              <span className="italic text-accent">Shine</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Target, title: 'Interest Profiler', desc: 'Discover careers aligned with your passions through O*NET assessments', color: 'bg-accent' },
              { icon: Heart, title: 'Work Values', desc: 'Identify what matters most in your ideal work environment', color: 'bg-primary' },
              { icon: Sparkles, title: 'AI Insights', desc: 'Personalized recommendations based on your unique profile', color: 'bg-accent' },
              { icon: Mic, title: 'Career Podcast', desc: 'Listen to a custom 3–5 minute podcast about your career path', color: 'bg-primary' },
            ].map((f, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-sm border-2 border-border hover:border-primary transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`${f.color} h-2 w-full`} />
                <div className="p-6 bg-card">
                  <div className={`w-14 h-14 rounded-sm ${f.color} flex items-center justify-center mb-5`}>
                    <f.icon className={`h-7 w-7 ${f.color === 'bg-primary' ? 'text-primary-foreground' : 'text-accent-foreground'}`} />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-foreground">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FULL-BLEED COLLAB IMAGE + floating How-It-Works card ─── */}
      <section className="relative min-h-[70vh] flex items-center">
        <img
          src={collabImage}
          alt="Team collaborating with energy and laughter"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-accent/85 via-accent/60 to-transparent" />

        <div className="container mx-auto px-4 relative z-10 flex justify-end">
          <div className="max-w-lg bg-card/95 backdrop-blur-sm p-8 md:p-12 shadow-xl rounded-sm animate-slide-up">
            <p className="uppercase tracking-[0.2em] text-xs font-bold text-primary mb-4">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-display mb-8">
              Three Steps to<br />
              <span className="italic text-primary">Your Future</span>
            </h2>
            {[
              { step: '01', title: 'Complete Assessments', desc: 'Interest Profiler & Work Importance evaluations' },
              { step: '02', title: 'Upload Your Resume', desc: 'Share your experience for personalized matching' },
              { step: '03', title: 'Listen & Explore', desc: 'Get your custom career podcast & recommendations' },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 mb-6 last:mb-0">
                <span className="text-3xl font-bold text-primary/30 font-display">{item.step}</span>
                <div>
                  <h3 className="font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA with stripe pattern ─── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              hsl(45 95% 55%) 0px,
              hsl(45 95% 55%) 60px,
              hsl(45 90% 60%) 60px,
              hsl(45 90% 60%) 100px,
              hsl(45 95% 55%) 100px,
              hsl(45 95% 55%) 160px,
              hsl(40 85% 50%) 160px,
              hsl(40 85% 50%) 180px
            )`,
          }}
        />
        <div className="container mx-auto px-4 relative z-10 py-20 lg:py-28 text-center">
          <div className="max-w-2xl mx-auto bg-card p-10 md:p-14 shadow-xl rounded-sm">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground font-display">
              Ready to Discover Your{' '}
              <span className="italic text-primary">Ideal Career?</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Join thousands of professionals who've found their path with WorkReady360
            </p>
            <Link to="/auth" className="mt-8 inline-block">
              <Button variant="hero" size="xl" className="uppercase tracking-wider text-sm font-bold">
                <Play className="h-5 w-5" />
                Start Free Today
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 bg-accent">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src={logoColor} alt="WorkReady360" className="h-16 object-contain brightness-0 invert" />
            <div className="flex items-center gap-6">
              <Link to="/auth" className="text-sm text-accent-foreground/70 hover:text-accent-foreground transition-colors">
                Get Started
              </Link>
              <Link to="/auth" className="text-sm text-accent-foreground/70 hover:text-accent-foreground transition-colors">
                Sign In
              </Link>
            </div>
            <p className="text-sm text-accent-foreground/50">
              © 2026 WorkReady360. Powered by O*NET&nbsp;&&nbsp;AI.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
