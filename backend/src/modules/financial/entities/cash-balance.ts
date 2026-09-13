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
