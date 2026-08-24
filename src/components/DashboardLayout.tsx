'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Utensils,
  FileText,
  DollarSign,
  LogOut,
  Menu as MenuIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard' },
  { title: 'Clientes', icon: Users, url: '/dashboard/clients' },
  { title: 'Eventos', icon: Calendar, url: '/dashboard/events' },
  { title: 'Agenda', icon: Calendar, url: '/dashboard/agenda' },
  { title: 'Cardápio', icon: Utensils, url: '/dashboard/menu' },
  { title: 'Orçamentos', icon: FileText, url: '/dashboard/budgets' },
  { title: 'Financeiro', icon: DollarSign, url: '/dashboard/finance' },
];

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { signOut } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="p-4 sm:p-6 border-b border-white/10">
        <h2 className="text-xl sm:text-2xl font-bold neon-glow text-white tracking-tighter">
          Agenda Buffet
        </h2>
      </div>

      <nav className="flex-1 p-3 sm:p-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.url;

          return (
            <Link
              key={item.title}
              href={item.url}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 p-3.5 sm:p-3 rounded-lg transition-all duration-200 w-full min-h-[48px]',
                isActive
                  ? 'bg-primary/20 text-primary neon-border'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-5 h-5 sm:w-5 sm:h-5 shrink-0', isActive ? 'text-primary' : '')} />
              <span className="font-medium text-base sm:text-sm">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 sm:p-6 border-t border-white/10">
        <Button
          variant="ghost"
          onClick={() => signOut()}
          className="w-full flex items-center justify-start gap-3 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-all min-h-[48px] py-3"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium text-base sm:text-sm">Sair</span>
        </Button>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );

  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full bg-black text-white">
      {/* Sidebar DESKTOP: só mostra em md pra cima */}
      <aside className="hidden md:flex w-64 border-r border-white/10 bg-black/50 backdrop-blur-xl flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Barra superior MOBILE: só mostra abaixo de md */}
        <header className="md:hidden sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between min-h-[56px]">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-11 w-11 shrink-0">
                <MenuIcon className="w-6 h-6" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[85%] max-w-[320px] p-0 bg-black border-r border-white/10"
              showCloseButton={true}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <h1 className="font-bold neon-glow text-sm sm:text-base tracking-tight text-white truncate px-2">
            Agenda Buffet
          </h1>
          <div className="w-11 shrink-0" />
        </header>

        <div className="p-4 sm:p-6 lg:p-8 relative pb-20 sm:pb-8">
          {/* Background Neon Orbs */}
          <div className="fixed top-[-20%] right-[-10%] w-[60%] h-[50%] bg-primary/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
          <div className="fixed bottom-[-20%] left-[-10%] w-[60%] h-[50%] bg-primary/5 rounded-full blur-[150px] -z-10 pointer-events-none" />
          {children}
        </div>
      </main>
    </div>
  );
}
