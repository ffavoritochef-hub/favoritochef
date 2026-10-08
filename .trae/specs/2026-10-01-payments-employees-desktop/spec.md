# Pagamentos Parciais + Funcionários + Layout Desktop - Product Requirements Document

## Overview
- **Summary**: Implementar três frentes no sistema de gestão de buffet: (1) módulo de pagamentos parciais de clientes vinculados a cada evento, com acompanhamento de saldo devedor; (2) cadastro de funcionários e alocação deles nos eventos; (3) otimização do layout desktop das páginas principais para melhor aproveitamento de espaço e consistência visual.
- **Purpose**: Resolver a lacuna de não ter controle sobre pagamentos parcelados de clientes, falta de gestão de equipe por evento e layout desktop pouco aproveitado em telas grandes.
- **Target Users**: Proprietário e gerente do buffet, quem faz o lançamento financeiro e escala a equipe.

## Goals
- Permitir lançar múltiplos pagamentos parciais por evento (entrada, 2ª via, 3ª via, etc.) com data, valor, método e observação.
- Exibir resumo financeiro do evento: valor fechado, total recebido, saldo a receber, progresso %.
- Criar CRUD de funcionários (nome, função/cargo, telefone, status ativo/inativo).
- Permitir alocar múltiplos funcionários por evento e listar quem trabalhou em cada buffet.
- Melhorar o layout das telas de listagem no desktop (eventos em grid 2 colunas, transações em tabela mais robusta, formulários com largura equilibrada).
- Criar página de detalhes do evento que centralize tudo: dados básicos + pagamentos recebidos + funcionários alocados + despesas vinculadas + lucro/prejuízo.

## Non-Goals
- Não implementar controle de ponto/horário de funcionários (só alocação por evento).
- Não implementar integração de pagamento online (apenas lançamento manual dos recebimentos).
- Não implementar notificações push ou e-mail de lembrete de pagamento.
- Não refatorar temas de dark mode ou mudar identidade visual atual.

## Background & Context
- Sistema atual tem tabela `events` com `agreed_value` (valor fechado com cliente) mas nenhum mecanismo de recebimentos parciais.
- Tabela `finance_transactions` já existe e tem `event_id` (FK para eventos) — já suporta vincular receitas/despesas a eventos.
- Página de listagem de eventos usa `grid-cols-1` em todos os breakpoints; no desktop tela grande fica 1 card por linha com muito espaço vazio.
- Não existe página de detalhes do evento (`/dashboard/events/[id]`), só listagem e edição.
- Não existe tabela/cadastro de funcionários.
- Paleta, espaçamentos e design system já definidos no projeto (ver project_memory).

## Functional Requirements
- **FR-1 (Pagamentos)**: Na página de detalhes do evento e/ou no novo evento, permitir cadastrar N pagamentos com: valor, data recebimento, método de pagamento (Pix, Dinheiro, Cartão, Transferência, Boleto, Outro), status (Recebido/Previsão) e observações.
- **FR-2 (Pagamentos)**: Exibir painel financeiro do evento com Valor Fechado, Total Recebido, Saldo a Receber e barra de progresso %.
- **FR-3 (Pagamentos)**: Cada pagamento do cliente pode ser opcionalmente espelhado como uma `finance_transactions` do tipo receivable/status=recebido (checkbox "Registrar também no Financeiro").
- **FR-4 (Funcionários)**: Criar página de listagem e cadastro de funcionários (CRUD): nome completo, cargo/função, telefone/celular, e-mail (opcional), observações, status ativo/inativo.
- **FR-5 (Funcionários)**: No formulário de novo evento e edição de evento, permitir selecionar múltiplos funcionários para serem alocados (com campo opcional de "função específica neste evento").
- **FR-6 (Funcionários)**: Na página de detalhes do evento, listar todos os funcionários alocados, com nome, cargo e função específica (se houver).
- **FR-7 (Layout Desktop)**: Listagem de eventos (`/dashboard/events`) usar grid 2 colunas a partir de `lg` e 3 colunas a partir de `2xl`, mantendo 1 coluna no mobile.
- **FR-8 (Layout Desktop)**: Páginas de formulário (novo/editar evento, cliente etc.) manter largura máxima consistente e aproveitar grid com mais colunas em telas XL/2XL.
- **FR-9 (Layout Desktop)**: Incluir item "Funcionários" no menu lateral e na navegação inferior mobile (no item "Mais").
- **FR-10 (Detalhes Evento)**: Criar página `/dashboard/events/[id]` como "Central do Evento" com abas/seções visíveis: Dados Gerais, Pagamentos Recebidos, Equipe Alocada, Despesas, Rentabilidade.
- **FR-11 (Rentabilidade)**: Na central do evento, exibir cálculo automático: Valor Fechado - Total de Despesas vinculadas = Lucro/Prejuízo do evento; e também Valor Fechado - Total Recebido em pagamentos = Saldo a Receber.

## Non-Functional Requirements
- **NFR-1**: Mobile first — tudo que for adicionado deve manter a experiência mobile já validada como boa.
- **NFR-2**: Todos os inputs mantêm font-size >= 16px e altura h-12 em mobile (evitar zoom iOS).
- **NFR-3**: Paleta 100% através de variáveis CSS; nenhuma cor hardcoded em hexadecimal.
- **NFR-4**: CRUDs com idempotência e feedback via toast de sucesso/erro em todas as operações.
- **NFR-5**: Migrações SQL idempotentes (IF NOT EXISTS) e aplicáveis via Supabase SQL Editor.
- **NFR-6**: Acessibilidade: botões/inputs com aria-labels quando apropriado, e estados focáveis visíveis.

## Constraints
- **Technical**: Next.js (conforme regras do workspace, ler node_modules/next/dist/docs antes de escrever se tiver dúvida), Supabase, Tailwind, componentes shadcn/ui existentes.
- **Business**: Sinais financeiros (sucesso, erro, atenção) seguem a paleta existente.
- **Dependencies**: Migração Supabase para criar 3 estruturas: `employees`, `event_employees`, `event_payments` (ou equivalente).
- **UI/UX**: Arredondamentos conforme project_memory (cards 16px, botões/inputs 10px, badges 20px).

## Assumptions
- Vínculo N:N eventos <-> funcionários com tabela associativa.
- Pagamentos do cliente são vinculados a 1 evento (não existe pagamento genérico de cliente sem evento).
- O sistema de autenticação atual (AuthContext) é suficiente para controlar acesso às novas telas.
- Usuário aprova que a página "Menu / Mais" receba o item de Funcionários na navegação inferior mobile.

## Open Questions
- [ ] Pagamentos devem permitir marcar individualmente como "previsão" (recebimento futuro) vs "recebido"? Assumido: sim.
- [ ] Funcionários podem ter valor por hora/diária para custo do evento? Assumido: não nesta iteração; deixar campo "função específica no evento" só textual.

## Acceptance Criteria

### AC-1: Cadastro de pagamento parcial em um evento
- **Type**: `rule`
- **Given**: Estou na central/detalhes de um evento com Valor Fechado de R$ 5.000,00
- **When**: Clico em "Adicionar Pagamento", preencho valor R$ 2.000,00, data hoje, método Pix, status Recebido, observação "Sinal" e salvo
- **Then**: A lista de pagamentos exibe o novo lançamento, o painel mostra Total Recebido R$ 2.000, Saldo a Receber R$ 3.000, progresso 40%
- **Pass Condition**: Dados persistidos em Supabase e cálculo automático bate com soma
- **Evidence**: Screenshot da tela e select SQL do pagamento + dados do evento

### AC-2: CRUD de funcionários
- **Type**: `rule`
- **Given**: Acesso ao menu Funcionários
- **When**: Cadastro funcionário "João Silva", cargo "Churrasqueiro", telefone "(11)99999-9999", ativo
- **Then**: Ele aparece na listagem; posso editar para mudar cargo; posso inativar e ele some das seleções futuras
- **Pass Condition**: Operações Create/Read/Update/Soft-delete funcionam via interface
- **Evidence**: Listagem, edição e select na tabela employees

### AC-3: Alocar funcionários no evento
- **Type**: `rule`
- **Given**: Evento já criado e 3 funcionários ativos cadastrados
- **When**: Edito o evento, seleciono 2 funcionários (um como "Chef", outro como "Auxiliar de churrasco") e salvo
- **Then**: Na central do evento, a seção Equipe lista exatamente esses 2 funcionários com suas funções
- **Pass Condition**: Tabela associativa event_employees populada corretamente
- **Evidence**: SQL join events x event_employees x employees

### AC-4: Listagem de eventos responsiva (desktop)
- **Type**: `rule`
- **Given**: Tenho 6 eventos cadastrados e estou em uma tela >= 1280px (lg)
- **When**: Abro a página /dashboard/events
- **Then**: Os cards aparecem em grid 2 colunas; em tela >= 1536px (2xl) ficam 3 colunas; mobile continua 1 coluna
- **Pass Condition**: Breakpoints aplicados corretamente via grid-cols
- **Evidence**: Captura de tela em cada breakpoint

### AC-5: Página de detalhes do evento existe e funciona
- **Type**: `rule`
- **Given**: Evento válido existe com ID X
- **When**: Navego para /dashboard/events/X
- **Then**: Página carrega com dados do evento, link para editar, seções de pagamentos/equipe/despesas visíveis
- **Pass Condition**: Roteamento funciona, dados carregam sem erro
- **Evidence**: Navegação e tela renderizada

### AC-6: Cálculo de rentabilidade do evento
- **Type**: `rule`
- **Given**: Evento com Valor Fechado R$ 6.000; duas despesas vinculadas de R$ 500 + R$ 1.500
- **When**: Abro central do evento, seção Rentabilidade
- **Then**: Exibe "Despesas R$ 2.000", "Lucro Estimado R$ 4.000"
- **Pass Condition**: Cálculo (agreed_value - sum finance_transactions where type=payable & event_id=X) está correto
- **Evidence**: Soma SQL vs exibição

### AC-7: Qualidade do layout desktop
- **Type**: `rubric`
- **Dimension**: Aproveitamento de espaço e organização visual em desktop
- **Scale**: 1-5
- **Anchors**: 1 = muito espaço vazio, 1 coluna em tudo; 3 = aproveitamento mediano, algum grid 2 colunas; 5 = grid em listagens, formulários em largura confortável, sidebar estável, elementos sem exceder overflow-x
- **Pass Threshold**: >= 4
- **Evidence**: Prints das telas Events, Dashboard, Finance em 1920x1080

### AC-8: Qualidade da experiência mobile preservada
- **Type**: `rubric`
- **Dimension**: Preservação e consistência da experiência mobile após mudanças
- **Scale**: 1-5
- **Anchors**: 1 = quebrou layouts mobile, overflow horizontal, inputs menores que h-12; 3 = pequenos ajustes necessários mas funcional; 5 = tudo continua perfeito, inputs h-12, sem quebras, navegação inferior operante
- **Pass Threshold**: >= 4
- **Evidence**: Capturas em viewport 375x667 (iPhone SE) das mesmas telas
