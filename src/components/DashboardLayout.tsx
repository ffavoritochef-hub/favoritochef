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
  Bell,
  User,
  ChevronRight,
  Home,
  MoreHorizontal,
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

const bottomNavItems = [
  { title: 'Início', icon: Home, url: '/dashboard' },
  { title: 'Eventos', icon: Calendar, url: '/dashboard/events' },
  { title: 'Clientes', icon: Users, url: '/dashboard/clients' },
  { title: 'Orçamentos', icon: FileText, url: '/dashboard/budgets' },
  { title: 'Mais', icon: MoreHorizontal, url: '/dashboard/menu' },
];

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { signOut, user } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-5 sm:p-6 border-b border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
          Agenda Buffet
        </h2>
      </div>

      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.url;

          return (
            <Link
              key={item.title}
              href={item.url}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl transition-all duration-200 w-full min-h-[48px]',
                isActive
                  ? 'bg-primary text-white shadow-sm shadow-primary/20'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : '')} />
              <span className="font-medium text-sm">{item.title}</span>
              {isActive && <ChevronRight className="w-4 h-4 ml-auto shrink-0 opacity-80" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 sm:p-6 border-t border-border space-y-3">
        {user && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          onClick={() => signOut()}
          className="w-full flex items-center justify-start gap-3 text-slate-600 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-all min-h-[48px] py-3 border-slate-200"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm">Sair</span>
        </Button>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );

  if (!user) return null;

  return (
    <div className="flex min-h-screen w-full bg-background text-slate-900">
      <aside className="hidden md:flex w-64 border-r border-border bg-white flex-col shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      <main className="flex-1 overflow-y-auto min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-30 bg-primary text-white px-4 py-3 flex items-center justify-between min-h-[56px] shadow-sm">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-11 w-11 shrink-0">
                <MenuIcon className="w-6 h-6" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[85%] max-w-[320px] p-0 bg-white border-r border-border"
              showCloseButton={true}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1 min-w-0 px-2">
            <h1 className="font-bold text-base truncate">
              Olá, {user.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-xs text-white/80 truncate">Bem-vindo ao seu sistema</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-10 w-10">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className={cn(
          "flex-1 relative w-full max-w-full",
          isMobile ? "pb-20 pt-4 px-3" : "p-6 lg:p-8"
        )}>
          {children}
        </div>

        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-[0_-2px_8px_rgba(15,23,42,0.04)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-center justify-around h-16 px-1">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    href={item.url}
                    className={cn(
                      'flex flex-col items-center justify-center gap-0.5 h-full flex-1 min-w-0 transition-colors',
                      isActive ? 'text-primary' : 'text-slate-400'
                    )}
                  >
                    <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-primary' : '')} />
                    <span className={cn('text-[10px] font-semibold truncate max-w-full px-1', isActive ? 'text-primary' : '')}>
                      {item.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}
