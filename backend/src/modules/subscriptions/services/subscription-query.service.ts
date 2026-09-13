import { Injectable, NotFoundException } from '@nestjs/common';
import type { SubscriptionStatus } from '../../../generated/prisma/client.js';
import { ClientQueryService } from '../../clients/services/client-query.service.js';
import { SubscriptionRepository } from '../repositories/subscription.repository.js';
import { toSubscriptionEntity } from '../entities/subscription.entity.js';
@Injectable() export class SubscriptionQueryService {
 constructor(private readonly repository:SubscriptionRepository,private readonly clients:ClientQueryService){}
 private async enrich(model:NonNullable<Awaited<ReturnType<SubscriptionRepository['findById']>>>){const client=await this.clients.getById(model.clientId);return {...toSubscriptionEntity(model),clientName:client.fullName};}
 async getById(id:string){const model=await this.repository.findById(id);if(!model)throw new NotFoundException('Assinatura não encontrada.');return this.enrich(model);}
 async list(filters:{clientId?:string;status?:SubscriptionStatus}){return Promise.all((await this.repository.findMany(filters)).map(x=>this.enrich(x)));}
 active(){return this.list({status:'ATIVA'});}
}
