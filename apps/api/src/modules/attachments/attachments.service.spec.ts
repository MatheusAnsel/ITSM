import { NotFoundException, PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { AttachmentLimitError, AttachmentRecord, AttachmentsRepository, NewAttachment } from './attachments.repository';
import { AttachmentsService, TicketAccess } from './attachments.service';
import { FileStorage } from './attachments.storage';
import type { TicketStatus } from '../tickets/ticket.rules';

class InMemoryRepo extends AttachmentsRepository {
  items: AttachmentRecord[] = [];
  failNext = false;
  async create(data: NewAttachment, max: number): Promise<AttachmentRecord> {
    if (this.failNext) throw new Error('banco fora');
    if (this.items.filter((i) => i.ticketId === data.ticketId).length >= max) throw new AttachmentLimitError();
    const rec: AttachmentRecord = {
      id: `a${this.items.length + 1}`,
      ticketId: data.ticketId,
      filename: data.filename,
      mimeType: data.mimeType,
      size: data.size,
      storageKey: data.storageKey,
      createdAt: new Date(),
      uploader: { id: data.uploaderId, name: 'Fulano' },
    };
    this.items.push(rec);
    return rec;
  }
  async listByTicket(ticketId: string) {
    return this.items.filter((i) => i.ticketId === ticketId);
  }
  async find(ticketId: string, id: string) {
    return this.items.find((i) => i.ticketId === ticketId && i.id === id) ?? null;
  }
}

class InMemoryStorage extends FileStorage {
  files = new Map<string, Buffer>();
  async save(content: Buffer) {
    const key = `k${this.files.size + 1}`;
    this.files.set(key, content);
    return key;
  }
  open(key: string) {
    return Readable.from(this.files.get(key) ?? Buffer.alloc(0));
  }
  async remove(key: string) {
    this.files.delete(key);
  }
}

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const actor = { id: 'u1', role: 'REQUESTER' as const };

function setup(status: TicketStatus = 'OPEN', maxBytes = 1024) {
  const repo = new InMemoryRepo();
  const storage = new InMemoryStorage();
  const tickets: TicketAccess = {
    get: jest.fn(async (_a, id: string) => {
      if (id === 'invisivel') throw new NotFoundException('Chamado não encontrado');
      return { id, status };
    }),
  };
  return { repo, storage, tickets, service: new AttachmentsService(repo, storage, tickets, maxBytes) };
}

describe('AttachmentsService', () => {
  it('grava um anexo válido com o tipo detectado e guarda o arquivo', async () => {
    const { service, storage, repo } = setup();
    const view = await service.upload(actor, 't1', { originalName: 'tela.png', buffer: png });
    expect(view).toMatchObject({ filename: 'tela.png', mimeType: 'image/png', size: png.length });
    expect(view).not.toHaveProperty('storageKey');
    expect(storage.files.size).toBe(1);
    expect(repo.items[0].storageKey).toBe('k1');
  });

  it('respeita a visibilidade do chamado (404 para quem não pode ver)', async () => {
    const { service, storage } = setup();
    await expect(service.upload(actor, 'invisivel', { originalName: 'a.png', buffer: png })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.list(actor, 'invisivel')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.download(actor, 'invisivel', 'a1')).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.files.size).toBe(0);
  });

  it('rejeita envio sem arquivo, arquivo vazio e chamado encerrado', async () => {
    const { service } = setup();
    await expect(service.upload(actor, 't1', undefined)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(service.upload(actor, 't1', { originalName: 'a.png', buffer: Buffer.alloc(0) })).rejects.toBeInstanceOf(UnprocessableEntityException);
    for (const status of ['CLOSED', 'CANCELLED'] as const) {
      const s = setup(status);
      await expect(s.service.upload(actor, 't1', { originalName: 'a.png', buffer: png })).rejects.toBeInstanceOf(UnprocessableEntityException);
    }
  });

  it('rejeita arquivo acima do limite e tipo inválido sem gravar nada', async () => {
    const { service, storage } = setup('OPEN', 8);
    await expect(service.upload(actor, 't1', { originalName: 'a.png', buffer: png })).rejects.toBeInstanceOf(PayloadTooLargeException);
    const big = setup('OPEN', 1024);
    await expect(big.service.upload(actor, 't1', { originalName: 'malware.png', buffer: Buffer.from('MZ....') })).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(storage.files.size + big.storage.files.size).toBe(0);
  });

  it('bloqueia o 11º anexo e remove o arquivo órfão', async () => {
    const { service, storage } = setup();
    for (let i = 0; i < 10; i++) await service.upload(actor, 't1', { originalName: `a${i}.png`, buffer: png });
    await expect(service.upload(actor, 't1', { originalName: 'extra.png', buffer: png })).rejects.toThrow(/Limite de 10/);
    expect(storage.files.size).toBe(10);
  });

  it('remove o arquivo se a gravação no banco falhar por outro motivo', async () => {
    const { service, storage, repo } = setup();
    repo.failNext = true;
    await expect(service.upload(actor, 't1', { originalName: 'a.png', buffer: png })).rejects.toThrow('banco fora');
    expect(storage.files.size).toBe(0);
  });

  it('lista e baixa anexos do próprio chamado; 404 para anexo de outro chamado', async () => {
    const { service } = setup();
    const a = await service.upload(actor, 't1', { originalName: 'a.png', buffer: png });
    expect(await service.list(actor, 't1')).toHaveLength(1);
    expect(await service.list(actor, 't2')).toHaveLength(0);
    const { meta, stream } = await service.download(actor, 't1', a.id);
    expect(meta.filename).toBe('a.png');
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks).equals(png)).toBe(true);
    await expect(service.download(actor, 't2', a.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
