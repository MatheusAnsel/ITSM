import { z } from 'zod';

const booleanFromString = (fallback: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(fallback)
    .transform((value) => value === 'true');

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGINS: z
    .string()
    .min(1, 'CORS_ORIGINS é obrigatória')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET precisa ter ao menos 32 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: booleanFromString('false'),
  SWAGGER_ENABLED: booleanFromString('false'),
  // Limite de requisições por IP. Só desligue em testes automatizados; em produção deve ficar ligado.
  RATE_LIMIT_ENABLED: booleanFromString('true'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
  // Intervalo do fechamento automático (RN-07); 0 desliga.
  AUTO_CLOSE_INTERVAL_MINUTES: z.coerce.number().int().min(0).default(15),
  // Quantos proxies confiáveis existem na frente da API (por exemplo, o balanceador do Render).
  // 0 = nenhum. Sem isso, atrás de um proxy o limite de tentativas e a auditoria veem o IP do proxy.
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  // Instância pública de demonstração: permite o seed de demonstração mesmo com NODE_ENV=production.
  DEMO_MODE: booleanFromString('false'),
  // "json" escreve uma linha de JSON por evento (padrão em produção); "pretty" é o formato legível do Nest.
  LOG_FORMAT: z.enum(['json', 'pretty']).optional(),
  // Uma linha de log por requisição (método, caminho, status, duração e requestId). Nunca registra corpo nem cabeçalhos.
  LOG_REQUESTS: booleanFromString('true'),
});

export type Env = z.infer<typeof envSchema>;

export function resolveLogFormat(env: Pick<Env, 'LOG_FORMAT' | 'NODE_ENV'>): 'json' | 'pretty' {
  return env.LOG_FORMAT ?? (env.NODE_ENV === 'production' ? 'json' : 'pretty');
}

export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração inválida. A API não pode iniciar:\n${details}`);
  }
  const env = result.data;
  if (env.NODE_ENV === 'production' && !env.COOKIE_SECURE) {
    throw new Error('Configuração inválida: COOKIE_SECURE deve ser true em produção.');
  }
  if (env.NODE_ENV === 'production' && !env.RATE_LIMIT_ENABLED) {
    throw new Error('Configuração inválida: RATE_LIMIT_ENABLED não pode ser false em produção.');
  }
  return env;
}
