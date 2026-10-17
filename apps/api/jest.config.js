/** @type {import('jest').Config} */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  testEnvironment: 'node',
  // Cobertura dos testes unitários e de serviço. Ficam de fora o que só faz sentido contra um banco
  // real (repositórios Prisma, seed), a fiação do Nest (módulos, main), DTOs e os próprios testes;
  // esses caminhos são exercitados pelos testes e2e.
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.spec.ts',
    '!**/*.module.ts',
    '!**/*.prisma.repository.ts',
    '!**/dto/**',
    '!prisma/**',
    '!main.ts',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text-summary', 'json-summary', 'lcov'],
};
