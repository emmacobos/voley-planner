import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de la pizarra en un navegador de verdad (tocar, arrastrar, escribir).
 * Se corren con `npm run test:e2e`; levantan solas el servidor de desarrollo.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '*.e2e.ts',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5179/',
    // En algunos entornos el navegador ya viene instalado en otra ruta.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'npx vite --port 5179 --strictPort',
    url: 'http://localhost:5179/',
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'compu',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 800 } },
      testIgnore: 'celular.e2e.ts',
    },
    { name: 'celular', use: { ...devices['Pixel 7'] }, testMatch: 'celular.e2e.ts' },
  ],
});
