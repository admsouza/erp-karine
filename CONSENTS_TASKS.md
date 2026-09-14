# CONSENTS_TASKS.md — Fase 7.1: termos e aceite eletrônico

> Plano de execução da especificação `CONSENTS_SPEC.md`.
> Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído.
> **Somente uma fatia importante por vez.** Não iniciar Fase 8 (`exams`) em paralelo.

## Fase 7.1 — Módulo `consents` `[ ]`

- [x] Especificação funcional/técnica/base legal criada em `CONSENTS_SPEC.md`
- [x] Plano de tarefas criado em `CONSENTS_TASKS.md`

### A. Modelo e migração

- [ ] Criar enums Prisma de tipo/status/método/evidência/signatário
- [ ] Criar `ConsentTemplate`
- [ ] Criar `ConsentTemplateVersion`
- [ ] Criar `ConsentRequirement`
- [ ] Criar `ConsentRequest`
- [ ] Criar `ConsentAcceptance`
- [ ] Criar `ConsentDocument`
- [ ] Criar `ConsentEvidence`
- [ ] Migração **somente aditiva**, sem alterar/remover dado clínico existente
- [ ] Validar migração no banco dev
- [ ] Validar migração contra cópia dos dados reais conforme `AGENTS.md`

### B. Estrutura modular do backend

- [ ] Criar `backend/src/modules/consents/{controllers,services,dto,repositories,entities}`
- [ ] Repository do módulo acessa apenas entidades de `consents`
- [ ] Importar contratos públicos de `clients`, `procedures`, `appointments`, `protocols`, `audit` e `auth` somente quando necessários
- [ ] Exportar `ConsentQueryService` como contrato público
- [ ] Registrar módulo no `AppModule` preservando `NotFoundModule` por último

### C. Templates e versões

- [ ] CRUD lógico de `ConsentTemplate` sem DELETE físico
- [ ] Criar versão `DRAFT`
- [ ] Editar somente versão `DRAFT`
- [ ] Publicar `DRAFT -> PUBLISHED`
- [ ] Aposentar `PUBLISHED -> RETIRED`
- [ ] Recusar edição/exclusão de versão publicada ou aposentada
- [ ] Preview seguro de Markdown sem HTML arbitrário
- [ ] Auditoria de criação/publicação/aposentadoria

### D. Requisitos por procedimento

- [ ] Associar template a procedimento por `ConsentRequirement`
- [ ] Validar procedimento exclusivamente por `ProcedureQueryService`
- [ ] Impedir associação duplicada
- [ ] Permitir inativação sem apagar histórico
- [ ] `IMAGE_MARKETING` nunca vira requisito obrigatório do procedimento

### E. Solicitação e snapshots

- [ ] Criar request para paciente e versão `PUBLISHED`
- [ ] Vínculo opcional com procedimento/agendamento/protocolo
- [ ] Validar vínculos via serviços públicos dos módulos donos
- [ ] Guardar snapshots necessários de paciente/procedimento/profissional
- [ ] Gerar token criptográfico aleatório de 32 bytes
- [ ] Persistir somente `SHA-256(token)`
- [ ] Expiração padrão inicial de 7 dias
- [ ] Cancelamento invalida imediatamente
- [ ] Renovação invalida token anterior e gera auditoria
- [ ] Nunca logar token em claro

### F. Segurança do fluxo público

- [ ] Rotas `/api/public/consents/:token/*` marcadas `@Public()` apenas para sessão administrativa
- [ ] Implementar guard próprio para token público
- [ ] Challenge de identidade com CPF + data de nascimento
- [ ] Não exibir dado clínico completo antes do challenge
- [ ] Rate limit por tokenHash + IP
- [ ] Bloqueio temporário após tentativas inválidas
- [ ] Mensagem genérica sem indicar qual campo errou
- [ ] Limites de payload/user-agent/metadata
- [ ] Revisar interação com `OriginGuard` sem liberar `*`
- [ ] Testar enumeração, token expirado/cancelado/renovado e brute force

### G. Aceite e recusa

- [ ] Exigir declarações obrigatórias explicitamente `true`
- [ ] Assinatura desenhada opcional
- [ ] Sanitizar/limitar SVG quando usado
- [ ] `acceptedAt` sempre definido pelo servidor
- [ ] Recusa sem justificativa obrigatória
- [ ] Request finalizado não aceita segunda manifestação
- [ ] Paciente menor exige responsável legal no MVP
- [ ] Guardar snapshot do responsável legal
- [ ] Escopos de imagem limitados aos declarados na versão

### H. Evidências e PDF

- [ ] `ConsentEvidence` append-only, sem endpoints de edição/exclusão
- [ ] Separar evidência jurídica de `AuditEvent`
- [ ] Gerar PDF no backend com biblioteca JS puro compatível com Node 22+
- [ ] Validar licença/manutenção/npm audit antes de adicionar dependência
- [ ] Persistir **bytes exatos** do PDF em `ConsentDocument`
- [ ] Calcular SHA-256 dos bytes persistidos
- [ ] Acceptance + document + evidências + mudança de status em uma transação
- [ ] Rodapé com título/código, versão, signatário, data/hora Recife, método e SHA-256
- [ ] Não colocar IP técnico completo no PDF entregue ao paciente

### I. Contrato e integração de leitura

- [ ] `ConsentQueryService.requiredForProcedure`
- [ ] `ConsentQueryService.pendingForAppointment`
- [ ] `ConsentQueryService.hasValidAcceptanceForAppointment`
- [ ] `ConsentQueryService.listByClient`
- [ ] `ConsentQueryService.getDocument`
- [ ] Página do cliente consome contrato público, não repository
- [ ] Agenda/protocolo exibem estado via contrato/API
- [ ] MVP mostra aviso de pendência, **sem bloquear `Appointment -> REALIZADO`**

### J. API administrativa

- [ ] Templates/versões com Swagger
- [ ] Requisitos por procedimento com Swagger
- [ ] Requests: criar/listar/detalhar/cancelar/renovar link/baixar documento
- [ ] Gestão de templates/requisitos restrita a `ADMIN`
- [ ] DTOs administrativos separados dos DTOs públicos

### K. Frontend administrativo

- [ ] Criar `frontend/src/features/consents/{api,components,hooks,pages,types}`
- [ ] Ficha do cliente: seção **Termos e consentimentos**
- [ ] Mostrar tipo, procedimento, versão, status e datas
- [ ] Ações: visualizar, copiar link quando pendente, baixar PDF quando aceito
- [ ] Card no atendimento/protocolo: Aceito/Pendente/Recusado/Expirado/Não exigido
- [ ] Sistema → Termos e consentimentos (ADMIN)
- [ ] Templates, versões, preview, publicar, aposentar e vínculo com procedimento

### L. Frontend público mobile-first

- [ ] Rota `/aceite/:token` fora do `AdminLayout`
- [ ] Etapa identificação
- [ ] Etapa leitura do documento
- [ ] Declarações explícitas sem checkbox pré-marcado
- [ ] Assinatura opcional
- [ ] Botões claros `Concordar e assinar` e `Recusar`
- [ ] Confirmação/comprovante/download
- [ ] Não esconder riscos em accordion fechado por padrão
- [ ] Testar documento longo e teclado mobile
- [ ] Sem overflow horizontal em 390px

### M. Autorização de imagem

- [ ] `IMAGE_CLINICAL` separado de `IMAGE_MARKETING`
- [ ] Marketing opcional e independente do atendimento
- [ ] Escopos: redes sociais/site/educacional/científico/material impresso
- [ ] Identificável vs não identificável
- [ ] Revogação preserva histórico e impede novos usos conforme regra definida

### N. Testes e gates

- [ ] Unitários: imutabilidade, snapshots, token/hash, challenge, rate limit, declarações, segundo aceite, menor/responsável, imagem independente, PDF/hash
- [ ] E2E do fluxo ADMIN + paciente completo
- [ ] E2E 401/403 e USER sem gestão de templates
- [ ] E2E de token inválido/expirado/cancelado/renovado/reutilizado
- [ ] Testes de XSS/SVG e payload máximo
- [ ] Testar que token/OTP/PDF não aparecem em logs/audit
- [ ] `npx tsc --noEmit` backend/frontend
- [ ] lint backend/frontend
- [ ] unitários/e2e
- [ ] builds backend/frontend
- [ ] `npm audit` sem vulnerabilidade alta/crítica
- [ ] Navegador real em 390px e 1440px

### O. Documentação e publicação

- [ ] Atualizar `PROJECT.md` com domínio/prioridade/regras
- [ ] Atualizar `MODULES.md` com contrato final de `consents`
- [ ] Atualizar `ARCHITECTURE.md` com decisões efetivamente implementadas
- [ ] Integrar esta lista em `TASKS.md` no fechamento da fase
- [ ] Atualizar `AGENTS.md` com estado/armadilhas reais encontradas
- [ ] Atualizar `CHANGELOG.md`
- [ ] Revisão jurídica/ética dos **textos reais** dos templates antes de ativação
- [ ] PR de implementação → aprovação explícita → merge → deploy → smoke/API/navegador real → registro da publicação

## Fora do MVP

- GOV.BR/ICP-Brasil
- biometria/reconhecimento facial
- envio automático WhatsApp/SMS/e-mail
- múltiplos signatários simultâneos
- assinatura em lote
- MinIO/object storage
- OCR
- bloqueio rígido de atendimento
- eliminação automática por LGPD
- importação retroativa de termos em papel
