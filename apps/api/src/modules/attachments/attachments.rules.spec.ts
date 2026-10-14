import {
  detectType,
  extensionOf,
  fixFilenameEncoding,
  isPlainText,
  sanitizeDisplayName,
  uploadLimitBytes,
} from './attachments.rules';

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const pdf = Buffer.from('%PDF-1.7\n...');
const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03]);

describe('detectType', () => {
  it('aceita PNG, JPEG e PDF pelo conteúdo com extensão coerente', () => {
    expect(detectType(png, 'tela.png')).toEqual({ kind: 'png', mimeType: 'image/png' });
    expect(detectType(jpeg, 'foto.JPG')?.mimeType).toBe('image/jpeg');
    expect(detectType(jpeg, 'foto.jpeg')?.kind).toBe('jpeg');
    expect(detectType(pdf, 'laudo.pdf')?.mimeType).toBe('application/pdf');
  });

  it('aceita TXT e LOG somente se forem texto puro', () => {
    expect(detectType(Buffer.from('linha 1\nlinha 2 ação'), 'erro.log')).toEqual({ kind: 'log', mimeType: 'text/plain' });
    expect(detectType(Buffer.from('ok'), 'nota.txt')?.kind).toBe('txt');
    expect(detectType(exe, 'script.txt')).toBeNull();
    expect(detectType(Buffer.from([0x61, 0x00, 0x62]), 'x.log')).toBeNull();
    expect(detectType(Buffer.from([0xc3, 0x28]), 'x.txt')).toBeNull();
  });

  it('rejeita extensão que não bate com o conteúdo e tipos fora da lista', () => {
    expect(detectType(png, 'tela.pdf')).toBeNull();
    expect(detectType(pdf, 'laudo.png')).toBeNull();
    expect(detectType(exe, 'programa.png')).toBeNull();
    expect(detectType(Buffer.from('<script>alert(1)</script>'), 'a.html')).toBeNull();
    expect(detectType(Buffer.from('texto'), 'semextensao')).toBeNull();
    expect(detectType(Buffer.alloc(0), 'vazio.png')).toBeNull();
  });
});

describe('nomes', () => {
  it('sanitiza o nome de exibição', () => {
    expect(sanitizeDisplayName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeDisplayName('C:\\Users\\x\\foto.png')).toBe('foto.png');
    expect(sanitizeDisplayName('a"b<c>.png')).toBe('abc.png');
    expect(sanitizeDisplayName('..')).toBe('arquivo');
    expect(sanitizeDisplayName('\u0000\u0007')).toBe('arquivo');
    const long = sanitizeDisplayName(`${'a'.repeat(300)}.pdf`);
    expect(long.length).toBeLessThanOrEqual(145);
    expect(long.endsWith('.pdf')).toBe(true);
  });

  it('corrige nome UTF-8 entregue como latin1 pelo multer', () => {
    const garbled = Buffer.from('relatório.pdf', 'utf8').toString('latin1');
    expect(fixFilenameEncoding(garbled)).toBe('relatório.pdf');
    expect(fixFilenameEncoding('simples.png')).toBe('simples.png');
  });

  it('extrai extensão em minúsculas', () => {
    expect(extensionOf('A.B.PNG')).toBe('png');
    expect(extensionOf('sem')).toBe('');
  });
});

describe('utilidades', () => {
  it('detecta texto puro', () => {
    expect(isPlainText(Buffer.from('olá'))).toBe(true);
    expect(isPlainText(Buffer.from([0]))).toBe(false);
  });
  it('converte MB em bytes', () => {
    expect(uploadLimitBytes(5)).toBe(5 * 1024 * 1024);
    expect(uploadLimitBytes(0.5)).toBe(524288);
  });
});
