import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Linkedin, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PreGeneratePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasResume: boolean;
  hasLinkedIn: boolean;
  userId: string;
  onContinue: () => void;
}

export default function PreGeneratePrompt({
  open,
  onOpenChange,
  hasResume,
  hasLinkedIn,
  userId,
  onContinue,
}: PreGeneratePromptProps) {
  const navigate = useNavigate();
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);

  const handleEnrichLinkedIn = async () => {
    if (!linkedinUrl.trim()) return;
    setIsEnriching(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkedin-enrich`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ linkedinUrl: linkedinUrl.trim(), userId }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to enrich LinkedIn profile');
      }

      toast.success('LinkedIn profile imported successfully!');
      onOpenChange(false);
      onContinue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to import LinkedIn profile');
    } finally {
      setIsEnriching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✨ Make Your Podcast Even Better
          </DialogTitle>
          <DialogDescription>
            Adding your resume or LinkedIn profile helps us create a more personalized and
            insightful career podcast tailored to your experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Resume */}
          {!hasResume && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Upload Resume</p>
                <p className="text-xs text-muted-foreground">
                  Your work history helps personalize the podcast
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate('/resume');
                }}
              >
                Upload
              </Button>
            </div>
          )}

          {/* LinkedIn */}
          {!hasLinkedIn && (
            <div className="space-y-2 p-3 rounded-lg border border-dashed">
              <div className="flex items-center gap-3">
                <Linkedin className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Add LinkedIn Profile</p>
                  <p className="text-xs text-muted-foreground">
                    We'll import your career history and skills
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleEnrichLinkedIn}
                  disabled={!linkedinUrl.trim() || isEnriching}
                >
                  {isEnriching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Import'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              onContinue();
            }}
            className="text-muted-foreground"
          >
            Skip & Generate Anyway
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
