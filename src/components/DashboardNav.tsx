import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FileText, BarChart3, Mic, BookOpen, Compass, User } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { label: 'My Summary', href: '/summary', icon: User },
  { label: 'Resume', href: '/resume', icon: FileText },
  { label: 'Podcasts', href: '/podcast', icon: Mic },
  { label: 'Careers', href: '/careers', icon: Compass },
  { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
];

export default function DashboardNav() {
  const { pathname } = useLocation();

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm">
      <div className="px-6 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
