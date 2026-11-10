import { expect, test } from '@playwright/test';

test('partido a 3 sets: termina al ganar 2 y se descargan las estadísticas en PDF', async ({ page }) => {
  await page.goto('./#/partidos');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('voley-planner-theme', 'light');
    localStorage.setItem('voley-planner-tutorial-estadisticas', '1');
  });
  await page.reload();
  await page.locator('button', { hasText: '+ Nuevo partido' }).click();
  const dialog = page.locator('.match-dialog');
  await dialog.locator('input').first().fill('Club Prueba');
  await dialog.locator('button', { hasText: 'A 3 sets' }).click();
  await expect(dialog.locator('input[placeholder="Ej.: 2-1"]')).toBeVisible();
  await dialog.locator('.plan-link').click();
  await page.locator('button', { hasText: 'Anotar estadísticas' }).click();

  // Se puede elegir a cuántos sets antes de empezar; viene marcado el del partido.
  await expect(page.locator('.start-set button', { hasText: 'A 3 sets' })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.start-set button', { hasText: 'Empezar' }).first().click();
  await expect(page.locator('.score-sets')).toContainText('a 3');

  const errorRival = page.locator('button', { hasText: '+ Error del rival' });
  for (let i = 0; i < 25; i++) await errorRival.click();
  await page.locator('button', { hasText: 'Empezar el set 2' }).click();
  await page.locator('.start-set button', { hasText: 'Empezar' }).first().click();
  for (let i = 0; i < 25; i++) await errorRival.click();

  await expect(page.locator('.set-over')).toContainText('Terminó el partido');
  await page.locator('button', { hasText: 'Guardar resultado 2-0' }).click();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('button', { hasText: 'Descargar estadísticas (PDF)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^estadisticas-club-prueba-.*\.pdf$/);

  // También desde el resumen.
  await page.getByRole('tab', { name: 'Resumen' }).click();
  const [again] = await Promise.all([page.waitForEvent('download'), page.locator('button', { hasText: 'Descargar PDF' }).click()]);
  expect(again.suggestedFilename()).toMatch(/\.pdf$/);
});
