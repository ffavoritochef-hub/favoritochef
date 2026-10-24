'use client';

import { useTenant } from '@/contexts/TenantContext';
import { TeamManager } from '@/components/team/TeamManager';

export const dynamic = 'force-dynamic';

export default function UsuariosPage() {
  const { tenant } = useTenant();
  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Usuários</h1>
        <p className="text-sm text-slate-500 mt-1">
          Logins de {tenant?.name || 'sua empresa'}. Administradores veem tudo; usuários veem só as áreas que você liberar.
        </p>
      </div>
      <TeamManager />
    </div>
  );
}
