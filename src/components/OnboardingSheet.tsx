import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, Bot, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OnboardingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 0 | 1 | 2 | 3 | 4;

const QUESTIONS = [
  { id: 'name', prompt: "👋 Hi! I'm Agent360, your career co-pilot. What's your first name?", placeholder: 'Your first name' },
  { id: 'industry', prompt: "Nice to meet you, {name}! What industry or field are you most interested in?", placeholder: 'e.g. Healthcare, Technology, Education…' },
  { id: 'experience', prompt: "Got it! How many years of professional experience do you have?", options: ['0–2 years', '3–5 years', '6–10 years', '10+ years'] },
  { id: 'priority', prompt: "Last one — what matters most to you in your next role?", options: ['Higher pay', 'Work-life balance', 'Growth & learning', 'Purpose & impact'] },
];

export default function OnboardingSheet({ open, onOpenChange }: OnboardingSheetProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');

  const currentQ = QUESTIONS[step] as (typeof QUESTIONS)[number] | undefined;

  const handleAnswer = (value: string) => {
    if (!currentQ) return;
    const updated = { ...answers, [currentQ.id]: value };
    setAnswers(updated);
    setInputValue('');
    if (step < 3) {
      setStep((step + 1) as Step);
    } else {
      setStep(4 as Step);
    }
  };

  const handleSubmitInput = () => {
    if (inputValue.trim()) handleAnswer(inputValue.trim());
  };

  const handleGetStarted = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  const resolvePrompt = (prompt: string) => {
    return prompt.replace('{name}', answers.name || 'there');
  };

  // Build conversation history
  const messages: { role: 'agent' | 'user'; text: string }[] = [];
  for (let i = 0; i < step; i++) {
    const q = QUESTIONS[i];
    messages.push({ role: 'agent', text: resolvePrompt(q.prompt) });
    messages.push({ role: 'user', text: answers[q.id] || '' });
  }
  if (currentQ && step < 4) {
    messages.push({ role: 'agent', text: resolvePrompt(currentQ.prompt) });
  }
  if (step === 4) {
    messages.push({
      role: 'agent',
      text: `Awesome, ${answers.name || 'friend'}! Based on your interests in ${answers.industry || 'your field'} and focus on ${(answers.priority || 'growth').toLowerCase()}, I've got some great insights waiting for you. Let's set up your free account and dive in! 🚀`,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0 bg-background">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Agent360</span>
            <span className="text-muted-foreground font-normal text-sm">Career Assistant</span>
          </SheetTitle>
        </SheetHeader>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'agent' && (
                <div className="w-7 h-7 rounded-full bg-primary flex-shrink-0 flex items-center justify-center mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'agent'
                    ? 'bg-muted text-foreground'
                    : 'bg-accent text-accent-foreground'
                }`}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-accent flex-shrink-0 flex items-center justify-center mt-1">
                  <User className="h-3.5 w-3.5 text-accent-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input area */}
        <div className="border-t border-border px-6 py-4">
          {step === 4 ? (
            <Button variant="hero" size="xl" className="w-full uppercase tracking-wider text-sm font-bold" onClick={handleGetStarted}>
              Create Free Account
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : currentQ && 'options' in currentQ && currentQ.options ? (
            <div className="grid grid-cols-2 gap-2">
              {currentQ.options.map((opt) => (
                <Button
                  key={opt}
                  variant="outline"
                  className="text-sm border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                  onClick={() => handleAnswer(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); handleSubmitInput(); }}
              className="flex gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={currentQ?.placeholder || 'Type your answer…'}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="icon" disabled={!inputValue.trim()} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
