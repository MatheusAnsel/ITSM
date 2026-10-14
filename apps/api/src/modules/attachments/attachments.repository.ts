export interface AttachmentRecord {
  id: string;
  ticketId: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  createdAt: Date;
  uploader: { id: string; name: string };
}

export interface NewAttachment {
  ticketId: string;
  uploaderId: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
}

export abstract class AttachmentsRepository {
  // Falha com `AttachmentLimitError` se o chamado já estiver no limite (checado junto da gravação).
  abstract create(data: NewAttachment, maxPerTicket: number): Promise<AttachmentRecord>;
  abstract listByTicket(ticketId: string): Promise<AttachmentRecord[]>;
  abstract find(ticketId: string, id: string): Promise<AttachmentRecord | null>;
}

export class AttachmentLimitError extends Error {}
