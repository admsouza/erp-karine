# CONSENTS_SPEC.md — Consentimentos e aceite eletrônico

> Especificação funcional, técnica e de segurança da Fase 7.1 do ERP Clínica.
> Ler junto com `AGENTS.md`, `PROJECT.md`, `ARCHITECTURE.md`, `MODULES.md` e `TASKS.md`.
> Estado: **especificado, não implementado**. Data: 2026-09-14.

## 1. Objetivo

Criar o módulo de domínio `consents` para administrar termos e consentimentos da clínica com versionamento imutável, aceite eletrônico pelo próprio celular do paciente, documento final preservado e trilha de evidências capaz de demonstrar qual documento/versão foi apresentado, a quem, quando, como o signatário foi identificado, quais declarações confirmou e a integridade do documento final.

O módulo não substitui anamnese, avaliação clínica ou protocolo. **Consentimento não é campo de `Client`, `Appointment` ou `Protocol`**: é fato histórico próprio, com entidades e regras próprias.

## 2. Princípios obrigatórios

1. `consents` segue o monólito modular existente: `{controllers,services,dto,repositories,entities}`.
2. Repository do módulo só acessa suas próprias entidades Prisma.
3. Paciente, procedimento, agendamento e protocolo são consultados somente pelos serviços públicos dos módulos donos.
4. Template publicado é imutável; correção cria nova versão.
5. Documento aceito é imutável; cadastro alterado depois não muda o histórico. Usar snapshots.
6. Evidências do signatário são append-only e diferentes da auditoria interna `AuditEvent`.
7. Assinatura desenhada é opcional e não é a única prova do aceite.
8. Nenhum token, OTP, assinatura completa ou PDF/base64 deve aparecer em logs ou `AuditEvent`.
9. Migração será somente aditiva.
10. Não alterar a máquina de estados de `appointments` no MVP; primeiro entregar indicador/aviso.

## 3. Tipos de documento

`ConsentTemplateType`:

- `PROCEDURE_CONSENT` — TCLE específico do procedimento;
- `PRIVACY_NOTICE` — ciência do aviso de privacidade;
- `DATA_CONSENT` — consentimento LGPD específico quando esta for a base legal adotada;
- `IMAGE_CLINICAL` — registro de imagem para acompanhamento/prontuário;
- `IMAGE_MARKETING` — uso opcional de imagem para divulgação;
- `OTHER` — finalidade futura explicitamente descrita.

`IMAGE_MARKETING` é independente do TCLE. A recusa de divulgação **não pode impedir o procedimento**.

## 4. Conteúdo mínimo de TCLE de procedimento

Um `PROCEDURE_CONSENT` deve suportar:

- identificação do paciente/signatário e do profissional;
- procedimento e região quando aplicável;
- descrição e objetivo em linguagem clara;
- benefícios/resultados esperados, sem promessa de resultado;
- alternativas relevantes quando aplicável;
- contraindicações/informações que o paciente deve declarar;
- riscos, efeitos adversos e possíveis intercorrências;
- cuidados pré e pós-procedimento;
- sinais de alerta e canal de contato;
- oportunidade de perguntas/esclarecimento;
- declarações explícitas de leitura, compreensão e voluntariedade;
- versão do termo, data/hora e método do aceite;
- SHA-256 do documento final.

A rastreabilidade do produto **efetivamente aplicado** (produto, fabricante, registro Anvisa, lote, validade, quantidade e região) pertence ao registro da sessão/protocolo e não deve reescrever o TCLE assinado anteriormente.

## 5. Autorização de imagem

Para `IMAGE_MARKETING`, a versão define os escopos disponíveis, sem autorização ampla por padrão:

- `SOCIAL_MEDIA`
- `WEBSITE`
- `EDUCATIONAL`
- `SCIENTIFIC`
- `PRINTED_MATERIAL`

Identificação: `IDENTIFIABLE` ou `NON_IDENTIFIABLE`.

O aceite registra exatamente os escopos escolhidos. Revogação futura impede novos usos a partir da revogação e preserva a trilha histórica; retirada de material já publicado não será automatizada no MVP.

## 6. Signatário e responsável legal

`SignerRole`: `PATIENT` ou `LEGAL_REPRESENTATIVE`.

No MVP, paciente menor de 18 anos não faz autoaceite isolado. O responsável legal deve ter snapshot de nome, CPF, relação declarada com o paciente e telefone usado no fluxo. Casos de incapacidade/representação especiais exigem revisão jurídica/ética; o software não os infere sozinho.

## 7. Estados

`ConsentTemplateVersionStatus`: `DRAFT`, `PUBLISHED`, `RETIRED`.

Transições: `DRAFT -> PUBLISHED -> RETIRED`. Não há retorno para draft. Publicado/retirado é imutável.

`ConsentRequestStatus`: `PENDING`, `VIEWED`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `CANCELLED`, `REVOKED`.

Requests finalizados não aceitam nova manifestação. `ACCEPTED -> REVOKED` somente quando a natureza do documento admitir revogação. TCLE de procedimento já realizado não é apagado por revogação posterior.

## 8. Modelo de dados

### `ConsentTemplate`

`id`, `code @unique`, `name`, `type`, `description?`, `active`, `deactivatedAt?`, `createdAt`, `updatedAt`.

### `ConsentTemplateVersion`

`id`, `templateId`, `version`, `status`, `title`, `contentMarkdown`, `requiredDeclarations Json`, `imageScopes Json?`, `revocable`, `publishedAt?`, `retiredAt?`, `createdByUserId`, timestamps.

`@@unique([templateId, version])`. Somente `DRAFT` é editável.

### `ConsentRequirement`

Vincula procedimento a template: `id`, `procedureId`, `templateId`, `required`, `active`, timestamps. `@@unique([procedureId, templateId])`. Procedimento validado via `ProcedureQueryService`.

### `ConsentRequest`

`id`, `clientId`, `procedureId?`, `appointmentId?`, `protocolId?`, `templateVersionId`, `status`, `tokenHash @unique`, `expiresAt`, datas de ciclo, `createdByUserId`, snapshots de paciente/procedimento/agendamento/profissional e `documentVariables Json`.

Índices em cliente, vínculos, status e expiração.

### `ConsentAcceptance`

Um por request aceito: `id`, `requestId @unique`, `signerRole`, nome/CPF do signatário, relação do responsável?, `method`, `declarations Json`, `selectedScopes Json?`, `signatureSvg?`, `acceptedAt`, IP?, user-agent?, final do telefone?, `challengeVerifiedAt?`, `createdAt`.

SVG é opcional, sanitizado e limitado em tamanho.

### `ConsentDocument`

Um por request aceito: `id`, `requestId @unique`, `mimeType`, `content Bytes`, `sha256 @unique`, `sizeBytes`, `generatedAt`.

No MVP, armazenar os bytes exatos do PDF no PostgreSQL por baixo volume e simplicidade de consistência/backup. A persistência fica escondida atrás do service para permitir object storage no futuro sem quebrar contratos.

### `ConsentEvidence`

Append-only: `id`, `requestId`, `type`, `occurredAt`, `ipAddress?`, `userAgent?`, `metadata Json`.

Tipos iniciais: `LINK_OPENED`, `IDENTITY_CHALLENGE_PASSED`, `IDENTITY_CHALLENGE_FAILED`, `DOCUMENT_VIEWED`, `DECLARATIONS_CONFIRMED`, `SIGNATURE_CAPTURED`, `ACCEPTED`, `DECLINED`, `DOCUMENT_GENERATED`, `DOCUMENT_DOWNLOADED`.

## 9. Link público e identificação

Ao criar request, gerar token criptograficamente aleatório de **32 bytes**. Entregar o token apenas na URL e persistir somente `SHA-256(token)`, seguindo o padrão de segurança já usado nas sessões.

Antes de exibir dados clínicos completos, exigir challenge com **CPF + data de nascimento** do cadastro. Se faltar um desses dados, o request por esse método não deve ser enviado até regularização ou criação de método alternativo aprovado.

Aplicar rate limit por `tokenHash + IP`, bloqueio temporário após tentativas inválidas e mensagem genérica: `Não foi possível confirmar os dados informados.` Nunca revelar qual campo errou.

Token inicial: validade padrão de 7 dias, cancelável e renovável. Renovação invalida o token anterior. Token não pode aparecer em log, auditoria ou erro.

As rotas públicas usam `@Public()` apenas para escapar da sessão administrativa, **mas sempre com guard próprio do token/challenge**. `@Public()` sozinho não significa sem proteção.

## 10. Método de aceite

`ConsentAcceptanceMethod`:

- `SECURE_LINK_CHALLENGE` — MVP;
- `OTP` — evolução quando houver provider configurado;
- `EXTERNAL_PROVIDER` — integração futura.

Prever porta `ConsentVerificationProvider` para OTP sem acoplar domínio a WhatsApp/SMS/e-mail. OTP deve ser aleatório, curto, com validade e tentativas limitadas e persistido somente como hash.

O MVP **não depende de GOV.BR, WhatsApp Cloud API ou provedor externo**.

## 11. Fluxo interno

1. usuário autenticado escolhe paciente;
2. opcionalmente vincula procedimento/agendamento/protocolo;
3. sistema resolve versão `PUBLISHED` aplicável;
4. lê dados pelos serviços públicos dos módulos donos;
5. cria snapshots;
6. gera token e persiste apenas hash;
7. devolve ação `Copiar link`.

Envio automático fica fora do MVP; a clínica pode compartilhar manualmente pelo WhatsApp.

## 12. Fluxo público

1. paciente abre link;
2. realiza challenge;
3. visualiza o termo e a versão;
4. confirma declarações obrigatórias individualmente;
5. informa signatário/responsável quando aplicável;
6. assinatura desenhada opcional;
7. confirma ou recusa;
8. no aceite, backend gera PDF, calcula SHA-256 e persiste acceptance + document + evidências **na mesma transação**;
9. request vira `ACCEPTED` e oferece comprovante/download.

Recusa não exige justificativa obrigatória e vira `DECLINED`.

## 13. Contrato público entre módulos

Exportar `ConsentQueryService`, com contratos equivalentes a:

- `requiredForProcedure(procedureId)`;
- `pendingForAppointment(appointmentId)`;
- `hasValidAcceptanceForAppointment(appointmentId)`;
- `listByClient(clientId)`;
- `getDocument(requestId)`.

Outros módulos nunca acessam repository/tabelas de `consents` diretamente.

No MVP, `appointments` apenas exibe indicador/aviso de pendência; não bloquear `Appointment -> REALIZADO` sem decisão futura explícita.

## 14. API administrativa

Sessão obrigatória. Templates/requisitos são ADMIN.

Templates/versões:

- `GET/POST /api/consents/templates`
- `GET/PATCH /api/consents/templates/:id`
- `PATCH /api/consents/templates/:id/inactivate|reactivate`
- `POST /api/consents/templates/:id/versions`
- `PATCH /api/consents/templates/:id/versions/:versionId`
- `POST /api/consents/templates/:id/versions/:versionId/publish`
- `POST /api/consents/templates/:id/versions/:versionId/retire`

Requisitos:

- `GET /api/consents/requirements?procedureId=`
- `POST /api/consents/requirements`
- `PATCH /api/consents/requirements/:id`
- `PATCH /api/consents/requirements/:id/inactivate`

Requests:

- `POST/GET /api/consents/requests`
- `GET /api/consents/requests/:id`
- `POST /api/consents/requests/:id/cancel`
- `POST /api/consents/requests/:id/renew-link`
- `GET /api/consents/requests/:id/document`
- `GET /api/consents/clients/:clientId`

## 15. API pública

Prefixo `/api/public/consents`:

- `GET /:token` — metadados mínimos;
- `POST /:token/identify`;
- `GET /:token/document-view` — após challenge;
- `POST /:token/accept`;
- `POST /:token/decline`;
- `GET /:token/pdf` — após aceite e conforme política de acesso.

Nenhuma rota pública oferece lista/busca ou expõe IDs de outros pacientes.

## 16. Validações

- CPF normalizado/validado quando exigido;
- somente versão `PUBLISHED` gera request;
- entidades vinculadas existem via serviços públicos;
- request finalizado não aceita segundo aceite;
- declarações obrigatórias precisam ser `true` explicitamente;
- escopos de imagem limitados aos definidos na versão;
- SVG, user-agent, metadata e payload com limites de tamanho;
- `acceptedAt` sempre vem do servidor;
- DTO público é separado de DTO administrativo.

## 17. Renderização e PDF

Template em Markdown controlado, sem HTML arbitrário. Variáveis são resolvidas no backend. O PDF final é a evidência documental e seus **bytes exatos** são preservados.

Escolher biblioteca JavaScript puro compatível com Node 22+, sem Chromium/binário nativo, validando licença, manutenção e `npm audit`.

Rodapé mínimo: código/título, versão, paciente/signatário, data/hora `America/Recife`, método de aceite, identificador público não sensível e SHA-256. IP e detalhes técnicos ficam na evidência interna.

## 18. Privacidade

- dado de saúde é sensível; minimizar coleta;
- não logar conteúdo clínico;
- CPF completo não entra em URL, nome de arquivo ou auditoria genérica;
- resposta pública antes do challenge retorna apenas o mínimo;
- não assumir consentimento como base legal de todo tratamento de saúde;
- revogação/eliminação não dispara `DELETE` automático de prontuário/documento clínico.

## 19. Frontend

Administrativo: `frontend/src/features/consents/{api,components,hooks,pages,types}`.

Na ficha do cliente, seção **Termos e consentimentos** com tipo, procedimento, versão, situação, datas e ações de visualizar/copiar link/baixar PDF.

Em atendimento/protocolo, card com `Aceito`, `Pendente`, `Recusado`, `Expirado` ou `Não exigido`, sempre derivado da API.

Em **Sistema → Termos e consentimentos** (ADMIN): templates, versões, preview, publicação, aposentadoria e vínculo com procedimentos.

Rota pública `/aceite/:token` fica fora do `AdminLayout`, mobile-first, com etapas: identificação → documento → declarações → assinatura opcional → confirmação → comprovante. Não pré-marcar checkbox, não esconder riscos em accordion fechado e manter `Recusar` visível.

## 20. Auditoria

Ações internas via `AuditTrailService`: criação/publicação/aposentadoria de versão, alteração de requisito, criação/cancelamento de request, renovação de link e revogação.

Eventos do paciente ficam em `ConsentEvidence`. Não registrar token, OTP, SVG completo, PDF/base64 ou CPF completo desnecessário em `changes`.

## 21. Testes obrigatórios

Unitários: imutabilidade de versão publicada; snapshot; token só em hash; token expirado/cancelado; challenge e rate limit; declarações; segundo aceite; recusa; responsável legal; imagem de marketing independente; hash do PDF; evidência append-only.

E2E: ADMIN cria/publica template e requisito; usuário cria request; rota pública não vaza dado antes do challenge; challenge errado é genérico; aceite cria acceptance/document/evidências; SHA do PDF confere; reuso é recusado; renovação invalida token anterior; cancelamento invalida link; USER não gerencia templates; rota pública funciona sem `erp_session` mas exige token; nenhuma rota de delete físico.

Segurança: XSS/SVG, limite de payload, não enumeração, rate limit, token ausente de logs, `OriginGuard`/guard público positivo e negativo, `npm audit` sem alta/crítica.

UI real: 390px e 1440px, documento longo e sem overflow horizontal.

## 22. Migração e compatibilidade

Migração **somente aditiva**. Antes de produção, validar no dev e contra cópia dos dados reais seguindo `AGENTS.md`. Não criar histórico retroativo para termos de papel.

## 23. Fora do MVP

GOV.BR, ICP-Brasil, biometria/reconhecimento facial, envio automático WhatsApp/SMS/e-mail, múltiplos signatários, assinatura em lote, motor genérico de contratos, MinIO/object storage, OCR, bloqueio rígido de atendimento, eliminação automática por LGPD e importação retroativa de termos em papel.

## 24. Critérios de aceite da Fase 7.1

A fase só termina quando templates/versionamento, requisito por procedimento, link seguro, fluxo celular, challenge/rate limit, aceite/recusa, PDF+SHA-256, evidências append-only, responsável legal, autorização de imagem independente, integração de leitura, auditoria interna, Swagger, testes, gates (`tsc`, lint, unit/e2e, builds), migração validada, UI 390/1440 e documentação estiverem concluídos.

Os textos reais de TCLE de cada procedimento **não devem ser inventados pelo software**: antes de ativá-los em produção precisam de revisão do profissional responsável e revisão jurídica/ética aplicável ao conselho profissional e aos serviços efetivamente prestados.

## 25. Fundamentos externos considerados

A especificação considera, sem substituir assessoria jurídica: LGPD (Lei 13.709/2018), MP 2.200-2/2001 art. 10 §2º, Lei 14.063/2020 e orientações sanitárias da Anvisa para procedimentos estéticos, informação sobre riscos/intercorrências, produtos e rastreabilidade.
