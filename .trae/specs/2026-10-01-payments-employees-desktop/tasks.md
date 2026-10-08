# Pagamentos Parciais + Funcionários + Layout Desktop - Implementation Plan

## Task 1: Migração Supabase - Tabelas employees, event_employees, event_payments
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Criar arquivo `supabase/migrations/0003_employees_payments.sql` idempotente
  - Tabela `employees`: id (UUID PK), name (text NOT NULL), role (text), phone (text), email (text), observations (text), is_active (bool default true), timestamps
  - Tabela `event_employees`: id PK, event_id FK events, employee_id FK employees, specific_role (text), created_at
  - Tabela `event_payments`: id PK, event_id FK events, amount (numeric 12,2 NOT NULL), payment_date (date NOT NULL), method (text: Pix/Dinheiro/Cartão/Transferência/Boleto/Outro), status (text: Recebido/Previsão), notes (text), register_in_finance (bool default false), created_at
  - Índices em FKs e comentários nas colunas
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-1.1: SQL executado múltiplas vezes sem erro (idempotente IF NOT EXISTS em tudo)
  - `rule` TR-1.2: INSERT/SELECT em employees, event_employees e event_payments funcionam com FKs íntegras
- **Notes**: Aplicar manualmente no painel Supabase > SQL Editor, como nas migrations anteriores.

## Task 2: Atualizar Navegação (menu lateral + bottom nav mobile)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Em [DashboardLayout.tsx](file:///c:/Projeto/AgendaBuffet/src/components/DashboardLayout.tsx) adicionar item "Funcionários" no `menuItems` com ícone UserCheck / Users (icone existente) apontando para `/dashboard/employees`
  - Verificar que no "Mais" do bottomNav a tela "Funcionários" esteja acessível via página `/dashboard/menu` (atualizar a página menu se necessário ou incluir direto)
- **Acceptance Criteria Addressed**: FR-9
- **Test Requirements**:
  - `rule` TR-2.1: Item "Funcionários" aparece na sidebar desktop e é clicável
  - `rule` TR-2.2: Item está acessível também no fluxo mobile (via bottom nav ou menu)
- **Notes**: Reutilizar ícones do pacote lucide-react (ex: `UserRoundPlus` ou `HardHat`)

## Task 3: CRUD de Funcionários (Listagem + Novo + Editar)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - Criar rota `/dashboard/employees/page.tsx` (listagem): grid cards em mobile, tabela em desktop, com busca, badge ativo/inativo, botões Editar e Inativar/Ativar
  - Criar rota `/dashboard/employees/new/page.tsx` (cadastro): formulário com Nome, Cargo, Telefone, E-mail, Observações, Status (Ativo/Inativo)
  - Criar rota `/dashboard/employees/[id]/edit/page.tsx` (edição): mesmo formulário com dados pré-carregados
  - Confirm Dialog para inativação (soft-delete via is_active=false)
  - Manter padrão visual: Card shadow-card, inputs h-12, botões rounded-xl
- **Acceptance Criteria Addressed**: AC-2, FR-4, NFR-1, NFR-2
- **Test Requirements**:
  - `rule` TR-3.1: Cadastrar funcionário novo → aparece na listagem
  - `rule` TR-3.2: Editar funcionário existente → dados persistidos
  - `rule` TR-3.3: Inativar funcionário → não aparece mais em selects de eventos futuros (mas permanece em vínculos históricos)
  - `rubric` TR-3.4: Qualidade visual do CRUD; escala 1-5; 1=fora do padrão, 3=padrão médio, 5=100% alinhado aos cards existentes, inputs h-12, badges; threshold >= 4; evidência screenshot listagem + formulário

## Task 4: Atualizar formulários de Evento (Novo e Editar) com seleção de Funcionários + campos financeiros
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 3
- **Description**:
  - Em [new/page.tsx](file:///c:/Projeto/AgendaBuffet/src/app/dashboard/events/new/page.tsx) e [[id]/edit/page.tsx](file:///c:/Projeto/AgendaBuffet/src/app/dashboard/events/%5Bid%5D/edit/page.tsx) adicionar uma seção "Equipe do Evento"
  - Criar seleção múltipla (ex: checkboxes com busca ou Select multiplo customizado usando shadcn disponível) dos employees ativos
  - Cada funcionário selecionado pode ter um campo "Função específica neste evento" (opcional)
  - No submit: salvar vínculos na tabela `event_employees` (após obter o event_id no caso de novo)
  - No edit: carregar vínculos existentes, permitir adicionar/remover e atualizar
  - Criar também uma seção opcional de "Pagamento Inicial / Sinal" na criação do evento (valor + data + método) — opcional, pode deixar para depois se complicar; ou deixar a gestão de pagamentos só na central
- **Acceptance Criteria Addressed**: AC-3, FR-5
- **Test Requirements**:
  - `rule` TR-4.1: Novo evento com 2 funcionários selecionados → event_employees tem 2 linhas
  - `rule` TR-4.2: Editar evento, remover 1 e adicionar 1 novo → vínculos atualizados corretamente (upsert / delete+insert)
  - `rubric` TR-4.3: Organização da nova seção dentro do formulário; escala 1-5; 1=bagunçado, 3=aceitável, 5=card próprio com ícone/título, alinhado às outras seções; threshold >= 4

## Task 5: Criar Página de Detalhes do Evento (Central do Evento)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 4
- **Description**:
  - Criar rota `/dashboard/events/[id]/page.tsx` (client component)
  - Buscar evento com dados do cliente + join
  - Header com data (badge calendário), nome evento, status, cliente
  - Botões: Editar Evento, Voltar
  - Estrutura de Cards/seções (em vez de abas para simplificar):
    1. Dados Gerais (resumo: tipo, horários, endereço, convidados, valor fechado)
    2. Financeiro (Painel com Valor Fechado, Total Recebido, Saldo a Receber + barra progresso) + botão "Adicionar Pagamento" + lista de pagamentos
    3. Equipe Alocada (lista de funcionários com cargo/função específica)
    4. Despesas & Rentabilidade (lista de finance_transactions vinculadas do tipo payable + cálculo lucro/prejuízo)
- **Acceptance Criteria Addressed**: AC-5, FR-10
- **Test Requirements**:
  - `rule` TR-5.1: Rota abre sem erro para evento válido, dados carregam
  - `rule` TR-5.2: Evento inexistente redireciona ou mostra mensagem amigável
  - `rubric` TR-5.3: Clareza visual e hierarquia da central; escala 1-5; 1=confuso, 3=mediano, 5=seções claras, destaques certos, fácil localizar cada coisa; threshold >= 4

## Task 6: Implementar módulo de Pagamentos (CRUD dentro da Central do Evento)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 5
- **Description**:
  - Modal/Dialog "Novo Pagamento" ou formulário inline com campos: valor, data, método (Select), status (Recebido/Previsão), observações, checkbox "Registrar também no Financeiro"
  - Lista de pagamentos com colunas/campos: data, método, status, valor, observações, ações (editar/excluir)
  - Painel superior: 3 cards (Valor Fechado, Total Recebido, Saldo a Receber) + barra de progresso (recebido/fechado)
  - Ao marcar checkbox "Registrar no Financeiro": cria/atualiza registro em `finance_transactions` type=receivable, description = "Pagamento cliente: {nome_cliente} / {nome_evento}"
- **Acceptance Criteria Addressed**: AC-1, FR-1, FR-2, FR-3
- **Test Requirements**:
  - `rule` TR-6.1: Adicionar pagamento R$ 2000 em evento de R$ 5000 → painel exibe 2000 recebido, 3000 saldo, 40%
  - `rule` TR-6.2: Checkbox "Registrar no Financeiro" marcado → cria linha em finance_transactions correspondente
  - `rule` TR-6.3: Editar pagamento → valores e painel atualizam; excluir → valores subtraem do total
  - `rubric` TR-6.4: Clareza visual das informações financeiras; escala 1-5; threshold >= 4; evidência screenshot do painel + lista

## Task 7: Seção Equipe + Rentabilidade na Central do Evento
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 5, Task 1
- **Description**:
  - Seção "Equipe Alocada": listar employees do join event_employees com badge de cargo
  - Link rápido para editar o evento caso queira alterar equipe
  - Seção "Despesas & Rentabilidade": listar finance_transactions com event_id=X e type='payable' (formato card/tabela), e soma total
  - Card de Lucro/Prejuízo: agreed_value - soma(despesas) com cor verde/vermelho conforme sinal
- **Acceptance Criteria Addressed**: AC-6, FR-6, FR-11
- **Test Requirements**:
  - `rule` TR-7.1: Evento com funcionários alocados → seção equipe mostra todos
  - `rule` TR-7.2: Evento com 2 despesas de R$500 e R$1500, agreed R$6000 → lucro R$4000 em verde
  - `rule` TR-7.3: Despesas > agreed_value → mostra "Prejuízo" em vermelho

## Task 8: Otimizações de Layout Desktop (listagens e formulários)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Em [events/page.tsx](file:///c:/Projeto/AgendaBuffet/src/app/dashboard/events/page.tsx): mudar grid de `grid-cols-1` para `grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3` (com gap apropriado)
  - Verificar cards de eventos em telas grandes: ajustar o layout interno do card para não ficar "esticado demais" em colunas (ex: ação botões lado a lado em vez de empilhados em largura >= lg)
  - Em [dashboard/page.tsx](file:///c:/Projeto/AgendaBuffet/src/app/dashboard/page.tsx): validar que largura do conteúdo fique consistente (talvez aumentar max-width do container principal ou ajustar paddings em lg+)
  - Em [finance/page.tsx](file:///c:/Projeto/AgendaBuffet/src/app/dashboard/finance/page.tsx): tabela desktop pode ganhar coluna "Evento Vinculado" quando houver FK
  - Ajustar [DashboardLayout.tsx](file:///c:/Projeto/AgendaBuffet/src/components/DashboardLayout.tsx) padding desktop: o conteúdo pode ter um max-w-[1400px] ou similar centrado em telas 4k para não ficar super largo
- **Acceptance Criteria Addressed**: AC-4, AC-7, FR-7, FR-8
- **Test Requirements**:
  - `rule` TR-8.1: Events em viewport >= 1280px renderiza grid-cols-2; >= 1536px renderiza grid-cols-3
  - `rubric` TR-8.2: Layout desktop geral após ajustes; escala 1-5; 1=ruim, 3=mediano, 5=ótimo aproveitamento sem desperdício, sem quebras; threshold >= 4; evidência prints em 1920x1080
  - `rubric` TR-8.3: Layout mobile preservado; escala 1-5; threshold >= 4; evidência prints em 375x667

## Task 9: Ajustes de integração e testes finais
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Tasks 3, 4, 5, 6, 7, 8
- **Description**:
  - Na listagem de eventos (events/page.tsx): fazer botão "Detalhes" realmente navegar para a central `/dashboard/events/[id]` (atualmente não tem href)
  - Na listagem de eventos: incluir badge financeiro rápido (ex: "Saldo R$ X restante" ou progresso %) quando agreed_value > 0
  - Na página Financeiro: mostrar nome do evento vinculado em transações que tem event_id
  - Rodar build do Next.js para validar TypeScript/ESLint
  - Rodar lint do projeto
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-5, AC-6
- **Test Requirements**:
  - `rule` TR-9.1: `npm run build` ou `npm run lint` passa sem erros TypeScript/Eslint críticos
  - `rule` TR-9.2: Navegação "Detalhes" → abre Central do Evento correta
  - `rule` TR-9.3: Transação financeira com event_id → mostra nome do evento na listagem
