/**
 * Comparação de nome de **local do recurso** (e das identificações sugeridas).
 *
 * Ignora maiúsculas **e acentos** de propósito: 'Itau' e 'Itaú' são o mesmo banco para
 * quem digita, e a unicidade do banco (Postgres) é sensível a acento — sem normalizar,
 * a lista de escolha ficaria com dois "Itaú" e a conferência de caixa perderia o sentido.
 */
export function mesmoNome(a: string, b: string) {
  const normalizar = (valor: string) =>
    valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  return normalizar(a) === normalizar(b);
}
