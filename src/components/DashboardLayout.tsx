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
  Bell,
  User,
  ChevronRight,
  ChevronLeft,
  Home,
  LayoutGrid,
  HardHat,
  Settings,
  UtensilsCrossed,
  Inbox,
  Plus,
  CalendarDays,
  UserPlus,
  Receipt,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, url: '/dashboard', tone: 'bg-blue-50 text-blue-600' },
  { title: 'Leads', icon: Inbox, url: '/dashboard/leads', tone: 'bg-rose-50 text-rose-600' },
  { title: 'Clientes', icon: Users, url: '/dashboard/clients', tone: 'bg-sky-50 text-sky-600' },
  { title: 'Eventos', icon: Calendar, url: '/dashboard/events', tone: 'bg-indigo-50 text-indigo-600' },
  { title: 'Agenda', icon: CalendarDays, url: '/dashboard/agenda', tone: 'bg-violet-50 text-violet-600' },
  { title: 'Funcionários', icon: HardHat, url: '/dashboard/employees', tone: 'bg-amber-50 text-amber-600' },
  { title: 'Cardápio', icon: Utensils, url: '/dashboard/menu', tone: 'bg-orange-50 text-orange-600' },
  { title: 'Orçamentos', icon: FileText, url: '/dashboard/budgets', tone: 'bg-emerald-50 text-emerald-600' },
  { title: 'Vitrine', icon: Store, url: '/dashboard/vitrine', tone: 'bg-fuchsia-50 text-fuchsia-600' },
  { title: 'Financeiro', icon: DollarSign, url: '/dashboard/finance', tone: 'bg-green-50 text-green-600' },
  { title: 'Configurações', icon: Settings, url: '/dashboard/settings', tone: 'bg-slate-100 text-slate-600' },
];

const isRouteActive = (pathname: string, url: string) =>
  url === '/dashboard' ? pathname === url : pathname === url || pathname.startsWith(url + '/');

/** Abas da barra inferior (mobile). O botão "+" central fica entre a 2ª e a 3ª. */
const tabItems = [
  { title: 'Início', icon: Home, url: '/dashboard' },
  { title: 'Eventos', icon: Calendar, url: '/dashboard/events' },
  { title: 'Orçamentos', icon: FileText, url: '/dashboard/budgets' },
];

const createActions = [
  { title: 'Novo evento', desc: 'Agendar um buffet', icon: CalendarDays, url: '/dashboard/events/new', tone: 'bg-indigo-50 text-indigo-600' },
  { title: 'Novo orçamento', desc: 'Montar proposta', icon: FileText, url: '/dashboard/budgets/new', tone: 'bg-emerald-50 text-emerald-600' },
  { title: 'Novo cliente', desc: 'Cadastrar contato', icon: UserPlus, url: '/dashboard/clients/new', tone: 'bg-sky-50 text-sky-600' },
  { title: 'Lançamento', desc: 'Conta a pagar/receber', icon: Receipt, url: '/dashboard/finance/new', tone: 'bg-green-50 text-green-600' },
];

/** Vibração curtinha ao tocar (Android/TWA); ignorada onde não existe. */
const haptic = () => {
  try {
    navigator.vibrate?.(8);
  } catch {}
};

/** Arrastar para baixo fecha o bottom sheet (só quando o conteúdo está no topo). */
function useSwipeToClose(onClose: () => void) {
  const startY = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  return {
    style: dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined,
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
      startY.current = e.currentTarget.scrollTop <= 0 ? e.touches[0].clientY : null;
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (startY.current === null) return;
      setDy(Math.max(0, e.touches[0].clientY - startY.current));
    },
    onTouchEnd: () => {
      if (dy > 90) onClose();
      startY.current = null;
      setDy(0);
    },
  };
}

const SheetHandle = () => <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-slate-200" aria-hidden />;

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

/** Menu completo do mobile: grade de "apps" num bottom sheet. */
function MoreSheet({ open, onOpenChange, newLeads }: { open: boolean; onOpenChange: (v: boolean) => void; newLeads: number }) {
  const { signOut, user } = useAuth();
  const { tenant } = useTenant();
  const pathname = usePathname();
  const swipe = useSwipeToClose(() => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="md:hidden gap-0 rounded-t-[28px] border-0 pt-3 px-4 bg-white"
        {...swipe}
      >
        <SheetHandle />
        <SheetHeader className="sr-only">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Todas as áreas do sistema</SheetDescription>
        </SheetHeader>

        {user && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-primary-dark p-4 text-white shadow-lg shadow-primary/25">
            <div className="size-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold uppercase shrink-0">
              {(user.email || '?')[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{user.email?.split('@')[0]}</p>
              <p className="text-xs text-white/75 truncate">{tenant?.name || user.email}</p>
            </div>
            <Link
              href="/dashboard/settings"
              onClick={() => onOpenChange(false)}
              className="size-10 rounded-full bg-white/15 flex items-center justify-center shrink-0"
              aria-label="Configurações"
            >
              <Settings className="size-5" />
            </Link>
          </div>
        )}

        <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(pathname, item.url);
            return (
              <Link
                key={item.url}
                href={item.url}
                onClick={() => {
                  haptic();
                  onOpenChange(false);
                }}
                className="flex flex-col items-center gap-1.5 min-w-0"
              >
                <span
                  className={cn(
                    'relative size-14 rounded-2xl flex items-center justify-center transition',
                    item.tone,
                    active && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  <Icon className="size-6" />
                  {item.url === '/dashboard/leads' && <CountBadge n={newLeads} className="absolute -top-1.5 -right-1.5 ring-2 ring-white" />}
                </span>
                <span className={cn('text-[11px] leading-tight text-center truncate max-w-full', active ? 'font-bold text-primary' : 'font-medium text-slate-600')}>
                  {item.title === 'Dashboard' ? 'Início' : item.title === 'Configurações' ? 'Ajustes' : item.title}
                </span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="mt-6 mb-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3.5 text-sm font-semibold text-destructive"
        >
          <LogOut className="size-5" /> Sair da conta
        </button>
      </SheetContent>
    </Sheet>
  );
}

/** Ações rápidas do botão "+" central. */
function CreateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const swipe = useSwipeToClose(() => onOpenChange(false));
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="md:hidden gap-0 rounded-t-[28px] border-0 pt-3 px-4 bg-white" {...swipe}>
        <SheetHandle />
        <SheetHeader className="mt-3 px-1">
          <SheetTitle className="text-lg">Criar novo</SheetTitle>
          <SheetDescription className="text-sm">O que você quer adicionar agora?</SheetDescription>
        </SheetHeader>
        <div className="mt-4 mb-1 grid grid-cols-2 gap-3">
          {createActions.map((a) => (
            <Link
              key={a.url}
              href={a.url}
              onClick={() => {
                haptic();
                onOpenChange(false);
              }}
              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-card"
            >
              <span className={cn('size-11 rounded-xl flex items-center justify-center', a.tone)}>
                <a.icon className="size-6" />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">{a.title}</span>
                <span className="block text-xs text-slate-500">{a.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { access, tenant } = useTenant();
  const router = useRouter();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const newLeads = useNewLeads(!!user && access === 'ativo');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (access === 'master') router.replace('/master');
  }, [access, router]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (loading || access === 'loading' || access === 'master')
    return (
      <div className="flex flex-col items-center justify-center gap-5 min-h-screen bg-background">
        <div className="size-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 animate-pulse">
          <UtensilsCrossed className="size-8 text-white" />
        </div>
        <div className="h-1 w-24 overflow-hidden rounded-full bg-primary/10">
          <div className="loading-bar h-full w-1/2 rounded-full bg-primary" />
        </div>
      </div>
    );

  if (!user) return null;

  if (access !== 'ativo') return <BlockedScreen />;

  // seção atual (a mais específica) e se estamos numa subpágina (detalhe/novo/editar)
  const section = menuItems
    .filter((m) => isRouteActive(pathname, m.url))
    .sort((a, b) => b.url.length - a.url.length)[0];
  const isHome = pathname === '/dashboard';
  const isSubpage = !!section && pathname !== section.url;
  const firstName = user.email?.split('@')[0] || '';

  const goBack = () => {
    haptic();
    if (window.history.length > 1) router.back();
    else router.push(section?.url || '/dashboard');
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-slate-900">
      <aside className="hidden md:flex w-64 border-r border-border bg-white flex-col shrink-0 sticky top-0 h-screen">
        <SidebarContent newLeads={newLeads} />
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior estilo app */}
        <header
          className={cn(
            'md:hidden sticky top-0 z-30 bg-primary text-white transition-shadow duration-300',
            scrolled && 'shadow-lg shadow-primary/25'
          )}
        >
          <div className="flex items-center gap-2 h-14 px-2">
            {isSubpage ? (
              <button type="button" onClick={goBack} className="size-11 rounded-full flex items-center justify-center active:bg-white/15 shrink-0" aria-label="Voltar">
                <ChevronLeft className="size-6" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  haptic();
                  setMoreOpen(true);
                }}
                className="ml-1 size-10 rounded-xl bg-white/15 ring-1 ring-white/25 overflow-hidden flex items-center justify-center shrink-0"
                aria-label="Abrir menu"
              >
                {tenant?.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tenant.logo_url} alt="" className="size-full object-contain bg-white" />
                ) : (
                  <UtensilsCrossed className="size-5" />
                )}
              </button>
            )}

            <div className="flex-1 min-w-0 px-1.5">
              {isHome ? (
                <>
                  <p className="text-[11px] leading-tight text-white/70 truncate">Olá, {firstName} 👋</p>
                  <p className="font-bold text-[15px] leading-tight truncate">{tenant?.name || 'Agenda Buffet'}</p>
                </>
              ) : (
                <p key={pathname} className="font-bold text-[17px] truncate animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
                  {section?.title || 'Agenda Buffet'}
                </p>
              )}
            </div>

            <Link
              href="/dashboard/leads"
              onClick={haptic}
              className="relative size-11 rounded-full flex items-center justify-center active:bg-white/15 shrink-0"
              aria-label={newLeads > 0 ? `${newLeads} leads novos` : 'Leads'}
            >
              <Bell className={cn('size-[22px] origin-top', newLeads > 0 && 'bell-ring')} />
              <CountBadge n={newLeads} className="absolute top-0.5 right-0 ring-2 ring-primary" />
            </Link>
          </div>
        </header>

        <div className="flex-1 relative w-full px-3 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom))] md:p-6 lg:p-8 md:mx-auto md:max-w-[1600px]">
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </div>

        {/* Barra inferior flutuante com botão de criar */}
        <nav
          className="md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pointer-events-none"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
        >
          <div className="pointer-events-auto relative mx-auto flex h-16 max-w-md items-center rounded-[26px] border border-white/70 bg-white/85 px-1 shadow-[0_10px_40px_-10px_rgba(15,23,42,0.35)] backdrop-blur-xl">
            {tabItems.slice(0, 2).map((item) => (
              <TabLink key={item.url} item={item} active={isRouteActive(pathname, item.url)} />
            ))}

            <div className="flex flex-1 justify-center">
              <button
                type="button"
                onClick={() => {
                  haptic();
                  setCreateOpen(true);
                }}
                className="-mt-9 size-[58px] rounded-[20px] bg-gradient-to-br from-blue-500 to-primary-dark text-white shadow-xl shadow-primary/40 ring-[5px] ring-background flex items-center justify-center"
                aria-label="Criar novo"
              >
                <Plus className={cn('size-7 transition-transform duration-300', createOpen && 'rotate-45')} strokeWidth={2.5} />
              </button>
            </div>

            {tabItems.slice(2).map((item) => (
              <TabLink key={item.url} item={item} active={isRouteActive(pathname, item.url)} />
            ))}

            <button
              type="button"
              className="flex flex-1 min-w-0 flex-col items-center justify-center gap-1 h-full"
              onClick={() => {
                haptic();
                setMoreOpen(true);
              }}
              aria-label="Abrir menu completo"
            >
              <TabIcon icon={LayoutGrid} active={moreOpen} dot={newLeads > 0} />
              <TabLabel active={moreOpen}>Menu</TabLabel>
            </button>
          </div>
        </nav>

        <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} newLeads={newLeads} />
        <CreateSheet open={createOpen} onOpenChange={setCreateOpen} />
      </main>
    </div>
  );
}

function TabIcon({ icon: Icon, active, dot }: { icon: React.ElementType; active: boolean; dot?: boolean }) {
  return (
    <span
      className={cn(
        'relative flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300',
        active ? 'bg-primary/10 text-primary' : 'text-slate-400'
      )}
    >
      <Icon className="size-[22px]" strokeWidth={active ? 2.4 : 2} />
      {dot && <span className="absolute top-0.5 right-3 size-2.5 rounded-full bg-destructive ring-2 ring-white" />}
    </span>
  );
}

const TabLabel = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
  <span className={cn('text-[10.5px] leading-none truncate max-w-full', active ? 'font-bold text-primary' : 'font-medium text-slate-500')}>
    {children}
  </span>
);

function TabLink({ item, active }: { item: (typeof tabItems)[number]; active: boolean }) {
  return (
    <Link
      href={item.url}
      onClick={haptic}
      className="flex flex-1 min-w-0 flex-col items-center justify-center gap-1 h-full"
      aria-current={active ? 'page' : undefined}
    >
      <TabIcon icon={item.icon} active={active} />
      <TabLabel active={active}>{item.title}</TabLabel>
    </Link>
  );
}
