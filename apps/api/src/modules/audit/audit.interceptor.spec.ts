import { ExecutionContext, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Audit, AuditOptions, AuditRequest, fromParam, fromResult } from './audit.decorator';
import { AuditInterceptor } from './audit.interceptor';
import { AuditEntry } from './audit.repository';
import { AuditService } from './audit.service';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(options: AuditOptions | undefined, req: Partial<AuditRequest>) {
  const recorded: AuditEntry[] = [];
  const audit = {
    record: async (e: AuditEntry) => void recorded.push(e),
  } as unknown as AuditService;
  const reflector = { get: () => options } as unknown as Reflector;
  const context = {
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ params: {}, ...req }) }),
  } as unknown as ExecutionContext;
  return { interceptor: new AuditInterceptor(reflector, audit), context, recorded };
}

describe('AuditInterceptor', () => {
  it('não grava nada em rotas sem @Audit', async () => {
    const { interceptor, context, recorded } = setup(undefined, {});
    await firstValueFrom(interceptor.intercept(context, { handle: () => of('ok') }));
    await flush();
    expect(recorded).toEqual([]);
  });

  it('grava autor, entidade, campos alterados e IP após o sucesso', async () => {
    const { interceptor, context, recorded } = setup(
      {
        action: 'ASSET_UPDATED',
        entity: 'Asset',
        entityId: fromParam(),
        extra: () => ({ status: 'RETIRED' }),
      },
      {
        user: { id: 'u1' },
        params: { id: 'a1' },
        body: { status: 'RETIRED', notes: 'x' },
        ip: '10.0.0.5',
      },
    );
    await firstValueFrom(interceptor.intercept(context, { handle: () => of({ id: 'a1' }) }));
    await flush();
    expect(recorded).toEqual([
      {
        actorId: 'u1',
        action: 'ASSET_UPDATED',
        entity: 'Asset',
        entityId: 'a1',
        metadata: { fields: ['status', 'notes'], status: 'RETIRED' },
        ip: '10.0.0.5',
      },
    ]);
  });

  it('usa o id do resultado em criações e deixa metadados nulos sem corpo', async () => {
    const { interceptor, context, recorded } = setup(
      { action: 'X_CREATED', entity: 'X', entityId: fromResult() },
      { user: { id: 'u1' } },
    );
    await firstValueFrom(interceptor.intercept(context, { handle: () => of({ id: 'novo' }) }));
    await flush();
    expect(recorded[0]).toMatchObject({ entityId: 'novo', metadata: null, ip: null });
  });

  it('obtém o autor do resultado em rotas públicas (login)', async () => {
    const { interceptor, context, recorded } = setup(
      {
        action: 'LOGIN_SUCCEEDED',
        entity: 'User',
        actorId: fromResult('user.id'),
        entityId: fromResult('user.id'),
      },
      { body: { email: 'a@b.com', password: 'segredo' } },
    );
    await firstValueFrom(
      interceptor.intercept(context, { handle: () => of({ user: { id: 'u9' } }) }),
    );
    await flush();
    expect(recorded[0]).toMatchObject({
      actorId: 'u9',
      entityId: 'u9',
      metadata: { fields: ['email'] },
    });
    expect(JSON.stringify(recorded[0])).not.toContain('segredo');
  });

  it('grava a ação de falha e repassa o erro original', async () => {
    const { interceptor, context, recorded } = setup(
      {
        action: 'LOGIN_SUCCEEDED',
        failureAction: 'LOGIN_FAILED',
        entity: 'User',
        extra: () => ({ email: 'a@b.com' }),
      },
      { body: { email: 'a@b.com', password: 'x' } },
    );
    const error = new UnauthorizedException();
    await expect(
      firstValueFrom(interceptor.intercept(context, { handle: () => throwError(() => error) })),
    ).rejects.toBe(error);
    await flush();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      action: 'LOGIN_FAILED',
      actorId: null,
      metadata: { email: 'a@b.com', status: 401 },
    });
  });

  it('não grava falhas quando a rota não define ação de falha', async () => {
    const { interceptor, context, recorded } = setup(
      { action: 'ASSET_UPDATED', entity: 'Asset' },
      { user: { id: 'u1' } },
    );
    await expect(
      firstValueFrom(
        interceptor.intercept(context, { handle: () => throwError(() => new NotFoundException()) }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    await flush();
    expect(recorded).toEqual([]);
  });

  it('o decorator guarda as opções no handler', () => {
    class Dummy {
      @Audit({ action: 'A', entity: 'B' })
      run() {}
    }
    expect(Reflect.getMetadata('audit', Dummy.prototype.run)).toEqual({ action: 'A', entity: 'B' });
  });

  it('fromResult tolera resultado sem o caminho', () => {
    expect(fromResult('user.id')({ params: {} }, undefined)).toBeUndefined();
    expect(fromResult('user.id')({ params: {} }, { user: null })).toBeUndefined();
  });
});
