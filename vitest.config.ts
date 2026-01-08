import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Use happy-dom for faster tests (switch to jsdom if compatibility issues)
      environment: 'happy-dom',

      // Enable global test APIs (describe, it, expect)
      globals: true,

      // Setup files run before each test file
      setupFiles: ['./src/test/setup.ts'],

      // Include pattern for test files
      include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],

      // Exclude patterns
      exclude: ['node_modules', 'dist', 'e2e'],

      // Coverage configuration
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.d.ts',
          'src/**/*.test.{ts,tsx}',
          'src/**/*.spec.{ts,tsx}',
          'src/test/**',
          'src/main.tsx',
          'src/vite-env.d.ts',
        ],
      },

      // Reporters
      reporters: ['verbose'],

      // Mock browser APIs
      deps: {
        optimizer: {
          web: {
            include: ['@testing-library/react'],
          },
        },
      },
    },
  })
);
