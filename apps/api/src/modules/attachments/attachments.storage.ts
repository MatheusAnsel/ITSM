import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Readable } from 'node:stream';

// Abstração do armazenamento: hoje disco local; trocar por S3/MinIO não toca no resto.
export abstract class FileStorage {
  abstract save(content: Buffer): Promise<string>;
  abstract open(key: string): Readable;
  abstract remove(key: string): Promise<void>;
}

const KEY_PATTERN = /^[a-f0-9]{32}$/;

export class LocalFileStorage extends FileStorage {
  constructor(private readonly dir: string) {
    super();
  }

  async save(content: Buffer): Promise<string> {
    await mkdir(this.dir, { recursive: true });
    // Nome aleatório e sem extensão: nada do que o usuário envia chega ao caminho do arquivo.
    const key = randomBytes(16).toString('hex');
    await writeFile(join(this.dir, key), content, { flag: 'wx', mode: 0o640 });
    return key;
  }

  open(key: string): Readable {
    return createReadStream(this.path(key));
  }

  async remove(key: string): Promise<void> {
    await unlink(this.path(key)).catch(() => undefined);
  }

  private path(key: string): string {
    if (!KEY_PATTERN.test(key)) throw new Error('Chave de armazenamento inválida');
    return join(this.dir, key);
  }
}
