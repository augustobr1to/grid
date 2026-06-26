import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    root: '.',
    publicDir: 'public',
    optimizeDeps: {
        exclude: ['@dimforge/rapier3d-compat'],
    },
    server: {
        port: 5174,
    },
    build: {
        target: 'es2020',
        sourcemap: true,
    },
});
