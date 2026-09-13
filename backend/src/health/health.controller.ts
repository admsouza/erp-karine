import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../common/prisma/prisma.service.js';

interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  database: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Verifica se a API e o banco de dados estão respondendo' })
  @ApiOkResponse({ description: 'API e banco operacionais' })
  async check(): Promise<HealthResponse> {
    return {
      status: 'ok',
      service: 'erp-estetica-api',
      version: process.env.npm_package_version ?? '0.1.0',
      database: await this.databaseStatus(),
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async databaseStatus(): Promise<'up' | 'down'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }
}
