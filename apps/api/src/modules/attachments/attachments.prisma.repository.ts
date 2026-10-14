import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AttachmentLimitError,
  AttachmentRecord,
  AttachmentsRepository,
  NewAttachment,
} from './attachments.repository';

const INCLUDE = { uploader: { select: { id: true, name: true } } } as const;
type Row = Prisma.AttachmentGetPayload<{ include: typeof INCLUDE }>;

const toRecord = (row: Row): AttachmentRecord => ({ ...row });

@Injectable()
export class PrismaAttachmentsRepository extends AttachmentsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: NewAttachment, maxPerTicket: number): Promise<AttachmentRecord> {
    // Serializable: duas gravações simultâneas não passam juntas do limite.
    return this.prisma
      .$transaction(
        async (tx) => {
          const count = await tx.attachment.count({ where: { ticketId: data.ticketId } });
          if (count >= maxPerTicket) throw new AttachmentLimitError();
          return tx.attachment.create({ data, include: INCLUDE });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .then(toRecord);
  }

  async listByTicket(ticketId: string): Promise<AttachmentRecord[]> {
    const rows = await this.prisma.attachment.findMany({
      where: { ticketId },
      include: INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRecord);
  }

  async find(ticketId: string, id: string): Promise<AttachmentRecord | null> {
    const row = await this.prisma.attachment.findFirst({ where: { id, ticketId }, include: INCLUDE });
    return row ? toRecord(row) : null;
  }
}
