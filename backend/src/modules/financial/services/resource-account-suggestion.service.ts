import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import {
  AuditTrailService,
  type AuditChange,
} from '../../audit/services/audit-trail.service.js';
import type {
  CreateAccountSuggestionDto,
  UpdateAccountSuggestionDto,
} from '../dto/cash.dto.js';
import { CashRepository } from '../repositories/cash.repository.js';
import { mesmoNome } from '../../../common/utils/nome-normalizado.js';

/**
 * Catálogo das **identificações sugeridas** ao cadastrar um local do recurso
 * (espécie, bancos e maquinetas). Era lista fixa no frontend; virou cadastro para a
 * clínica manter sozinha (incluir banco novo, renomear, tirar de linha) pela tela de
 * Manutenção de cadastros.
 *
 * É **sugestão**: o local do recurso continua aceitando qualquer nome — o catálogo só
 * monta o seletor das telas.
 */
@Injectable()
export class ResourceAccountSuggestionService {
  constructor(
    private readonly repository: CashRepository,
    private readonly audit: AuditTrailService,
  ) {}

  list(activeOnly = false) {
    return this.repository
      .suggestions()
      .then((itens) =>
        activeOnly ? itens.filter((x) => x.active) : itens,
      );
  }

  create(
    dto: CreateAccountSuggestionDto,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      await this.ensureNomeLivre(dto.name, undefined, tx);
      const sugestao = await this.repository.createSuggestion(
        { name: dto.name, kind: dto.kind },
        tx,
      );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'ResourceAccountSuggestion',
          entityId: sugestao.id,
          action: 'CREATED',
          requestId,
          changes: [
            { field: 'name', before: null, after: sugestao.name },
            { field: 'kind', before: null, after: sugestao.kind },
          ],
        },
        tx,
      );
      return sugestao;
    });
  }

  update(
    id: string,
    dto: UpdateAccountSuggestionDto,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      const sugestao = await this.repository.suggestion(id, tx);
      if (!sugestao)
        throw new NotFoundException('Identificação sugerida não encontrada.');
      const data: Prisma.ResourceAccountSuggestionUpdateInput = {};
      const changes: AuditChange[] = [];
      if (dto.name && dto.name !== sugestao.name) {
        await this.ensureNomeLivre(dto.name, id, tx);
        data.name = dto.name;
        changes.push({ field: 'name', before: sugestao.name, after: dto.name });
      }
      if (dto.kind && dto.kind !== sugestao.kind) {
        data.kind = dto.kind;
        changes.push({ field: 'kind', before: sugestao.kind, after: dto.kind });
      }
      if (!changes.length)
        throw new BadRequestException(
          'Informe uma alteração diferente do valor atual.',
        );
      const atualizada = await this.repository.updateSuggestion(id, data, tx);
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'ResourceAccountSuggestion',
          entityId: id,
          action: 'UPDATED',
          requestId,
          changes,
        },
        tx,
      );
      return atualizada;
    });
  }

  inactivate(id: string, user: AuthenticatedUser, requestId?: string) {
    return this.alternar(id, user, requestId, false);
  }

  reactivate(id: string, user: AuthenticatedUser, requestId?: string) {
    return this.alternar(id, user, requestId, true);
  }

  private alternar(
    id: string,
    user: AuthenticatedUser,
    requestId: string | undefined,
    ativar: boolean,
  ) {
    return this.repository.transaction(async (tx) => {
      const sugestao = await this.repository.suggestion(id, tx);
      if (!sugestao)
        throw new NotFoundException('Identificação sugerida não encontrada.');
      if (sugestao.active === ativar)
        throw new ConflictException(
          ativar
            ? 'Identificação sugerida já está ativa.'
            : 'Identificação sugerida já está inativa.',
        );
      const atualizada = await this.repository.updateSuggestion(
        id,
        { active: ativar, deactivatedAt: ativar ? null : new Date() },
        tx,
      );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'ResourceAccountSuggestion',
          entityId: id,
          action: ativar ? 'REACTIVATED' : 'INACTIVATED',
          requestId,
          changes: [{ field: 'active', before: !ativar, after: ativar }],
        },
        tx,
      );
      return atualizada;
    });
  }

  private async ensureNomeLivre(
    name: string,
    ignorarId: string | undefined,
    tx: Prisma.TransactionClient,
  ) {
    const repetida = (await this.repository.suggestions(tx)).some(
      (x) => x.id !== ignorarId && mesmoNome(x.name, name),
    );
    if (repetida)
      throw new ConflictException('Já existe uma identificação com esse nome.');
  }
}
