import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SYSTEM_USER_EMAIL, SYSTEM_USER_NAME } from '../common/system-user';
import { BCRYPT_COST, normalizeEmail, validatePassword } from '../modules/auth/auth.rules';
import { DEFAULT_SLA, PRIORITIES } from '../modules/tickets/ticket.rules';
import { LocalFileStorage } from '../modules/attachments/attachments.storage';
import { buildDemoTickets, DEFAULT_DEMO_REFRESH_HOURS, DEMO_RESET_ACTION, isDemoStale } from './seed-demo';

const prisma = new PrismaClient();

const CATEGORIES = [
  ['Hardware', 'Computadores, periféricos e equipamentos'],
  ['Software', 'Instalação, licenças e erros de aplicativos'],
  ['Rede', 'Internet, Wi-Fi, VPN e cabeamento'],
  ['Acesso e senha', 'Contas, permissões e redefinição de senha'],
  ['E-mail', 'Caixa de entrada, listas e agenda'],
  ['Impressão', 'Impressoras, toners e filas de impressão'],
  ['Outros', 'Demais solicitações'],
] as const;

async function seedBase(): Promise<void> {
  for (const [name, description] of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, create: { name, description }, update: {} });
  }
  // As políticas existentes não são sobrescritas: o administrador pode tê-las ajustado.
  for (const priority of PRIORITIES) {
    await prisma.slaPolicy.upsert({
      where: { priority },
      create: { priority, ...DEFAULT_SLA[priority] },
      update: {},
    });
  }
  const passwordHash = await bcrypt.hash(randomBytes(48).toString('base64url'), BCRYPT_COST);
  await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    create: {
      name: SYSTEM_USER_NAME,
      email: SYSTEM_USER_EMAIL,
      passwordHash,
      role: 'ADMIN',
      active: false,
    },
    update: {},
  });
}

async function seedAdmin(): Promise<void> {
  const email = normalizeEmail(process.env.SEED_ADMIN_EMAIL ?? 'admin@itsm.local');
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  const errors = validatePassword(password);
  if (errors.length > 0) {
    throw new Error(`SEED_ADMIN_PASSWORD inválida: ${errors.join('; ')}`);
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Administrador ${email} já existe; senha mantida.`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.user.create({ data: { name: 'Administrador', email, passwordHash, role: 'ADMIN' } });
  console.log(`Administrador ${email} criado.`);
}

// Dados de demonstração. Em produção só roda numa instância pública de demonstração (DEMO_MODE=true).
// A senha dos usuários de demonstração (DEMO_PASSWORD) é separada da do administrador, que continua secreta.
async function seedDemo(): Promise<void> {
  const password = process.env.DEMO_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? '';
  const errors = validatePassword(password);
  if (errors.length > 0) {
    throw new Error(`DEMO_PASSWORD (ou SEED_ADMIN_PASSWORD) inválida: ${errors.join('; ')}`);
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const people = [
    ['gestor', 'Gestor Demo', 'gestor@itsm.local', 'MANAGER'],
    ['atendente', 'Atendente Demo', 'atendente@itsm.local', 'AGENT'],
    ['diego', 'Diego Martins', 'diego.martins@itsm.local', 'AGENT'],
    ['elisa', 'Elisa Prado', 'elisa.prado@itsm.local', 'AGENT'],
    ['solicitante', 'Solicitante Demo', 'solicitante@itsm.local', 'REQUESTER'],
    ['ana', 'Ana Ribeiro', 'ana.ribeiro@itsm.local', 'REQUESTER'],
    ['bruno', 'Bruno Alves', 'bruno.alves@itsm.local', 'REQUESTER'],
    ['carla', 'Carla Nunes', 'carla.nunes@itsm.local', 'REQUESTER'],
  ] as const;
  const idOf = new Map<string, string>();
  const system = await prisma.user.findUniqueOrThrow({ where: { email: SYSTEM_USER_EMAIL } });
  const now = new Date();
  const lastReset = await prisma.auditLog.findFirst({
    where: { action: DEMO_RESET_ACTION },
    orderBy: { createdAt: 'desc' },
  });
  const refreshHours = Number(process.env.DEMO_REFRESH_HOURS ?? DEFAULT_DEMO_REFRESH_HOURS);
  const stale = isDemoStale(lastReset?.createdAt ?? null, await prisma.ticket.count(), now, refreshHours);

  // Na recriação, os usuários de demonstração voltam ao estado original (perfil, ativo e senha
  // pública), para um visitante não deixar a demonstração quebrada para o próximo.
  for (const [key, name, email, role] of people) {
    const user = await prisma.user.upsert({
      where: { email },
      create: { name, email, passwordHash, role },
      update: stale ? { name, role, active: true, passwordHash } : {},
    });
    idOf.set(key, user.id);
  }
  idOf.set('sistema', system.id);

  if (stale) {
    // Chamados levam junto comentários, histórico e anexos (cascade); os arquivos dos anexos saem do disco.
    const storage = new LocalFileStorage(process.env.UPLOAD_DIR ?? './uploads');
    const files = await prisma.attachment.findMany({ select: { storageKey: true } });
    await prisma.ticket.deleteMany();
    await Promise.all(files.map((f) => storage.remove(f.storageKey)));
    // A trilha de auditoria da demonstração é das ações de visitantes sobre os dados apagados.
    await prisma.auditLog.deleteMany();
  }

  const assets = [
    ['NB-0001', 'Notebook Dell Latitude 5440', 'NOTEBOOK', 'IN_USE', 'solicitante'],
    ['NB-0002', 'Notebook Lenovo ThinkPad E14', 'NOTEBOOK', 'IN_STOCK', null],
    ['NB-0003', 'Notebook HP ProBook 440', 'NOTEBOOK', 'IN_USE', 'ana'],
    ['DT-0001', 'Desktop Dell OptiPlex 3000', 'DESKTOP', 'IN_USE', 'bruno'],
    ['MN-0001', 'Monitor LG 24 polegadas', 'MONITOR', 'IN_STOCK', null],
    ['MN-0002', 'Monitor Dell 27 polegadas', 'MONITOR', 'IN_USE', 'carla'],
    ['IM-0001', 'Impressora HP LaserJet Pro', 'PRINTER', 'MAINTENANCE', null],
    ['SW-0001', 'Switch 24 portas', 'NETWORK', 'IN_USE', null],
    ['SV-0001', 'Servidor de arquivos', 'SERVER', 'IN_USE', null],
    ['PH-0001', 'Telefone IP Yealink', 'PHONE', 'RETIRED', null],
  ] as const;
  const assetId = new Map<string, string>();
  for (const [tag, name, type, status, owner] of assets) {
    const asset = await prisma.asset.upsert({
      where: { tag },
      create: { tag, name, type, status, assignedToId: owner ? idOf.get(owner) : null },
      update: stale ? { name, type, status, assignedToId: owner ? idOf.get(owner) : null } : {},
    });
    assetId.set(tag, asset.id);
  }

  // Chamados só entram quando a base está vazia ou foi limpa acima: rodar o seed de novo não duplica nada.
  if (stale) {
    const categories = new Map((await prisma.category.findMany()).map((c) => [c.name, c.id]));
    const person = (key: string): string => {
      const id = idOf.get(key);
      if (!id) throw new Error(`Pessoa de demonstração desconhecida: ${key}`);
      return id;
    };
    for (const t of buildDemoTickets(now)) {
      await prisma.ticket.create({
        data: {
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          categoryId: categories.get(t.categoryName) ?? [...categories.values()][0],
          requesterId: person(t.requesterKey),
          assigneeId: t.assigneeKey ? person(t.assigneeKey) : null,
          assetId: t.assetTag ? (assetId.get(t.assetTag) ?? null) : null,
          createdAt: t.createdAt,
          responseDueAt: t.responseDueAt,
          resolutionDueAt: t.resolutionDueAt,
          slaPausedAt: t.slaPausedAt,
          firstRespondedAt: t.firstRespondedAt,
          resolvedAt: t.resolvedAt,
          closedAt: t.closedAt,
          history: {
            create: t.history.map((h) => ({
              actorId: person(h.actorKey),
              action: h.action,
              fromValue: h.fromValue,
              toValue: h.action === 'ASSIGNEE_CHANGED' && h.toValue ? person(h.toValue) : h.toValue,
              createdAt: h.createdAt,
            })),
          },
          comments: {
            create: t.comments.map((c) => ({
              authorId: person(c.authorKey),
              body: c.body,
              internal: c.internal,
              createdAt: c.createdAt,
            })),
          },
        },
      });
    }
    await prisma.auditLog.create({
      data: {
        actorId: system.id,
        action: DEMO_RESET_ACTION,
        entity: 'System',
        metadata: { tickets: await prisma.ticket.count(), refreshHours },
        createdAt: now,
      },
    });
    console.log('Chamados de demonstração recriados com datas atuais.');
  } else {
    console.log(`Dados de demonstração recentes (recriados em ${lastReset?.createdAt.toISOString()}); mantidos.`);
  }
}

async function main(): Promise<void> {
  await seedBase();
  await seedAdmin();
  if (process.env.SEED_DEMO === 'true') {
    if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true')
      throw new Error('SEED_DEMO em produção só é permitido com DEMO_MODE=true (instância de demonstração).');
    await seedDemo();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
