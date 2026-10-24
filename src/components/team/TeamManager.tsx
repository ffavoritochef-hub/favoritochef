'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Loader2, Pencil, Plus, ShieldCheck, Trash2, UserCog, UserRound } from 'lucide-react';
import { authFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MIN_PASSWORD, MemberRole, PERMISSIONS, Permission, ROLE_LABELS, isValidEmail } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
  role: MemberRole;
  permissions: string[];
  active: boolean;
  created_at: string;
  is_owner: boolean;
  is_me: boolean;
}

const PERM_LABEL = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.label])) as Record<string, string>;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authFetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Erro ao salvar.');
  return body as T;
}

/**
 * Lista e gerencia os usuários de uma empresa.
 * Sem `tenantId` usa a empresa do usuário logado (admin); o master passa o id da empresa.
 */
export function TeamManager({ tenantId, compact = false }: { tenantId?: string; compact?: boolean }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<TeamMember | 'new' | null>(null);
  const [pending, setPending] = useState<{ kind: 'toggle' | 'delete'; m: TeamMember } | null>(null);
  const [busy, setBusy] = useState(false);
  const qs = tenantId ? `?tenantId=${tenantId}` : '';

  const [reload, setReload] = useState(0);
  const load = useCallback(() => setReload((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    api<{ members: TeamMember[] }>(`/api/team${qs}`)
      .then(({ members }) => {
        if (!alive) return;
        setMembers(members);
        setError('');
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [qs, reload]);

  async function confirmPending() {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === 'delete') {
        await api(`/api/team/${pending.m.id}`, { method: 'DELETE' });
        toast.success('Usuário excluído.');
      } else {
        await api(`/api/team/${pending.m.id}`, { method: 'PATCH', body: JSON.stringify({ active: !pending.m.active }) });
        toast.success(pending.m.active ? 'Usuário inativado. Ele não consegue mais entrar.' : 'Usuário ativado.');
      }
      setPending(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {loading ? 'Carregando...' : `${members.length} usuário${members.length === 1 ? '' : 's'}`}
        </p>
        <Button onClick={() => setEditing('new')} className="h-11 rounded-xl font-semibold gap-2" disabled={!!error && !members.length}>
          <Plus className="size-4" /> Novo usuário
        </Button>
      </div>

      {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : (
        <div className={cn('grid gap-3', !compact && 'lg:grid-cols-2')}>
          {members.map((m) => (
            <article key={m.id} className={cn('bg-white border border-border rounded-2xl p-4 space-y-3', !m.active && 'bg-slate-50')}>
              <div className="flex items-start gap-3">
                <div className={cn('size-11 rounded-full flex items-center justify-center shrink-0 font-bold uppercase', m.active ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-500')}>
                  {(m.name || m.email)[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn('font-bold leading-tight break-words', m.active ? 'text-slate-900' : 'text-slate-500')}>
                    {m.name || m.email.split('@')[0]} {m.is_me && <span className="text-xs font-medium text-slate-400">(você)</span>}
                  </p>
                  <p className="text-xs text-slate-500 break-all">{m.email}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border',
                      m.is_owner || m.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 text-slate-600 border-slate-200')}>
                      {m.is_owner || m.role === 'admin' ? <ShieldCheck className="size-3" /> : <UserRound className="size-3" />}
                      {m.is_owner ? ROLE_LABELS.owner : ROLE_LABELS[m.role]}
                    </span>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border',
                      m.active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200')}>
                      {m.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {m.is_owner || m.role === 'admin' ? (
                  <span className="text-xs text-slate-500">Vê tudo da empresa e gerencia os usuários.</span>
                ) : m.permissions.length ? (
                  m.permissions.map((p) => (
                    <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">{PERM_LABEL[p] ?? p}</span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Nenhuma área liberada</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-100">
                <Button variant="outline" className="h-10 rounded-xl text-xs sm:text-sm px-2 border-slate-200" onClick={() => setEditing(m)}>
                  <Pencil className="size-4" /> Editar
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl text-xs sm:text-sm px-2 border-slate-200"
                  disabled={m.is_owner || m.is_me}
                  onClick={() => setPending({ kind: 'toggle', m })}
                >
                  <UserCog className="size-4" /> {m.active ? 'Inativar' : 'Ativar'}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-xl text-xs sm:text-sm px-2 border-slate-200 hover:text-destructive hover:border-destructive/30"
                  disabled={m.is_owner || m.is_me}
                  onClick={() => setPending({ kind: 'delete', m })}
                >
                  <Trash2 className="size-4" /> Excluir
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <MemberDialog
        key={editing === 'new' ? 'new' : editing?.id ?? 'none'}
        member={editing}
        tenantId={tenantId}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && !busy && setPending(null)}
        title={pending?.kind === 'delete' ? 'Excluir usuário?' : pending?.m.active ? 'Inativar usuário?' : 'Ativar usuário?'}
        description={
          pending?.kind === 'delete'
            ? `${pending.m.email} perde o acesso e o login é apagado. Os dados da empresa continuam.`
            : pending?.m.active
              ? `${pending?.m.email} não vai conseguir entrar até ser ativado de novo.`
              : `${pending?.m.email} volta a entrar com a mesma senha.`
        }
        confirmText={pending?.kind === 'delete' ? 'Excluir' : pending?.m.active ? 'Inativar' : 'Ativar'}
        variant={pending?.kind === 'delete' ? 'destructive' : pending?.m.active ? 'warning' : 'default'}
        loading={busy}
        onConfirm={confirmPending}
      />
    </div>
  );
}

function MemberDialog({
  member,
  tenantId,
  onClose,
  onSaved,
}: {
  member: TeamMember | 'new' | null;
  tenantId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = member === 'new';
  const m = member && member !== 'new' ? member : null;
  const [name, setName] = useState(m?.name ?? '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<MemberRole>(m?.is_owner ? 'admin' : m?.role ?? 'usuario');
  const [perms, setPerms] = useState<Permission[]>((m?.permissions as Permission[]) ?? ['eventos', 'agenda']);
  const [saving, setSaving] = useState(false);
  const roleLocked = !!m && (m.is_owner || m.is_me);

  const toggle = (p: Permission) => setPerms((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]));
  const allOn = perms.length === PERMISSIONS.length;

  async function save() {
    if (isNew && !isValidEmail(email)) return toast.error('Informe um e-mail válido.');
    if (isNew && password.length < MIN_PASSWORD) return toast.error(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
    if (!isNew && password && password.length < MIN_PASSWORD) return toast.error(`A nova senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
    if (role === 'usuario' && perms.length === 0) return toast.error('Marque pelo menos uma área.');
    setSaving(true);
    try {
      const payload = { name: name.trim(), role, permissions: role === 'admin' ? [] : perms, ...(password ? { password } : {}) };
      if (isNew) {
        const r = await api<{ linked: boolean }>('/api/team', {
          method: 'POST',
          body: JSON.stringify({ ...payload, email: email.trim(), tenantId }),
        });
        toast.success(r.linked ? 'Usuário vinculado. Ele já tinha login e continua com a senha dele.' : 'Usuário criado! Passe o e-mail e a senha para ele entrar.');
      } else if (m) {
        await api(`/api/team/${m.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('Usuário atualizado.');
      }
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!member} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-lg !rounded-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Novo usuário' : 'Editar usuário'}</DialogTitle>
          <DialogDescription>{isNew ? 'Crie o login e escolha o que ele pode ver.' : m?.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tm-name">Nome</Label>
            <Input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" placeholder="Ex.: Maria da cozinha" />
          </div>
          {isNew && (
            <div className="space-y-1.5">
              <Label htmlFor="tm-email">E-mail (é o login)</Label>
              <Input id="tm-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" placeholder="nome@email.com" />
            </div>
          )}
          {(isNew || !m?.is_owner || m.is_me) && (
            <div className="space-y-1.5">
              <Label htmlFor="tm-pass" className="flex items-center gap-1.5">
                <KeyRound className="size-3.5" /> {isNew ? 'Senha' : 'Nova senha (deixe vazio para manter)'}
              </Label>
              <div className="relative">
                <Input
                  id="tm-pass"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                  placeholder={`Mínimo ${MIN_PASSWORD} caracteres`}
                />
                <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-1 top-1/2 -translate-y-1/2 size-9 flex items-center justify-center text-slate-400" aria-label={showPass ? 'Esconder senha' : 'Mostrar senha'}>
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {isNew && <p className="text-xs text-slate-500">Se o e-mail já tiver login no sistema (sem empresa), ele é só vinculado e mantém a senha atual.</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de acesso</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['admin', 'Administrador', 'Vê tudo e gerencia usuários'],
                ['usuario', 'Usuário', 'Vê só as áreas marcadas'],
              ] as [MemberRole, string, string][]).map(([k, label, hint]) => (
                <button
                  key={k}
                  type="button"
                  disabled={roleLocked}
                  onClick={() => setRole(k)}
                  className={cn('text-left rounded-xl border p-3 min-h-[64px] transition disabled:opacity-60',
                    role === k ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border')}
                >
                  <span className="block text-sm font-bold text-slate-900">{label}</span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </button>
              ))}
            </div>
            {roleLocked && <p className="text-xs text-slate-500">{m?.is_owner ? 'O dono é sempre administrador.' : 'Você não pode mudar o seu próprio acesso.'}</p>}
          </div>

          {role === 'usuario' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>O que ele pode ver</Label>
                <button type="button" className="text-xs font-semibold text-primary" onClick={() => setPerms(allOn ? [] : PERMISSIONS.map((p) => p.key))}>
                  {allOn ? 'Desmarcar todas' : 'Marcar todas'}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {PERMISSIONS.map((p) => {
                  const on = perms.includes(p.key);
                  return (
                    <label key={p.key} className={cn('flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer', on ? 'border-primary bg-primary/5' : 'border-border')}>
                      <input type="checkbox" checked={on} onChange={() => toggle(p.key)} className="mt-0.5 size-4 accent-[var(--primary)]" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">{p.label}</span>
                        <span className="block text-xs text-slate-500">{p.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">O Início aparece para todos; os valores financeiros dele só para quem tem Financeiro.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-11 rounded-xl">Cancelar</Button>
          <Button onClick={save} disabled={saving} className="h-11 rounded-xl font-semibold">
            {saving ? <Loader2 className="size-4 animate-spin" /> : null} {isNew ? 'Criar usuário' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
