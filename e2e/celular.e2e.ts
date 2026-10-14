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
