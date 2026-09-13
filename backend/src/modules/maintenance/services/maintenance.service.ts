import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import { ClientQueryService } from '../../clients/services/client-query.service.js';
import { ClientService } from '../../clients/services/client.service.js';
import { ProcedureQueryService } from '../../procedures/services/procedure-query.service.js';
import { ProcedureService } from '../../procedures/services/procedure.service.js';
import { SubscriptionPlanQueryService } from '../../subscriptions/services/subscription-plan-query.service.js';
import { SubscriptionPlanService } from '../../subscriptions/services/subscription-plan.service.js';
import { ResourceAccountService } from '../../financial/services/resource-account.service.js';
import { ResourceAccountSuggestionService } from '../../financial/services/resource-account-suggestion.service.js';
import { ProductQueryService } from '../../products/services/product-query.service.js';
import { ProductService } from '../../products/services/product.service.js';
import {
  MAINTENANCE_TYPES,
  type MaintenanceType,
} from '../dto/maintenance.dto.js';

const ROTULO_LOCAL: Record<string, string> = {
  CASH: 'Espécie',
  BANK: 'Banco',
  CARD: 'Conta de maquineta',
};
const ROTULO_UNIDADE: Record<string, string> = {
  SESSAO: 'Sessão',
  APLICACAO: 'Aplicação',
  REGIAO: 'Região',
  ML: 'ml',
  UNIDADE: 'Unidade',
  HORA: 'Hora',
  PACOTE: 'Pacote/Combo',
};
const ROTULO_PERIODICIDADE: Record<string, string> = {
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};

function moeda(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return '—';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export interface MaintenanceItem {
  id: string;
  type: MaintenanceType;
  label: string;
  secondary: string;
  active: boolean;
  updatedAt: Date | null;
  /** Valores atuais dos campos que o hub sabe editar (preenchem o formulário). */
  values: Record<string, string | number | null>;
}

export interface MaintenancePage {
  items: MaintenanceItem[];
  total: number;
  page: number;
  pageSize: number;
}

interface PlanoBruto {
  id: string;
  name: string;
  priceCents: number;
  periodicity?: string;
  active: boolean;
  updatedAt?: Date;
}

/**
 * Hub de manutenção de cadastros (Sistema). **Não tem tabela nem regra de domínio próprias**:
 * consulta os serviços públicos de consulta dos módulos donos e delega as operações aos
 * serviços públicos deles, que continuam validando e aplicando as regras.
 *
 * A trilha de auditoria é registrada **aqui apenas quando o dono não registra** — em
 * `financial` (local do recurso) o próprio serviço dono grava o evento, e duplicar
 * confundiria a leitura da trilha.
 */
@Injectable()
export class MaintenanceService {
  constructor(
    private readonly clientes: ClientQueryService,
    private readonly servicoClientes: ClientService,
    private readonly procedimentos: ProcedureQueryService,
    private readonly servicoProcedimentos: ProcedureService,
    private readonly planos: SubscriptionPlanQueryService,
    private readonly servicoPlanos: SubscriptionPlanService,
    private readonly locais: ResourceAccountService,
    private readonly sugestoes: ResourceAccountSuggestionService,
    private readonly produtos: ProductQueryService,
    private readonly servicoProdutos: ProductService,
    private readonly audit: AuditTrailService,
  ) {}

  private tipo(type: string): MaintenanceType {
    if (!(MAINTENANCE_TYPES as readonly string[]).includes(type))
      throw new BadRequestException('Tipo de cadastro inválido.');
    return type as MaintenanceType;
  }

  async list(query: {
    type: string;
    search?: string;
    active?: 'true' | 'false';
    page?: number;
    pageSize?: number;
  }): Promise<MaintenancePage> {
    const type = this.tipo(query.type);
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
    if (type === 'CLIENT' || type === 'PROCEDURE') {
      const resultado =
        type === 'CLIENT'
          ? await this.clientes.list({
              search: query.search,
              active: query.active,
              page,
              pageSize,
            } as never)
          : await this.procedimentos.list({
              search: query.search,
              active: query.active,
              page,
              pageSize,
            } as never);
      return {
        items: resultado.items.map((item) =>
          type === 'CLIENT'
            ? this.itemCliente(item as never)
            : this.itemProcedimento(item as never),
        ),
        total: resultado.total,
        page: resultado.page,
        pageSize: resultado.pageSize,
      };
    }
    const brutos: {
      id: string;
      name: string;
      secondary: string;
      active: boolean;
      updatedAt: Date | null;
      values: Record<string, string | number | null>;
    }[] =
      type === 'PRODUCT'
        ? (await this.produtos.list({ page: 1, pageSize: 200 })).items.map((x) => ({
            id: x.id,
            name: x.name,
            secondary: `${moeda(x.priceCents)}${x.unit ? ` · ${x.unit}` : ''}`,
            active: x.active,
            updatedAt: x.updatedAt,
            values: { name: x.name, priceCents: x.priceCents },
          }))
        : type === 'RESOURCE_ACCOUNT_SUGGESTION'
        ? (await this.sugestoes.list()).map((x) => ({
            id: x.id,
            name: x.name,
            secondary: ROTULO_LOCAL[x.kind] ?? x.kind,
            active: x.active,
            updatedAt: x.updatedAt,
            values: { name: x.name, kind: x.kind },
          }))
        : type === 'RESOURCE_ACCOUNT'
        ? (await this.locais.list()).map((x) => ({
            id: x.id,
            name: x.name,
            secondary: ROTULO_LOCAL[x.kind] ?? x.kind,
            active: x.active,
            updatedAt: x.updatedAt,
            values: { name: x.name, kind: x.kind },
          }))
        : ((await this.planos.list({})) as PlanoBruto[]).map((x) => ({
            id: x.id,
            name: x.name,
            secondary: `${moeda(x.priceCents)} · ${ROTULO_PERIODICIDADE[x.periodicity ?? 'MENSAL'] ?? ''}`.trim(),
            active: x.active,
            updatedAt: x.updatedAt ?? null,
            values: { name: x.name, priceCents: x.priceCents },
          }));
    const busca = query.search?.trim().toLowerCase();
    const filtrados = brutos.filter(
      (x) =>
        (!busca || x.name.toLowerCase().includes(busca)) &&
        (query.active === undefined || String(x.active) === query.active),
    );
    return {
      items: filtrados
        .slice((page - 1) * pageSize, page * pageSize)
        .map((x) => ({
          id: x.id,
          type,
          label: x.name,
          secondary: x.secondary,
          active: x.active,
          updatedAt: x.updatedAt,
          values: x.values,
        })),
      total: filtrados.length,
      page,
      pageSize,
    };
  }

  private itemCliente(item: {
    id: string;
    fullName: string;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    active: boolean;
    updatedAt?: Date;
  }): MaintenanceItem {
    return {
      id: item.id,
      type: 'CLIENT',
      label: item.fullName,
      secondary: item.phone ?? item.whatsapp ?? item.email ?? '',
      active: item.active,
      updatedAt: item.updatedAt ?? null,
      values: { name: item.fullName, phone: item.phone ?? null },
    };
  }

  private itemProcedimento(item: {
    id: string;
    name: string;
    unit?: string;
    currentValueCents?: number | null;
    active: boolean;
    updatedAt?: Date;
  }): MaintenanceItem {
    return {
      id: item.id,
      type: 'PROCEDURE',
      label: item.name,
      secondary: `${moeda(item.currentValueCents)} / ${ROTULO_UNIDADE[item.unit ?? 'SESSAO'] ?? ''}`.trim(),
      active: item.active,
      updatedAt: item.updatedAt ?? null,
      values: { name: item.name, unit: item.unit ?? null },
    };
  }

  /**
   * Quantos cadastros existem em cada tipo. Alimenta o seletor da tela — sem isso a
   * pessoa abre num tipo vazio (ex.: locais do recurso sem nenhum cadastro) e pensa que
   * a manutenção não funciona.
   */
  async summary(): Promise<{ counts: Record<MaintenanceType, number> }> {
    const [clientes, procedimentos, locais, sugestoes, produtos, planos] = await Promise.all([
      this.clientes.list({ page: 1, pageSize: 1 } as never),
      this.procedimentos.list({ page: 1, pageSize: 1 } as never),
      this.locais.list(),
      this.sugestoes.list(),
      this.produtos.list({ page: 1, pageSize: 1 }),
      this.planos.list({}),
    ]);
    return {
      counts: {
        RESOURCE_ACCOUNT: locais.length,
        RESOURCE_ACCOUNT_SUGGESTION: sugestoes.length,
        CLIENT: clientes.total,
        PROCEDURE: procedimentos.total,
        PRODUCT: produtos.total,
        SUBSCRIPTION_PLAN: planos.length,
      },
    };
  }

  /**
   * Cria **apenas a identificação sugerida de local** — é o catálogo que a clínica mantém
   * por aqui (incluir banco novo sem depender de deploy). Os demais cadastros continuam
   * sendo criados na tela do módulo dono.
   */
  async create(
    type: string,
    dto: MaintenanceUpdateInput,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    const t = this.tipo(type);
    if (t !== 'RESOURCE_ACCOUNT_SUGGESTION')
      throw new BadRequestException(
        'A manutenção de cadastros não cria este tipo de cadastro.',
      );
    if (!dto.name || !dto.kind)
      throw new BadRequestException('Informe a identificação e o tipo.');
    return await this.sugestoes.create(
      { name: dto.name, kind: dto.kind as never },
      user,
      requestId,
    );
  }

  async update(
    type: string,
    id: string,
    dto: MaintenanceUpdateInput,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    const t = this.tipo(type);
    if (t === 'RESOURCE_ACCOUNT' || t === 'RESOURCE_ACCOUNT_SUGGESTION') {
      if (dto.name === undefined && dto.kind === undefined)
        throw new BadRequestException(
          'Informe ao menos um campo para alterar o local do recurso.',
        );
      // O módulo dono valida e grava a própria trilha.
      const payload = { name: dto.name, kind: dto.kind as never };
      return t === 'RESOURCE_ACCOUNT'
        ? this.locais.update(id, payload, user, requestId)
        : this.sugestoes.update(id, payload, user, requestId);
    }
    if (t === 'CLIENT') {
      if (dto.name === undefined && dto.phone === undefined)
        throw new BadRequestException(
          'Informe ao menos um campo para alterar o cliente.',
        );
      const antes = await this.clientes.getById(id);
      const atualizado = await this.servicoClientes.update(id, {
        ...(dto.name !== undefined ? { fullName: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      });
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'maintenance',
          entityType: 'Client',
          entityId: id,
          action: 'UPDATED',
          requestId,
          changes: this.diferencas(
            { fullName: antes.fullName, phone: antes.phone },
            { fullName: dto.name, phone: dto.phone },
          ),
        },
        undefined,
      );
      return atualizado;
    }
    if (t === 'PRODUCT') {
      if (dto.name === undefined && dto.priceCents === undefined)
        throw new BadRequestException(
          'Informe ao menos um campo para alterar o produto.',
        );
      // O módulo dono valida e grava a própria trilha.
      return this.servicoProdutos.update(
        id,
        { name: dto.name, priceCents: dto.priceCents },
        user,
        requestId,
      );
    }
    if (t === 'PROCEDURE') {
      if (dto.name === undefined && dto.unit === undefined)
        throw new BadRequestException(
          'Informe ao menos um campo para alterar o procedimento.',
        );
      const antes = await this.procedimentos.getById(id);
      const atualizado = await this.servicoProcedimentos.update(id, {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit as never } : {}),
      });
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'maintenance',
          entityType: 'Procedure',
          entityId: id,
          action: 'UPDATED',
          requestId,
          changes: this.diferencas(
            { name: antes.name, unit: antes.unit },
            { name: dto.name, unit: dto.unit },
          ),
        },
        undefined,
      );
      return atualizado;
    }
    if (dto.name === undefined && dto.priceCents === undefined)
      throw new BadRequestException(
        'Informe ao menos um campo para alterar o plano.',
      );
    const planoAntes = (await this.planos.getById(id)) as PlanoBruto;
    const plano = await this.servicoPlanos.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
    });
    await this.audit.record(
      {
        actorUserId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        module: 'maintenance',
        entityType: 'SubscriptionPlan',
        entityId: id,
        action: 'UPDATED',
        requestId,
        changes: this.diferencas(
          { name: planoAntes.name, priceCents: planoAntes.priceCents },
          { name: dto.name, priceCents: dto.priceCents },
        ),
      },
      undefined,
    );
    return plano;
  }

  private diferencas(
    antes: Record<string, unknown>,
    depois: Record<string, unknown>,
  ) {
    return Object.keys(antes)
      .filter((campo) => depois[campo] !== undefined && depois[campo] !== antes[campo])
      .map((campo) => ({
        field: campo,
        before: (antes[campo] ?? null) as string | number | boolean | null,
        after: (depois[campo] ?? null) as string | number | boolean | null,
      }));
  }

  async inactivate(
    type: string,
    id: string,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.alternarEstado(type, id, user, requestId, false);
  }

  async reactivate(
    type: string,
    id: string,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.alternarEstado(type, id, user, requestId, true);
  }

  private async alternarEstado(
    type: string,
    id: string,
    user: AuthenticatedUser,
    requestId: string | undefined,
    ativar: boolean,
  ) {
    const t = this.tipo(type);
    const acao = ativar ? 'REACTIVATED' : 'INACTIVATED';
    const estado = { field: 'active', before: !ativar, after: ativar };
    let resultado: unknown;
    if (t === 'RESOURCE_ACCOUNT' || t === 'RESOURCE_ACCOUNT_SUGGESTION') {
      // Dono grava a própria trilha.
      const servico = t === 'RESOURCE_ACCOUNT' ? this.locais : this.sugestoes;
      resultado = ativar
        ? await servico.reactivate(id, user, requestId)
        : await servico.inactivate(id, user, requestId);
      return resultado;
    }
    if (t === 'CLIENT') {
      resultado = ativar
        ? await this.servicoClientes.reactivate(id)
        : await this.servicoClientes.inactivate(id);
    } else if (t === 'PROCEDURE') {
      resultado = ativar
        ? await this.servicoProcedimentos.reactivate(id)
        : await this.servicoProcedimentos.inactivate(id);
    } else if (t === 'PRODUCT') {
      resultado = ativar
        ? await this.servicoProdutos.reactivate(id, user, requestId)
        : await this.servicoProdutos.inactivate(id, user, requestId);
      return resultado;
    } else {
      resultado = ativar
        ? await this.servicoPlanos.reactivate(id)
        : await this.servicoPlanos.inactivate(id);
    }
    await this.audit.record(
      {
        actorUserId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        module: 'maintenance',
        entityType:
          t === 'CLIENT'
            ? 'Client'
            : t === 'PROCEDURE'
              ? 'Procedure'
              : 'SubscriptionPlan',
        entityId: id,
        action: acao,
        requestId,
        changes: [estado],
      },
      undefined,
    );
    return resultado;
  }
}

export interface MaintenanceUpdateInput {
  name?: string;
  kind?: string;
  phone?: string;
  unit?: string;
  priceCents?: number;
}
