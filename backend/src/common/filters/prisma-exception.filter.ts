import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from './http-exception.filter.js';

interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
}

const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: HttpStatus.CONFLICT, message: 'Registro duplicado: valor já cadastrado.' },
  P2003: { status: HttpStatus.BAD_REQUEST, message: 'Referência inválida: registro relacionado não existe.' },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Registro não encontrado.' },
};

/**
 * Converte erros conhecidos do Prisma em respostas HTTP padronizadas,
 * evitando vazar detalhes do banco para o cliente.
 */
@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (!isKnownPrismaError(exception)) {
      throw exception;
    }

    const mapped = PRISMA_ERROR_MAP[exception.code];
    if (!mapped) {
      this.logger.error(`Prisma ${exception.code} em ${request.method} ${request.url}`, exception);
      throw exception;
    }

    response.status(mapped.status).json({
      statusCode: mapped.status,
      error: mapped.status === HttpStatus.CONFLICT ? 'Conflict' : 'Bad Request',
      message: mapped.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorBody);
  }
}

function isKnownPrismaError(exception: unknown): exception is PrismaKnownError {
  if (typeof exception !== 'object' || exception === null) {
    return false;
  }
  const code = (exception as { code?: unknown }).code;
  return typeof code === 'string' && code.startsWith('P');
}
