import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Heart, CheckCircle2 } from 'lucide-react';

// O*NET Work Importance Locator questions
const workImportanceQuestions = [
  // Achievement
  { id: 1, text: "I want a job where I can try out my own ideas", category: "Achievement" },
  { id: 2, text: "I want a job where I can make use of my abilities", category: "Achievement" },
  { id: 3, text: "I want a job where I can see the results of my work", category: "Achievement" },
  { id: 4, text: "I want a job that gives me a feeling of accomplishment", category: "Achievement" },
  // Working Conditions
  { id: 5, text: "I want a job where I am busy all the time", category: "Working Conditions" },
  { id: 6, text: "I want a job with good working conditions", category: "Working Conditions" },
  { id: 7, text: "I want a job with enough time for my family", category: "Working Conditions" },
  { id: 8, text: "I want a job where I can work on my own", category: "Working Conditions" },
  // Recognition
  { id: 9, text: "I want a job where I get recognition for the work I do", category: "Recognition" },
  { id: 10, text: "I want a job where I can give directions to others", category: "Recognition" },
  { id: 11, text: "I want a job where my coworkers respect me", category: "Recognition" },
  { id: 12, text: "I want a job that provides advancement opportunities", category: "Recognition" },
  // Relationships
  { id: 13, text: "I want a job where I can do things for other people", category: "Relationships" },
  { id: 14, text: "I want a job where my coworkers are friendly", category: "Relationships" },
  { id: 15, text: "I want a job where I can work as part of a team", category: "Relationships" },
  { id: 16, text: "I want a job where I am not asked to do anything that goes against my morals", category: "Relationships" },
  // Support
  { id: 17, text: "I want a job with supervisors who back up their workers", category: "Support" },
  { id: 18, text: "I want a job with supervisors who train workers well", category: "Support" },
  { id: 19, text: "I want a job with a company that treats employees fairly", category: "Support" },
  { id: 20, text: "I want a job that offers steady employment", category: "Support" },
  // Independence
  { id: 21, text: "I want a job where I can plan my work without much supervision", category: "Independence" },
  { id: 22, text: "I want a job where I can make decisions on my own", category: "Independence" },
  { id: 23, text: "I want a job where I can do things my own way", category: "Independence" },
  { id: 24, text: "I want a job where I am responsible for my work", category: "Independence" },
];

const responseOptions = [
  { value: "1", label: "Not Important" },
  { value: "2", label: "Somewhat Important" },
  { value: "3", label: "Important" },
  { value: "4", label: "Very Important" },
  { value: "5", label: "Most Important" },
];

const categoryDescriptions: Record<string, string> = {
  Achievement: "Occupations that let you use your best abilities and give a sense of accomplishment",
  "Working Conditions": "Occupations with good working conditions, job security, and work-life balance",
  Recognition: "Occupations that provide advancement, leadership, and respect from others",
  Relationships: "Occupations with friendly coworkers, teamwork, and helping others",
  Support: "Occupations with supportive supervisors and fair company policies",
  Independence: "Occupations that allow you to work autonomously and make your own decisions",
};

const QUESTIONS_PER_PAGE = 4;

export default function WorkImportance() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<{ category: string; score: number }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const totalPages = Math.ceil(workImportanceQuestions.length / QUESTIONS_PER_PAGE);
  const startIndex = currentPage * QUESTIONS_PER_PAGE;
  const currentQuestions = workImportanceQuestions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);
  const progress = (Object.keys(responses).length / workImportanceQuestions.length) * 100;

  const allCurrentAnswered = currentQuestions.every(q => responses[q.id]);
  const allAnswered = Object.keys(responses).length === workImportanceQuestions.length;

  const calculateScores = () => {
    const scores: Record<string, number> = {
      Achievement: 0,
      "Working Conditions": 0,
      Recognition: 0,
      Relationships: 0,
      Support: 0,
      Independence: 0,
    };
    
    Object.entries(responses).forEach(([id, value]) => {
      const question = workImportanceQuestions.find(q => q.id === parseInt(id));
      if (question) {
        scores[question.category] += parseInt(value);
      }
    });

    return Object.entries(scores)
      .map(([category, score]) => ({ category, score }))
      .sort((a, b) => b.score - a.score);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    const scores = calculateScores();
    const topValues = scores.slice(0, 3).map(s => s.category);
    
    const scoresObj = scores.reduce((acc, s) => {
      acc[s.category] = s.score;
      return acc;
    }, {} as Record<string, number>);

    const { error } = await supabase
      .from('work_importance_results')
      .insert({
        user_id: user.id,
        responses: responses,
        scores: scoresObj,
        top_values: topValues,
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="animate-scale-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <CardTitle className="text-2xl">Assessment Complete!</CardTitle>
              <CardDescription>
                Here are your Work Importance results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={result.category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3 ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium">{result.category}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{result.score}/20</span>
                    </div>
                    <Progress value={(result.score / 20) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {categoryDescriptions[result.category]}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Your Top Work Values:</h4>
                <div className="flex flex-wrap gap-2">
                  {results.slice(0, 3).map(r => (
                    <span key={r.category} className="px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                      {r.category}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
                <Button variant="hero" className="flex-1" onClick={() => navigate('/resume')}>
                  Upload Resume
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
              <Heart className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Work Importance Profiler</h1>
              <p className="text-muted-foreground">Identify what matters most in your career</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Questions */}
        <Card className="mb-6 animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">
              How important are these work values to you?
            </CardTitle>
            <CardDescription>
              Questions {startIndex + 1} - {Math.min(startIndex + QUESTIONS_PER_PAGE, workImportanceQuestions.length)} of {workImportanceQuestions.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {currentQuestions.map((question) => (
              <div key={question.id} className="space-y-3">
                <p className="font-medium">{question.text}</p>
                <RadioGroup
                  value={responses[question.id] || ''}
                  onValueChange={(value) => setResponses(prev => ({ ...prev, [question.id]: value }))}
                  className="flex flex-wrap gap-2"
                >
                  {responseOptions.map((option) => (
                    <div key={option.value} className="flex items-center">
                      <RadioGroupItem
                        value={option.value}
                        id={`q${question.id}-${option.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`q${question.id}-${option.value}`}
                        className="px-3 py-2 rounded-lg border-2 cursor-pointer transition-all hover:border-accent/50 peer-data-[state=checked]:border-accent peer-data-[state=checked]:bg-accent/10 text-sm"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => p - 1)}
            disabled={currentPage === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {currentPage < totalPages - 1 ? (
            <Button
              variant="accent"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!allCurrentAnswered}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="accent"
              onClick={handleSubmit}
              disabled={!allAnswered || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Complete Assessment
                  <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
