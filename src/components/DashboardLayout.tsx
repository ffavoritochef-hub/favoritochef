'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { BlockedScreen } from '@/components/AccessGate';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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
  HardHat,
  Settings,
  UtensilsCrossed,
  Inbox,
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
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard' },
  { title: 'Leads', icon: Inbox, url: '/dashboard/leads' },
  { title: 'Clientes', icon: Users, url: '/dashboard/clients' },
  { title: 'Eventos', icon: Calendar, url: '/dashboard/events' },
  { title: 'Agenda', icon: Calendar, url: '/dashboard/agenda' },
  { title: 'Funcionários', icon: HardHat, url: '/dashboard/employees' },
  { title: 'Cardápio', icon: Utensils, url: '/dashboard/menu' },
  { title: 'Orçamentos', icon: FileText, url: '/dashboard/budgets' },
  { title: 'Financeiro', icon: DollarSign, url: '/dashboard/finance' },
  { title: 'Configurações', icon: Settings, url: '/dashboard/settings' },
];

const isRouteActive = (pathname: string, url: string) =>
  url === '/dashboard' ? pathname === url : pathname === url || pathname.startsWith(url + '/');

const bottomNavItems = [
  { title: 'Início', icon: Home, url: '/dashboard' },
  { title: 'Eventos', icon: Calendar, url: '/dashboard/events' },
  { title: 'Clientes', icon: Users, url: '/dashboard/clients' },
  { title: 'Orçamentos', icon: FileText, url: '/dashboard/budgets' },
  { title: 'Mais', icon: MoreHorizontal, url: '#more' },
];

/** Quantidade de leads "novo"; avisa quando chega um pedido. */
function useNewLeads(enabled: boolean) {
  const [count, setCount] = useState(0);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const load = async () => {
      const { count: c, error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'novo');
      if (!alive || error || c === null) return;
      if (last.current !== null && c > last.current) {
        toast.success(c - last.current === 1 ? 'Novo pedido de orçamento!' : `${c - last.current} novos pedidos de orçamento!`, {
          action: { label: 'Ver', onClick: () => (window.location.href = '/dashboard/leads') },
        });
      }
      last.current = c;
      setCount(c);
    };
    load();
    const id = setInterval(load, 60000);
    window.addEventListener('focus', load);
    return () => {
      alive = false;
      clearInterval(id);
      window.removeEventListener('focus', load);
    };
  }, [enabled]);

  return count;
}

const CountBadge = ({ n, className }: { n: number; className?: string }) =>
  n > 0 ? (
    <span className={cn('min-w-5 h-5 px-1.5 rounded-full bg-destructive text-white text-[11px] font-bold leading-5 text-center', className)}>
      {n > 99 ? '99+' : n}
    </span>
  ) : null;

function SidebarContent({
  onNavigate,
  newLeads = 0,
}: {
  onNavigate?: () => void;
  newLeads?: number;
}) {
  const { signOut, user } = useAuth();
  const { tenant } = useTenant();
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-5 sm:p-6 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          {tenant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={tenant.name} className="w-11 h-11 rounded-xl object-contain bg-white border border-border shrink-0" />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
          )}
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight line-clamp-2">
            {tenant?.name || 'Agenda Buffet'}
          </h2>
        </div>
      </div>

      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = isRouteActive(pathname, item.url);

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
              {item.url === '/dashboard/leads' && <CountBadge n={newLeads} className="ml-auto" />}
              {isActive && <ChevronRight className={cn('w-4 h-4 shrink-0 opacity-80', !(item.url === '/dashboard/leads' && newLeads > 0) && 'ml-auto')} />}
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
  const { access, tenant } = useTenant();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const newLeads = useNewLeads(!!user && access === 'ativo');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (access === 'master') router.replace('/master');
  }, [access, router]);

  if (loading || access === 'loading' || access === 'master')
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );

  if (!user) return null;

  if (access !== 'ativo') return <BlockedScreen />;

  return (
    <div className="flex min-h-screen w-full bg-background text-slate-900">
      <aside className="hidden md:flex w-64 border-r border-border bg-white flex-col shrink-0 sticky top-0 h-screen">
        <SidebarContent newLeads={newLeads} />
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
              className="w-[85%] data-[side=left]:max-w-[320px] p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-white border-r border-border"
              showCloseButton={true}
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <SidebarContent newLeads={newLeads} onNavigate={() => setMobileMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex-1 min-w-0 px-2">
            <h1 className="font-bold text-base truncate">
              {tenant?.name || 'Agenda Buffet'}
            </h1>
            <p className="text-xs text-white/80 truncate">Olá, {user.email?.split('@')[0]}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button asChild variant="ghost" size="icon" className="relative text-white hover:bg-white/10 h-10 w-10">
              <Link href="/dashboard/leads" aria-label={newLeads > 0 ? `${newLeads} leads novos` : 'Leads'}>
                <Bell className="w-5 h-5" />
                <CountBadge n={newLeads} className="absolute -top-0.5 -right-0.5 ring-2 ring-primary" />
              </Link>
            </Button>
          </div>
        </header>

        <div className={cn(
          "flex-1 relative w-full",
          isMobile ? "pb-20 pt-4 px-3 max-w-full" : "p-6 lg:p-8 mx-auto w-full max-w-[1600px]"
        )}>
          {children}
        </div>

        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border shadow-[0_-2px_8px_rgba(15,23,42,0.04)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-center justify-around h-16 px-1">
              {bottomNavItems.map((item) => {
                const Icon = item.icon;
                const isMore = item.url === '#more';
                const isActive = !isMore && isRouteActive(pathname, item.url);
                const cls = cn(
                  'flex flex-col items-center justify-center gap-0.5 h-full flex-1 min-w-0 transition-colors',
                  isActive ? 'text-primary' : 'text-slate-400'
                );
                const inner = (
                  <>
                    <span className="relative">
                      <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-primary' : '')} />
                      {isMore && newLeads > 0 && <span className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-destructive ring-2 ring-white" />}
                    </span>
                    <span className={cn('text-[10px] font-semibold truncate max-w-full px-1', isActive ? 'text-primary' : '')}>
                      {item.title}
                    </span>
                  </>
                );
                return isMore ? (
                  <button key={item.title} type="button" className={cls} onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu completo">
                    {inner}
                  </button>
                ) : (
                  <Link key={item.title} href={item.url} className={cls} aria-current={isActive ? 'page' : undefined}>
                    {inner}
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
