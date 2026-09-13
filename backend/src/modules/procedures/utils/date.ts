/**
 * Datas "puras" das vigências.
 *
 * As colunas são `DATE` no banco e comparam com datas sem hora. Usar
 * `new Date()` do servidor (UTC) faria a virada do dia acontecer às 21h de
 * Recife — por isso o "hoje" é sempre calculado no fuso da clínica.
 */

/** Data de hoje no fuso da clínica, como meia-noite UTC. */
export function dataDeHoje(): Date {
  const agora = new Date();
  const local = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Recife' }));
  return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
}

/** `2026-10-01` → data pura em UTC. */
export function parseData(valor: string): Date {
  return new Date(`${valor.slice(0, 10)}T00:00:00.000Z`);
}

/** Data pura → `01/10/2026` (para mensagens de erro). */
export function formatarData(data: Date): string {
  return data.toISOString().slice(0, 10).split('-').reverse().join('/');
}
