/** Testes de integração: AppModule inteiro contra um PostgreSQL real (DATABASE_URL). */
module.exports = {
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  testEnvironment: 'node',
  testTimeout: 30000,
  maxWorkers: 1,
};
