import { http } from '../../../shared/api/http-client';
import type { FinancialFilters, FinancialReports, FinancialStatus, FinancialSummary, FinancialTransaction, PaymentMethod, TransactionType } from '../types/financial';
export const listFinancialTransactions=async(params:FinancialFilters,signal?:AbortSignal)=>(await http.get<FinancialTransaction[]>('/financial/transactions',{params,signal})).data;
export const financialSummary=async(params:Pick<FinancialFilters,'from'|'to'>,signal?:AbortSignal)=>(await http.get<FinancialSummary>('/financial/summary',{params,signal})).data;
export const financialReports=async(params:Pick<FinancialFilters,'from'|'to'>,signal?:AbortSignal)=>(await http.get<FinancialReports>('/financial/reports',{params,signal})).data;
export interface FinancialOption { id: string; name: string; currentValueCents?: number | null }
/** Clientes e procedimentos ativos para o lançamento manual (mesmo padrão da Agenda). */
export const financialOptions=async():Promise<{clients:FinancialOption[];procedures:FinancialOption[]}>=>{
  const [clients,procedures]=await Promise.all([
    http.get('/clients',{params:{active:'true',pageSize:100}}),
    http.get('/procedures',{params:{active:'true',pageSize:100}}),
  ]);
  return {
    clients:clients.data.items.map((item:{id:string;fullName:string})=>({id:item.id,name:item.fullName})),
    procedures:procedures.data.items.map((item:{id:string;name:string;currentValueCents:number|null})=>({id:item.id,name:item.name,currentValueCents:item.currentValueCents})),
  };
};
/** Credores já usados — sugestão do campo credor (sem cadastro de fornecedores). */
export const listCounterparties=async()=>(await http.get<string[]>('/financial/transactions/counterparties')).data;
export const createManualTransaction=async(input:{resourceAccountId?:string;description:string;clientId?:string;counterparty?:string;procedureId?:string;productId?:string;grossAmountCents?:number;discountType?:'PERCENT'|'AMOUNT';discountValue?:number;amountCents:number;date:string;paymentMethod:PaymentMethod;type:TransactionType;status:FinancialStatus;externalReference?:string;notes?:string})=>(await http.post<FinancialTransaction>('/financial/transactions',input)).data;
export const cancelFinancialTransaction=async(id:string)=>(await http.patch<FinancialTransaction>(`/financial/transactions/${id}/cancel`)).data;
export const updateFinancialTransaction=async(id:string,input:{description:string;amountCents:number;date:string;paymentMethod:PaymentMethod;type:TransactionType;status:FinancialStatus;reason:string})=>(await http.patch<FinancialTransaction>(`/financial/transactions/${id}`,input)).data;
export const deleteFinancialTransaction=async(id:string,reason:string)=>(await http.delete<FinancialTransaction>(`/financial/transactions/${id}`,{data:{reason}})).data;

export const assignFinancialResource=async(id:string,resourceAccountId:string,reason:string)=>(await http.patch(`/financial/transactions/${id}/resource`,{resourceAccountId,reason})).data;
export const createFinancialAdjustment=async(id:string,input:{description:string;type:TransactionType;amountCents:number;date:string;resourceAccountId:string;paymentMethod:PaymentMethod;reason:string;idempotencyKey:string})=>(await http.post(`/financial/transactions/${id}/adjustments`,input)).data;
