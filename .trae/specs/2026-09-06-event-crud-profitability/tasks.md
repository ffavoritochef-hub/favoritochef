# AgendaBuffet CRUD + Rentabilidade — Plano de Implementação

Ordem vertical: Banco → UI Componentes reutilizáveis (ConfirmDialog/Delete/AlertDialog) → Listas (Handlers) → Rotas Edit/Detail (Evento primeiro, já que é o core) → Dashboard KPIs → Build/Verificação.

---

## Task 1: Migration SQL — colunas novas + soft-delete
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None (primeira coisa, independente)
- **Description**:
  - Criar pasta `supabase/migrations/` (se não existe) e arquivo `0002_add_crud_profitability.sql` com:
    1. `ALTER TABLE events ADD COLUMN IF NOT EXISTS agreed_value NUMERIC(12,2) NOT NULL DEFAULT 0;`
    2. `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;` (soft-delete)
    3. `ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`
    4. `ALTER TABLE menu_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`
    5. `ALTER TABLE finance_transactions ADD COLUMN IF NOT EXISTS event_id UUID NULL REFERENCES events(id) ON DELETE SET NULL;`
    6. `CREATE INDEX IF NOT EXISTS idx_finance_transactions_event_id ON finance_transactions(event_id);`
    7. (Opcional) Comentários em PT-BR `COMMENT ON COLUMN events.agreed_value IS 'Valor fechado com o cliente para rentabilidade';`
- **Acceptance Criteria Addressed**: AC-3 (valor acordado), AC-4 (vínculo evento-financeiro), parte de AC-1 e AC-2 (colunas is_active)
- **Test Requirements**:
  - `rule` TR-1.1: Arquivo SQL sintaticamente correto e com `IF NOT EXISTS` em todas DDLs (idempotente). Evidence: `pgFormatter` ou leitura do arquivo com grep.
  - `rule` TR-1.2: Migration folder existe e segue convenção numérica ascendente.
- **Notes**: Como o Supabase integration falhou nesta sessão, a migration é escrita como arquivo e o usuário pode aplicar via `supabase db push` ou colar no SQL Editor do painel.

---

## Task 2: Componente ConfirmDialog (Exclusão / Ações destrutivas)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Criar `src/components/ui/confirm-dialog.tsx` reutilizável, usando o Dialog já estilizado (que já tem safe areas + dvh). Props: `open, onOpenChange, title, description, confirmText?="Confirmar", cancelText?="Cancelar", variant?="destructive"|"default", onConfirm`.
  - Exportar também um hook helper ou componente filho para o caso padrão "Tem certeza? Esta ação não pode ser desfeita.".
- **Acceptance Criteria Addressed**: AC-9
- **Test Requirements**:
  - `rule` TR-2.1: Sem `onConfirm` chamar antes do clique no botão Confirmar. Evidência: ler fonte → handler só existe onClick do botão primário.
  - `rubric` TR-2.2: Usabilidade mobile. Escala 1-5. 1=overflow, 3=funciona mas não tem safe areas; 5=herda tudo do Dialog.tsx existente, botão Cancelar e Confirmar full-width no mobile. Threshold >= 4. Evidence: snapshot ou leitura.
- **Notes**: Usar onde já existia `Trash2` sem handler em clients, events, budgets, finance, menu.

---

## Task 3: Clientes — Handlers editar/inativar/excluir + Rota Edit
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2 (ConfirmDialog), Task 1 (coluna is_active)
- **Description**:
  1. **Lista `clients/page.tsx`**:
     - `handleToggleActive(clientId, currentlyActive)` — Supabase `.update({ is_active: !currentlyActive })`.
     - `handleDelete(clientId)` — Abre ConfirmDialog → depois `DELETE FROM clients WHERE id=clientId`; trata erro FK (cliente tem eventos) com toast "Cliente tem eventos vinculados — prefira inativar".
     - `handleEdit(clientId)` — `router.push(/dashboard/clients/${id}/edit)`.
     - Filtro topo: toggle chip "Mostrar inativos" (default = só ativos).
  2. **Rota nova `src/app/dashboard/clients/[id]/edit/page.tsx`**:
     - `'use client'`, `useParams()` para pegar id, `useEffect` carrega cliente existente e preenche formulário igual clients/new.
     - Submit faz `.update()` com o mesmo schema de dados do new; `toast.success` e volta para `/dashboard/clients`.
- **Acceptance Criteria Addressed**: AC-1, AC-9
- **Test Requirements**:
  - `rule` TR-3.1: Edição salva e reflete no listado após refresh.
  - `rule` TR-3.2: Exclusão de cliente com eventos vinculados é rejeitada e toasta mensagem apropriada (não crasha).
  - `rule` TR-3.3: Inativação (toggle is_active=false) esconde cliente do listado default; ao ativar "Mostrar inativos" reaparece em cinza/esmaecido.

---

## Task 4: Eventos — Editar / Excluir / Mudar Status / Valor Acordado na lista
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2, Task 1
- **Description**:
  1. **`events/page.tsx`**:
     - Card de evento: entre "Detalhes" e "Orçamento", adicionar menu de ações (3 pontinhos) com opções:
       - Editar (vai para /events/[id]/edit)
       - Alterar Status (Select inline de 6 statuses)
       - Excluir (abre ConfirmDialog → DELETE)
     - Adicionar no card do evento, ao lado de "N convidados", um bloco "R$ Valor Acordado" (se > 0).
     - Filtro de status no topo (chips group) — filtrar `statusStyles[]` array.
  2. **`events/new/page.tsx`**:
     - Adicionar campo `<Input type="number" step="0.01" />` "Valor Acordado (R$)" no form, em `/events/new/` (novo evento já pode receber valor).
     - Mesmo campo no Editar Evento (abaixo Task 5).
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-9
- **Test Requirements**:
  - `rule` TR-4.1: Altera status do evento via menu e badge troca imediatamente sem F5.
  - `rule` TR-4.2: Excluir só passa após confirmar.
  - `rule` TR-4.3: Novo evento com agreed_value preenchido mostra R$ no card imediatamente.

---

## Task 5: Rota Editar Evento + Rota Detalhe Evento (Rentabilidade, o core do pedido)
- **Status**: `pending`
- **Priority**: high (MAIS ALTA de todas as UIs)
- **Depends On**: Task 1, Task 2, Task 4
- **Description**:
  **5A. `/dashboard/events/[id]/edit/page.tsx`**: Form igual new, porém preenchido do fetch. Campos inclusivos de Valor Acordado.

  **5B. `/dashboard/events/[id]/page.tsx` (Tela Detalhe Rentabilidade)**:
  - Header de voltar + nome evento + cliente + badge status.
  - 3 Cards sticky-ish no topo (grid-cols-1 sm:grid-cols-3):
    1. **Valor Acordado R$** + botão editar inline (abre dialog pequeno pra mudar o valor ou redireciona p/ rota edit).
    2. **Total Gasto** (soma type='payable' do finance_transactions vinculados).
    3. **Saldo** (acordado − gasto) com ícone verde/vermelho e `% gasto = gasto/acordado*100`.
  - Bloco lista de **Gastos do Evento**:
    - List idêntico a financeiro (só despesas).
    - Botão fixo/topo **"+ Adicionar Gasto"** abre Dialog inline com 3 inputs:
      - Descrição (text, placeholder "Ex: Carvão 2 sacos")
      - Valor (R$ number step 0.01)
      - Data (type=date default hoje)
      - (Oculto: type='payable', status='pendente', event_id = params.id)
    - Cada linha da lista tem editar/excluir.
  - Rodapé: subtotal, % gasto, margem lucro real.
  - Ao confirmar "+ Adicionar Gasto":
    1. POST no finance_transactions (via supabase client `.insert()`)
    2. Recalcula Total Gasto e Saldo em tempo real via refetch local
    3. Sonner: `Carvão adicionado | -R$ 10,00`
- **Acceptance Criteria Addressed**: AC-5, AC-6, AC-4, AC-11
- **Test Requirements**:
  - `rule` TR-5.1: Fluxo completo — Valor 1000 → adicionar 10 → Saldo = 990.
  - `rule` TR-5.2: Saldo ultrapassa (gastos > 1000) → cores invertem para vermelho.
  - `rule` TR-5.3: Registro inserido aparece na tela `/dashboard/finance` idêntico (mesmo valor, descrição, data).
  - `rubric` TR-5.4: Velocidade percepção, fluxo inline. Escala 1-5; threshold >= 4.

---

## Task 6: Financeiro — Vínculo a Evento + Editar/Excluir
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  1. **`finance/new/page.tsx`**: Adicionar select "Vincular a Evento (opcional)" carregando eventos `.select('id, name, date').order('date',ascending)`. Salvar `event_id`.
  2. **`finance/page.tsx`**:
     - Lista cada transação, coluna "Evento" em desktop (nome do evento se vinculado; "-" se não).
     - Ações por linha: Editar e Excluir (ConfirmDialog).
     - Card Summary mantém soma geral mas agora também mostra um mini-KPI: "Vinculados a Eventos R$ XXX (só gastos)".
     - Rota edit em `/dashboard/finance/[id]/edit/page.tsx`.
- **Acceptance Criteria Addressed**: AC-4, AC-7
- **Test Requirements**:
  - `rule` TR-6.1: Despesa criada com vínculo → aparece no detalhe do evento.
  - `rule` TR-6.2: Editar valor no financeiro reflete em Total Gasto do evento.
  - `rule` TR-6.3: Excluir do financeiro → some do detalhe do evento.

---

## Task 7: Orçamentos + Cardápio — Editar/Excluir/Inativar
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 2, Task 1 (menu_templates.is_active)
- **Description**:
  1. **Orçamentos**:
     - Ação Editar vai para `/dashboard/budgets/[id]/edit` (reutiliza form budgets/new, fetch inicial, update).
     - Ação Excluir com confirmação.
  2. **Cardápio (menu_templates)**:
     - Ação Editar `/dashboard/menu/[id]/edit`.
     - Toggle ativo/inativo (is_active).
     - Excluir.
- **Acceptance Criteria Addressed**: FR-9 (AC implícito)
- **Test Requirements**:
  - `rule` TR-7.1: Orçamento editado total_value atualizado bate na listagem.
  - `rule` TR-7.2: Template inativo não aparece mais no combo de budgets/new.

---

## Task 8: Dashboard — KPIs de Rentabilidade do Mês
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1 (agreed_value, event_id no financeiro), Task 5 (lógica fetch)
- **Description**:
  - `dashboard/page.tsx` (já convertido tema claro) → adicionar 2 KPI cards novos (ficam 5 KPIs total, 2 linhas sm) ou grupo separado "Rentabilidade do Mês":
    1. **Total Eventos do Mês**: `SUM(events.agreed_value)` onde status IN (Aprovado, Em andamento, Finalizado) AND `date >= monthStart` AND `date <= monthEnd`.
    2. **Custos do Mês Vinculados**: `SUM(finance_transactions.amount)` WHERE type='payable' AND event_id IS NOT NULL AND date no mês.
    3. **Resultado do Mês** (verde/vermelho) = 1 − 2 com ícone TrendingUp/Down.
  - Embaixo talvez tabela/lista "Top 5 Eventos Mais Lucrativos".
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `rule` TR-8.1: Mesmos dados de KPI batem com soma manual (SQL/Supabase console).
  - `rubric` TR-8.2: Clareza visual dos 3 novos KPIs (espaçamento, cores). Threshold >= 4.

---

## Task 9: Build + Diagnóstico + Checagem Final
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Todas as outras tasks
- **Description**:
  - `npm run build` duas vezes (para limpar cache Turbopack caso Invariant workStore erro).
  - `GetDiagnostics` (TypeScript) de todos os arquivos novos: 0 erros.
  - Grep por `text-white`, `neon-` em `src/app/dashboard/**/*.tsx` — 0 resultados, garante tema claro consistente.
  - Provar manualmente (ou por código) os casos-teste de AC-1 a AC-8 (rodar rotas pelo menos com lint OK; se possível dev server abrir).
- **Acceptance Criteria Addressed**: AC-10 (mobile), todos os rule ACs através das TRs.
- **Test Requirements**:
  - `rule` TR-9.1: `GetDiagnostics: []`
  - `rule` TR-9.2: Build sai exit code 0 (ou, se falhar só no Turbopack prerender /_global-error que é bug Next.js 16 conhecido, Compiled successfully com erros de TS).
  - `rubric` TR-9.3: Fidelidade mobile em 5 telas (clients, events-list, events-detail, finance, dashboard). Escala 1-5. Threshold >= 4.

---

Total: **9 Tasks** (2 banco + 1 componente base + 5 telas/rotas + 1 verificação). Prioridade high = 7; medium = 2.
