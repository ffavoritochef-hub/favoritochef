'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AccessState, DEFAULT_COLOR, Tenant, computeAccess, darken, safeColor } from '@/lib/tenant';

interface TenantContextType {
  tenant: Tenant | null;
  isMaster: boolean;
  access: AccessState;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  isMaster: false,
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
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setTenant(null);
      setIsMaster(false);
      applyTheme(DEFAULT_COLOR);
      setLoading(false);
      return;
    }
    const [adminRes, tenantRes] = await Promise.all([
      supabase.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle(),
      supabase.from('tenants').select('*').eq('owner_id', user.id).maybeSingle(),
    ]);
    const master = !!adminRes.data;
    const t = (tenantRes.data as Tenant | null) ?? null;
    setIsMaster(master);
    setTenant(t);
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
      loading: authLoading || loading,
      access: authLoading || loading ? 'loading' : computeAccess(tenant, isMaster),
      refresh: load,
    }),
    [tenant, isMaster, authLoading, loading, load]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export const useTenant = () => useContext(TenantContext);
