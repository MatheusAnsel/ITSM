import { setAccessToken } from './session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface LoginResult {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function login(email: string, password: string): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new ApiError('Não foi possível conectar à API', 0);
  }
  const body = (await res.json().catch(() => ({}))) as Partial<LoginResult> & { message?: string };
  if (!res.ok || !body.accessToken || !body.user) {
    throw new ApiError(body.message ?? 'Falha ao entrar', res.status);
  }
  setAccessToken(body.accessToken);
  return { accessToken: body.accessToken, user: body.user };
}
