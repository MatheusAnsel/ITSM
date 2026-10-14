import {
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Readable } from 'node:stream';
import type { Actor } from '../tickets/tickets.service';
import { isTerminal, TicketStatus } from '../tickets/ticket.rules';
import {
  ALLOWED_TYPES_LABEL,
  detectType,
  fixFilenameEncoding,
  MAX_ATTACHMENTS_PER_TICKET,
  sanitizeDisplayName,
} from './attachments.rules';
import { AttachmentLimitError, AttachmentRecord, AttachmentsRepository } from './attachments.repository';
import type { FileStorage } from './attachments.storage';

// Quem pode ver o chamado (RN-11) pode ver os anexos: reaproveita a checagem do TicketsService.
export interface TicketAccess {
  get(actor: Actor, id: string): Promise<{ id: string; status: TicketStatus }>;
}

export interface UploadInput {
  originalName: string;
  buffer: Buffer;
}

export interface AttachmentView {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  uploader: { id: string; name: string };
}

const toView = (a: AttachmentRecord): AttachmentView => ({
  id: a.id,
  filename: a.filename,
  mimeType: a.mimeType,
  size: a.size,
  createdAt: a.createdAt,
  uploader: a.uploader,
});

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly repo: AttachmentsRepository,
    private readonly storage: FileStorage,
    private readonly tickets: TicketAccess,
    private readonly maxBytes: number,
  ) {}

  async upload(actor: Actor, ticketId: string, file: UploadInput | undefined): Promise<AttachmentView> {
    const ticket = await this.tickets.get(actor, ticketId);
    if (!file || file.buffer.length === 0) {
      throw new UnprocessableEntityException('Envie um arquivo no campo "file"');
    }
    if (isTerminal(ticket.status)) {
      throw new UnprocessableEntityException('Chamados fechados ou cancelados não aceitam anexos');
    }
    if (file.buffer.length > this.maxBytes) {
      throw new PayloadTooLargeException(`O arquivo excede o limite de ${Math.floor(this.maxBytes / 1024 / 1024)} MB`);
    }

    const filename = sanitizeDisplayName(fixFilenameEncoding(file.originalName));
    const type = detectType(file.buffer, filename);
    if (!type) {
      throw new UnprocessableEntityException(
        `Tipo de arquivo não aceito. Use ${ALLOWED_TYPES_LABEL}, com a extensão correspondente ao conteúdo`,
      );
    }

    const storageKey = await this.storage.save(file.buffer);
    try {
      const record = await this.repo.create(
        {
          ticketId,
          uploaderId: actor.id,
          filename,
          mimeType: type.mimeType,
          size: file.buffer.length,
          storageKey,
        },
        MAX_ATTACHMENTS_PER_TICKET,
      );
      return toView(record);
    } catch (error) {
      // Não deixa arquivo órfão no disco se a gravação no banco falhou.
      await this.storage.remove(storageKey);
      if (error instanceof AttachmentLimitError) {
        throw new UnprocessableEntityException(`Limite de ${MAX_ATTACHMENTS_PER_TICKET} anexos por chamado atingido`);
      }
      throw error;
    }
  }

  async list(actor: Actor, ticketId: string): Promise<AttachmentView[]> {
    await this.tickets.get(actor, ticketId);
    return (await this.repo.listByTicket(ticketId)).map(toView);
  }

  async download(
    actor: Actor,
    ticketId: string,
    attachmentId: string,
  ): Promise<{ meta: AttachmentView; stream: Readable }> {
    await this.tickets.get(actor, ticketId);
    const record = await this.repo.find(ticketId, attachmentId);
    if (!record) throw new NotFoundException('Anexo não encontrado');
    return { meta: toView(record), stream: this.storage.open(record.storageKey) };
  }
}
