import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Target, CheckCircle2, Undo2 } from 'lucide-react';

// O*NET Interest Profiler – full 60-question set (RIASEC, 10 per category)
const interestQuestions = [
  // Realistic
  { id: 1, text: "Build kitchen cabinets", category: "R" },
  { id: 2, text: "Lay brick or tile", category: "R" },
  { id: 3, text: "Repair household appliances", category: "R" },
  { id: 4, text: "Raise fish in a fish hatchery", category: "R" },
  { id: 5, text: "Assemble electronic parts", category: "R" },
  { id: 6, text: "Drive a truck to deliver packages", category: "R" },
  { id: 7, text: "Test the quality of parts before shipment", category: "R" },
  { id: 8, text: "Repair and install locks", category: "R" },
  { id: 9, text: "Set up and operate machines to make products", category: "R" },
  { id: 10, text: "Put out forest fires", category: "R" },
  // Investigative
  { id: 11, text: "Study the structure of the human body", category: "I" },
  { id: 12, text: "Conduct research to develop new medicines", category: "I" },
  { id: 13, text: "Examine blood samples using a microscope", category: "I" },
  { id: 14, text: "Investigate the cause of a fire", category: "I" },
  { id: 15, text: "Study animal behavior", category: "I" },
  { id: 16, text: "Develop a new medical treatment", category: "I" },
  { id: 17, text: "Develop a way to better predict the weather", category: "I" },
  { id: 18, text: "Work in a biology lab", category: "I" },
  { id: 19, text: "Invent a replacement for sugar", category: "I" },
  { id: 20, text: "Study ways to reduce water pollution", category: "I" },
  // Artistic
  { id: 21, text: "Write a song", category: "A" },
  { id: 22, text: "Design artwork for magazines", category: "A" },
  { id: 23, text: "Write scripts for movies or television shows", category: "A" },
  { id: 24, text: "Play a musical instrument", category: "A" },
  { id: 25, text: "Create dance routines for a show", category: "A" },
  { id: 26, text: "Design sets for plays", category: "A" },
  { id: 27, text: "Write books or plays", category: "A" },
  { id: 28, text: "Sing in a band", category: "A" },
  { id: 29, text: "Direct a play", category: "A" },
  { id: 30, text: "Create special effects for movies", category: "A" },
  // Social
  { id: 31, text: "Help people with personal or emotional problems", category: "S" },
  { id: 32, text: "Teach children how to read", category: "S" },
  { id: 33, text: "Help people who have problems with drugs or alcohol", category: "S" },
  { id: 34, text: "Plan and direct recreational activities", category: "S" },
  { id: 35, text: "Teach sign language to people with hearing disabilities", category: "S" },
  { id: 36, text: "Help families care for ill relatives", category: "S" },
  { id: 37, text: "Teach an individual an exercise routine", category: "S" },
  { id: 38, text: "Help people with family-related problems", category: "S" },
  { id: 39, text: "Supervise the activities of children at a camp", category: "S" },
  { id: 40, text: "Teach a high school class", category: "S" },
  // Enterprising
  { id: 41, text: "Manage a department within a large company", category: "E" },
  { id: 42, text: "Start your own business", category: "E" },
  { id: 43, text: "Negotiate business contracts", category: "E" },
  { id: 44, text: "Represent a client in a lawsuit", category: "E" },
  { id: 45, text: "Market a new line of clothing", category: "E" },
  { id: 46, text: "Manage a retail store", category: "E" },
  { id: 47, text: "Buy and sell stocks and bonds", category: "E" },
  { id: 48, text: "Sell merchandise at a department store", category: "E" },
  { id: 49, text: "Operate a beauty salon or barber shop", category: "E" },
  { id: 50, text: "Manage a clothing store", category: "E" },
  // Conventional
  { id: 51, text: "Proofread records or forms", category: "C" },
  { id: 52, text: "Calculate the wages of employees", category: "C" },
  { id: 53, text: "Inventory supplies using a hand-held computer", category: "C" },
  { id: 54, text: "Record rent payments", category: "C" },
  { id: 55, text: "Handle customers' bank transactions", category: "C" },
  { id: 56, text: "Keep shipping and receiving records", category: "C" },
  { id: 57, text: "Develop a spreadsheet using computer software", category: "C" },
  { id: 58, text: "Maintain employee records", category: "C" },
  { id: 59, text: "Stamp, sort, and distribute mail for an organization", category: "C" },
  { id: 60, text: "Schedule conferences for an organization", category: "C" },
];

const responseEmojis = [
  { value: "1", label: "Strongly Dislike", emoji: "😖" },
  { value: "2", label: "Dislike", emoji: "😕" },
  { value: "3", label: "Unsure", emoji: "😐" },
  { value: "4", label: "Like", emoji: "😊" },
  { value: "5", label: "Strongly Like", emoji: "😍" },
];

const categoryNames: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

const categoryDescriptions: Record<string, string> = {
  R: "Hands-on, practical work with tools, machines, or nature",
  I: "Research, analysis, and problem-solving",
  A: "Creative expression and design",
  S: "Helping, teaching, and serving others",
  E: "Leading, persuading, and business",
  C: "Organizing data, records, and processes",
};

const categoryColors: Record<string, string> = {
  R: "hsl(var(--destructive))",
  I: "hsl(var(--accent))",
  A: "hsl(280, 60%, 50%)",
  S: "hsl(var(--success))",
  E: "hsl(var(--primary))",
  C: "hsl(200, 60%, 50%)",
};

export default function InterestProfiler() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<{ category: string; score: number }[]>([]);
  const [animDir, setAnimDir] = useState<'in' | 'out' | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const totalQuestions = interestQuestions.length;
  const progress = (Object.keys(responses).length / totalQuestions) * 100;
  const currentQuestion = interestQuestions[currentIndex];
  const allAnswered = Object.keys(responses).length === totalQuestions;

  const handleAnswer = useCallback((value: string) => {
    setAnimDir('out');
    setTimeout(() => {
      setResponses(prev => ({ ...prev, [currentQuestion.id]: value }));
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex(prev => prev + 1);
      }
      setAnimDir('in');
      setTimeout(() => setAnimDir(null), 300);
    }, 200);
  }, [currentIndex, currentQuestion, totalQuestions]);

  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const calculateScores = () => {
    const scores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    Object.entries(responses).forEach(([id, value]) => {
      const question = interestQuestions.find(q => q.id === parseInt(id));
      if (question) scores[question.category] += parseInt(value);
    });
    return Object.entries(scores)
      .map(([category, score]) => ({ category, score }))
      .sort((a, b) => b.score - a.score);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    const scores = calculateScores();
    const topInterests = scores.slice(0, 3).map(s => categoryNames[s.category]);
    const scoresObj = scores.reduce((acc, s) => {
      acc[s.category] = s.score;
      return acc;
    }, {} as Record<string, number>);

    const { error } = await supabase
      .from('interest_profiler_results')
      .insert({
        user_id: user.id,
        responses: responses,
        scores: scoresObj,
        top_interests: topInterests,
      });

    setIsSubmitting(false);
    if (error) {
      toast.error('Failed to save results. Please try again.');
      console.error(error);
    } else {
      setResults(scores);
      setIsComplete(true);
      toast.success('Assessment complete!');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ---------- RESULTS SCREEN ----------
  if (isComplete) {
    const maxScore = 50; // 10 questions × 5 max
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6 animate-scale-in">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Assessment Complete!</h1>
            <p className="text-muted-foreground text-sm">Your RIASEC Interest Profile</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
            {results.map((result, index) => (
              <div key={result.category} className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>{index + 1}</span>
                    <span className="font-medium text-sm text-foreground">{categoryNames[result.category]}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{result.score}/{maxScore}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(result.score / maxScore) * 100}%`,
                      backgroundColor: categoryColors[result.category],
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{categoryDescriptions[result.category]}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h4 className="font-semibold text-sm mb-2 text-foreground">Your Top Interests</h4>
            <div className="flex flex-wrap gap-2">
              {results.slice(0, 3).map(r => (
                <span key={r.category} className="px-3 py-1 rounded-full bg-primary/10 text-primary-foreground text-sm font-medium border border-primary/20">
                  {categoryNames[r.category]}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
            <Button variant="hero" className="flex-1" onClick={() => navigate('/assessment/work-importance')}>
              Work Values <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- INTRO SCREEN ----------
  if (showIntro) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-0">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>

          <div className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-sm text-center">
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto">
              <Target className="h-10 w-10 text-primary-foreground" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                What would you enjoy doing at your dream job?
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                You'll see {totalQuestions} work activities. For each one, tell us how you feel about doing it.
              </p>
            </div>

            <div className="space-y-3 text-left text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span>Picture yourself doing each activity</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span>Tap the face that matches how you feel</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span><strong>Don't think about</strong> education needed or salary — just go with your gut!</span>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              {responseEmojis.map(e => (
                <div key={e.value} className="text-center">
                  <span className="text-3xl">{e.emoji}</span>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{e.label}</p>
                </div>
              ))}
            </div>

            <Button variant="hero" size="lg" className="w-full text-base" onClick={() => setShowIntro(false)}>
              Let's Go! <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            No right or wrong answers — this is about <em>you</em>!
          </p>
        </div>
      </div>
    );
  }

  // ---------- QUESTION CARD ----------
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isLastAnswered = responses[currentQuestion.id] !== undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <button onClick={handleUndo} disabled={currentIndex === 0}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none">
              <Undo2 className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-foreground">
              {currentIndex + 1} <span className="text-muted-foreground">of {totalQuestions}</span>
            </span>
            <div className="w-9" /> {/* spacer */}
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Activity Card */}
          <div
            className={`rounded-2xl border border-border bg-card p-8 shadow-sm text-center transition-all duration-200 ${
              animDir === 'out' ? 'opacity-0 translate-y-4 scale-95' :
              animDir === 'in' ? 'opacity-0 -translate-y-4 scale-95' :
              'opacity-100 translate-y-0 scale-100'
            }`}
          >
            <div className="mb-2">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground uppercase tracking-wider">
                {categoryNames[currentQuestion.category]}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-snug min-h-[3.5rem] flex items-center justify-center">
              {currentQuestion.text}
            </h2>
          </div>

          {/* Emoji Response Buttons */}
          <div className="flex justify-center gap-3 md:gap-5">
            {responseEmojis.map((option) => {
              const isSelected = responses[currentQuestion.id] === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  className={`group flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-150 hover:scale-110 active:scale-95 ${
                    isSelected
                      ? 'bg-primary/15 ring-2 ring-primary scale-105'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <span className="text-4xl md:text-5xl transition-transform group-hover:scale-110">{option.emoji}</span>
                  <span className={`text-[10px] font-medium leading-tight text-center ${
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Submit on last question */}
          {isLastQuestion && isLastAnswered && allAnswered && (
            <div className="flex justify-center animate-fade-in">
              <Button variant="hero" size="lg" onClick={handleSubmit} disabled={isSubmitting} className="px-8">
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>See My Results <CheckCircle2 className="h-5 w-5" /></>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
