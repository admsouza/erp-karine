export const PERIODICITIES = { MENSAL:'Mensal', BIMESTRAL:'Bimestral', TRIMESTRAL:'Trimestral', SEMESTRAL:'Semestral', ANUAL:'Anual' } as const;
export type Periodicity = keyof typeof PERIODICITIES;
export const SUBSCRIPTION_STATUSES = { ATIVA:'Ativa', INADIMPLENTE:'Inadimplente', ENCERRADA:'Encerrada', CANCELADA:'Cancelada' } as const;
export type SubscriptionStatus = keyof typeof SUBSCRIPTION_STATUSES;
export const PAYMENT_METHODS = { PIX:'Pix', DINHEIRO:'Dinheiro', CARTAO_CREDITO:'Cartão de crédito', CARTAO_DEBITO:'Cartão de débito', TRANSFERENCIA:'Transferência', OUTRO:'Outro' } as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export interface Plan { id:string;name:string;description:string|null;priceCents:number;periodicity:Periodicity;sessionsPerPeriod:number|null;active:boolean; }
export interface Subscription { id:string;clientId:string;clientName:string;planId:string;planName:string;planPeriodicity:Periodicity;planSessionsPerPeriod:number|null;contractedValueCents:number;paymentMethod:PaymentMethod;startDate:string;endDate:string|null;status:SubscriptionStatus;notes:string|null; }
export interface Payment {id:string;subscriptionId:string;amountCents:number;paidAt:string;paymentMethod:PaymentMethod;notes:string|null;}
/** Mudança de um campo registrada na trilha de auditoria. */
export interface AuditChange { field:string; before:string|number|null; after:string|number|null }
/** Evento imutável da trilha de auditoria (não há edição nem exclusão). */
export interface AuditEvent { id:string; actorUserId:string; actorName:string|null; actorEmail:string|null; module:string; entityType:string; entityId:string; action:string; requestId:string|null; reason:string|null; changes:AuditChange[]; createdAt:string }
export interface AuditTimeline { items:AuditEvent[]; total:number; page:number; pageSize:number }
export interface Option {id:string;name:string;}
