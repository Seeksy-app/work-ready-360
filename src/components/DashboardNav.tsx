import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FileText, BarChart3, Mic, BookOpen, Compass, User, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getMascotSrc } from '@/lib/mascots';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: BarChart3, requiresPodcast: false },
  { label: 'My Summary', href: '/summary', icon: User, requiresPodcast: true },
  { label: 'Resume', href: '/resume', icon: FileText, requiresPodcast: false },
  { label: 'Podcasts', href: '/podcast', icon: Mic, requiresPodcast: true },
  { label: 'Careers', href: '/careers', icon: Compass, requiresPodcast: false },
  { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen, requiresPodcast: false },
];

export default function DashboardNav() {
  const { pathname } = useLocation();
  const { user, profile } = useAuth();
  const [hasPodcast, setHasPodcast] = useState(false);

  const mascotChoice = (profile as any)?.mascot_choice || 'default';
  const mascotSrc = MASCOT_MAP[mascotChoice] || mascotDefault;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('podcasts')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .limit(1)
      .then(({ data }) => setHasPodcast((data?.length || 0) > 0));
  }, [user]);

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm flex items-center">
      <div className="px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const locked = item.requiresPodcast && !hasPodcast;

          if (locked) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <span
                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 border-transparent text-muted-foreground/50 cursor-not-allowed"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Complete your assessments and generate a podcast first</TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Settings avatar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/settings" className="shrink-0 pr-4 pl-2 py-1.5">
            <Avatar className="h-8 w-8 border-2 border-border hover:border-accent transition-colors cursor-pointer">
              <AvatarImage src={mascotSrc} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                <Settings className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Link>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
    </nav>
  );
}
