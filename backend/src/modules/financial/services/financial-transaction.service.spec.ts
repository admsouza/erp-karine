import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FinancialTransactionService } from './financial-transaction.service.js';

const transaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1', clientId: null, description: 'Receita manual', category: null,
  amountCents: 1000, date: new Date('2026-09-13T12:00:00Z'), paymentMethod: 'PIX',
  origin: 'MANUAL', type: 'RECEITA', status: 'PAGO', appointmentId: null,
  subscriptionId: null, subscriptionPaymentId: null, procedureId: null,
  procedureName: null, subscriptionName: null, externalReference: null, notes: null,
  cancelledAt: null, createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

function setup() {
  const repository = {
    settlementFor: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (data) => transaction(data)),
    findById: vi.fn().mockResolvedValue(transaction()),
    findByAppointmentId: vi.fn().mockResolvedValue(null),
    findBySubscriptionPaymentId: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation(async (_id, data) => transaction(data)),
  };
  const clientes = {
    exists: vi.fn().mockResolvedValue(true),
    getById: vi.fn().mockResolvedValue({ id: 'c1', fullName: 'Ana Souza' }),
  };
  const procedimentos = {
    exists: vi.fn().mockResolvedValue(true),
    getById: vi.fn().mockResolvedValue({
      id: 'p1',
      name: 'Botox',
      unit: 'APLICACAO',
      currentValueCents: 90000,
    }),
  };
  return {
    repository,
    clientes,
    procedimentos,
    service: new FinancialTransactionService(
      repository as never,
      {
        transaction: async (work: (tx: object) => Promise<unknown>) => work({}),
      } as never,
      { assertWritable: vi.fn(), assertAccount: vi.fn() } as never,
      { record: vi.fn() } as never,
      clientes as never,
      procedimentos as never,
    ),
  };
}

describe('FinancialTransactionService', () => {
  it('cria receita ou despesa manual validada com origem MANUAL', async () => {
    const { service, repository } = setup();
    await service.createManual({ description: '  Material  ', amountCents: 3590, date: '2026-09-13', paymentMethod: 'PIX', type: 'DESPESA', status: 'PAGO', category: 'Insumos' });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ description: 'Material', amountCents: 3590, type: 'DESPESA', origin: 'MANUAL' }), expect.anything());
  });

  it('gera receita com snapshot ao concluir atendimento e é idempotente', async () => {
    const { service, repository } = setup();
    const event = { appointmentId: 'appointment-1', clientId: 'client-1', procedureId: 'procedure-1', procedureName: 'Botox', valueCents: 90000, completedAt: new Date('2026-09-13T12:00:00Z') };
    await service.fromAppointment(event);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 'appointment-1', procedureName: 'Botox', amountCents: 90000, origin: 'APPOINTMENT', type: 'RECEITA' }), expect.anything());
    repository.findByAppointmentId.mockResolvedValue(transaction({ appointmentId: 'appointment-1' }));
    await expect(service.fromAppointment(event)).resolves.toMatchObject({ appointmentId: 'appointment-1' });
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('gera receita com snapshot ao receber pagamento de assinatura e é idempotente', async () => {
    const { service, repository } = setup();
    const event = { subscriptionPaymentId: 'payment-1', subscriptionId: 'subscription-1', clientId: 'client-1', subscriptionName: 'Plano Ouro', amountCents: 9900, paidAt: new Date('2026-09-13T12:00:00Z'), paymentMethod: 'CARTAO_CREDITO' as const };
    await service.fromSubscriptionPayment(event);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ subscriptionPaymentId: 'payment-1', subscriptionName: 'Plano Ouro', amountCents: 9900, origin: 'SUBSCRIPTION' }), expect.anything());
    repository.findBySubscriptionPaymentId.mockResolvedValue(transaction({ subscriptionPaymentId: 'payment-1' }));
    await service.fromSubscriptionPayment(event);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('cancela uma única vez sem apagar o lançamento', async () => {
    const { service, repository } = setup();
    await service.cancel('tx-1');
    expect(repository.update).toHaveBeenCalledWith('tx-1', expect.objectContaining({ status: 'CANCELADO', cancelledAt: expect.any(Date) }), expect.anything());
    repository.findById.mockResolvedValue(transaction({ status: 'CANCELADO' }));
    await expect(service.cancel('tx-1')).rejects.toBeInstanceOf(ConflictException);
  });
  it('impede divergência entre baixa e destino do movimento',async()=>{
    const {service,repository}=setup();repository.settlementFor.mockResolvedValue({id:'settlement'} as never);
    await expect(service.assign('tx-1',{resourceAccountId:'bank',reason:'Trocar local'}, {id:'user'} as never)).rejects.toThrow('Baixa');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('vincula o cliente na receita e recusa cliente inexistente', async () => {
    const { service, repository, clientes } = setup();
    await service.createManual({
      description: 'Venda avulsa', amountCents: 9000, date: '2026-09-13',
      paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO', clientId: 'c1',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'c1', type: 'RECEITA' }),
      expect.anything(),
    );
    clientes.exists.mockResolvedValue(false);
    await expect(
      service.createManual({
        description: 'Venda', amountCents: 1000, date: '2026-09-13',
        paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO', clientId: 'c9',
      }),
    ).rejects.toThrow('Cliente não encontrado');
  });

  it('guarda o credor na despesa e recusa troca de papéis entre receita e despesa', async () => {
    const { service, repository } = setup();
    await service.createManual({
      description: '  Insumos  ', amountCents: 3590, date: '2026-09-13',
      paymentMethod: 'PIX', type: 'DESPESA', status: 'PAGO', counterparty: '  Distribuidora X  ',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ counterparty: 'Distribuidora X' }),
      expect.anything(),
    );
    await expect(
      service.createManual({
        description: 'Despesa', amountCents: 1000, date: '2026-09-13',
        paymentMethod: 'PIX', type: 'DESPESA', status: 'PAGO', clientId: 'c1',
      }),
    ).rejects.toThrow('Cliente é só para receita');
    await expect(
      service.createManual({
        description: 'Receita', amountCents: 1000, date: '2026-09-13',
        paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO', counterparty: 'Alguém',
      }),
    ).rejects.toThrow('Credor é só para despesa');
  });

  it('vincula o procedimento gravando o snapshot do nome', async () => {
    const { service, repository, procedimentos } = setup();
    await service.createManual({
      description: 'Botox sessão', amountCents: 90000, date: '2026-09-13',
      paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO', procedureId: 'p1',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ procedureId: 'p1', procedureName: 'Botox' }),
      expect.anything(),
    );
    procedimentos.exists.mockResolvedValue(false);
    await expect(
      service.createManual({
        description: 'X', amountCents: 1000, date: '2026-09-13',
        paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO', procedureId: 'p9',
      }),
    ).rejects.toThrow('Procedimento não encontrado');
  });

  it('aplica desconto percentual guardando o valor cheio e o desconto efetivo', async () => {
    const { service, repository } = setup();
    await service.createManual({
      description: 'Venda com desconto', amountCents: 9000, date: '2026-09-13',
      paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO',
      grossAmountCents: 10000, discountType: 'PERCENT' as never, discountValue: 1000,
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 9000, grossAmountCents: 10000, discountCents: 1000,
      }),
      expect.anything(),
    );
  });

  it('aplica desconto em reais e recusa desconto maior que o valor', async () => {
    const { service, repository } = setup();
    await service.createManual({
      description: 'Desconto em reais', amountCents: 8500, date: '2026-09-13',
      paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO',
      grossAmountCents: 10000, discountType: 'AMOUNT' as never, discountValue: 1500,
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ discountCents: 1500, amountCents: 8500 }),
      expect.anything(),
    );
    await expect(
      service.createManual({
        description: 'Desconto absurdo', amountCents: 0, date: '2026-09-13',
        paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO',
        grossAmountCents: 10000, discountType: 'AMOUNT' as never, discountValue: 20000,
      }),
    ).rejects.toThrow('Desconto não pode ser maior');
  });

  it('recusa desconto sem valor cheio e líquido que não confere com o desconto', async () => {
    const { service } = setup();
    await expect(
      service.createManual({
        description: 'Sem valor cheio', amountCents: 9000, date: '2026-09-13',
        paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO',
        discountType: 'PERCENT' as never, discountValue: 1000,
      }),
    ).rejects.toThrow('Informe o valor cheio');
    await expect(
      service.createManual({
        description: 'Conta errada', amountCents: 9500, date: '2026-09-13',
        paymentMethod: 'PIX', type: 'RECEITA', status: 'PAGO',
        grossAmountCents: 10000, discountType: 'PERCENT' as never, discountValue: 1000,
      }),
    ).rejects.toThrow('não confere com o desconto');
  });
});
