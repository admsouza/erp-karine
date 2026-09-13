/**
 * Comparação de nomes de cadastro (local do recurso, produto, etc.).
 *
 * Ignora maiúsculas **e acentos** de propósito: 'Itau' e 'Itaú' são o mesmo banco para quem digita,
 * e a unicidade do banco é sensível a acento — sem normalizar, a lista ficaria com dois "Itaú".
 */
export function normalizarNome(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function mesmoNome(a: string, b: string) {
  return normalizarNome(a) === normalizarNome(b);
}
