/**
 * Jest global setup — runs once before all test suites.
 */
export default async function globalSetup(): Promise<void> {
    // Environment checks, asset pre-loading, etc.
    console.log('[Test] Global setup complete');
}
