import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import logo360 from '@/assets/logo-360.jpg';
import mascot from '@/assets/agent360-mascot.png';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, PanelRightClose } from 'lucide-react';
import DashboardNav from '@/components/DashboardNav';
import AgentChat from '@/components/AgentChat';
import { useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b bg-accent backdrop-blur-sm sticky top-0 z-50">
          <div className="px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/dashboard">
                <img src={logo360} alt="WorkReady360" className="h-10 w-10 rounded object-contain" />
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="text-accent-foreground hover:bg-accent-foreground/10">Admin</Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChatOpen(!chatOpen)}
                className="md:hidden text-accent-foreground hover:bg-accent-foreground/10"
              >
                {chatOpen ? <PanelRightClose className="h-4 w-4" /> : <img src={mascot} alt="Chat" className="h-5 w-5 rounded-full" />}
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {profile?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline text-accent-foreground">
                  {profile?.full_name || user?.email}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} className="text-accent-foreground hover:bg-accent-foreground/10">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <DashboardNav />

        <main className="flex-1 overflow-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Chat sidebar */}
      <aside className={`${chatOpen ? 'block' : 'hidden'} md:block w-80 border-l bg-card flex-shrink-0`}>
        <AgentChat />
      </aside>
    </div>
  );
}
