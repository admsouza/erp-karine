import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

interface PrismaKnownError {
  code: string;
  meta?: Record<string, unknown>;
}

const PRISMA_STATUS: Record<string, Omit<ApiErrorBody, 'path' | 'timestamp'>> = {
  P2002: {
    statusCode: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Registro duplicado: valor já cadastrado.',
  },
  P2003: {
    statusCode: HttpStatus.BAD_REQUEST,
    error: 'Bad Request',
    message: 'Referência inválida: registro relacionado não existe.',
  },
  P2025: {
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    message: 'Registro não encontrado.',
  },
};

/**
 * Tratamento padronizado de erros da API.
 * Toda resposta de erro tem o formato:
 *   { statusCode, error, message, path, timestamp }
 * Erros internos (5xx) devolvem mensagem genérica — o detalhe fica no log do servidor.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const body = this.toErrorBody(exception, request);

    if (body.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown, request: Request): ApiErrorBody {
    const prismaError = toPrismaError(exception);
    if (prismaError) {
      const mapped = PRISMA_STATUS[prismaError.code];
      if (mapped) {
        return { ...mapped, path: request.url, timestamp: new Date().toISOString() };
      }
      this.logger.error(`Prisma ${prismaError.code} em ${request.method} ${request.url}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Erro interno ao processar a solicitação.',
        path: request.url,
        timestamp: new Date().toISOString(),
      };
    }

    if (exception instanceof HttpException) {
      return fromHttpException(exception, request);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Erro interno ao processar a solicitação.',
      path: request.url,
      timestamp: new Date().toISOString(),
    };
  }
}

function fromHttpException(exception: HttpException, request: Request): ApiErrorBody {
  const status = exception.getStatus();
  const response = exception.getResponse();

  const message =
    typeof response === 'string'
      ? response
      : ((response as { message?: string | string[] }).message ?? exception.message);

  const error =
    typeof response === 'object' && response !== null && 'error' in response
      ? String((response as { error?: unknown }).error)
      : exception.name;

  return { statusCode: status, error, message, path: request.url, timestamp: new Date().toISOString() };
}

function toPrismaError(exception: unknown): PrismaKnownError | null {
  if (typeof exception !== 'object' || exception === null) {
    return null;
  }
  const code = (exception as { code?: unknown }).code;
  if (typeof code !== 'string' || !code.startsWith('P')) {
    return null;
  }
  return exception as PrismaKnownError;
}
