# CHANGELOG.md — ERP Clínica

Mais recente no topo. Formato: **data · módulo · alteração · impacto**.

## 2026-09-13 · `financial` (tela) · Cadastro do local por seleção e rótulo "Identificação do local"

**Alteração**

- O cadastro do **local do recurso** deixou de ser texto livre: o campo **"Identificação do local"** é uma
  **seleção** com sugestões por tipo (`Espécie` → "Dinheiro (gaveta)"; `Banco` → "Banco principal"/"Banco
  secundário"; `Conta de maquineta` → "Maquineta principal"/"Maquineta 2") e a opção **"Outro (digitar)"**,
  que libera o nome próprio para quem tem mais de uma conta ou maquineta.
- O tipo (`Espécie`/`Banco`/`Conta de maquineta`) continua sendo seleção e passa a **filtrar** as sugestões.
- Texto de apoio explica para que serve cada tipo e que o local, depois de cadastrado, é apenas
  **selecionado** nos lançamentos, nas baixas e na conciliação.
- **Sem migração e sem mudança de backend**: o nome continua livre no banco — mudou só a tela.
- Terminologia **não** alterada para "Origem" de propósito: `origem` já significa de onde veio o lançamento
  (`Atendimento`, `Assinatura`, `Manual`) e duas "origens" com sentidos diferentes no mesmo módulo
  confundiriam relatórios e conferências depois.

**Impacto**

- Nada muda nos dados já cadastrados: locais existentes continuam valendo com o nome que têm.
- Quem tem um local de cada tipo cadastra em dois toques; quem tem vários usa "Outro (digitar)".
- `tsc`, `oxlint` e build do frontend aprovados; fluxo conferido em navegador real (390px): sugestões por
  tipo, "Outro (digitar)" abrindo o nome próprio e os três cadastros aparecendo na lista, sem erro de tela.

## 2026-09-13 · `financial` · Caixa, contas a receber/pagar e conciliação (Fase 6.1)

**Alteração**

- **Locais do recurso** (`ResourceAccount`: `CASH`, `BANK`, `CARD`) passaram a ser cadastro do módulo
  financeiro (`GET/POST /api/financial/accounts`) — antes o local era um conjunto fixo de formas de
  pagamento. É a base do saldo por origem e da conciliação.
- **Caixa mensal** (`CashPeriod` + `CashBalance`): `POST /api/financial/cash-periods` abre o mês
  **transportando automaticamente** o saldo apurado (`countedCents`) de cada local do último período
  fechado; `POST /api/financial/cash-periods/:id/close` fecha com saldo inicial, entradas, saídas,
  **saldo esperado**, **saldo apurado** e **divergência** por local, com motivo obrigatório.
- Abertura duplicada do mesmo mês, período fora de sequência, saldo inicial digitado à mão
  (400 — o transporte é a regra) e fechamento com lançamento **sem local definido** são recusados.
- Lançamento pode receber local depois (`PATCH /api/financial/transactions/:id/resource`).
- **Período fechado não aceita edição nem cancelamento** de lançamento (409). Ajuste é lançamento
  **novo** vinculado ao original (`adjustmentOfId`) e idempotente por chave
  (`POST /api/financial/transactions/:id/adjustments`, motivo obrigatório).
- **Contas a receber e a pagar** (`FinancialTitle` + `FinancialSettlement`): vencimento, valor,
  descrição, contraparte; situação derivada das baixas (`PENDENTE`, `PARCIAL`, `PAGO`, `CANCELADO` +
  marca de vencido); baixa parcial ou total com **local de destino** e forma de pagamento; a baixa
  gera **um** lançamento financeiro (`transactionId` único) e é idempotente por `idempotencyKey`.
- **Conciliação** (`FinancialReconciliation`): confere por período e por local o saldo esperado contra o
  saldo efetivo e **registra a divergência sem alterar lançamentos**; motivo/referência obrigatórios.
- **Consistência transacional**: o evento de domínio passou a ser publicado **dentro da transação** do
  caso de uso dono (`DomainEventBus.publish(evento, tx)`, entrega sequencial), então o lançamento
  financeiro de atendimento realizado e de pagamento de assinatura entra na mesma transação — falha de
  auditoria/lançamento desfaz a operação inteira, sem duplicar.
- Toda operação de caixa, baixa, ajuste e conciliação grava `AuditEvent` pelo caso de uso (autor,
  motivo, antes → depois, `requestId`).
- Frontend: a tela Financeiro ganhou as abas **Caixa**, **Contas a receber**, **Contas a pagar** e
  **Conciliação**, com formulários em modal e estado de erro/vazio, seguindo o padrão existente.
- Migrações **aditivas**: `20260913190000_cash_accounts`, `20260913191000_financial_titles`,
  `20260913192000_financial_reconciliation`.

**Impacto**

- Nenhum endpoint existente foi quebrado: `POST/PATCH /api/financial/transactions*`, `/summary` e
  `/reports` mantêm contrato e resposta; o que mudou foi o corpo passar a aceitar `resourceAccountId`
  e o lançamento manual/automático a registrar auditoria.
- Nada é obrigatório para continuar funcionando: os módulos existentes seguem lançando como antes,
  porém lançamento **sem local** agora conta para o fechamento do caixa e precisa ser classificado
  antes de fechar o mês (`PATCH /transactions/:id/resource`).
- **Passa a existir bloqueio após o fechamento**: cancelar/editar lançamento de mês fechado devolve 409.
  Antes disso, nenhum mês estará fechado — quem publicar primeiro não sente diferença.
- `FinancialTitle`/`FinancialSettlement` **não substituem** `FinancialTransaction`: a baixa cria o
  lançamento. Os relatórios e indicadores continuam lendo `FinancialTransaction`.
- Banco de desenvolvimento recebeu as três migrações (`prisma migrate status`: *up to date*).

**Verificação**

- **80 unitários** (19 arquivos) e **84 e2e** (11 arquivos) passando, incluindo o e2e novo
  `test/cash-period.e2e-spec.ts` com 12 casos: abertura duplicada, transporte de saldos, lançamento sem
  local bloqueando o fechamento, fechamento com divergência, bloqueio pós-fechamento, ajuste idempotente,
  baixa parcial/total, baixa em mês fechado, conciliação sem mutação e falha de auditoria/lançamento
  revertendo a operação.
- `tsc`, `oxlint` e `build` aprovados nos dois projetos.
- **Navegador real** (Chromium via CDP, 390×844 e 1440×1000): abertura do caixa por três locais,
  movimentação por formulário, baixa parcial e total de conta a receber, pagamento, conciliação com
  divergência, fechamento com saldo apurado e **transporte dos saldos para o mês seguinte** — sem erro
  de tela (`role=alert`) nem estouro horizontal.

**Publicação (2026-09-13)**

- PR **#16** aprovado e integrado em `main` (merge `486a3f4`); deploy no CapRover **concluído**
  (`erp-estetica`, container `healthy`).
- Verificação em produção: `/api/health` → `database: up`; SPA e deep link `/financeiro` → 200; as
  rotas novas sem sessão devolvem **401** (registradas e protegidas, não 404); `POST /api/financial/cash-periods`
  com mês inválido devolve **400** com a mensagem do DTO; as três migrações aparecem em
  `_prisma_migrations` no banco `erp_estetica` e as tabelas foram criadas.
- **Navegador real em produção** (sessão temporária de verificação, removida em seguida): as abas
  **Caixa**, **Contas a receber**, **Contas a pagar** e **Conciliação** renderizam em 390px e 1440px,
  sem erro de tela. Nenhum dado de produção foi criado além do usuário temporário — que foi **excluído**
  junto com suas sessões ao fim da verificação.
- **Pendência operacional:** cadastrar os locais do recurso da clínica (espécie, banco, maquineta) na
  tela Caixa — sem local cadastrado o caixa não abre.

---

## 2026-09-13 · `auth` + `Sistema` · Seção Sistema e gestão de usuários

**Alteração**

- O menu ganhou a seção **Sistema**, com **Auditoria**, **Usuários** e **Integração**. A auditoria saiu de `/auditoria` para `/sistema/auditoria` (a rota antiga redireciona).
- **Gestão de usuários** (`/sistema/usuarios`): listar com busca/nome/e-mail, filtro por perfil e situação, criar usuário, trocar perfil (ADMIN/USER), inativar, reativar e redefinir senha.
- Endpoints `GET/POST /api/users`, `PATCH /api/users/:id/role`, `PATCH /api/users/:id/inactivate|reactivate`, `POST /api/users/:id/password` — **todos com `@Roles('ADMIN')`**.
- **Integração**: tela preparada que lista os pontos de integração já existentes (trilha de auditoria, eventos de domínio, contratos públicos) e o que está por vir. **Nenhum agente de IA conectado ainda** — a tela não executa ação.
- O contrato de auditoria passou a aceitar **booleano** em `changes` (inativação/reversão de usuário), com renderização "Sim/Não" na tela.

**Impacto**

- Menu passa a ter **11 itens** organizados em seções (8 de operação + 3 em Sistema).
- Sem migração: `User.active` e `lastLoginAt` já existiam e o login já bloqueava usuário inativo.
- Regras de proteção novas: e-mail único, senha inicial/redefinida **sempre** com troca obrigatória, inativação e redefinição **encerram as sessões**, **não é possível ficar sem administrador ativo**, o admin não se inativa nem se rebaixa, e a senha **nunca** é gravada na trilha.
- Toda alteração de usuário gera evento no módulo `audit` (aparece em Auditoria).

**Verificação**

- **69 unitários** e **74 e2e**: criação com troca obrigatória, e-mail repetido (409), senha fraca/perfil inválido/e-mail inválido (400), filtros e paginação, troca de perfil, redefinição (senha antiga deixa de valer, senha nova exige troca e não aparece na trilha), inativação bloqueando login e reativação liberando, proteção do próprio admin, 403 para perfil `USER`, 401 sem sessão e 404 para exclusão física.
- typecheck, lint e builds dos dois projetos aprovados.

---

## 2026-09-13 · `audit` · Tela de auditoria do sistema (ADMIN) e autorização por perfil

**Alteração**

- Nova tela **Auditoria** no menu (`/auditoria`), **exclusiva do ADMIN**: filtros por usuário, módulo, tipo de registro, ação, período e busca livre (motivo, autor ou id), paginação e o antes → depois com rótulos de negócio.
- `GET /api/audit/events` e `GET /api/audit/filters` (opções vindas do que já foi registrado, não de lista fixa).
- `RolesGuard` + `@Roles(...)`: **autorização por perfil** entra no sistema (era dívida aberta). O guard é global e só age em rota marcada — rota sem `@Roles` continua como antes, sem quebrar os módulos publicados.
- Filtro de período é dia inteiro em `America/Recife` (00:00 → 23:59:59 UTC-3).
- A trilha segue **sem** rota de edição/exclusão (e2e verifica que `PATCH`/`DELETE` devolvem 404).

**Impacto**

- Menu passa a ter **9 itens**, e o item "Auditoria" só aparece para ADMIN (escondido no frontend, bloqueado com 403 no backend).
- Nenhuma migração: a tabela `AuditEvent` já existia.
- Sem autorização por perfil nos outros módulos — é decisão incremental, não automática.

**Verificação**

- **60 unitários** e **65 e2e**: filtros por autor/módulo/tipo/ação, busca livre, período com o caso de fronteira de fuso (evento das 23h de Recife), opções de filtro, 403 para perfil `USER`, 401 sem sessão, 400 de validação e 404 para edição/exclusão.
- typecheck, lint e builds dos dois projetos aprovados.

---

## 2026-09-13 · `subscriptions` · Correção da paginação da linha do tempo (achada em navegador real)

**Alteração**

- `PaymentTimelineQueryDto` passa a estender o `PaginationQueryDto` compartilhado, que já traz `@Type(() => Number)`.

**Impacto**

- Antes, `GET .../timeline?page=1&pageSize=50` devolvia **400** (`page must not be less than 1…`), porque na query string os números chegam como texto: sem `@Type(() => Number)` o `@IsInt()` reprova. Só o caminho **sem** parâmetros funcionava — foi por isso que e2e e smoke passaram e o defeito apareceu apenas dirigindo a tela real.
- Frontend não mudou (já enviava `page`/`pageSize`); a timeline voltou a renderizar na UI.

**Verificação**

- e2e passou a cobrir o caminho feliz **com** paginação explícita (além do caso inválido), para o defeito não voltar: 56 unitários e 58 e2e.

---

## 2026-09-13 · `audit` + `subscriptions` · Trilha de alterações e correção de pagamento

**Alteração**

- Módulo transversal `audit`: `AuditEvent` **append-only** + `AuditTrailService` (contrato público, aceita transação Prisma). Registra autor (id + snapshot de nome/e-mail), módulo, entidade, ação, `requestId`, motivo e **apenas os campos alterados** antes → depois.
- Pagamento de assinatura passa a ser **editável**: `GET` do detalhe, `PATCH` com `reason` obrigatório e `GET .../timeline`. Edição sem mudança efetiva é recusada (400).
- A correção do pagamento **sincroniza o lançamento financeiro vinculado na mesma transação** (valor, data, forma), sem criar segundo lançamento.
- Frontend mobile-first: cada pagamento do histórico abre o detalhe, com botão **Editar pagamento** e a **linha do tempo** (autor, data/hora de Recife, motivo e antes → depois com rótulos de negócio).

**Impacto**

- Migração aditiva `20260913160000_audit_payment_history`. **Não há histórico retroativo**: pagamentos lançados antes disso aparecem sem eventos de auditoria.
- `SubscriptionsModule` passa a depender dos contratos públicos de `audit` e `financial` (nunca de repositories/tabelas alheias).
- `MODULES.md` ganhou a seção `audit`; `ARCHITECTURE.md` registrou as decisões 7.38 e 7.39.

**Verificação**

- TDD com RED observado; **56 unitários** e **58 e2e**, typecheck, lint, builds e `npm audit` zero nos dois projetos.
- e2e cobre: motivo obrigatório, recusa de no-op, mudanças exatas na trilha, financeiro sincronizado sem duplicar (1 lançamento), 401 sem sessão e 400 de paginação.

---

## 2026-09-13 · `protocols` · Fase 7 implementada

**Alteração**

- Fichas clínicas com status, inativação lógica, snapshots de cliente/procedimento e edição administrativa controlada.
- Sessões append-only em ordem cronológica, com procedimento e atendimento realizado opcionais via contratos públicos.
- Frontend mobile-first: filtros, estados loading/erro/vazio, criação/edição, detalhe, evolução e impressão.

**Impacto**

- Migração aditiva `protocols_module`, com backfill apenas do snapshot de nome de fichas preexistentes; nenhum registro clínico é removido ou reescrito.
- `ProtocolQueryService` passa a ser contrato público para consultas futuras.

**Verificação**

- TDD com RED observado; 53 unitários e 55 e2e, typecheck, lint, builds e `npm audit` zero.

**Publicação**

- PR #12 revisado e mesclado em `main` (`c53001fb`); deploy CapRover concluído.
- Migração `20260913150000_protocols_module` aplicada; container saudável e tabelas clínicas preservadas sem registros prévios.
- Produção: health/SPA/deep link 200; protocolos e Swagger 401 sem sessão e 200 autenticados.
- Chromium real: `/protocolos` exibiu filtros, estado vazio e formulário completo de nova ficha.

---

## 2026-09-13 · `financial` · Fase 6 implementada

**Alteração**

- Receitas/despesas manuais e automáticas, status e cancelamento lógico.
- Eventos públicos de atendimento concluído e pagamento recebido, sem acesso cruzado a repositories/tabelas.
- Idempotência por vínculos únicos, indicadores, filtros e relatórios por snapshots históricos.
- Frontend mobile-first completo com filtros, formulário e estados loading/erro/vazio.

**Impacto**

- Migração aditiva `financial_module`; nenhum lançamento existente é duplicado ou removido.
- `FinancialQueryService` passa a ser o contrato público para o dashboard.

**Verificação**

- TDD com RED observado; 48 unitários e 51 e2e, typecheck, lint, builds e `npm audit` zero.

**Publicação**

- PR #11 mesclado em `main` (`56169cb`); deploy CapRover concluído com auditoria remota em zero.
- Migração `20260913143000_financial_module` aplicada; container saudável e tabela financeira preservada com zero registros anteriores.
- Produção: health/SPA/deep link 200; financeiro e Swagger 401 sem sessão; login e endpoints financeiros/Swagger 200 autenticados.
- Chromium real: `/financeiro` exibiu indicadores, filtros, estado vazio, relatórios e modal de lançamento manual.

---

## 2026-09-13 · infraestrutura · dependências sem vulnerabilidades conhecidas

**Alteração**

- Mantidos NestJS 12.0.1 e Prisma 7.10.0; rejeitado o downgrade major sugerido pelo `npm audit fix --force`.
- Overrides transitivos mínimos: `multer` 2.3.0, `deepmerge-ts` 8.0.2 e `mysql2` 3.24.4.
- Removido `@nestjs/mau`, ferramenta de desenvolvimento não utilizada que introduzia `tmp` e `undici` vulneráveis.
- Imagem Docker fixa npm 12.0.2 no build e runtime para consumir consistentemente o lockfile npm 12.
- Locks reinstalados do zero; `npm audit` completo e `npm audit --omit=dev` do backend, além do audit do frontend, retornam zero.
- Gate aprovado: Prisma generate, typecheck, lint, 42 unitários, 45 e2e e builds backend/frontend; smoke HTTP local aprovado.

**Impacto**

- Imagem de runtime deixa de carregar as 9 vulnerabilidades altas reportadas, sem downgrade de framework/ORM e sem mudança de contrato de aplicação ou banco.
- Overrides são temporários e devem ser removidos quando NestJS/Prisma passarem a fixar as versões corrigidas.

**Publicação**

- PR #10 mesclado em `main` (`415d6ab`) e deploy CapRover concluído; build remoto auditou 462 pacotes de desenvolvimento e 285 pacotes de runtime com zero vulnerabilidades.
- Container de produção saudável, Prisma conectado ao PostgreSQL e seis migrações sem pendência; árvore instalada confirmada com `multer@2.3.0`, `deepmerge-ts@8.0.2` e `mysql2@3.24.4`.
- Produção verificada: health e banco 200; auth, clientes, procedimentos, agenda, planos, assinaturas e Swagger protegidos com 401 sem sessão; SPA e deep links 200.
- Navegador Chromium real: login, menu completo, catálogo de procedimentos, tela de assinaturas, APIs autenticadas e modal de nova assinatura aprovados.

---

## 2026-09-13 · `subscriptions` · Fase 5 implementada

**Alteração**

- Planos, assinaturas e pagamentos com três repositories exclusivos e serviços separados por caso de uso.
- Snapshot comercial de plano; dinheiro em centavos; ciclo sem exclusão física e bloqueio de contrato ativo duplicado.
- `SubscriptionQueryService` público para financial/dashboard; dependência de clientes só via `ClientQueryService`.
- Frontend mobile-first com abas, filtros, formulários, ações de status, pagamentos e estados loading/erro/vazio.
- Gate aprovado: 42 unitários, 45 e2e, typecheck, lint e builds; smoke HTTP e CDP real aprovados.

**Impacto**

- Migração aditiva `subscription_snapshots`; contratos históricos não serão recalculados quando um plano mudar.
- Fase 6 pode consultar assinaturas pelo serviço público, sem acessar tabelas internas.

**Publicação**

- PR #9 revisado, correção de edição de planos aplicada (`7418eb5`) e merge em `main` (`83661f2`).
- Deploy CapRover concluído; migração `20260913052927_subscription_snapshots` aplicada no boot e container saudável.
- Produção verificada: health 200; API e Swagger 401 sem sessão; com sessão, planos, assinaturas e Swagger 200; SPA e deep link 200; navegador real exibiu abas, estado vazio e formulário completo.

---

## 2026-09-13 · `appointments` · Fase 4 implementada

**Alteração**

- Agenda completa: repository exclusivo, serviços de comando/consulta, REST e `AppointmentQueryService` exportado.
- Snapshot comercial de procedimento, quantidade, valor unitário vigente e total; dependências apenas pelos serviços públicos.
- Máquina de estados sem exclusão física; consultas diária, semanal, período, cliente e status.
- Frontend mobile-first com alternância dia/semana, criação e ações nos cards.
- Gate aprovado: 38 unitários, 41 e2e, typecheck, lint e builds dos dois projetos.

**Impacto**

- Migração aditiva `appointment_snapshot`; `AppointmentQueryService` é o contrato de leitura das Fases 6 e 9.

**Publicação**

- PR #8 revisado e mesclado em `main` (`d8ec3e7`); deploy CapRover concluído.
- Migração `20260913050509_appointment_snapshot` aplicada no boot; container saudável e banco operacional.
- Produção verificada: health 200, agenda sem sessão 401, SPA `/agenda` 200 e navegador real autenticado exibindo Dia, Semana e Novo agendamento; consulta diária autenticada 200.

---

## 2026-09-13 · `procedures` · unidade de medida e correção do valor vigente

**Alteração** (pedido do cliente: alterar o valor e definir unidade dos procedimentos já gravados)

- Novo campo **`Procedure.unit`** (`ProcedureUnit`): `SESSAO` (padrão), `APLICACAO`, `REGIAO`, `ML`, `UNIDADE`, `HORA`, `PACOTE`. É a base de cobrança do valor unitário e aparece como "R$ 900,00 / região" na listagem, no histórico e na tela do procedimento.
- Migração **aditiva** (`procedure_unit`, com `DEFAULT 'SESSAO'`): os 6 procedimentos de produção entram como "Sessão" sem perder nada e a unidade pode ser ajustada na tela.
- Novo endpoint **`PATCH /api/procedures/:id/prices/:priceId`**: corrige valor e observação da vigência **atual** — é o caminho para ajustar um valor já gravado sem inventar uma vigência nova.
- Regra: vigência **encerrada não é editável** (409) — o passado é o que foi praticado; payload vazio (400).
- Frontend: campo "Unidade de medida" no cadastro/edição, ação **Alterar valor** na vigência atual do histórico, e o modal com os dois modos (novo valor / correção).
- Correção de acessibilidade no caminho: `Input` e `Select` passaram a gerar `id` com `useId`, então o `<label>` está sempre ligado ao campo (sem `name`/`id` o campo ficava sem rótulo associado — percebido ao automatizar a tela).
- Testes: **35 unitários e 38 e2e** (novos: unidade, correção da vigência atual, recusa de edição de vigência encerrada, correção não altera datas anteriores).

**Publicação**

- Mesclado em `main` (`e6306d4`) e publicado. Migração `procedure_unit` aplicada no boot do container: os **6 procedimentos de produção entraram com unidade `SESSAO`** e valores vigentes intactos (Botox R$ 900,00; Labial e Mento R$ 750,00; Malar, Mandibula e Bigode Chinês R$ 900,00).
- Verificado em produção por API e em **navegador real** (somente leitura, sem alterar dado): tela do Botox com "R$ 900,00 / sessão", card de unidade, histórico com 1 vigência e as ações **Novo valor** e **Alterar valor** disponíveis; listagem com valor + unidade.

**Impacto**

- Nenhum dado perdido: a unidade é aditiva com padrão. `currentValueCents` continua derivado da vigência atual.
- Consumidores futuros (agenda/financeiro) devem usar `unit` como base da quantidade e gravar o valor unitário aplicado no próprio registro.

---

## 2026-09-13 · `procedures` · valor unitário com vigência (série histórica)

**Alteração** (pedido do cliente: valores mudam e precisam manter histórico)

- Nova entidade `ProcedurePrice`: `valueCents`, `validFrom`, `validTo` (nulo = vigência atual) e observação. O campo único `Procedure.defaultValueCents` foi **removido** — duas fontes de verdade divergiriam no primeiro reajuste.
- A API passa a devolver `currentValueCents` (derivado da vigência atual) e o histórico em `GET /api/procedures/:id/prices`.
- Endpoints novos: `POST /api/procedures/:id/prices` (novo valor: fecha a vigência anterior no dia em que a nova começa), `DELETE /api/procedures/:id/prices/:priceId` (correção; a anterior volta a valer) e `GET /api/procedures/:id/price-on?date=` (valor que valia no dia).
- Regras: vigência só entra depois da mais recente (409); o único valor não pode ser removido (409); o valor não é editável pelo `PATCH` do cadastro (400); datas são `DATE` calculadas no fuso da clínica.
- `ProcedureQueryService.valueOn(id, data)` entra no contrato público, para o financeiro usar o preço **do dia do atendimento** em vez do preço de hoje.
- Frontend: tela do procedimento (`/procedimentos/:id`) com valor vigente, duração, situação e **histórico de valores**; modal "Novo valor"; edição do cadastro não mexe em preço.
- **Migração de dados:** a migração `procedure_prices` copia o valor único de cada procedimento para uma vigência aberta antes de remover a coluna. Validada contra uma cópia dos dados reais de produção: **6 procedimentos → 6 vigências, soma R$ 5.100,00 preservada**.
- Testes: 31 unitários e 31 e2e no total (novos: 10 unitários do serviço de vigência e 6 e2e da série histórica).

**Publicação**

- Mesclado em `main` (`ccf95bd`) e publicado. A migração rodou no boot do container: **6 procedimentos de produção → 6 vigências, soma R$ 5.100,00 preservada** (Botox R$ 900,00; Labial e Mento R$ 750,00; Malar, Mandibular e Bigode Chinês R$ 900,00), todas abertas e com a observação da migração.
- Verificado por API em produção: listagem com `currentValueCents`, histórico do Botox com 1 vigência, consulta por data, 401 sem sessão.

**Impacto**

- Mudança de contrato no módulo novo: `defaultValueCents` sai, `currentValueCents` entra. Nenhum outro módulo consumia o campo ainda (agenda e financeiro são fases futuras) — por isso a troca é barata agora e cara depois.
- Consumidores futuros devem gravar o valor aplicado no próprio registro, nunca recalcular pelo preço de hoje.

---

## 2026-09-13 · módulo `procedures` · Fase 3 implementada

**Alteração**

- Novo módulo `procedures` (catálogo): repositório único com Prisma, DTOs, `ProcedureService` e `ProcedureQueryService` — este último **exportado** como contrato público para agenda, protocolos e financeiro referenciarem procedimento pelo id.
- Endpoints: cadastrar, listar/pesquisar (paginado, filtro `active=true|false`), detalhar, editar, inativar e reativar. Sem `DELETE`, como no módulo de clientes.
- Regras: nome único (409), valor padrão em centavos, duração inteira de 5 a 600 minutos.
- Frontend: `features/procedures/` (tipos, api, hook com debounce, tabela, formulário em modal com valor em reais convertido para centavos) e novo item **Procedimentos** no menu lateral (8 itens).
- Testes: 7 unitários do `ProcedureService`, 5 e2e do módulo (21 unitários e 23 e2e no total).
- **Correção no `OriginGuard`** (da fase anterior): a comparação entre `Origin` e `Host` recusava o login legítimo quando um proxy troca o `Host` (proxy do Vite em desenvolvimento). O guard agora considera `X-Forwarded-Host` e a lista `CORS_ORIGINS`, aceitando mesmo hostname em porta diferente; o caso positivo passou a ter teste (antes só o caso negativo era testado — foi assim que o bug escapou).

**Publicação**

- Mesclado em `main` (`194758e`) e publicado no CapRover. Sem migração: a tabela `Procedure` já existia desde a Fase 1.
- Verificado em produção por API e em **navegador real**: login da Dra. Karine, menu com os 8 itens, `/procedimentos` renderizando o catálogo vazio, Swagger com as 4 rotas, `/api/clients` 401 sem sessão (com o dado real preservado: 1 cliente).

**Impacto**

- Nenhuma migração de banco: a tabela `Procedure` já existia desde a Fase 1.
- Nenhuma alteração em contrato de módulo existente; `clients` e `auth` intocados.

---

## 2026-09-13 · módulo `auth` · autenticação e sessão (Fase 2.5)

**Alteração**

- Novo módulo `auth`: `User` e `Session` no schema (migração `auth_users_sessions`), `AuthService`, `SessionService`, `SessionAuthGuard` global, `OriginGuard`, bloqueio por tentativas (429) e troca de senha obrigatória no primeiro acesso.
- Sessão em Postgres com cookie `httpOnly` (`erp_session`), token guardado hasheado (sha256), validade de 7 dias com renovação; bcryptjs (JS puro) para senha.
- Todas as rotas de `/api` passam a exigir sessão, exceto `GET /api/health` e `POST /api/auth/login`; a documentação Swagger também exige sessão.
- Frontend: `AuthProvider`, tela `/login`, tela `/trocar-senha` (bloqueante com senha temporária), menu do usuário na topbar (alterar senha / sair) e redirecionamento automático em 401.
- CLI `node dist/scripts/create-user.js` para criar/atualizar usuários.
- Testes: 8 unitários do `AuthService` e 9 e2e do módulo; os e2e existentes passaram a autenticar de verdade.

**Publicação**

- Mesclado em `main` (`ec730c6`) e publicado: `db` migrado no boot do container (`auth_users_sessions` aplicada), usuário `mkarineon@gmail.com` (ADMIN) criado com senha escolhida pelo cliente e sem troca obrigatória.
- Verificado em produção: `/api/health` 200 público; `/api/clients` e `/api/docs-json` 401 sem sessão; login 200 com cookie `httpOnly`+`Secure`; com sessão, `/api/clients` 200 (registro do cliente preservado); logout invalida a sessão.

**Impacto**

- Sem sessão, nenhuma rota de domínio responde — o dado de paciente deixa de ficar exposto na URL pública.
- Deploy passa a exigir a criação do usuário inicial (senão ninguém entra).
- Perfil (ADMIN/USER) existe no modelo mas **não há autorização por perfil**; e não há reset de senha por e-mail (a CLI faz isso).

---

## 2026-09-13 · módulo `clients` · Fase 2 implementada e publicada

**Alteração**

- Backend do módulo: `ClientRepository` (único ponto com Prisma), DTOs de entrada/saída,
  `ClientQueryService` (contrato público, exportado) e `ClientService` (criar, editar,
  inativar, reativar), `ClientsController` com Swagger e `ClientsModule`.
- Regras: CPF normalizado + dígito verificador + único (409), nascimento não futuro,
  e-mail validado, campos extras recusados, busca por nome/CPF/telefone/WhatsApp/e-mail e
  filtro `active=true|false` paginado. Sem exclusão física (inativar/reativar; 409 na repetição).
- Validador genérico `IsCpf` em `common/validators` e utilitários de paginação em `common/pagination`.
- Testes: 6 unitários do service + e2e do fluxo completo.
- Frontend `features/clients/`: tipos, API, hooks (`useClients`/`useClient` com
  `AbortController`), tabela, formulário em modal, badge de situação e página do cliente com
  as seções dos módulos futuros. Componentes genéricos novos em `shared/components`
  (Button, Input, Select, Modal, Pagination, Badge) e `useDebouncedValue`. Rota `/clientes/:id`.

**Impacto**

- Primeiro módulo de domínio completo; passa a ser a referência de camadas para os próximos.
- **Bug real corrigido:** `active=false` era convertido para `true` pela conversão implícita do
  `ValidationPipe` — o contrato do filtro passou a ser texto explícito.
- Nenhuma alteração de contrato de módulo existente (os outros 7 módulos seguem sem regra).
- Publicação: PR #3 revisado e mesclado em `main` (`b5a0cd5`); branch `feat/clientes` mantida.
  Deploy no CapRover concluído e verificado em produção (`/api/health`, `GET /api/clients`
  paginado, validação 400, uuid malformado 400, Swagger com as 4 rotas).

---

## 2026-09-13 · banco de dados + deploy · PostgreSQL e publicação no CapRover

**Alteração**

- Banco trocado de **SQLite para PostgreSQL** (`srv-captain--postgresql`), a pedido do
  cliente, com driver adapter `@prisma/adapter-pg` (node-postgres, JS puro).
  Removidas as dependências `@prisma/adapter-libsql`, `@libsql/client` e `better-sqlite3`.
- Migração `init` recriada para Postgres; enums agora são **tipos nativos** do banco.
  Bancos: `erp_estetica` (produção) e `erp_estetica_dev` (desenvolvimento e testes e2e).
- `PrismaService` passa a exigir `DATABASE_URL` — se faltar, a aplicação falha na hora com
  mensagem clara em vez de subir apontando para o banco errado.
- Deploy criado: `Dockerfile` multi-stage (build do frontend + build do backend + runtime
  não-root com `tini` e `HEALTHCHECK`), `captain-definition`, `.dockerignore` e
  `backend/docker-entrypoint.sh` rodando `prisma migrate deploy` antes de subir a API.
  O CLI do Prisma foi movido de `devDependencies` para `dependencies` (é usado no boot).
- CapRover: `containerHttpPort=3001`, `forceSsl=true`, `DATABASE_URL` do Postgres e volume
  `erp-estetica-data` mantido (não usado: o banco saiu do container).
- Infra **disponível e não usada** ficou registrada em `ARCHITECTURE.md`: Redis
  (`srv-captain--redis`) e MinIO/S3 (`storage-api.solucoes.cloud`).

**Impacto**

- Sistema publicado em **https://erp-estetica.solucoes.cloud** (API + SPA no mesmo container).
- Deploy e restart **não apagam mais dado**: o banco vive fora do container.
- Duas falhas reais de build foram corrigidas na publicação: `prisma generate` sem
  `DATABASE_URL` no build (fallback explícito no `prisma.config.ts`) e `.dockerignore`
  deixando `backend/.env` entrar na imagem (padrão `**/.env`).
- Quem for rodar localmente precisa de um PostgreSQL acessível em `DATABASE_URL`
  (ver `backend/.env.example`).
- Validação de status ganha uma segunda barreira: o próprio banco recusa valor fora do enum.

---

## 2026-09-13 · arquitetura (global) · realinhamento à arquitetura modular

**Alteração**

- Backend reorganizado como monólito modular: domínios movidos de `src/<dominio>/` para
  `src/modules/<dominio>/{controllers,services,dto,repositories,entities}` e `src/common/`
  reduzido ao que é genérico (`database`, `exceptions`, `health`, `pagination`, e as pastas
  reservadas `guards`, `interceptors`, `decorators`, `utils`).
- `common/prisma` → `common/database` (`PrismaService` + `DatabaseModule`); `common/filters`
  → `common/exceptions` (filtro padronizado + `NotFoundModule`); `src/health` →
  `common/health`. Removidos dois filtros mortos da iteração anterior.
- Frontend reorganizado em `app/` (router, providers, layout), `features/<dominio>/`
  (`api`, `components`, `hooks`, `pages`, `types`) e `shared/` (api, components, hooks,
  types, utils). Tipos de status saíram do arquivo único `src/types/index.ts` para
  `features/<modulo>/types`.
- Schema Prisma ajustado: enum `TransactionOrigin` agora `APPOINTMENT | SUBSCRIPTION | MANUAL`;
  `isActive` → `active` (Client, Procedure, SubscriptionPlan, Protocol); `inactivatedAt` →
  `deactivatedAt`; adicionados `deletedAt` (Client, Procedure, SubscriptionPlan, Protocol) e
  `externalReference` (FinancialTransaction). Migração `init` recriada do zero.
- Criado `MODULES.md` (obrigatório): responsabilidade, entidades, serviços públicos, eventos
  emitidos/consumidos, dependências permitidas, endpoints e regras de cada módulo.
- `ARCHITECTURE.md` reescrito com regras de dependência entre módulos, responsabilidade das
  camadas, proibições de importação no frontend e decisões 7.12 a 7.14.

**Impacto**

- Nenhum endpoint público foi quebrado (`/api/health`, `/api/docs` seguem iguais).
- **Banco de desenvolvimento recriado** (não havia dado real) — quem tiver `dev.db` antigo
  precisa rodar `npm run db:migrate` novamente.
- O padrão de onde colocar código mudou: implementar módulo novo agora segue
  `modules/<dominio>/` no backend e `features/<dominio>/` no frontend.
- Verificação repetida após a mudança: typecheck, lint, e2e (3/3) e build passando nos dois
  projetos; backend e frontend subindo e respondendo.

---

## 2026-09-13 · projeto · Fase 1 (fundação)

**Alteração**

- Criado o monorepo `erp-karine/` com `backend/` (NestJS 12, ESM) e `frontend/` (React 19 +
  Vite 8 + Tailwind 4 + React Router + Axios), `.gitignore` e `README.md`.
- Prisma 7 + SQLite com driver adapter libSQL; 11 entidades e 6 enums; migração `init`.
- Valores monetários definidos em centavos (`Int`).
- `app.setup.ts` com prefixo `/api`, `ValidationPipe` global, CORS e Swagger; filtro global
  de erro com envelope `{ statusCode, error, message, path, timestamp }`.
- `GET /api/health` (API + banco). `ServeStaticModule` condicional para servir o SPA no
  mesmo app em produção.
- Layout administrativo com menu lateral, barra superior com status da conexão e layout
  responsivo; páginas base dos 7 módulos e página 404.
- Documentação persistente criada: `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`,
  `CHANGELOG.md` (e, no realinhamento, `MODULES.md`).
- Testes e2e do backend (Vitest): `/api/health`, contrato OpenAPI e 404 padronizado.

**Impacto**

- Base do projeto disponível: `npm run start:dev` no backend (3001) e `npm run dev` no
  frontend (5173). Nenhuma regra de negócio implementada ainda — os módulos começam na Fase 2.
- Código publicado em https://github.com/admsouza/erp-karine (branch `main`).

---

## 2026-09-13 · infra · publicação do repositório

**Alteração**

- Primeiro push para `https://github.com/admsouza/erp-karine` (branch `main`).

**Impacto**

- Confirmado que `.env`, `dev.db`, `node_modules` e o cliente Prisma gerado **não** entram no
  versionamento (75 arquivos versionados).
- O token de acesso precisa da permissão **Contents: Read and write** para push — sem ela o
  git responde 403 mesmo com o repositório legível.
