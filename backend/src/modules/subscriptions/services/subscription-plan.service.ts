import { ConflictException, Injectable } from '@nestjs/common';
import type { CreatePlanDto, UpdatePlanDto } from '../dto/subscription.dto.js';
import { SubscriptionPlanRepository } from '../repositories/subscription-plan.repository.js';
import { SubscriptionPlanQueryService } from './subscription-plan-query.service.js';
@Injectable() export class SubscriptionPlanService {
 constructor(private readonly repository:SubscriptionPlanRepository,private readonly query:SubscriptionPlanQueryService){}
 async create(dto:CreatePlanDto){await this.available(dto.name);return this.repository.create({name:dto.name,description:dto.description||null,priceCents:dto.priceCents,periodicity:dto.periodicity,sessionsPerPeriod:dto.sessionsPerPeriod??null});}
 async update(id:string,dto:UpdatePlanDto){await this.query.getById(id);if(dto.name)await this.available(dto.name,id);return this.repository.update(id,{...dto,description:dto.description===undefined?undefined:dto.description||null,sessionsPerPeriod:dto.sessionsPerPeriod===undefined?undefined:dto.sessionsPerPeriod??null});}
 async inactivate(id:string){const plan=await this.query.getById(id);if(!plan.active)throw new ConflictException('Plano já está inativo.');return this.repository.update(id,{active:false});}
 async reactivate(id:string){const plan=await this.query.getById(id);if(plan.active)throw new ConflictException('Plano já está ativo.');return this.repository.update(id,{active:true});}
 private async available(name:string,id?:string){const found=await this.repository.findByName(name);if(found&&found.id!==id)throw new ConflictException('Já existe plano com este nome.');}
}
