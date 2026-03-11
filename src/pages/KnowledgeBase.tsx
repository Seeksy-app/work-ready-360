import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { searchCareers, getCareerDetails, OnetCareer, OnetCareerDetail } from '@/lib/onet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  Search,
  Briefcase,
  BookOpen,
  FileText,
  GraduationCap,
  ExternalLink,
  Star,
  TrendingUp,
  DollarSign,
  HelpCircle,
} from 'lucide-react';
import DashboardNav from '@/components/DashboardNav';

// ── "What Is…" glossary from the Engage360 Workbook ──
const GLOSSARY_ITEMS = [
  {
    term: 'Work Ready',
    definition: 'Individuals possessing the foundational skills needed to be minimally qualified for a specific occupation as determined through a job analysis or occupational profile.',
  },
  {
    term: 'Occupational Profile',
    definition: 'The end product of a process used to identify the key skill areas and levels of skills required to enter an occupation and successfully perform tasks.',
  },
  {
    term: 'Job Profile / Analysis',
    definition: 'A systematic procedure for gathering, documenting, and analyzing information about the content, context, and requirements for a job.',
  },
  {
    term: 'Task',
    definition: 'Typically conceptualized as the smallest unit of activity with a meaningful outcome.',
  },
  {
    term: 'Task Statement',
    definition: 'The types of activities workers in an occupation may perform that describe the task.',
  },
  {
    term: 'Skill',
    definition: 'A fundamental and portable capability that is essential to conveying and receiving information critical to training and workplace success. Skills are acquired through experience and practice and are used to facilitate knowledge acquisition.',
  },
  {
    term: 'Transitional & Soft Skills',
    definition: 'Personal characteristics and behavioral skills that affect an individual\'s interactions, job performance, and career prospects across a broad range of settings. Examples include adaptability, communication skills, cooperation, discipline, and integrity.',
  },
  {
    term: 'Foundational Skills',
    definition: 'Competencies that form the very foundation for success. They are portable across all occupations — such as applied math, locating information, and reading for information — and enable individuals to advance along a career pathway.',
  },
  {
    term: 'Knowledge',
    definition: 'A collection of discrete but related facts, information, and principles about a certain domain, acquired through education, training, or experience.',
  },
  {
    term: 'Abilities',
    definition: 'Unlike skills, which are acquired through experience and practice, abilities are relatively stable characteristics of an individual.',
  },
  {
    term: 'Interests (RIASEC)',
    definition: 'Holland\'s taxonomy of occupational preferences. There are six interest types: Realistic (R), Investigative (I), Artistic (A), Social (S), Enterprising (E), and Conventional (C). Knowing your type can improve success and satisfaction in the workplace.',
  },
  {
    term: 'Work Values',
    definition: 'Based on the Minnesota Theory of Work Adjustment, the framework comprises six values: Achievement, Independence, Recognition, Relationships, Support, and Working Conditions. Values are made up of needs.',
  },
  {
    term: 'Work Needs',
    definition: 'What makes people satisfied with their work. Some people value pay, while others want security, autonomy, or work that uses their best abilities. There are 20 needs that make up six values. Needs must be reinforced by the employer (environment) in order to find satisfaction.',
  },
  {
    term: 'Work Adjustment',
    definition: 'The process of achieving and maintaining correspondence between an individual and a work environment. The reinforcement of values & needs creates satisfaction, and the ability to perform required abilities creates satisfactoriness.',
  },
  {
    term: 'Tenure',
    definition: 'The degrees of satisfaction and satisfactoriness are predictors of the likelihood that someone will stay in a job, be successful at it, and receive advancement.',
  },
  {
    term: 'Job Zone',
    definition: 'A group of occupations similar in how much education, related experience, and on-the-job training people need. There are five zones ranging from little/no preparation (Zone 1) to extensive preparation such as a Bachelor\'s Degree Plus (Zone 5).',
  },
  {
    term: 'Personality Types',
    definition: 'In our culture, most people are one of six personality types: Realistic, Investigative, Artistic, Social, Enterprising, and Conventional. Knowing your type helps improve success and satisfaction in the workplace.',
  },
  {
    term: 'World of Work (WOW)',
    definition: 'A map that organizes occupations into six interest types, 16 clusters, 12 regions, and 26 career areas (groups of similar jobs). Occupations are positioned according to primary work tasks — Data, Things, Ideas, and People.',
  },
  {
    term: 'Work Tasks',
    definition: 'All occupations involve work with Data (facts, records, numbers), Things (machines, tools, materials), Ideas (abstractions, theories, insights), and/or People (helping, informing, persuading, directing). Understanding your primary tasks helps map you to the right career area.',
  },
  {
    term: 'Engagement',
    definition: 'According to Gallup, only 33% of employees are engaged in the workplace. An engaged worker is involved in, enthusiastic about, and committed to their work and workplace — they use their strengths daily, feel recognized, and are challenged to grow.',
  },
];

// ── Work Tasks deep-dive ──
const WORK_TASKS = [
  {
    name: 'Data',
    emoji: '📊',
    description: 'Facts, records, files, numbers. Data activities involve impersonal processes such as recording, verifying, transmitting, and organizing facts or data representing goods and services.',
    examples: 'Purchasing agents, accountants, and air traffic controllers work mainly with data.',
  },
  {
    name: 'Things',
    emoji: '🔧',
    description: 'Machines, mechanisms, materials, tools, physical and biological processes. Things activities involve non-personal processes such as producing, transporting, servicing, and repairing.',
    examples: 'Bricklayers, farmers, and engineers work mainly with things.',
  },
  {
    name: 'Ideas',
    emoji: '💡',
    description: 'Abstractions, theories, knowledge, insights. Ideas activities involve intrapersonal processes such as discovering, interpreting, and creating new ways of expressing something — for example, with words, equations, or music.',
    examples: 'Scientists, musicians, and philosophers work mainly with ideas.',
  },
  {
    name: 'People',
    emoji: '🤝',
    description: 'People activities involve interpersonal processes such as helping, informing, servicing, persuading, entertaining, motivating, and directing — producing a change in human behavior.',
    examples: 'Teachers, salespersons, and nurses work mainly with people.',
  },
];

const EDUCATIONAL_RESOURCES = [
  { title: 'Bureau of Labor Statistics – Occupational Outlook Handbook', url: 'https://www.bls.gov/ooh/', description: 'Comprehensive career information including pay, outlook, and education requirements.', category: 'Government' },
  { title: 'O*NET OnLine', url: 'https://www.onetonline.org/', description: 'Explore occupations, skills, interests, and work values in detail.', category: 'Government' },
  { title: 'CareerOneStop', url: 'https://www.careeronestop.org/', description: 'Tools to explore careers, find training, and search for jobs.', category: 'Government' },
  { title: 'Khan Academy – Career Planning', url: 'https://www.khanacademy.org/college-careers-more', description: 'Free courses on college prep, career skills, and financial literacy.', category: 'Free Courses' },
  { title: 'Coursera – Career Development', url: 'https://www.coursera.org/browse/business/leadership-and-management', description: 'Professional development courses from top universities.', category: 'Online Learning' },
  { title: 'LinkedIn Learning', url: 'https://www.linkedin.com/learning/', description: 'Professional skills training in business, tech, and creative fields.', category: 'Online Learning' },
];

const RECOMMENDED_READING = [
  { title: 'What Color Is Your Parachute?', author: 'Richard N. Bolles', description: 'The classic guide to job-hunting and career-changing.' },
  { title: 'Designing Your Life', author: 'Bill Burnett & Dave Evans', description: 'Apply design thinking to build a joyful, fulfilling life and career.' },
  { title: 'So Good They Can\'t Ignore You', author: 'Cal Newport', description: 'Why skills trump passion in the quest for work you love.' },
  { title: 'Strengths Finder 2.0', author: 'Tom Rath', description: 'Discover your top strengths and how to develop them.' },
  { title: 'The Pathfinder', author: 'Nicholas Lore', description: 'A guide to choosing or changing your career for a lifetime of satisfaction.' },
  { title: 'Atomic Habits', author: 'James Clear', description: 'Build good habits that support your career goals.' },
];

const RESUME_TIPS = [
  { title: 'Tailor for each application', description: 'Customize your resume to match the job description keywords and requirements.' },
  { title: 'Quantify achievements', description: 'Use numbers: "Increased sales by 25%" is stronger than "Improved sales."' },
  { title: 'Use action verbs', description: 'Start bullets with strong verbs: Led, Developed, Implemented, Achieved.' },
  { title: 'Keep it concise', description: 'One page for <10 years experience, two pages max for senior roles.' },
  { title: 'ATS-friendly formatting', description: 'Use standard fonts, avoid tables/graphics, and include relevant keywords.' },
  { title: 'Proofread thoroughly', description: 'Typos can disqualify you. Read aloud and have someone else review it.' },
  { title: 'Highlight transferable skills', description: 'Emphasize skills that apply across industries when changing careers.' },
  { title: 'Include a strong summary', description: 'A 2-3 sentence professional summary at the top sets the tone.' },
];

export default function KnowledgeBase() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [careers, setCareers] = useState<OnetCareer[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<OnetCareerDetail | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [glossaryFilter, setGlossaryFilter] = useState('');

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSelectedCareer(null);
    try {
      const result = await searchCareers(searchQuery);
      setCareers(result.career || []);
      if ((result.career?.length || 0) === 0) toast.info('No careers found. Try different keywords.');
    } catch (error: any) {
      toast.error(error.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCareer = async (career: OnetCareer) => {
    setIsLoadingDetails(true);
    try {
      const details = await getCareerDetails(career.code);
      setSelectedCareer(details);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const filteredGlossary = glossaryFilter
    ? GLOSSARY_ITEMS.filter(item =>
        item.term.toLowerCase().includes(glossaryFilter.toLowerCase()) ||
        item.definition.toLowerCase().includes(glossaryFilter.toLowerCase())
      )
    : GLOSSARY_ITEMS;

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DashboardNav />

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Knowledge Base</h1>
                <p className="text-muted-foreground">Explore concepts, careers, resources, and tips</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="glossary" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="glossary" className="gap-1.5 text-xs sm:text-sm">
                <HelpCircle className="h-4 w-4" />
                What Is…
              </TabsTrigger>
              <TabsTrigger value="occupations" className="gap-1.5 text-xs sm:text-sm">
                <Briefcase className="h-4 w-4" />
                Occupations
              </TabsTrigger>
              <TabsTrigger value="education" className="gap-1.5 text-xs sm:text-sm">
                <GraduationCap className="h-4 w-4" />
                Education
              </TabsTrigger>
              <TabsTrigger value="reading" className="gap-1.5 text-xs sm:text-sm">
                <BookOpen className="h-4 w-4" />
                Reading
              </TabsTrigger>
              <TabsTrigger value="resume-tips" className="gap-1.5 text-xs sm:text-sm">
                <FileText className="h-4 w-4" />
                Resume Tips
              </TabsTrigger>
            </TabsList>

            {/* What Is… Glossary Tab */}
            <TabsContent value="glossary" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold mb-1">Key Concepts & Definitions</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Essential terms from the WorkReady360 framework to help you understand your career journey.
                  </p>
                  <Input
                    placeholder="Filter terms…"
                    value={glossaryFilter}
                    onChange={(e) => setGlossaryFilter(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                <Accordion type="multiple" className="space-y-2">
                  {filteredGlossary.map((item) => (
                    <AccordionItem key={item.term} value={item.term} className="border rounded-lg px-4">
                      <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                        {item.term}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground pb-4">
                        {item.definition}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {filteredGlossary.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">No matching terms found.</p>
                )}
              </div>

              {/* Work Tasks Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">The Four Work Tasks</h3>
                <p className="text-sm text-muted-foreground">
                  All occupations involve work with some combination of these four areas.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {WORK_TASKS.map((task) => (
                    <Card key={task.name}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{task.emoji}</span>
                          <div>
                            <h4 className="font-semibold text-sm mb-1">{task.name}</h4>
                            <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                            <p className="text-xs text-primary/70 italic">{task.examples}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Occupation Search Tab */}
            <TabsContent value="occupations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Search Occupations</CardTitle>
                  <CardDescription>Explore careers using the O*NET database</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleSearch} className="flex gap-2">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by job title, keyword, or skill..."
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isSearching}>
                      {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </form>

                  {careers.length > 0 && !selectedCareer && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {careers.map((career) => (
                        <button
                          key={career.code}
                          onClick={() => handleSelectCareer(career)}
                          className="w-full text-left p-3 rounded-lg border hover:border-primary/30 hover:bg-primary/5 transition-colors"
                        >
                          <p className="font-medium text-sm">{career.title}</p>
                          <p className="text-xs text-muted-foreground">{career.code}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {isLoadingDetails && (
                    <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  )}
                  {selectedCareer && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{selectedCareer.title}</h3>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCareer(null)}>Back to results</Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedCareer.description}</p>
                      {selectedCareer.what_they_do && (
                        <div>
                          <h4 className="font-medium text-sm mb-1">What They Do</h4>
                          <p className="text-sm text-muted-foreground">{selectedCareer.what_they_do}</p>
                        </div>
                      )}
                      {selectedCareer.outlook && (
                        <div className="flex flex-wrap gap-3">
                          {selectedCareer.outlook.salary?.annual_median && (
                            <Badge variant="secondary" className="gap-1"><DollarSign className="h-3 w-3" />${selectedCareer.outlook.salary.annual_median.toLocaleString()}/yr</Badge>
                          )}
                          {selectedCareer.outlook.description && (
                            <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" />{selectedCareer.outlook.description}</Badge>
                          )}
                        </div>
                      )}
                      {selectedCareer.skills && selectedCareer.skills.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Top Skills</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedCareer.skills.slice(0, 8).map((s) => (
                              <Badge key={s.name} variant="outline" className="text-xs">{s.name}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" onClick={() => navigate(`/podcast?occupation=${selectedCareer.code}&title=${encodeURIComponent(selectedCareer.title)}`)}>
                          🎙️ Generate Podcast
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={`https://www.onetonline.org/link/summary/${selectedCareer.code}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" /> View on O*NET
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Educational Resources Tab */}
            <TabsContent value="education" className="space-y-4">
              <h2 className="text-lg font-semibold">Educational Resources</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {EDUCATIONAL_RESOURCES.map((resource) => (
                  <a key={resource.title} href={resource.url} target="_blank" rel="noopener noreferrer">
                    <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-sm group-hover:text-primary transition-colors">{resource.title}</h3>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{resource.description}</p>
                        <Badge variant="secondary" className="text-xs">{resource.category}</Badge>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </TabsContent>

            {/* Recommended Reading Tab */}
            <TabsContent value="reading" className="space-y-4">
              <h2 className="text-lg font-semibold">Recommended Reading</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {RECOMMENDED_READING.map((book) => (
                  <Card key={book.title} className="h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{book.title}</h3>
                          <p className="text-xs text-primary/70 mb-1">by {book.author}</p>
                          <p className="text-xs text-muted-foreground">{book.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Resume Tips Tab */}
            <TabsContent value="resume-tips" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Resume Tips</h2>
                <Button size="sm" onClick={() => navigate('/resume')}>
                  <FileText className="h-4 w-4 mr-1" />
                  Build Your Resume
                </Button>
              </div>
              <div className="space-y-3">
                {RESUME_TIPS.map((tip, index) => (
                  <Card key={tip.title}>
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{tip.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
