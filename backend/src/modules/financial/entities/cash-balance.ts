import { ConflictException } from '@nestjs/common';
export function balanceTotals(
  openingCents: number,
  items: { type: string; amountCents: number }[],
) {
  const incomingCents = items
    .filter((x) => x.type === 'RECEITA')
    .reduce((s, x) => s + x.amountCents, 0);
  const outgoingCents = items
    .filter((x) => x.type === 'DESPESA')
    .reduce((s, x) => s + x.amountCents, 0);
  const expectedCents = openingCents + incomingCents - outgoingCents;
  if (
    [openingCents, incomingCents, outgoingCents, expectedCents].some(
      (x) => Math.abs(x) > 2_000_000_000,
    )
  )
    throw new ConflictException('Saldo excede o limite suportado em centavos.');
  return { openingCents, incomingCents, outgoingCents, expectedCents };
}

export interface CashTotals {
  openingCents: number;
  incomingCents: number;
  outgoingCents: number;
  expectedCents: number;
  countedCents: number | null;
  differenceCents: number | null;
}

/**
 * O saldo do caixa é **um só**: a composição é a soma dos locais do recurso
 * (espécie + banco + maquineta). O detalhe por local continua existindo para a
 * conferência física; aqui sai o consolidado.
 *
 * Apurado e divergência só consolidam quando **todos** os locais já têm valor —
 * somar parcial daria um total que parece conferido e não está.
 */
export function consolidateBalances(
  balances: {
    openingCents: number;
    incomingCents: number;
    outgoingCents: number;
    expectedCents: number;
    countedCents: number | null;
    differenceCents: number | null;
  }[],
): CashTotals {
  const soma = (valor: (item: (typeof balances)[number]) => number) =>
    balances.reduce((total, item) => total + valor(item), 0);
  // `!= null` cobre `null` e `undefined`: no período aberto a divergência ainda não existe
  // e somar valores ausentes daria NaN (total que parece conferido e não está).
  const todosApuraram = balances.every((x) => x.countedCents != null);
  const todasDivergencias = balances.every((x) => x.differenceCents != null);
  return {
    openingCents: soma((x) => x.openingCents),
    incomingCents: soma((x) => x.incomingCents),
    outgoingCents: soma((x) => x.outgoingCents),
    expectedCents: soma((x) => x.expectedCents),
    countedCents: todosApuraram ? soma((x) => x.countedCents as number) : null,
    differenceCents: todasDivergencias
      ? soma((x) => x.differenceCents as number)
      : null,
  };
}
