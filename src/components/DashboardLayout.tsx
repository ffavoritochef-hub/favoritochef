'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Utensils, 
  FileText, 
  DollarSign, 
  LogOut,
  Menu as MenuIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard' },
  { title: 'Clientes', icon: Users, url: '/dashboard/clients' },
  { title: 'Eventos', icon: Calendar, url: '/dashboard/events' },
  { title: 'Agenda', icon: Calendar, url: '/dashboard/agenda' },
  { title: 'Cardápio', icon: Utensils, url: '/dashboard/menu' },
  { title: 'Orçamentos', icon: FileText, url: '/dashboard/budgets' },
  { title: 'Financeiro', icon: DollarSign, url: '/dashboard/finance' },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  console.log('DashboardLayout rendering:', { pathname, user, loading, children });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
  
  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/50 backdrop-blur-xl flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold neon-glow text-white tracking-tighter">Agenda Buffet</h2>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.url;
            
            return (
              <Link 
                key={item.title}
                href={item.url}
                className={`
                  flex items-center gap-3 p-3 rounded-lg transition-all duration-200 w-full
                  ${isActive 
                    ? 'bg-primary/20 text-primary neon-border' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'}
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-6 border-t border-white/10">
          <Button 
            variant="ghost" 
            onClick={() => signOut()}
            className="w-full flex items-center justify-start gap-3 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </Button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-10 relative">
             {/* Background Neon Orbs */}
            <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] -z-10" />
            <div className="fixed bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px] -z-10" />
            {children}
          </div>
      </main>
    </div>
  );
}
