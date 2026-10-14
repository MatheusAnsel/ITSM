import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { AllExceptionsFilter } from '../../common/http-exception.filter';
import { AttachmentLimitError, AttachmentRecord, AttachmentsRepository, NewAttachment } from './attachments.repository';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { FileStorage, LocalFileStorage } from './attachments.storage';

const TICKET = '3f1c2a54-0b0e-4a53-9c58-2d6b3a1f7e10';
const OTHER = '9a1c2a54-0b0e-4a53-9c58-2d6b3a1f7e99';
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

class Repo extends AttachmentsRepository {
  items: AttachmentRecord[] = [];
  async create(d: NewAttachment, max: number) {
    if (this.items.length >= max) throw new AttachmentLimitError();
    const r: AttachmentRecord = {
      id: `00000000-0000-4000-8000-${String(this.items.length + 1).padStart(12, '0')}`,
      ticketId: d.ticketId,
      filename: d.filename,
      mimeType: d.mimeType,
      size: d.size,
      storageKey: d.storageKey,
      createdAt: new Date(),
      uploader: { id: d.uploaderId, name: 'Ana' },
    };
    this.items.push(r);
    return r;
  }
  async listByTicket() {
    return this.items;
  }
  async find(_t: string, id: string) {
    return this.items.find((i) => i.id === id) ?? null;
  }
}

// Controller real + multer real + armazenamento em disco temporário; só auth e banco são simulados.
describe('Anexos via HTTP (multipart de verdade)', () => {
  let app: INestApplication;
  let dir: string;
  let repo: Repo;

  beforeAll(async () => {
    const { Test } = await import('@nestjs/testing');
    dir = await mkdtemp(join(tmpdir(), 'itsm-upload-'));
    repo = new Repo();
    const storage: FileStorage = new LocalFileStorage(dir);
    const tickets = {
      get: async (_a: unknown, id: string) => {
        if (id !== TICKET) throw new NotFoundException('Chamado não encontrado');
        return { id, status: 'OPEN' as const };
      },
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [{ provide: AttachmentsService, useValue: new AttachmentsService(repo, storage, tickets, 1024) }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
      req.user = { id: 'u1', role: 'REQUESTER' };
      next();
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  const http = () => request(app.getHttpServer());

  it('sobe, lista e baixa um PNG preservando o conteúdo e forçando download', async () => {
    const up = await http().post(`/tickets/${TICKET}/attachments`).attach('file', png, 'relatório final.png').expect(201);
    expect(up.body).toMatchObject({ filename: 'relatório final.png', mimeType: 'image/png', size: png.length });
    expect(up.body.storageKey).toBeUndefined();

    const files = await readdir(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^[a-f0-9]{32}$/);

    const list = await http().get(`/tickets/${TICKET}/attachments`).expect(200);
    expect(list.body).toHaveLength(1);

    const dl = await http()
      .get(`/tickets/${TICKET}/attachments/${up.body.id}`)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(dl.headers['content-type']).toContain('image/png');
    expect(dl.headers['content-disposition']).toMatch(/^attachment; filename=".*"; filename\*=UTF-8''/);
    expect(dl.headers['content-disposition']).toContain('relat%C3%B3rio%20final.png');
    expect(Buffer.isBuffer(dl.body) && dl.body.equals(png)).toBe(true);
  });

  it('rejeita arquivo acima do limite com 413 e não grava nada', async () => {
    const before = (await readdir(dir)).length;
    await http().post(`/tickets/${TICKET}/attachments`).attach('file', Buffer.alloc(2048, 1), 'grande.log').expect(413);
    expect((await readdir(dir)).length).toBe(before);
  });

  it('rejeita conteúdo que não corresponde à extensão (422) e envio sem arquivo (422)', async () => {
    await http().post(`/tickets/${TICKET}/attachments`).attach('file', Buffer.from('MZ-programa'), 'foto.png').expect(422);
    await http().post(`/tickets/${TICKET}/attachments`).field('x', 'y').expect(422);
  });

  it('chamado que o usuário não vê responde 404; id malformado, 400', async () => {
    await http().post(`/tickets/${OTHER}/attachments`).attach('file', png, 'a.png').expect(404);
    await http().get(`/tickets/${OTHER}/attachments`).expect(404);
    await http().get(`/tickets/nao-uuid/attachments`).expect(400);
  });
});
