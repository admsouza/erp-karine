import { http } from '../../../shared/api/http-client';
import type { FinancialFilters, FinancialReports, FinancialStatus, FinancialSummary, FinancialTransaction, PaymentMethod, TransactionType } from '../types/financial';
export const listFinancialTransactions=async(params:FinancialFilters,signal?:AbortSignal)=>(await http.get<FinancialTransaction[]>('/financial/transactions',{params,signal})).data;
export const financialSummary=async(params:Pick<FinancialFilters,'from'|'to'>,signal?:AbortSignal)=>(await http.get<FinancialSummary>('/financial/summary',{params,signal})).data;
export const financialReports=async(params:Pick<FinancialFilters,'from'|'to'>,signal?:AbortSignal)=>(await http.get<FinancialReports>('/financial/reports',{params,signal})).data;
export const createManualTransaction=async(input:{resourceAccountId?:string;description:string;category?:string;amountCents:number;date:string;paymentMethod:PaymentMethod;type:TransactionType;status:FinancialStatus;externalReference?:string;notes?:string})=>(await http.post<FinancialTransaction>('/financial/transactions',input)).data;
export const cancelFinancialTransaction=async(id:string)=>(await http.patch<FinancialTransaction>(`/financial/transactions/${id}/cancel`)).data;

export const assignFinancialResource=async(id:string,resourceAccountId:string,reason:string)=>(await http.patch(`/financial/transactions/${id}/resource`,{resourceAccountId,reason})).data;
export const createFinancialAdjustment=async(id:string,input:{description:string;type:TransactionType;amountCents:number;date:string;resourceAccountId:string;paymentMethod:PaymentMethod;reason:string;idempotencyKey:string})=>(await http.post(`/financial/transactions/${id}/adjustments`,input)).data;
