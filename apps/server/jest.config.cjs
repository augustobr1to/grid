/** Jest config for the Colyseus server — integration tests boot a real server. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 15000,
  moduleNameMapper: {
    '^@thegridcn/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
    '^.+\\.mjs$': '<rootDir>/jest.mjs-transformer.cjs',
  },
  transformIgnorePatterns: ['/node_modules/(?!.*rou3/)'],
};
