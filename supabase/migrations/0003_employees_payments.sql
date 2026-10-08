-- Migration 0003: Funcionarios + Pagamentos Parciais de Evento
-- Data estimada: 2026-10-01
-- Aplicar no Supabase SQL Editor (painel.supabase.com > SQL Editor > New query)
-- Todas DDL com IF NOT EXISTS — idempotente, rodar múltiplas vezes sem problema.

-- 1) employees: cadastro de funcionários (equipe)
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  observations TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.employees IS 'Funcionários/colaboradores do buffet para alocação nos eventos';
COMMENT ON COLUMN public.employees.role IS 'Cargo/Função principal (ex: Churrasqueiro, Garçom, Chef, Auxiliar)';
COMMENT ON COLUMN public.employees.is_active IS 'Soft-delete; false remove de seleções futuras mas mantém vínculos históricos';

CREATE INDEX IF NOT EXISTS idx_employees_is_active ON public.employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_name ON public.employees(name);

-- 2) event_employees: vínculo N:N eventos <-> funcionários
CREATE TABLE IF NOT EXISTS public.event_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  specific_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, employee_id)
);

COMMENT ON TABLE public.event_employees IS 'Alocação de funcionários nos eventos (equipe do buffet)';
COMMENT ON COLUMN public.event_employees.specific_role IS 'Função específica neste evento, se diferente do cargo padrão';

CREATE INDEX IF NOT EXISTS idx_event_employees_event_id ON public.event_employees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_employees_employee_id ON public.event_employees(employee_id);

-- 3) event_payments: recebimentos parciais dos clientes vinculados a cada evento
CREATE TABLE IF NOT EXISTS public.event_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL,
  method TEXT NOT NULL DEFAULT 'Outro',
  status TEXT NOT NULL DEFAULT 'Recebido',
  notes TEXT,
  register_in_finance BOOLEAN NOT NULL DEFAULT false,
  finance_transaction_id UUID NULL REFERENCES public.finance_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.event_payments IS 'Pagamentos parciais/recebimentos feitos pelo cliente para um evento específico';
COMMENT ON COLUMN public.event_payments.method IS 'Forma de pagamento: Pix, Dinheiro, Cartão, Transferência, Boleto, Outro';
COMMENT ON COLUMN public.event_payments.status IS 'Recebido ou Previsão (recebimento futuro)';
COMMENT ON COLUMN public.event_payments.register_in_finance IS 'Se true, este pagamento gerou/está vinculado a um registro em finance_transactions';
COMMENT ON COLUMN public.event_payments.finance_transaction_id IS 'FK opcional para o registro espelhado em finance_transactions';

CREATE INDEX IF NOT EXISTS idx_event_payments_event_id ON public.event_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_payment_date ON public.event_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_event_payments_status ON public.event_payments(status);

-- 4) Trigger atualização de updated_at para employees e event_payments
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS set_employees_updated_at ON public.employees;
CREATE TRIGGER set_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS set_event_payments_updated_at ON public.event_payments;
CREATE TRIGGER set_event_payments_updated_at
BEFORE UPDATE ON public.event_payments
FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- 5) Row Level Security (RLS) — manter compatibilidade se o schema usar
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'employees_authenticated_all') THEN
    CREATE POLICY employees_authenticated_all ON public.employees
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_employees' AND policyname = 'event_employees_authenticated_all') THEN
    CREATE POLICY event_employees_authenticated_all ON public.event_employees
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'event_payments' AND policyname = 'event_payments_authenticated_all') THEN
    CREATE POLICY event_payments_authenticated_all ON public.event_payments
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
