import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { SYSTEM_USER_EMAIL, SYSTEM_USER_NAME } from '../common/system-user';
import { BCRYPT_COST, normalizeEmail, validatePassword } from '../modules/auth/auth.rules';
import { DEFAULT_SLA, PRIORITIES } from '../modules/tickets/ticket.rules';

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

// Dados de demonstração para desenvolvimento. Nunca roda em produção.
async function seedDemo(): Promise<void> {
  const password = process.env.SEED_ADMIN_PASSWORD ?? '';
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const people = [
    ['Gestor Demo', 'gestor@itsm.local', 'MANAGER'],
    ['Atendente Demo', 'atendente@itsm.local', 'AGENT'],
    ['Solicitante Demo', 'solicitante@itsm.local', 'REQUESTER'],
  ] as const;
  for (const [name, email, role] of people) {
    await prisma.user.upsert({
      where: { email },
      create: { name, email, passwordHash, role },
      update: {},
    });
  }
  const requester = await prisma.user.findUniqueOrThrow({
    where: { email: 'solicitante@itsm.local' },
  });
  const assets = [
    ['NB-0001', 'Notebook Dell Latitude 5440', 'NOTEBOOK', 'IN_USE', requester.id],
    ['NB-0002', 'Notebook Lenovo ThinkPad E14', 'NOTEBOOK', 'IN_STOCK', null],
    ['MN-0001', 'Monitor LG 24 polegadas', 'MONITOR', 'IN_STOCK', null],
    ['IM-0001', 'Impressora HP LaserJet Pro', 'PRINTER', 'MAINTENANCE', null],
    ['SW-0001', 'Switch 24 portas', 'NETWORK', 'IN_USE', null],
  ] as const;
  for (const [tag, name, type, status, assignedToId] of assets) {
    await prisma.asset.upsert({
      where: { tag },
      create: { tag, name, type, status, assignedToId: status === 'IN_USE' ? assignedToId : null },
      update: {},
    });
  }
  console.log('Dados de demonstração criados (usuários com a mesma senha do administrador).');
}

async function main(): Promise<void> {
  await seedBase();
  await seedAdmin();
  if (process.env.SEED_DEMO === 'true') {
    if (process.env.NODE_ENV === 'production')
      throw new Error('SEED_DEMO não pode ser usado em produção.');
    await seedDemo();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
