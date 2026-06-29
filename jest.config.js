/**
 * Jest config (JS, not TS, so ts-node is not required)
 */

/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: __dirname,
    roots: ['<rootDir>/tests', '<rootDir>/packages/engine/src/__tests__'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^three$': '<rootDir>/tests/__mocks__/three.ts',
        '^@dimforge/rapier3d-compat$': '<rootDir>/tests/__mocks__/@dimforge/rapier3d-compat.ts',
        '^@thegridcn/shared$': '<rootDir>/packages/shared/src/index.ts',
        '^@thegridcn/engine$': '<rootDir>/packages/engine/src/index.ts',
        '^@thegridcn/engine/(.*)$': '<rootDir>/packages/engine/src/$1',
    },
    globalSetup: '<rootDir>/tests/setup/jestGlobalSetup.js',
    setupFilesAfterEnv: ['<rootDir>/tests/setup/jestSetupFile.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: '<rootDir>/tsconfig.base.json',
            diagnostics: true,
        }],
    },
    transformIgnorePatterns: [
        'node_modules/(?!(three|@dimforge|three-mesh-bvh)/)',
    ],
    // Coverage is opt-in (only collected under --coverage / `pnpm test:coverage`),
    // so the fast default `test` run is unaffected. Thresholds sit just below
    // current levels to gate regressions without being flaky as the engine grows.
    collectCoverageFrom: [
        'packages/engine/src/**/*.ts',
        '!packages/engine/src/**/*.test.ts',
        '!packages/engine/src/__tests__/**',
        '!packages/engine/src/**/*.d.ts',
    ],
    coverageThreshold: {
        global: { statements: 45, branches: 32, functions: 50, lines: 45 },
    },
};

config.testEnvironment = (process.env.TEST_ENV || '').includes('jsdom') ? 'jsdom' : config.testEnvironment;
module.exports = config;
