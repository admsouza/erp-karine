import axios, { AxiosError } from 'axios';
import type { ApiError } from '../types';

/**
 * Cliente HTTP único da aplicação.
 * Em desenvolvimento o Vite faz proxy de /api para o backend NestJS (porta 3001).
 * Em produção o backend serve o build e a API na mesma origem.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

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
