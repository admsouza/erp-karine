export const TRANSACTION_TYPES={RECEITA:'Receita',DESPESA:'Despesa'} as const;
export const FINANCIAL_STATUSES={PENDENTE:'Pendente',PAGO:'Pago',CANCELADO:'Cancelado'} as const;
export const TRANSACTION_ORIGINS={APPOINTMENT:'Atendimento',SUBSCRIPTION:'Assinatura',MANUAL:'Manual'} as const;
export const PAYMENT_METHODS={PIX:'Pix',DINHEIRO:'Dinheiro',CARTAO_CREDITO:'Cartão de crédito',CARTAO_DEBITO:'Cartão de débito',TRANSFERENCIA:'Transferência',OUTRO:'Outro'} as const;
export type TransactionType=keyof typeof TRANSACTION_TYPES; export type FinancialStatus=keyof typeof FINANCIAL_STATUSES; export type TransactionOrigin=keyof typeof TRANSACTION_ORIGINS; export type PaymentMethod=keyof typeof PAYMENT_METHODS;
export interface FinancialTransaction{id:string;clientId:string|null;description:string;category:string|null;amountCents:number;date:string;paymentMethod:PaymentMethod;origin:TransactionOrigin;type:TransactionType;status:FinancialStatus;procedureName:string|null;subscriptionName:string|null;externalReference:string|null;notes:string|null;cancelledAt:string|null}
export interface FinancialSummary{revenueCents:number;expenseCents:number;balanceCents:number;receiptCount:number}
export interface FinancialReports{byProcedure:{name:string;amountCents:number}[];bySubscription:{name:string;amountCents:number}[]}
export interface FinancialFilters{from?:string;to?:string;origin?:TransactionOrigin;type?:TransactionType;status?:FinancialStatus}
