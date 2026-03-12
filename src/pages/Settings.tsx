import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardNav from '@/components/DashboardNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Save, Lock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import mascotDefault from '@/assets/agent360-mascot.png';
import mascotChef from '@/assets/mascots/mascot-chef.png';
import mascotNurse from '@/assets/mascots/mascot-nurse.png';
import mascotEngineer from '@/assets/mascots/mascot-engineer.png';
import mascotGraduate from '@/assets/mascots/mascot-graduate.png';
import mascotArtist from '@/assets/mascots/mascot-artist.png';
import mascotBusiness from '@/assets/mascots/mascot-business.png';
import mascotScientist from '@/assets/mascots/mascot-scientist.png';

const MASCOTS = [
  { id: 'default', label: 'Agent 360', src: mascotDefault },
  { id: 'chef', label: 'Chef', src: mascotChef },
  { id: 'nurse', label: 'Healthcare', src: mascotNurse },
  { id: 'engineer', label: 'Engineer', src: mascotEngineer },
  { id: 'graduate', label: 'Graduate', src: mascotGraduate },
  { id: 'artist', label: 'Artist', src: mascotArtist },
  { id: 'business', label: 'Business', src: mascotBusiness },
  { id: 'scientist', label: 'Scientist', src: mascotScientist },
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [mascotChoice, setMascotChoice] = useState('default');
  const [saving, setSaving] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setZipCode(p.zip_code || '');
      setNotifications(p.notifications_enabled ?? true);
      setStreetAddress(p.street_address || '');
      setCity(p.city || '');
      setState(p.state || '');
      setPhone(p.phone || '');
      setMascotChoice(p.mascot_choice || 'default');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          street_address: streetAddress.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          zip_code: zipCode.trim() || null,
          phone: phone.trim() || null,
          notifications_enabled: notifications,
          mascot_choice: mascotChoice,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Settings saved!');
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
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={MASCOTS.find(m => m.id === mascotChoice)?.src} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{profile?.full_name || 'Your Profile'}</CardTitle>
                <CardDescription>{profile?.email}</CardDescription>
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
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {MASCOTS.map((mascot) => (
                <button
                  key={mascot.id}
                  onClick={() => setMascotChoice(mascot.id)}
                  className={cn(
                    'relative flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all hover:scale-105',
                    mascotChoice === mascot.id
                      ? 'border-accent bg-accent/10 shadow-md'
                      : 'border-border hover:border-accent/50'
                  )}
                >
                  <img src={mascot.src} alt={mascot.label} className="h-14 w-14 object-contain" />
                  <span className="text-[10px] font-medium text-foreground leading-tight text-center">{mascot.label}</span>
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
    </div>
  );
}
