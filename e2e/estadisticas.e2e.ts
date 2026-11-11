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
  const [again] = await Promise.all([page.waitForEvent('download'), page.locator('button', { hasText: 'Descargar informe (PDF)' }).click()]);
  expect(again.suggestedFilename()).toMatch(/\.pdf$/);
});

test('el informe del partido arma qué trabajar, lo suma a la próxima sesión y guarda las conclusiones', async ({ page }) => {
  await page.goto('./#/sesiones');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('voley-planner-theme', 'light');
    localStorage.setItem('voley-planner-tutorial-estadisticas', '1');
  });
  await page.reload();
  await page.click('.welcome-ghost');
  const id = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('voley-planner')!)
        .state.matches.filter((m: { stats?: unknown }) => m.stats)
        .sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date))[0].id,
  );
  await page.goto(`./#/partidos/${id}/estadisticas`);
  await page.getByRole('tab', { name: 'Resumen' }).click();

  const report = page.locator('.match-report');
  await expect(report.locator('.stack-bar')).toHaveCount(2);
  await expect(report.locator('.moments article')).toHaveCount(4);
  await expect(report.locator('.player-card').first()).toBeVisible();
  await expect(report.locator('.trend-cards article')).toHaveCount(4);

  const first = report.locator('.work-list li').first();
  await expect(first).toContainText('R4');
  await first.locator('button', { hasText: '+ A la próxima sesión' }).click();
  await expect(first.locator('.work-added')).toContainText('sesión del');
  const objective = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem('voley-planner')!).state;
    return st.sessions.map((s: { objective: string }) => s.objective).join(' | ');
  });
  expect(objective).toContain('Recepción y side-out en R4');

  await report.locator('textarea.conclusions').fill('Trabajar la recepción en R4.');
  await expect
    .poll(() => page.evaluate((mid) => JSON.parse(localStorage.getItem('voley-planner')!).state.matches.find((m: { id: string }) => m.id === mid).conclusions, id))
    .toBe('Trabajar la recepción en R4.');

  const [pdf] = await Promise.all([page.waitForEvent('download'), page.locator('button', { hasText: 'Descargar informe (PDF)' }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);

  await first.locator('button', { hasText: 'Ver la sesión' }).click();
  await expect(page).toHaveURL(/#\/sesiones\//);
});
