'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  findScheduleConflicts,
  staffGap,
  type ConflictResult,
  SETUP_BUFFER_MINUTES,
} from '@/lib/buffet-rules';
import { AlertTriangle, CheckCircle2, HardHat } from 'lucide-react';

/** Busca eventos do mesmo dia e calcula conflitos de horário/montagem. */
export function useScheduleConflicts(
  date: string,
  start: string,
  end: string,
  excludeId?: string
): ConflictResult[] {
  const [conflicts, setConflicts] = useState<ConflictResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!date || !start || !end || !supabase) {
      setConflicts([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('events')
        .select('id, name, date, start_time, end_time, status')
        .eq('date', date);
      if (cancelled) return;
      setConflicts(
        findScheduleConflicts(
          { id: excludeId, date, start_time: start, end_time: end },
          (data as any[]) || []
        )
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [date, start, end, excludeId]);

  return conflicts;
}

export function ScheduleConflictAlert({ conflicts }: { conflicts: ConflictResult[] }) {
  if (conflicts.length === 0) return null;
  const hard = conflicts.some((c) => c.kind === 'sobreposicao');
  return (
    <div
      role="alert"
      className={`rounded-xl border px-4 py-3 text-sm ${
        hard
          ? 'border-destructive/30 bg-destructive/5 text-destructive'
          : 'border-warning/40 bg-warning/10 text-slate-800'
      }`}
    >
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4 shrink-0" />
        {hard ? 'Conflito de agenda — salvamento bloqueado' : `Intervalo curto (mínimo ${SETUP_BUFFER_MINUTES} min)`}
      </p>
      <ul className="mt-1.5 space-y-0.5 pl-6 list-disc">
        {conflicts.map((c, i) => (
          <li key={i}>{c.message}</li>
        ))}
      </ul>
    </div>
  );
}

export function StaffSuggestionBox({ guests, allocated }: { guests: number; allocated: number }) {
  if (!guests) return null;
  const g = staffGap(guests, allocated);
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
        g.ok ? 'border-success/30 bg-success/5' : 'border-warning/40 bg-warning/10'
      }`}
    >
      {g.ok ? (
        <CheckCircle2 className="size-5 text-success shrink-0 mt-0.5" />
      ) : (
        <HardHat className="size-5 text-warning shrink-0 mt-0.5" />
      )}
      <div className="text-slate-700">
        <p className="font-semibold text-slate-900">
          Equipe sugerida para {guests} convidados: {g.total} pessoas
        </p>
        <p>
          {g.waiters} garçons + {g.kitchen} cozinha · alocados: {allocated}
          {g.ok ? ' — equipe completa.' : ` — faltam ${g.missing}.`}
        </p>
      </div>
    </div>
  );
}
