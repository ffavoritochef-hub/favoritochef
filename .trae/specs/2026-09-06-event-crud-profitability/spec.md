# AgendaBuffet — CRUD + Rentabilidade por Evento (PRD)

## Overview
- **Resumo**: Amplia o módulo de Gestão de Eventos do AgendaBuffet com 3 pilares: (1) operações CRUD completas (Editar, Excluir, Inativar) nas telas de Clientes, Eventos, Orçamentos, Financeiro, Cardápio; (2) valor do evento fechado com o cliente no cadastro do evento; (3) gastos vinculados individualmente a cada evento, com cálculo automático de LUCRO / PREJUÍZO por evento e visão consolidada.
- **Propósito**: O dono do buffet negocia um valor "fechado" com o cliente e precisa, ao longo do evento, lançar os custos (carvão, bebida, equipe etc.) para saber em tempo real se o negócio vai dar lucro ou prejuízo. Hoje a tela de Eventos só agenda; Financeiro é um caixa geral sem vínculo por evento.
- **Usuários-Alvo**: Dono do buffet / responsável operacional (1 usuário único autenticado via Supabase).

## Goals
1. Qualquer entidade (Cliente, Evento, Orçamento, Transação Financeira, Modelo de Cardápio) pode ser **editada** e **excluída** (soft-delete via status inativo, e opção hard-delete em Dialog de confirmação).
2. O Evento passa a ter um **Valor Acordado (valor fechado com o cliente)**, preenchido no agendamento ou edição.
3. Toda **Despesa** (carvão, cerveja, equipe, frete etc.) é **vinculada a um Evento** — tanto no financeiro geral, quanto diretamente no detalhe do evento.
4. Cada Evento exibe uma **calculadora simples e visível**: `Saldo = Valor Acordado - Soma dos Gastos Vinculados`, com cores verde (lucro) / vermelho (prejuízo) e percentual de margem.
5. Resumo consolidado no Dashboard com valor total de eventos, custos totalizados e lucro/prejuízo líquido do período.

## Non-Goals
- Não implementa emissão de NF-e, boletos, Pix ou integração com gateways de pagamento.
- Não muda o sistema de autenticação / permissões (continua single-user via Supabase Auth).
- Não cria ordens de serviço, checklist de equipe ou controle de estoque detalhado.
- Não refatora PDFs de proposta / WhatsApp existentes nesse ciclo.

## Background & Context
Estrutura atual do projeto (investigada em 2026-09-06):
- **Stack**: Next.js 16.2.7 (App Router, Turbopack), React 19, Tailwind v4 (zero config, `@theme inline`), shadcn/ui v4, Radix, Lucide Icons, Supabase (Auth + PostgREST), Sonner, date-fns, pdfkit.
- **Tabelas Supabase existentes** (uso inferido a partir dos `.from()` no código):
  - `clients` (id, name, email, document, phone, whatsapp, address, created_at)
  - `events` (id, client_id FK, name, type, date, start_time, end_time, address, guest_count, observations, status ∈ {Orçamento enviado,Aguardando aprovação,Aprovado,Em andamento,Finalizado,Cancelado}, created_at)
  - `budgets` (id, event_id FK, menu_template_id FK, food_value, drinks_value, staff_value, location_value, transport_value, margin_percent, total_value, payment_conditions, created_at)
  - `finance_transactions` (id, type ∈ {receivable, payable}, description, amount, date, status ∈ {pago,recebido,pendente,atrasado}, created_at)
  - `menu_templates` + `menu_template_items`
- **UI já convertida para tema claro** (sessão anterior) e Input 16px com safe areas (bug digitação resolvido na mesma sessão).
- **O que existe hoje, mas não funciona**:
  - Botões Editar/Excluir em `clients/page.tsx` só renderizam, não têm handler (verificado em [clients/page.tsx](file:///c:/Projeto/AgendaBuffet/src/app/dashboard/clients/page.tsx#L124-L133)).
  - Botão "Detalhes" em `events/page.tsx` e botões de ação em Orçamentos/Financeiro/Cardápio sem ação.
  - `finance_transactions` NÃO tem `event_id` — caixa é geral, não por evento.
  - `events` NÃO tem `agreed_value` — valor fechado não é armazenado.
- Exemplo dado pelo usuário: *"valor evento 1.000, opção colocar carvão = 10,00 e ir subtraindo do valor evento"* → este é o comportamento central do requisito.

## Functional Requirements
- **FR-1 — Soft Delete + Inativação em Clientes**: Tela Clientes permite marcar cliente como **Ativo/Inativo** (toggle) e **Excluir definitivamente** (com confirmação Sonner + Dialog). Filtro "Mostrar inativos" no topo.
- **FR-2 — Editar Cliente**: Rota `/dashboard/clients/[id]/edit` que reutiliza o formulário de `clients/new`, preenchido com dados existentes. Supabase `.update()`.
- **FR-3 — Excluir Evento / Alterar Status**: Tela Eventos oferece no card (e na linha da tabela desktop) menu de ações: Editar, Alterar Status (Aprovado / Em andamento / Finalizado / Cancelado) e Excluir (confirmação Dialog).
- **FR-4 — Editar Evento**: Rota `/dashboard/events/[id]/edit` reutiliza o form de `events/new`.
- **FR-5 — Campo `agreed_value` no Evento**: Novo campo obrigatório ou opcional (aceita 0) nos forms de Novo Evento e Editar Evento: "Valor Acordado (R$) — valor fechado com o cliente". Armazena em `events.agreed_value NUMERIC(12,2) DEFAULT 0`.
- **FR-6 — Vincular Financeiro a Evento**: Formulário Nova Transação (`/dashboard/finance/new`) recebe um select opcional "Vincular a Evento" (carrega eventos). Salva em `finance_transactions.event_id UUID NULL REFERENCES events(id)`. Quando `type=payable` e `event_id` não nulo → a transação aparece no detalhe do evento.
- **FR-7 — Editar / Excluir Transação**: Financeiro lista ganha ações Editar e Excluir por item.
- **FR-8 — Tela de Detalhe do Evento (rentabilidade)**: Rota `/dashboard/events/[id]` com 3 blocos fixados no topo:
  - Card 1: **Valor Acordado** R$ (editar inline quick-edit ou botão Editar Dados)
  - Card 2: **Total Gasto** (soma `finance_transactions` onde event_id = id AND type='payable')
  - Card 3: **Saldo (Lucro/Prejuízo)** — verde se ≥0, vermelho se <0, com badge percentual sobre valor acordado.
  - Abaixo: lista de gastos lançados para o evento, com botão **"+ Adicionar Gasto"** (abre Dialog inline — NÃO navega para o financeiro) pedindo descrição, valor, data (padrão hoje), status. Ao salvar recalcula os 3 cards em tempo real.
  - Abaixo da lista: subtotal + percentual `(gasto/valor_acordado)*100`.
- **FR-9 — Orçamentos / Cardápios**: Tela Orçamentos ganha ações Editar e Excluir. Tela Cardápio ganha Editar / Excluir e marcar modelo como inativo.
- **FR-10 — Dashboard KPIs de Rentabilidade**: 2 KPI novos (mantém 3 atuais de financeiro):
  - **Total Eventos Aprovados/Finalizados** (soma agreed_value dos eventos nestes status no mês corrente)
  - **Resultado do Mês** (valor acordado total − gastos vinculados total) com cor verde/vermelho.
- **FR-11 — Confirmação em Exclusões**: Toda exclusão permanente abre `Dialog` nativo shadcn com "Tem certeza? Esta ação não pode ser desfeita." e dois botões (Cancelar / Confirmar exclusão). Em telas mobile, usar `Sheet` ou o mesmo Dialog com os ajustes de safe-zone já aplicados.
- **FR-12 — Filtro por período na Rentabilidade**: Detalhe do Evento mostra todos gastos vinculados (sem filtro por padrão). Lista Eventos tem filtro simples por status (chip group).
- **FR-13 — Ordem e consistência**: Ao adicionar gasto no detalhe do evento, o mesmo registro aparece automaticamente na lista geral de Financeiro (mesma linha, mesma PK).

## Non-Functional Requirements
- **NFR-1 Mobile-First**: Tela Detalhe Evento e formulários novos seguem os padrões já usados: `max-w-6xl mx-auto`, cards `rounded-2xl shadow-card`, botões full-width `< md`, campos h-12 `text-[16px]`, `pb-16` no mobile, safe areas.
- **NFR-2 Atualização Otimista**: Sonner "Gasto adicionado" + atualização imediata da UI; em caso de erro Supabase, rollback + toast de erro.
- **NFR-3 IDs estáveis**: Não renomear tabelas existentes; somente adicionar colunas novas.
- **NFR-4 Backward Compat**: Eventos existentes que não têm `agreed_value` assumem 0 e mostram badge "Valor não informado".
- **NFR-5 Performance**: Soma de gastos no detalhe do evento vem da mesma query `.select("*", { count: "exact" })` e não causa N+1.
- **NFR-6 Tema Claro**: Manter identidade visual existente — azul #2563EB primário, cards brancos, bordas `border-border`, badges sólidos, sem classes de tema escuro.

## Constraints
- **Técnicas**:
  - Apenas adicionar colunas via migration SQL Supabase `ALTER TABLE ... ADD COLUMN ...;` — script `.sql` em `supabase/migrations/` (criar pasta se não existir).
  - Continuar usando client `@/lib/supabase` (PostgREST), sem criar `api/routes` novas a menos que estritamente necessário.
  - Manter páginas de `/new` existentes. Criar pastas `[id]/edit` e `[id]/page.tsx` novas.
- **Negócio**:
  - Exclusão de Cliente só permite se não tiver eventos vinculados (ou avisa e propõe inativar).
  - Valor acordado pode ser editado a qualquer momento, pois negociação pós-evento pode mudar.
- **Dependências**:
  - Variação da sessão anterior: Supabase integration não conseguiu token nessa sessão (`Get supabase tables failed accessToken is required`) → migration SQL será escrita como arquivo e deverá ser aplicada manualmente pelo usuário no painel Supabase, OU na proxima sessão com integration ativa.

## Assumptions
- Usuário quer o comportamento simples do exemplo: *"valor 1000, gasto 10 = saldo 990 visível em tempo real"* — não há rateio de custos indiretos ou rateio por qtd. convidados.
- Todo "gasto" no detalhe do evento entra como `finance_transactions(type='payable', status='pendente')` default, podendo ser alterado depois.
- O dono prefere lançar direto no evento e enxergar lá, sem passar pela tela de Financeiro; mas deve sincronizar.
- Receitas de um evento (ex: sinal pago) entram via Financeiro → receita vinculada → mas não deduzem o saldo de rentabilidade (saldo = acordado - gastos). Se o usuário quiser esse comportamento depois, é uma melhoria separada.

## Respostas do Usuário (set/2026)
- **Q1 Confirmado**: Ao excluir um Evento → gastos são **desvinculados** (setam event_id = NULL) e permanecem no financeiro geral. ON DELETE SET NULL.
- **Q2 Confirmado**: Valor Acordado pode ser preenchido desde "Orçamento enviado" (qualquer status).
- **Q3 Confirmado**: Receitas vinculadas ao evento **NÃO** somam no saldo de rentabilidade. Saldo = Valor Acordado (fixo) − Soma dos Gastos Vinculados. Receitas servem apenas para fluxo de caixa geral.

---

## Acceptance Criteria

### AC-1: Cliente — Editar, Inativar, Excluir funcionam
- **Type**: `rule`
- **Given**: Estou logado na tela `/dashboard/clients`
- **When**: Clico em Editar → salvo mudanças; ou clico em Excluir → confirmo no Dialog
- **Then**: (a) Cliente alterado aparece com novos dados no refresh; (b) Excluído some da lista; (c) Inativo aparece esmaecido e só volta ao toggle "Mostrar inativos".
- **Pass Condition**: `supabase.from('clients').select() reflete a mudança; Sonner mostra sucesso.`
- **Evidence**: Gravação tela ou log do Supabase PostgREST.

### AC-2: Evento — Editar, Alterar Status, Excluir
- **Type**: `rule`
- **Given**: Lista de Eventos `/dashboard/events`
- **When**: Uso os botões de ação em um card de evento
- **Then**: Editar abre `/dashboard/events/[id]/edit` pré-preenchido; alterar status atualiza badge imediatamente; excluir some após confirmação.
- **Pass Condition**: Campos salvos batem no Supabase; status reflete `statusStyles[]`.
- **Evidence**: GET `/events?select=*&id=eq:X` com campos atualizados.

### AC-3: Valor Acordado armazenado no Evento
- **Type**: `rule`
- **Given**: Formulário Novo Evento ou Editar Evento
- **When**: Preencho "Valor Acordado R$ 1.000,00" e salvo
- **Then**: `events.agreed_value = 1000.00` e aparece no card do evento na listagem (ao lado de Nº convidados).
- **Pass Condition**: SQL / PostgREST retorna agreed_value.
- **Evidence**: Leitura Supabase após submit.

### AC-4: Financeiro víncula a Evento
- **Type**: `rule`
- **Given**: `/dashboard/finance/new`
- **When**: Seleciono Evento = "Casamento João&Maria", Tipo = Despesa, Descrição = Carvão, Valor = 10,00 e salvo
- **Then**: (a) linha aparece em Financeiro com o evento vinculado; (b) no detalhe do evento /dashboard/events/[id] o Total Gasto soma +10; (c) Saldo = acordado − 10.
- **Pass Condition**: `COUNT(*)` de `finance_transactions where event_id = X` incrementa.
- **Evidence**: 2 telas (Financeiro + Detalhe Evento) mostram mesmo registro.

### AC-5: Tela Detalhe do Evento — Calculadora visível e "+ Adicionar Gasto" inline
- **Type**: `rule`
- **Given**: Acesso `/dashboard/events/[id]` com valor_acordado = 1000
- **When**: Clico em "+ Adicionar Gasto", preencho "Carvão", 10,00, data hoje e confirmo
- **Then**: Cards topo recalculam: Valor 1000 / Gasto 10 / Saldo 990 (verde); linha nova aparece na lista abaixo; Sonner de sucesso.
- **Pass Condition**: Saldo numérico bate `1000 − 10 = 990`; badge cor.
- **Evidence**: Screenshot cards + lista.

### AC-6: Cores Lucro Verde / Prejuízo Vermelho
- **Type**: `rule`
- **Given**: Evento com Valor 1000
- **When**: Soma gastos = 1.100 (passa de 1000)
- **Then**: Card Saldo mostra R$ −100,00 em texto `text-destructive` e ícone TrendingDown; badge percentual em vermelho.
- **Pass Condition**: Troca classe dinâmica `saldo >= 0 ? bg-success/10 text-success : bg-destructive/10 text-destructive`.
- **Evidence**: Inspecionar DOM ou screenshot.

### AC-7: Editar/Excluir Transação no Financeiro
- **Type**: `rule`
- **Given**: Lista financeira
- **When**: Edito valor de "Carvão 10 → 20" ou excluo
- **Then**: Total Gasto no evento correspondente recalcula em tempo real ao acessar detalhe; Sonner sucesso.
- **Pass Condition**: Valor no Financeiro === valor no Detalhe Evento.
- **Evidence**: Comparação duas telas.

### AC-8: Dashboard novos KPIs rentabilidade
- **Type**: `rule`
- **Given**: Home `/dashboard`
- **When**: Mês corrente tem 2 eventos aprovados com agreed_value 1.000 + 2.000 e gastos 300 + 200
- **Then**: KPI 1 = "R$ 3.000 Total de Eventos do Mês"; KPI 2 = "R$ 2.500 Resultado" verde.
- **Pass Condition**: Soma manual = valores exibidos nos KPIs.
- **Evidence**: Screenshot home.

### AC-9: Confirmação em todas exclusões permanentes
- **Type**: `rule`
- **Given**: Qualquer botão Excluir
- **When**: Clico em Excluir
- **Then**: Um Dialog shadcn abre com texto de confirmação e foco no botão Cancelar. A exclusão só roda após Confirmar.
- **Pass Condition**: Nenhuma exclusão roda sem handler confirmado.
- **Evidence**: Código usa componente `<AlertDialog>` próprio ou `<Dialog>` com 2 botões.

### AC-10: Nenhum regression de layout mobile
- **Type**: `rubric`
- **Dimension**: Fidelidade Mobile-First
- **Scale**: 1–5
- **Anchors**: 1 = inputs <16px ou overflow horizontal; 3 = telas carregam mas layouts quebram em 375px; 5 = telas novas reproduzem o padrão clients/page.tsx em 375×812 (iPhone SE), com botões full-width, cards sem overflow, pb-16 no fim, inputs visíveis.
- **Pass Threshold**: >= 4
- **Evidence**: Screenshot Chrome DevTools Device Mode 375px × 812px em /clients, /events, /events/[id], /finance, /dashboard.

### AC-11: Qualidade UX / Velocidade percepção
- **Type**: `rubric`
- **Dimension**: UX de lançamento de gasto
- **Scale**: 1–5
- **Anchors**: 1 = obrigado a sair do evento, ir no Financeiro, cadastrar e voltar (como hoje); 3 = Dialog inline mas recarrega página toda; 5 = Dialog inline, 3 campos (descrição/valor/data), submit em < 500ms percebidos, cards atualizam sem F5, Sonner ok.
- **Pass Threshold**: >= 4
- **Evidence**: Gravação de tela curta do fluxo "+ Adicionar Gasto".
