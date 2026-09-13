import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResult } from '../../../common/pagination/paginated.js';
import type { ListProtocolsQueryDto } from '../dto/list-protocols-query.dto.js';
import { ProtocolRepository } from '../repositories/protocol.repository.js';
@Injectable()
export class ProtocolQueryService {
 constructor(private readonly protocols:ProtocolRepository){}
 async getById(id:string){const item=await this.protocols.findById(id);if(!item)throw new NotFoundException('Protocolo não encontrado.');return {...item,sessions:await this.protocols.listSessions(id)};}
 async list(query:ListProtocolsQueryDto){const result=await this.protocols.findPage({search:query.search,clientId:query.clientId,status:query.status,active:query.active===undefined?undefined:query.active==='true',skip:query.skip,take:query.pageSize});return buildPaginatedResult(result.items.map(this.toSummary),result.total,query);}
 async byClient(clientId:string){return (await this.protocols.findPage({clientId,skip:0,take:100})).items.map(this.toSummary);}
 private readonly toSummary = ({ chiefComplaint: _chiefComplaint, evaluation: _evaluation, objective: _objective, proposedProtocol: _proposedProtocol, guidelines: _guidelines, evolution: _evolution, notes: _notes, ...summary }: Awaited<ReturnType<ProtocolRepository['findById']>> & {}) => summary;
}
