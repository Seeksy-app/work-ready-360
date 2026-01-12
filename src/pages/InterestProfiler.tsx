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
import { Loader2, ArrowLeft, ArrowRight, Target, CheckCircle2 } from 'lucide-react';

// O*NET Interest Profiler questions based on RIASEC model
const interestQuestions = [
  // Realistic
  { id: 1, text: "Build kitchen cabinets", category: "R" },
  { id: 2, text: "Lay brick or tile", category: "R" },
  { id: 3, text: "Repair household appliances", category: "R" },
  { id: 4, text: "Raise fish in a fish hatchery", category: "R" },
  { id: 5, text: "Assemble electronic parts", category: "R" },
  { id: 6, text: "Drive a truck to deliver packages", category: "R" },
  // Investigative
  { id: 7, text: "Study the structure of the human body", category: "I" },
  { id: 8, text: "Conduct research to develop new medicines", category: "I" },
  { id: 9, text: "Examine blood samples using a microscope", category: "I" },
  { id: 10, text: "Investigate the cause of a fire", category: "I" },
  { id: 11, text: "Study animal behavior", category: "I" },
  { id: 12, text: "Develop a new medical treatment", category: "I" },
  // Artistic
  { id: 13, text: "Write a song", category: "A" },
  { id: 14, text: "Design artwork for magazines", category: "A" },
  { id: 15, text: "Write scripts for movies or television shows", category: "A" },
  { id: 16, text: "Play a musical instrument", category: "A" },
  { id: 17, text: "Create dance routines for a show", category: "A" },
  { id: 18, text: "Design sets for plays", category: "A" },
  // Social
  { id: 19, text: "Help people with personal or emotional problems", category: "S" },
  { id: 20, text: "Teach children how to read", category: "S" },
  { id: 21, text: "Help people who have problems with drugs or alcohol", category: "S" },
  { id: 22, text: "Plan and direct recreational activities", category: "S" },
  { id: 23, text: "Teach sign language to people with hearing disabilities", category: "S" },
  { id: 24, text: "Help families care for ill relatives", category: "S" },
  // Enterprising
  { id: 25, text: "Manage a department within a large company", category: "E" },
  { id: 26, text: "Start your own business", category: "E" },
  { id: 27, text: "Negotiate business contracts", category: "E" },
  { id: 28, text: "Represent a client in a lawsuit", category: "E" },
  { id: 29, text: "Market a new line of clothing", category: "E" },
  { id: 30, text: "Manage a retail store", category: "E" },
  // Conventional
  { id: 31, text: "Proofread records or forms", category: "C" },
  { id: 32, text: "Calculate the wages of employees", category: "C" },
  { id: 33, text: "Inventory supplies using a hand-held computer", category: "C" },
  { id: 34, text: "Record rent payments", category: "C" },
  { id: 35, text: "Handle customers' bank transactions", category: "C" },
  { id: 36, text: "Keep shipping and receiving records", category: "C" },
];

const responseOptions = [
  { value: "1", label: "Strongly Dislike" },
  { value: "2", label: "Dislike" },
  { value: "3", label: "Unsure" },
  { value: "4", label: "Like" },
  { value: "5", label: "Strongly Like" },
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

const QUESTIONS_PER_PAGE = 6;

export default function InterestProfiler() {
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

  const totalPages = Math.ceil(interestQuestions.length / QUESTIONS_PER_PAGE);
  const startIndex = currentPage * QUESTIONS_PER_PAGE;
  const currentQuestions = interestQuestions.slice(startIndex, startIndex + QUESTIONS_PER_PAGE);
  const progress = (Object.keys(responses).length / interestQuestions.length) * 100;

  const allCurrentAnswered = currentQuestions.every(q => responses[q.id]);
  const allAnswered = Object.keys(responses).length === interestQuestions.length;

  const calculateScores = () => {
    const scores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    
    Object.entries(responses).forEach(([id, value]) => {
      const question = interestQuestions.find(q => q.id === parseInt(id));
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
                Here are your Interest Profiler results based on the RIASEC model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={result.category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index < 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium">{categoryNames[result.category]}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{result.score}/30</span>
                    </div>
                    <Progress value={(result.score / 30) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {categoryDescriptions[result.category]}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Your Top Interest Areas:</h4>
                <div className="flex flex-wrap gap-2">
                  {results.slice(0, 3).map(r => (
                    <span key={r.category} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {categoryNames[r.category]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
                <Button variant="hero" className="flex-1" onClick={() => navigate('/assessment/work-importance')}>
                  Continue to Work Values
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
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <Target className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Interest Profiler</h1>
              <p className="text-muted-foreground">Discover careers that match your interests</p>
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
              How would you feel about doing these activities?
            </CardTitle>
            <CardDescription>
              Questions {startIndex + 1} - {Math.min(startIndex + QUESTIONS_PER_PAGE, interestQuestions.length)} of {interestQuestions.length}
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
                        className="px-3 py-2 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 text-sm"
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
              variant="hero"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!allCurrentAnswered}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="hero"
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
