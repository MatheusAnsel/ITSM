import { Module } from '@nestjs/common';
import { validateEnv } from '../../config/env';
import { TicketsModule } from '../tickets/tickets.module';
import { TicketsService } from '../tickets/tickets.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaAttachmentsRepository } from './attachments.prisma.repository';
import { AttachmentsRepository } from './attachments.repository';
import { uploadLimitBytes } from './attachments.rules';
import { AttachmentsService } from './attachments.service';
import { FileStorage, LocalFileStorage } from './attachments.storage';

@Module({
  imports: [TicketsModule],
  controllers: [AttachmentsController],
  providers: [
    { provide: AttachmentsRepository, useClass: PrismaAttachmentsRepository },
    { provide: FileStorage, useFactory: () => new LocalFileStorage(validateEnv().UPLOAD_DIR) },
    {
      provide: AttachmentsService,
      useFactory: (repo: AttachmentsRepository, storage: FileStorage, tickets: TicketsService) =>
        new AttachmentsService(repo, storage, tickets, uploadLimitBytes(validateEnv().MAX_UPLOAD_MB)),
      inject: [AttachmentsRepository, FileStorage, TicketsService],
    },
  ],
})
export class AttachmentsModule {}
