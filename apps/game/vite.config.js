import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    optimizeDeps: {
        exclude: ['@dimforge/rapier3d-compat'],
    },
    server: {
        port: 5173,
    },
    build: {
        target: 'es2020',
        sourcemap: process.env.SOURCE_MAPS === 'true',
        chunkSizeWarningLimit: 3000,
    },
});
