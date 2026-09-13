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

/**
 * Identificação vinda do **catálogo do backend** (`GET /api/financial/account-suggestions`).
 * Era lista fixa aqui; virou cadastro mantido na Manutenção de cadastros.
 */
export interface IdentificacaoLocal {
  name: string;
  kind: ResourceKind;
}

/** Opções do seletor de identificação (com "Outro (digitar)" no fim). */
export const identificacoesOpcoes = (catalogo: IdentificacaoLocal[]) => [
  ...catalogo.map((x) => ({
    value: `${x.kind}:${x.name}`,
    label: `${x.name} · ${RESOURCE_KINDS[x.kind]}`,
  })),
  { value: OUTRO_LOCAL, label: 'Outro (digitar)' },
];

/** Valor do seletor para um local existente (cai em "Outro (digitar)" se não estiver no catálogo). */
export const valorDaIdentificacao = (
  catalogo: IdentificacaoLocal[],
  name: string,
  kind: ResourceKind,
) => {
  const conhecida = catalogo.find((x) => x.name === name && x.kind === kind);
  return conhecida ? `${conhecida.kind}:${conhecida.name}` : OUTRO_LOCAL;
};

/** Separa o valor do seletor em nome e tipo (o tipo só é derivado quando é do catálogo). */
export const identificacaoEscolhida = (
  catalogo: IdentificacaoLocal[],
  valor: string,
) => catalogo.find((x) => `${x.kind}:${x.name}` === valor) ?? null;
