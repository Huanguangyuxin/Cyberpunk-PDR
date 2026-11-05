import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { name: 'afterlife-engine', environment: 'node', exclude: ['**/node_modules/**', '.assetlib/**', 'dist/**'] } });
