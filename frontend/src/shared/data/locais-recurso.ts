/**
 * Catálogo dos locais do recurso (espécie, bancos e maquinetas) usado por **mais de uma
 * feature** — o cadastro em `features/financial` e a correção em `features/maintenance`.
 *
 * Fica em `shared/` por ser **dado sem regra**: quem valida nome/tipo é o backend. A
 * alternativa (duplicar a lista em cada feature) já mostrou o custo: uma lista envelhece
 * e a outra não. Aqui é um lugar só para incluir um banco novo.
 */
export const RESOURCE_KINDS = {
  CASH: 'Espécie',
  BANK: 'Banco',
  CARD: 'Conta de maquineta',
} as const;

export type ResourceKind = keyof typeof RESOURCE_KINDS;

/** Valor do seletor que libera o campo de nome próprio (mais de um banco/maquineta). */
export const OUTRO_LOCAL = '__outro__';

/** Identificações sugeridas, com o tipo junto. Ordem prática: espécie, bancos, maquinetas. */
export const IDENTIFICACOES_LOCAL: { name: string; kind: ResourceKind }[] = [
  { name: 'Dinheiro (gaveta)', kind: 'CASH' },
  { name: 'Banco do Brasil', kind: 'BANK' },
  { name: 'Caixa Econômica', kind: 'BANK' },
  { name: 'Itaú', kind: 'BANK' },
  { name: 'Nubank', kind: 'BANK' },
  { name: 'Santander', kind: 'BANK' },
  { name: 'Mercado Pago', kind: 'BANK' },
  { name: 'Maquineta principal', kind: 'CARD' },
  { name: 'Maquineta 2', kind: 'CARD' },
];

/** Opções do seletor de identificação (com "Outro (digitar)" no fim). */
export const identificacoesOpcoes = () => [
  ...IDENTIFICACOES_LOCAL.map((x) => ({
    value: `${x.kind}:${x.name}`,
    label: `${x.name} · ${RESOURCE_KINDS[x.kind]}`,
  })),
  { value: OUTRO_LOCAL, label: 'Outro (digitar)' },
];

/** Valor do seletor para um local existente (cai em "Outro (digitar)" se não for sugestão). */
export const valorDaIdentificacao = (name: string, kind: ResourceKind) => {
  const conhecida = IDENTIFICACOES_LOCAL.find(
    (x) => x.name === name && x.kind === kind,
  );
  return conhecida ? `${conhecida.kind}:${conhecida.name}` : OUTRO_LOCAL;
};

/** Separa o valor do seletor em nome e tipo (o tipo só é derivado quando é sugestão). */
export const identificacaoEscolhida = (valor: string) =>
  IDENTIFICACOES_LOCAL.find((x) => `${x.kind}:${x.name}` === valor) ?? null;
