import { http } from '../../../shared/api/http-client';
import type { FinancialFilters, FinancialReports, FinancialStatus, FinancialSummary, FinancialTransaction, PaymentMethod, TransactionType } from '../types/financial';
export const listFinancialTransactions=async(params:FinancialFilters,signal?:AbortSignal)=>(await http.get<FinancialTransaction[]>('/financial/transactions',{params,signal})).data;
export const financialSummary=async(params:Pick<FinancialFilters,'from'|'to'>,signal?:AbortSignal)=>(await http.get<FinancialSummary>('/financial/summary',{params,signal})).data;
export const financialReports=async(params:Pick<FinancialFilters,'from'|'to'>,signal?:AbortSignal)=>(await http.get<FinancialReports>('/financial/reports',{params,signal})).data;
export const createManualTransaction=async(input:{description:string;category?:string;amountCents:number;date:string;paymentMethod:PaymentMethod;type:TransactionType;status:FinancialStatus;externalReference?:string;notes?:string})=>(await http.post<FinancialTransaction>('/financial/transactions',input)).data;
export const cancelFinancialTransaction=async(id:string)=>(await http.patch<FinancialTransaction>(`/financial/transactions/${id}/cancel`)).data;
