import { CashRepository } from '../repositories/cash.repository.js';
import { CashPolicyService } from './cash-policy.service.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import type { AssignResourceDto } from '../dto/cash.dto.js';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClientQueryService } from '../../clients/services/client-query.service.js';
import { ProcedureQueryService } from '../../procedures/services/procedure-query.service.js';
import { ProductQueryService } from '../../products/services/product-query.service.js';
import type { AppointmentCompleted } from '../../appointments/events/appointment-completed.event.js';
import type { SubscriptionPaymentReceived } from '../../subscriptions/events/subscription-payment-received.event.js';
import type { CreateManualTransactionDto, UpdateFinancialTransactionDto } from '../dto/financial.dto.js';
import { toFinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import { FinancialTransactionRepository } from '../repositories/financial-transaction.repository.js';
import type { PaymentMethod, Prisma } from '../../../generated/prisma/client.js';
@Injectable()
export class FinancialTransactionService {
  constructor(private readonly repository: FinancialTransactionRepository, private readonly cash: CashRepository, private readonly policy: CashPolicyService, private readonly audit: AuditTrailService, private readonly clientes: ClientQueryService, private readonly procedimentos: ProcedureQueryService, private readonly produtos: ProductQueryService) {}

  /**
   * Lançamento manual (venda avulsa ou despesa).
   *
   * Papéis são assimétricos de propósito: **receita** aponta para o **cliente** (FK, compõe a ficha
   * dele) e **despesa** guarda o **credor** como texto (a maioria é credor eventual — não se paga um
   * cadastro de fornecedores para isso). Trocar os papéis é recusado em vez de virar dado sujo.
   *
   * O desconto guarda a **intenção** (tipo + valor informado) e o **efetivo em centavos**; o
   * `amountCents` continua sendo o **líquido** — o que de fato entrou/saiu —, então nenhum relatório,
   * indicador ou conciliação muda de significado. O valor cheio fica em `grossAmountCents`.
   */
  async createManual(dto: CreateManualTransactionDto, user?: AuthenticatedUser, requestId?: string) {
    return this.cash.transaction(async tx => {
      const date = new Date(dto.date.length===10 ? `${dto.date}T12:00:00-03:00` : dto.date);
      await this.policy.assertWritable(date,tx);
      if(dto.resourceAccountId)await this.policy.assertAccount(dto.resourceAccountId,tx);

      const receita = dto.type === 'RECEITA';
      if (!receita && dto.clientId)
        throw new BadRequestException('Cliente é só para receita; em despesa informe o credor.');
      if (receita && dto.counterparty)
        throw new BadRequestException('Credor é só para despesa; em receita informe o cliente.');
      if (dto.productId && dto.procedureId)
        throw new BadRequestException(
          'Escolha um item por lançamento: procedimento ou produto.',
        );
      if (dto.clientId && !(await this.clientes.exists(dto.clientId)))
        throw new NotFoundException('Cliente não encontrado.');
      let procedureName: string | null = null;
      if (dto.procedureId) {
        if (!(await this.procedimentos.exists(dto.procedureId)))
          throw new NotFoundException('Procedimento não encontrado.');
        // Snapshot: o nome de hoje não pode reescrever o histórico do que foi vendido.
        procedureName = (await this.procedimentos.getById(dto.procedureId)).name;
      }
      let productName: string | null = null;
      let productCostCents: number | null = null;
      if (dto.productId) {
        if (!(await this.produtos.exists(dto.productId)))
          throw new NotFoundException('Produto não encontrado.');
        const produto = await this.produtos.findById(dto.productId);
        if (!produto) throw new NotFoundException('Produto não encontrado.');
        const commercialUse = produto.commercialUse ?? 'VENDA';
        if (commercialUse !== 'AMBOS' && (receita ? commercialUse !== 'VENDA' : commercialUse !== 'COMPRA'))
          throw new BadRequestException(receita ? 'Este produto é somente para compra de credor.' : 'Este produto é somente para venda ao cliente.');
        productName = produto.name;
        productCostCents = receita ? produto.purchasePriceCents : null;
      }
      const { discountCents, grossAmountCents } = this.desconto(dto);

      const item=await this.repository.create({ ...dto, description: dto.description.trim(), category: dto.category?.trim() || null, date, origin: 'MANUAL', clientId: dto.clientId ?? null, counterparty: dto.counterparty?.trim() || null, procedureId: dto.procedureId ?? null, procedureName, productId: dto.productId ?? null, productName, productCostCents, grossAmountCents, discountCents, externalReference: dto.externalReference?.trim() || null, notes: dto.notes?.trim() || null },tx);
      if(user)await this.audit.record({actorUserId:user.id,actorName:user.name,actorEmail:user.email,module:'financial',entityType:'FinancialTransaction',entityId:item.id,action:'CREATED',requestId,changes:[{field:'amountCents',before:null,after:item.amountCents},...(discountCents===null?[]:[{field:'discountCents',before:null,after:discountCents}]),{field:'resourceAccountId',before:null,after:item.resourceAccountId}]},tx);
      return toFinancialTransactionEntity(item);
    });
  }

  /** Confere o desconto informado e devolve o efetivo em centavos (null quando não há desconto). */
  private desconto(dto: CreateManualTransactionDto) {
    if (dto.discountType === undefined) {
      if (dto.grossAmountCents !== undefined && dto.grossAmountCents !== dto.amountCents)
        throw new BadRequestException('O valor líquido não confere com o valor cheio.');
      return { discountCents: null, grossAmountCents: dto.grossAmountCents ?? null };
    }
    if (dto.grossAmountCents === undefined)
      throw new BadRequestException('Informe o valor cheio para aplicar desconto.');
    if (dto.discountValue === undefined)
      throw new BadRequestException('Informe o valor do desconto.');
    if (dto.discountType === 'PERCENT' && dto.discountValue > 10_000)
      throw new BadRequestException('O desconto percentual não pode passar de 100%.');
    const gross = dto.grossAmountCents;
    const discountCents =
      dto.discountType === 'PERCENT'
        ? Math.round((gross * dto.discountValue) / 10_000)
        : dto.discountValue;
    if (discountCents > gross)
      throw new BadRequestException('Desconto não pode ser maior que o valor cheio.');
    if (dto.amountCents !== gross - discountCents)
      throw new BadRequestException('O valor líquido não confere com o desconto.');
    return { discountCents, grossAmountCents: gross };
  }
  async fromAppointment(event: Omit<AppointmentCompleted, 'name'>,existingTx?:Prisma.TransactionClient) {
    return this.cash.transaction(async tx=>{
      const existing=await this.repository.findByAppointmentId(event.appointmentId,tx);if(existing)return toFinancialTransactionEntity(existing);
      await this.policy.assertWritable(event.completedAt,tx);
      return toFinancialTransactionEntity(await this.repository.create({ clientId: event.clientId, description: `Atendimento: ${event.procedureName ?? 'Procedimento'}`, category: 'Atendimento', amountCents: event.valueCents, date: event.completedAt, paymentMethod: 'OUTRO', origin: 'APPOINTMENT', type: 'RECEITA', status: 'PAGO', appointmentId: event.appointmentId, procedureId: event.procedureId, procedureName: event.procedureName },tx));
    },existingTx);
  }
  async fromSubscriptionPayment(event: Omit<SubscriptionPaymentReceived, 'name'>,existingTx?:Prisma.TransactionClient) {
    return this.cash.transaction(async tx=>{
      const existing=await this.repository.findBySubscriptionPaymentId(event.subscriptionPaymentId,tx);if(existing)return toFinancialTransactionEntity(existing);
      await this.policy.assertWritable(event.paidAt,tx);
      return toFinancialTransactionEntity(await this.repository.create({ clientId: event.clientId, description: `Assinatura: ${event.subscriptionName}`, category: 'Assinatura', amountCents: event.amountCents, date: event.paidAt, paymentMethod: event.paymentMethod, origin: 'SUBSCRIPTION', type: 'RECEITA', status: 'PAGO', subscriptionId: event.subscriptionId, subscriptionPaymentId: event.subscriptionPaymentId, subscriptionName: event.subscriptionName },tx));
    },existingTx);
  }
  async synchronizeSubscriptionPayment(event: { subscriptionPaymentId: string; amountCents: number; paidAt: Date; paymentMethod: PaymentMethod; description?: string }, tx: Prisma.TransactionClient) {
    await this.cash.lock(tx);
    const existing = await this.repository.findBySubscriptionPaymentId(event.subscriptionPaymentId, tx);
    if (!existing) throw new NotFoundException('Lançamento financeiro vinculado não encontrado.');
    await this.policy.assertWritable(existing.date,tx);
    await this.policy.assertWritable(event.paidAt,tx);
    return this.repository.updateWithTransaction(existing.id, { amountCents: event.amountCents, date: event.paidAt, paymentMethod: event.paymentMethod, description: event.description ?? existing.description }, tx);
  }
  async update(id:string,input:UpdateFinancialTransactionDto,user:AuthenticatedUser,requestId?:string){return this.cash.transaction(async tx=>{
    const item=await this.repository.findById(id,tx);if(!item)throw new NotFoundException('Lançamento financeiro não encontrado.');
    if(item.status==='CANCELADO')throw new ConflictException('Lançamento excluído não pode ser alterado.');
    if(await this.repository.settlementFor(id,tx))throw new ConflictException('Baixa de conta é imutável; registre ajuste auditado.');
    const {reason,...payload}=input;const dto={...payload,resourceAccountId:payload.resourceAccountId??item.resourceAccountId??undefined,clientId:payload.clientId??item.clientId??undefined,counterparty:payload.counterparty??item.counterparty??undefined,procedureId:payload.procedureId??item.procedureId??undefined,productId:payload.productId??item.productId??undefined,category:payload.category??item.category??undefined,externalReference:payload.externalReference??item.externalReference??undefined,notes:payload.notes??item.notes??undefined,grossAmountCents:payload.grossAmountCents??item.grossAmountCents??undefined,discountType:payload.discountType??item.discountType??undefined,discountValue:payload.discountValue??item.discountValue??undefined};const date=new Date(dto.date.length===10?`${dto.date}T12:00:00-03:00`:dto.date);await this.policy.assertWritable(item.date,tx);await this.policy.assertWritable(date,tx);if(dto.resourceAccountId)await this.policy.assertAccount(dto.resourceAccountId,tx);
    const receita=dto.type==='RECEITA';if(!receita&&dto.clientId)throw new BadRequestException('Cliente é só para receita; em despesa informe o credor.');if(receita&&dto.counterparty)throw new BadRequestException('Credor é só para despesa; em receita informe o cliente.');if(dto.productId&&dto.procedureId)throw new BadRequestException('Escolha um item por lançamento: procedimento ou produto.');if(dto.clientId&&!(await this.clientes.exists(dto.clientId)))throw new NotFoundException('Cliente não encontrado.');
    let procedureName:string|null=null;if(dto.procedureId){if(!(await this.procedimentos.exists(dto.procedureId)))throw new NotFoundException('Procedimento não encontrado.');procedureName=(await this.procedimentos.getById(dto.procedureId)).name;}
    let productName:string|null=null;let productCostCents:number|null=null;if(dto.productId){if(!(await this.produtos.exists(dto.productId)))throw new NotFoundException('Produto não encontrado.');const produto=await this.produtos.findById(dto.productId);if(!produto)throw new NotFoundException('Produto não encontrado.');const commercialUse=produto.commercialUse??'VENDA';if(commercialUse!=='AMBOS'&&(receita?commercialUse!=='VENDA':commercialUse!=='COMPRA'))throw new BadRequestException(receita?'Este produto é somente para compra de credor.':'Este produto é somente para venda ao cliente.');productName=produto.name;productCostCents=receita?produto.purchasePriceCents:null;}
    const {discountCents,grossAmountCents}=this.desconto(dto);const data={...dto,description:dto.description.trim(),category:dto.category?.trim()||null,date,clientId:dto.clientId??null,counterparty:dto.counterparty?.trim()||null,procedureId:dto.procedureId??null,procedureName,productId:dto.productId??null,productName,productCostCents,grossAmountCents,discountCents,externalReference:dto.externalReference?.trim()||null,notes:dto.notes?.trim()||null,cancelledAt:dto.status==='CANCELADO'?new Date():null};
    const updated=await this.repository.update(id,data,tx);const auditValue=(value:unknown)=>value instanceof Date?value.toISOString():(typeof value==='string'||typeof value==='number'||typeof value==='boolean'||value===null?value:String(value));const changes=Object.entries(data).filter(([key,value])=>item[key as keyof typeof item]!==value).map(([field,after])=>({field,before:auditValue(item[field as keyof typeof item]),after:auditValue(after)}));await this.audit.record({actorUserId:user.id,actorName:user.name,actorEmail:user.email,module:'financial',entityType:'FinancialTransaction',entityId:id,action:'UPDATED',reason,requestId,changes},tx);return toFinancialTransactionEntity(updated);
  });}
  async cancel(id: string, user?:AuthenticatedUser, requestId?:string, reason?:string) { return this.cash.transaction(async tx=>{ const item = await this.repository.findById(id,tx); if (!item) throw new NotFoundException('Lançamento financeiro não encontrado.'); if(await this.repository.settlementFor(id,tx))throw new ConflictException('Baixa de conta é imutável; registre ajuste auditado.'); if (item.status === 'CANCELADO') throw new ConflictException('Lançamento financeiro já está cancelado.'); await this.policy.assertWritable(item.date,tx); const updated=await this.repository.update(id, { status: 'CANCELADO', cancelledAt: new Date() },tx);if(user)await this.audit.record({actorUserId:user.id,actorName:user.name,actorEmail:user.email,module:'financial',entityType:'FinancialTransaction',entityId:id,action:'CANCELLED',reason,requestId,changes:[{field:'status',before:item.status,after:'CANCELADO'}]},tx);return toFinancialTransactionEntity(updated); }); }
  async assign(id:string,dto:AssignResourceDto,user:AuthenticatedUser,requestId?:string){return this.cash.transaction(async tx=>{
    const item=await this.repository.findById(id,tx);if(!item)throw new NotFoundException('Lançamento não encontrado.');if(await this.repository.settlementFor(id,tx))throw new ConflictException('Baixa de conta é imutável; registre ajuste auditado.');await this.policy.assertWritable(item.date,tx);await this.policy.assertAccount(dto.resourceAccountId,tx);
    if(item.resourceAccountId===dto.resourceAccountId)throw new ConflictException('O lançamento já pertence a este local.');
    const updated=await this.repository.update(id,{resourceAccountId:dto.resourceAccountId},tx);
    await this.audit.record({actorUserId:user.id,actorName:user.name,actorEmail:user.email,module:'financial',entityType:'FinancialTransaction',entityId:id,action:'RESOURCE_ASSIGNED',reason:dto.reason,requestId,changes:[{field:'resourceAccountId',before:item.resourceAccountId,after:dto.resourceAccountId}]},tx);return updated;
  });}
}
