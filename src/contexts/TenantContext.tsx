'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AccessState, DEFAULT_COLOR, Tenant, computeAccess, darken, safeColor } from '@/lib/tenant';
import { Permission, UserRole, can as canDo, sanitizePermissions } from '@/lib/permissions';

interface TenantContextType {
  tenant: Tenant | null;
  isMaster: boolean;
  /** Papel do usuário na empresa (owner/admin/usuario). */
  role: UserRole;
  permissions: Permission[];
  can: (perm: Permission | 'usuarios') => boolean;
  access: AccessState;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isMaster: false,
  role: 'none',
  permissions: [],
  can: () => false,
  access: 'loading',
  loading: true,
  refresh: async () => {},
});

function applyTheme(color: string) {
  if (typeof document === 'undefined') return;
  const c = safeColor(color);
  const root = document.documentElement;
  root.style.setProperty('--primary', c);
  root.style.setProperty('--primary-dark', darken(c));
  root.style.setProperty('--sidebar-primary', c);
  root.style.setProperty('--ring', c);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', c);
}

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [role, setRole] = useState<UserRole>('none');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setTenant(null);
      setIsMaster(false);
      setRole('none');
      setPermissions([]);
      applyTheme(DEFAULT_COLOR);
      setLoading(false);
      return;
    }
    const [adminRes, ownRes, memberRes] = await Promise.all([
      supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
      supabase.from('tenants').select('*').eq('owner_id', user.id).maybeSingle(),
      supabase.from('tenant_members').select('tenant_id, role, permissions, active').eq('user_id', user.id).maybeSingle(),
    ]);
    const master = !!adminRes.data;
    let t = (ownRes.data as Tenant | null) ?? null;
    let r: UserRole = t ? 'owner' : 'none';
    let perms: Permission[] = [];
    // usuário vinculado (não dono): a empresa vem do vínculo ativo
    const m = memberRes.data as { tenant_id: string; role: 'admin' | 'usuario'; permissions: string[]; active: boolean } | null;
    if (!t && m?.active) {
      const { data } = await supabase.from('tenants').select('*').eq('id', m.tenant_id).maybeSingle();
      t = (data as Tenant | null) ?? null;
      if (t) {
        r = m.role;
        perms = sanitizePermissions(m.permissions);
      }
    }
    setIsMaster(master);
    setTenant(t);
    setRole(r);
    setPermissions(perms);
    applyTheme(master ? DEFAULT_COLOR : t?.primary_color ?? DEFAULT_COLOR);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    load();
  }, [authLoading, load]);

  const value = useMemo<TenantContextType>(
    () => ({
      tenant,
      isMaster,
      role,
      permissions,
      can: (perm: Permission | 'usuarios') => canDo(role, permissions, perm),
      loading: authLoading || loading,
      access: authLoading || loading ? 'loading' : computeAccess(tenant, isMaster),
      refresh: load,
    }),
    [tenant, isMaster, role, permissions, authLoading, loading, load]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => useContext(TenantContext);
