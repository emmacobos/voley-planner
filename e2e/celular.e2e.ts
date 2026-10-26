import { expect, test } from '@playwright/test';
import { openDemoExercise } from './helpers';

test('en el celular la pizarra entra en la pantalla y las herramientas quedan abajo', async ({ page }) => {
  await openDemoExercise(page);
  const width = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(width[0]).toBeLessThanOrEqual(width[1]);
  const bar = page.locator('.tool-bar');
  await expect(bar).toBeVisible();
  expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
});

test('en el celular el menú se abre con ☰ y se cierra al elegir una sección', async ({ page }) => {
  await openDemoExercise(page);
  const app = page.locator('.app');
  await expect(app).not.toHaveClass(/drawer-open/);
  await page.locator('.topbar .menu-toggle').click();
  await expect(app).toHaveClass(/drawer-open/);
  await page.locator('.sidebar nav a[title="Planteles"]').click();
  await expect(app).not.toHaveClass(/drawer-open/);
  await expect(page).toHaveURL(/#\/plantel/);
});
