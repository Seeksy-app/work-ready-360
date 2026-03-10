import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, CheckCircle2, Linkedin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export default function ProfileSheet({ open, onOpenChange, onSaved }: ProfileSheetProps) {
  const { user, profile } = useAuth();
  const [zipCode, setZipCode] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useEffect(() => {
    if (profile) {
      setZipCode((profile as any)?.zip_code || '');
      setLinkedinUrl((profile as any)?.linkedin_url || '');
      setNotifications((profile as any)?.notifications_enabled ?? true);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    if (!zipCode.trim()) {
      toast.error('Please enter your zip code');
      return;
    }

    setSaving(true);
    try {
      const updates: Record<string, any> = {
        zip_code: zipCode.trim(),
        notifications_enabled: notifications,
        updated_at: new Date().toISOString(),
      };

      if (linkedinUrl.trim()) {
        updates.linkedin_url = linkedinUrl.trim();
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      // If LinkedIn URL provided, trigger enrichment
      if (linkedinUrl.trim() && linkedinUrl.includes('linkedin.com')) {
        setEnriching(true);
        try {
          const resp = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkedin-enrich`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ linkedinUrl: linkedinUrl.trim(), userId: user.id }),
            }
          );
          if (resp.ok) {
            toast.success('LinkedIn profile imported!');
          }
        } catch {
          // non-blocking
        } finally {
          setEnriching(false);
        }
      }

      toast.success('Profile saved!');
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Complete Your Profile</SheetTitle>
          <SheetDescription>
            Add your location and optional LinkedIn to personalize your experience.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Zip Code */}
          <div className="space-y-2">
            <Label htmlFor="zip">Zip Code *</Label>
            <Input
              id="zip"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="e.g. 90210"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">Used for local weather and job market data</p>
          </div>

          {/* LinkedIn URL */}
          <div className="space-y-2">
            <Label htmlFor="linkedin" className="flex items-center gap-2">
              <Linkedin className="h-4 w-4" />
              LinkedIn URL
            </Label>
            <Input
              id="linkedin"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
            <p className="text-xs text-muted-foreground">
              Optional — we'll import your work history & skills to personalize your podcast
            </p>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Get updates about new features</p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || enriching}
            className="w-full"
          >
            {saving || enriching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {enriching ? 'Importing LinkedIn...' : 'Saving...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
