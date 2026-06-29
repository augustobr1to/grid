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
};

config.testEnvironment = (process.env.TEST_ENV || '').includes('jsdom') ? 'jsdom' : config.testEnvironment;
module.exports = config;
