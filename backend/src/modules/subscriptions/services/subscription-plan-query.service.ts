import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionPlanRepository } from '../repositories/subscription-plan.repository.js';
import { toPlanEntity } from '../entities/subscription.entity.js';
@Injectable() export class SubscriptionPlanQueryService {
 constructor(private readonly repository:SubscriptionPlanRepository){}
 async getById(id:string){const model=await this.repository.findById(id);if(!model)throw new NotFoundException('Plano não encontrado.');return toPlanEntity(model);}
 async list(filters:{search?:string;active?:'true'|'false'}){return (await this.repository.findMany({search:filters.search,active:filters.active===undefined?undefined:filters.active==='true'})).map(toPlanEntity);}
}
