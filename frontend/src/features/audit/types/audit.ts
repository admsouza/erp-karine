/** Tipos da trilha de auditoria — espelham o contrato de `GET /api/audit/events`. */

export interface AuditChange {
  field: string;
  before: string | number | null;
  after: string | number | null;
}

export interface AuditEvent {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorEmail: string | null;
  module: string;
  entityType: string;
  entityId: string;
  action: string;
  requestId: string | null;
  reason: string | null;
  changes: AuditChange[];
  createdAt: string;
}

export interface AuditEventPage {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditFilterOptions {
  actors: { id: string; name: string | null; email: string | null }[];
  modules: string[];
  entityTypes: string[];
  actions: string[];
}

export interface AuditFilters {
  actorUserId: string;
  module: string;
  entityType: string;
  action: string;
  from: string;
  to: string;
  search: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilters = {
  actorUserId: '',
  module: '',
  entityType: '',
  action: '',
  from: '',
  to: '',
  search: '',
};

/** Rótulos de negócio. O que não estiver mapeado aparece como veio da API. */
export const AUDIT_ACTIONS: Record<string, string> = {
  CREATED: 'Criação',
  UPDATED: 'Alteração',
  CANCELLED: 'Cancelamento',
};

export const AUDIT_MODULES: Record<string, string> = {
  clients: 'Clientes',
  procedures: 'Procedimentos',
  appointments: 'Agenda',
  subscriptions: 'Assinaturas',
  financial: 'Financeiro',
  protocols: 'Protocolos',
  auth: 'Acesso ao sistema',
};

export const AUDIT_ENTITY_TYPES: Record<string, string> = {
  Client: 'Cliente',
  Procedure: 'Procedimento',
  Appointment: 'Agendamento',
  SubscriptionPlan: 'Plano',
  ClientSubscription: 'Assinatura',
  SubscriptionPayment: 'Pagamento de assinatura',
  FinancialTransaction: 'Lançamento financeiro',
  Protocol: 'Protocolo',
  ProtocolSession: 'Sessão de protocolo',
};

export const AUDIT_FIELD_LABELS: Record<string, string> = {
  amountCents: 'Valor',
  paidAt: 'Data',
  paymentMethod: 'Forma de pagamento',
  notes: 'Observação',
  date: 'Data',
  description: 'Descrição',
};

/** Espelha o catálogo de formas de pagamento dos módulos financeiro/assinaturas. */
const PAYMENT_METHODS: Record<string, string> = {
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de crédito',
  CARTAO_DEBITO: 'Cartão de débito',
  TRANSFERENCIA: 'Transferência',
  OUTRO: 'Outro',
};

/** Forma de pagamento com o rótulo do catálogo (PIX → Pix). */
export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHODS[value] ?? value;
}

export function auditFieldLabel(field: string): string {
  return AUDIT_FIELD_LABELS[field] ?? field;
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTIONS[action] ?? action;
}

export function auditModuleLabel(module: string): string {
  return AUDIT_MODULES[module] ?? module;
}

export function auditEntityLabel(entityType: string): string {
  return AUDIT_ENTITY_TYPES[entityType] ?? entityType;
}

export function actorLabel(event: AuditEvent): string {
  return event.actorName ?? event.actorEmail ?? 'Usuário removido';
}
