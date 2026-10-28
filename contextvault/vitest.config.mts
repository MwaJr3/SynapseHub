import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment:'node', exclude:['tests/e2e/**','node_modules/**'], setupFiles:['./tests/setup.ts'], fileParallelism:false, maxWorkers:1, testTimeout:30000, hookTimeout:30000 } });
