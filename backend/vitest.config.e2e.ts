import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    /**
     * As suítes e2e rodam contra o **mesmo banco de desenvolvimento** (não há banco efêmero).
     * Em paralelo, uma suíte que limpa o estado de caixa no `beforeAll` apaga dados que outra
     * está usando — foi assim que a suíte do caixa derrubou a de manutenção de cadastros.
     * Sequencial custa alguns segundos e elimina a classe de flake por concorrência.
     */
    fileParallelism: false,
  },
});
