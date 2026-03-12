import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardNav from '@/components/DashboardNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Save, Lock, Check, ArrowLeft, Linkedin, Globe, Twitter, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MASCOTS } from '@/lib/mascots';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const topRef = useRef<HTMLDivElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [mascotChoice, setMascotChoice] = useState('default');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Unsaved changes guard
  const [pendingNavPath, setPendingNavPath] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setDisplayName(p.full_name || '');
      setZipCode(p.zip_code || '');
      setNotifications(p.notifications_enabled ?? true);
      setStreetAddress(p.street_address || '');
      setCity(p.city || '');
      setState(p.state || '');
      setPhone(p.phone || '');
      setMascotChoice(p.mascot_choice || 'default');
      setLinkedinUrl(p.linkedin_url || '');
      setTwitterUrl(p.twitter_url || '');
      setWebsiteUrl(p.website_url || '');
      setAvatarUrl(p.avatar_url || null);
    }
  }, [profile]);

  // Detect unsaved changes
  const hasChanges = useMemo(() => {
    if (!profile) return false;
    const p = profile as any;
    return (
      displayName !== (p.full_name || '') ||
      streetAddress !== (p.street_address || '') ||
      city !== (p.city || '') ||
      state !== (p.state || '') ||
      zipCode !== (p.zip_code || '') ||
      phone !== (p.phone || '') ||
      notifications !== (p.notifications_enabled ?? true) ||
      mascotChoice !== (p.mascot_choice || 'default') ||
      linkedinUrl !== (p.linkedin_url || '') ||
      twitterUrl !== (p.twitter_url || '') ||
      websiteUrl !== (p.website_url || '')
    );
  }, [profile, displayName, streetAddress, city, state, zipCode, phone, notifications, mascotChoice, linkedinUrl, twitterUrl, websiteUrl]);

  // Browser beforeunload guard
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasChanges]);

  const guardedNavigate = useCallback((path: string) => {
    if (hasChanges) {
      setPendingNavPath(path);
    } else {
      navigate(path);
    }
  }, [hasChanges, navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: displayName.trim() || null,
          street_address: streetAddress.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
          phone: phone.trim() || null,
          notifications_enabled: notifications,
          mascot_choice: mascotChoice,
          linkedin_url: linkedinUrl.trim() || null,
          twitter_url: twitterUrl.trim() || null,
          website_url: websiteUrl.trim() || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Settings saved!');
      // Scroll to top after save
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password updated!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setChangingPw(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      // Bust cache by appending timestamp
      const freshUrl = `${publicUrl}?t=${Date.now()}`;
      await supabase.from('profiles').update({ avatar_url: freshUrl, updated_at: new Date().toISOString() } as any).eq('user_id', user.id);
      setAvatarUrl(freshUrl);
      toast.success('Profile image updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : (profile?.email?.[0] || '?').toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />
      <div ref={topRef} className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => guardedNavigate('/dashboard')} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          {hasChanges && (
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Unsaved changes</span>
          )}
        </div>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <div className="relative group">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    {uploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                    <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  </label>
                </div>
                <button
                  onClick={() => document.querySelector<HTMLInputElement>('#avatar-upload')?.click()}
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                </button>
                <input id="avatar-upload" type="file" accept="image/*" className="sr-only" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input id="displayName" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your display name" />
                </div>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Address & Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Address & Contact</CardTitle>
            <CardDescription>Your contact information for personalized career insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input id="street" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} placeholder="123 Main St" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="Springfield" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={state} onChange={e => setState(e.target.value)} placeholder="IL" maxLength={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">Zip Code</Label>
                <Input id="zip" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="62701" maxLength={10} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Social Links</CardTitle>
            <CardDescription>Connect your profiles to personalize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2">
                <Linkedin className="h-4 w-4" /> LinkedIn URL
              </Label>
              <Input id="linkedin" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/yourprofile" />
              <p className="text-xs text-muted-foreground">We'll import your work history & skills to personalize your podcast</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter" className="flex items-center gap-2">
                <Twitter className="h-4 w-4" /> X / Twitter
              </Label>
              <Input id="twitter" value={twitterUrl} onChange={e => setTwitterUrl(e.target.value)} placeholder="https://x.com/yourhandle" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" /> Personal Website
              </Label>
              <Input id="website" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://yoursite.com" />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">Get updates about new features and career insights</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </CardContent>
        </Card>

        {/* AI Mascot Picker */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Choose Your AI Agent</CardTitle>
            <CardDescription>Pick a mascot that represents your career vibe!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-4">
              {MASCOTS.map((mascot) => (
                <button
                  key={mascot.id}
                  onClick={() => setMascotChoice(mascot.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all hover:scale-105',
                    mascotChoice === mascot.id
                      ? 'border-accent bg-accent/10 shadow-md'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  <img src={mascot.src} alt={mascot.label} className="h-20 w-20 object-contain" />
                  <span className="text-xs font-medium text-foreground leading-tight text-center">{mascot.label}</span>
                  {mascotChoice === mascot.id && (
                    <div className="absolute -top-1.5 -right-1.5 bg-accent text-accent-foreground rounded-full p-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-4 w-4" /> Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPw">New Password</Label>
              <Input id="newPw" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPw">Confirm Password</Label>
              <Input id="confirmPw" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPw || !newPassword} variant="outline">
              {changingPw ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-8">
          <Button onClick={handleSaveProfile} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>

      {/* Unsaved changes dialog */}
      <AlertDialog open={!!pendingNavPath} onOpenChange={(open) => { if (!open) setPendingNavPath(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingNavPath) navigate(pendingNavPath); }}>
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
