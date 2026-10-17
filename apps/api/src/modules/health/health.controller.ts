import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: 'ok'; database: 'up'; uptime: number; commit: string | null }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível');
    }
    // Commit em execução, quando a plataforma informa (o Render define RENDER_GIT_COMMIT). Serve para
    // conferir, depois de um deploy, se a versão nova já está respondendo.
    const commit = process.env.RENDER_GIT_COMMIT ?? process.env.GIT_COMMIT ?? null;
    return { status: 'ok', database: 'up', uptime: Math.round(process.uptime()), commit };
  }
}
