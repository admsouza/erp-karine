import axios, { AxiosError } from 'axios';
import type { ApiError } from '../types/api';

/**
 * Cliente HTTP único da aplicação.
 * Em desenvolvimento o Vite faz proxy de /api para o backend NestJS (3001).
 * Em produção o backend serve o build e a API na mesma origem.
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  // O cookie de sessão é httpOnly e da mesma origem: o navegador envia sozinho.
  withCredentials: true,
});

/**
 * Rotas em que 401 é resposta esperada e não significa "sessão expirou":
 * o login (senha errada) e o /auth/me do boot da aplicação.
 */
const ROTAS_SEM_REDIRECIONAMENTO = ['/auth/login', '/auth/me'];

http.interceptors.response.use(
  (resposta) => resposta,
  (erro: AxiosError) => {
    const url = erro.config?.url ?? '';
    const expirou = erro.response?.status === 401 && !ROTAS_SEM_REDIRECIONAMENTO.some((rota) => url.includes(rota));
    if (expirou) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(erro);
  },
);

/** Converte qualquer falha do axios na mensagem padronizada da API. */
export function describeApiError(error: unknown): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiError | undefined;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join(' ') : body.message;
    }
    if (error.code === 'ECONNABORTED') {
      return 'Tempo de resposta excedido. Tente novamente.';
    }
    if (!error.response) {
      return 'Não foi possível conectar ao servidor.';
    }
  }
  return 'Não foi possível concluir a operação.';
}
