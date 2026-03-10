import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
  Loader2,
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  X,
  Mic,
  PenTool,
  Sparkles,
  Save,
  Eye,
  LogOut,
  Plus,
  Trash2,
  ArrowRight,
} from 'lucide-react';

type ResumeMode = 'choose' | 'upload' | 'manual' | 'ai' | 'preview';

interface ResumeSection {
  id: string;
  type: 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'custom';
  title: string;
  content: string;
}

const DEFAULT_SECTIONS: ResumeSection[] = [
  { id: 'contact', type: 'contact', title: 'Contact Information', content: '' },
  { id: 'summary', type: 'summary', title: 'Professional Summary', content: '' },
  { id: 'experience', type: 'experience', title: 'Work Experience', content: '' },
  { id: 'education', type: 'education', title: 'Education', content: '' },
  { id: 'skills', type: 'skills', title: 'Skills', content: '' },
];

// AI Q&A state
interface AIQAState {
  step: number;
  answers: Record<string, string>;
  isGenerating: boolean;
  generatedSections: ResumeSection[] | null;
}

const AI_QUESTIONS = [
  { key: 'name_contact', label: 'What is your full name, email, phone, and city/state?', placeholder: 'e.g. Jane Doe, jane@email.com, (555) 123-4567, Austin, TX' },
  { key: 'current_role', label: 'What is your current or most recent job title and company?', placeholder: 'e.g. Marketing Manager at Acme Corp (2021–present)' },
  { key: 'experience', label: 'Describe your top 2-3 work experiences with key accomplishments.', placeholder: 'e.g. Led a team of 5 to launch a new product line, increasing revenue by 30%...' },
  { key: 'education', label: 'What is your educational background? (degrees, schools, years)', placeholder: 'e.g. B.S. in Computer Science, University of Texas, 2018' },
  { key: 'skills', label: 'List your top skills, certifications, or technologies.', placeholder: 'e.g. Python, Project Management, PMP Certified, Data Analysis' },
  { key: 'target', label: 'What type of role or industry are you targeting?', placeholder: 'e.g. Senior Software Engineer in fintech' },
];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resume-builder`;

export default function Resume() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Mode
  const [mode, setMode] = useState<ResumeMode>('choose');

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Builder state
  const [sections, setSections] = useState<ResumeSection[]>(DEFAULT_SECTIONS);
  const [activeSection, setActiveSection] = useState<string>('contact');

  // AI Q&A state
  const [aiState, setAiState] = useState<AIQAState>({
    step: 0,
    answers: {},
    isGenerating: false,
    generatedSections: null,
  });

  // Draft saved
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Load saved draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`wr360_resume_draft_${user?.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHasDraft(true);
        // Don't auto-load; show option
      } catch {}
    }
  }, [user]);

  const loadDraft = () => {
    const saved = localStorage.getItem(`wr360_resume_draft_${user?.id}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setSections(parsed.sections);
      setMode('manual');
      toast.success('Draft loaded');
    }
  };

  const saveDraft = () => {
    if (!user) return;
    localStorage.setItem(`wr360_resume_draft_${user.id}`, JSON.stringify({ sections, savedAt: new Date().toISOString() }));
    setHasDraft(true);
    toast.success('Draft saved');
  };

  const saveAndPublish = async () => {
    if (!user) return;
    // Build resume content from sections
    const content = sections.map(s => `## ${s.title}\n${s.content}`).join('\n\n');
    
    try {
      const { error } = await supabase.from('resumes').upsert({
        user_id: user.id,
        file_name: 'resume-built.md',
        file_url: '', // No file URL for built resumes
        parsed_content: { sections: sections.map(s => ({ title: s.title, content: s.content })), fullText: content },
      }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Resume published! 🎉');
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save resume');
    }
  };

  // Upload handlers
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0]);
  }, []);

  const validateAndSetFile = (file: File) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) { toast.error('Please upload a PDF or Word document'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10MB'); return; }
    setFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) validateAndSetFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !user) return;
    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsUploading(false);
    setUploadComplete(true);
    toast.success('Resume uploaded successfully!');
  };

  // AI Q&A
  const handleAIAnswer = (value: string) => {
    setAiState(prev => ({
      ...prev,
      answers: { ...prev.answers, [AI_QUESTIONS[prev.step].key]: value },
    }));
  };

  const handleAINext = () => {
    const currentQ = AI_QUESTIONS[aiState.step];
    if (!aiState.answers[currentQ.key]?.trim()) {
      toast.error('Please answer the question before continuing');
      return;
    }
    if (aiState.step < AI_QUESTIONS.length - 1) {
      setAiState(prev => ({ ...prev, step: prev.step + 1 }));
    } else {
      generateResumeFromAI();
    }
  };

  const handleAIPrev = () => {
    if (aiState.step > 0) setAiState(prev => ({ ...prev, step: prev.step - 1 }));
  };

  const generateResumeFromAI = async () => {
    setAiState(prev => ({ ...prev, isGenerating: true }));

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ answers: aiState.answers }),
      });

      if (!resp.ok) throw new Error('Failed to generate resume');
      const data = await resp.json();

      if (data.sections) {
        const generated: ResumeSection[] = data.sections.map((s: any, i: number) => ({
          id: `gen-${i}`,
          type: 'custom' as const,
          title: s.title,
          content: s.content,
        }));
        setSections(generated);
        setMode('manual'); // Switch to editor with generated content
        toast.success('Resume generated! Review and edit below.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate resume');
    } finally {
      setAiState(prev => ({ ...prev, isGenerating: false }));
    }
  };

  const updateSection = (id: string, content: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
  };

  const updateSectionTitle = (id: string, title: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  };

  const addSection = () => {
    const newId = `custom-${Date.now()}`;
    setSections(prev => [...prev, { id: newId, type: 'custom', title: 'New Section', content: '' }]);
    setActiveSection(newId);
  };

  const removeSection = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id));
    if (activeSection === id) setActiveSection(sections[0]?.id || '');
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // CHOOSE MODE
  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <FileText className="h-7 w-7 text-secondary-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Your Resume</h1>
            <p className="text-muted-foreground">Choose how you'd like to get started</p>
          </div>

          <div className="grid gap-4">
            <Card className="hover:shadow-lg hover:border-primary/30 cursor-pointer transition-all group" onClick={() => setMode('upload')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Upload Existing Resume</h3>
                  <p className="text-sm text-muted-foreground">Upload a PDF or Word document you already have</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg hover:border-primary/30 cursor-pointer transition-all group" onClick={() => setMode('manual')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                  <PenTool className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Build Manually</h3>
                  <p className="text-sm text-muted-foreground">Create your resume section by section with a structured editor</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg hover:border-primary/30 cursor-pointer transition-all group" onClick={() => setMode('ai')}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">AI-Assisted Builder</h3>
                  <p className="text-sm text-muted-foreground">Answer a few questions and let AI create a polished resume for you</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>

            {hasDraft && (
              <Card className="hover:shadow-lg hover:border-primary/30 cursor-pointer transition-all group border-dashed" onClick={loadDraft}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Continue Draft</h3>
                    <p className="text-sm text-muted-foreground">Pick up where you left off</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // UPLOAD MODE
  if (mode === 'upload') {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Button variant="ghost" onClick={() => setMode('choose')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Options
          </Button>
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Upload Your Resume</CardTitle>
              <CardDescription>Upload a PDF or Word document</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!uploadComplete ? (
                <>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                      isDragging ? 'border-primary bg-primary/5' : file ? 'border-success bg-success/5' : 'border-muted-foreground/30 hover:border-primary/50'
                    }`}
                  >
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {file ? (
                      <div className="space-y-3">
                        <div className="w-16 h-16 rounded-xl bg-success/10 flex items-center justify-center mx-auto">
                          <FileText className="h-8 w-8 text-success" />
                        </div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-destructive">
                          <X className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center mx-auto">
                          <Upload className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="font-medium">{isDragging ? 'Drop your resume here' : 'Drag & drop your resume'}</p>
                        <p className="text-sm text-muted-foreground">or click to browse • PDF, DOC, DOCX up to 10MB</p>
                      </div>
                    )}
                  </div>
                  {file && (
                    <Button className="w-full" size="lg" onClick={handleUpload} disabled={isUploading}>
                      {isUploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Upload Resume</>}
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center space-y-6 py-4">
                  <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-success" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Resume Uploaded!</h3>
                    <p className="text-muted-foreground">Your resume is ready for podcast generation</p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => { setFile(null); setUploadComplete(false); }}>Upload Different</Button>
                    <Button onClick={() => navigate('/podcast')}><Mic className="h-4 w-4 mr-2" /> Generate Podcast</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // AI Q&A MODE
  if (mode === 'ai') {
    const currentQ = AI_QUESTIONS[aiState.step];
    const progressPct = ((aiState.step + 1) / AI_QUESTIONS.length) * 100;

    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Button variant="ghost" onClick={() => setMode('choose')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Options
          </Button>

          <Card className="animate-fade-in">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>AI Resume Builder</CardTitle>
              </div>
              <CardDescription>Question {aiState.step + 1} of {AI_QUESTIONS.length}</CardDescription>
              <div className="w-full bg-muted rounded-full h-2 mt-3">
                <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {aiState.isGenerating ? (
                <div className="text-center py-12 space-y-4">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="font-medium">Crafting your resume...</p>
                  <p className="text-sm text-muted-foreground">This usually takes 15-30 seconds</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">{currentQ.label}</Label>
                    <Textarea
                      value={aiState.answers[currentQ.key] || ''}
                      onChange={(e) => handleAIAnswer(e.target.value)}
                      placeholder={currentQ.placeholder}
                      className="min-h-[120px]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleAIPrev} disabled={aiState.step === 0}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { saveDraft(); setMode('choose'); }}>
                        <Save className="h-4 w-4 mr-1" /> Save & Quit
                      </Button>
                    </div>
                    <Button onClick={handleAINext}>
                      {aiState.step === AI_QUESTIONS.length - 1 ? (
                        <><Sparkles className="h-4 w-4 mr-1" /> Generate Resume</>
                      ) : (
                        <>Next <ArrowRight className="h-4 w-4 ml-1" /></>
                      )}
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setMode('preview')}>
                    <Eye className="h-4 w-4 mr-1" /> Preview Draft
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // PREVIEW MODE
  if (mode === 'preview') {
    const previewContent = sections.map(s => `## ${s.title}\n${s.content || '_Not yet filled_'}`).join('\n\n');
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Button variant="ghost" onClick={() => setMode('manual')} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Resume Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none bg-card p-6 rounded-lg border min-h-[400px]">
                <ReactMarkdown>{previewContent}</ReactMarkdown>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setMode('manual')} className="flex-1">
                  <PenTool className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="outline" onClick={saveDraft} className="flex-1">
                  <Save className="h-4 w-4 mr-2" /> Save Draft
                </Button>
                <Button onClick={saveAndPublish} className="flex-1">
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Save & Publish
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // MANUAL BUILD MODE (also used after AI generation)
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button variant="ghost" onClick={() => setMode('choose')} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Options
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Resume Builder</h1>
            <p className="text-sm text-muted-foreground">Edit sections below. Your changes are saved locally.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMode('preview')}>
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
            <Button variant="outline" size="sm" onClick={saveDraft}>
              <Save className="h-4 w-4 mr-1" /> Save Draft
            </Button>
            <Button size="sm" onClick={saveAndPublish}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Publish
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.id} className={`transition-all ${activeSection === section.id ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => setActiveSection(section.id === activeSection ? '' : section.id)}>
                <div className="flex items-center justify-between">
                  <Input
                    value={section.title}
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className="border-0 p-0 h-auto text-base font-semibold focus-visible:ring-0 bg-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {section.type === 'custom' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              {activeSection === section.id && (
                <CardContent>
                  <Textarea
                    value={section.content}
                    onChange={(e) => updateSection(section.id, e.target.value)}
                    placeholder={`Enter your ${section.title.toLowerCase()} here...`}
                    className="min-h-[150px] resize-y"
                  />
                </CardContent>
              )}
            </Card>
          ))}

          <Button variant="outline" className="w-full border-dashed" onClick={addSection}>
            <Plus className="h-4 w-4 mr-2" /> Add Section
          </Button>
        </div>

        <div className="flex gap-3 mt-8 sticky bottom-4">
          <Button variant="outline" onClick={() => { saveDraft(); setMode('choose'); }} className="flex-1">
            <LogOut className="h-4 w-4 mr-2" /> Save & Quit
          </Button>
          <Button variant="outline" onClick={() => setMode('preview')} className="flex-1">
            <Eye className="h-4 w-4 mr-2" /> Preview
          </Button>
          <Button onClick={saveAndPublish} className="flex-1">
            <CheckCircle2 className="h-4 w-4 mr-2" /> Save & Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
