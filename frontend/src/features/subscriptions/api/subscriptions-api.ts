import { http } from '../../../shared/api/http-client';
import type { Payment, PaymentMethod, Periodicity, Plan, Subscription, SubscriptionStatus, Option } from '../types/subscription';
export const listPlans=async(params?:{search?:string;active?:string},signal?:AbortSignal)=>(await http.get<Plan[]>('/subscription-plans',{params,signal})).data;
export const createPlan=async(input:{name:string;description?:string;priceCents:number;periodicity:Periodicity;sessionsPerPeriod?:number})=>(await http.post<Plan>('/subscription-plans',input)).data;
export const updatePlan=async(id:string,input:{name:string;description?:string;priceCents:number;periodicity:Periodicity;sessionsPerPeriod?:number})=>(await http.patch<Plan>(`/subscription-plans/${id}`,input)).data;
export const setPlanActive=async(id:string,active:boolean)=>(await http.patch<Plan>(`/subscription-plans/${id}/${active?'reactivate':'inactivate'}`)).data;
export const listSubscriptions=async(params?:{clientId?:string;status?:SubscriptionStatus},signal?:AbortSignal)=>(await http.get<Subscription[]>('/subscriptions',{params,signal})).data;
export const createSubscription=async(input:{clientId:string;planId:string;startDate:string;paymentMethod:PaymentMethod;notes?:string})=>(await http.post<Subscription>('/subscriptions',input)).data;
export const changeSubscriptionStatus=async(id:string,status:SubscriptionStatus)=>(await http.patch<Subscription>(`/subscriptions/${id}/status`,{status})).data;
export const listPayments=async(id:string)=>(await http.get<Payment[]>(`/subscriptions/${id}/payments`)).data;
export const createPayment=async(id:string,input:{amountCents:number;paidAt:string;paymentMethod:PaymentMethod;notes?:string})=>(await http.post<Payment>(`/subscriptions/${id}/payments`,input)).data;
export async function subscriptionOptions():Promise<{clients:Option[];plans:Plan[]}>{const [clients,plans]=await Promise.all([http.get('/clients',{params:{active:'true',pageSize:100}}),listPlans({active:'true'})]);return{clients:clients.data.items.map((x:{id:string;fullName:string})=>({id:x.id,name:x.fullName})),plans};}
