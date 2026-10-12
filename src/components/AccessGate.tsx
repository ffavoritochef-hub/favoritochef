'use client';

import { Clock, Ban, XCircle, CalendarX, HelpCircle, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { accessMessage, AccessState } from '@/lib/tenant';

const ICONS: Partial<Record<AccessState, typeof Clock>> = {
  pendente: Clock,
  recusado: XCircle,
  suspenso: Ban,
  expirado: CalendarX,
  sem_buffet: HelpCircle,
};

/** Tela exibida quando o buffet ainda não pode usar o sistema. */
export function BlockedScreen() {
  const { signOut, user } = useAuth();
  const { access, tenant, refresh } = useTenant();
  const Icon = ICONS[access] ?? HelpCircle;
  const { title, text } = accessMessage(access, tenant);
  const pending = access === 'pendente';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-border shadow-card p-6 sm:p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
          {tenant && <p className="text-sm font-semibold text-slate-700">{tenant.name}</p>}
          <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
          {user?.email && <p className="text-xs text-slate-400">Conta: {user.email}</p>}
        </div>
        <div className="flex flex-col gap-2">
          {(pending || access === 'expirado' || access === 'suspenso') && (
            <Button variant="outline" onClick={() => refresh()} className="w-full min-h-[48px] gap-2">
              <RefreshCw className="w-4 h-4" /> Verificar novamente
            </Button>
          )}
          <Button onClick={() => signOut()} className="w-full min-h-[48px] gap-2">
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
