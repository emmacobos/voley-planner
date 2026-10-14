import { expect, test } from '@playwright/test';
import { boardPoint, chooseTool, dragFrom, openDemoExercise, savedElements } from './helpers';

test.beforeEach(async ({ page }) => {
  await openDemoExercise(page);
});

test('curvar una flecha con la herramienta de flecha activa no crea otra', async ({ page }) => {
  await chooseTool(page, 'desplazamiento');
  const [ax, ay] = await boardPoint(page, 3, 2);
  const [bx, by] = await boardPoint(page, 7, 2);
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  await page.mouse.move(bx, by, { steps: 5 });
  await page.mouse.up();
  const arrows = (await savedElements(page)).filter((e) => e.kind === 'arrow').length;

  await dragFrom(page, '.handle-curve', 0, 60);
  const after = (await savedElements(page)).filter((e) => e.kind === 'arrow');
  expect(after).toHaveLength(arrows);
  expect(after.at(-1)!.curve).toBeTruthy();
});

test('un texto nuevo arranca vacío, se escribe directo y vacío se borra solo', async ({ page }) => {
  await chooseTool(page, 'Texto');
  const [x, y] = await boardPoint(page, 13, 4);
  await page.mouse.click(x, y);
  const field = page.locator('.floating-panel textarea');
  await expect(field).toBeFocused();
  await expect(field).toHaveValue('');
  await page.keyboard.type('Bloqueo doble');
  await expect.poll(async () => (await savedElements(page)).find((e) => e.kind === 'text')?.text).toBe('Bloqueo doble');

  // Tocar afuera cierra la tarjeta y deja el texto.
  await page.mouse.click(60, 400);
  await expect(page.locator('.floating-panel')).toHaveCount(0);
  expect((await savedElements(page)).filter((e) => e.kind === 'text')).toHaveLength(1);

  // Uno vacío desaparece al dejar de seleccionarlo.
  await chooseTool(page, 'Texto');
  const [x2, y2] = await boardPoint(page, 4, 7);
  await page.mouse.click(x2, y2);
  expect((await savedElements(page)).filter((e) => e.kind === 'text')).toHaveLength(2);
  await page.mouse.click(60, 400);
  await expect.poll(async () => (await savedElements(page)).filter((e) => e.kind === 'text').length).toBe(1);
});

test('el texto nunca se sale de su cuadro al agrandarlo o angostarlo', async ({ page }) => {
  await chooseTool(page, 'Texto');
  const [x, y] = await boardPoint(page, 9, 4);
  await page.mouse.click(x, y);
  await page.keyboard.type('Bloqueo doble por zona cuatro');
  await page.locator('.floating-panel input[aria-label="Tamaño de letra"]').fill('1.2');
  await dragFrom(page, '.handle-width', -200, 0);
  await dragFrom(page, '.handle-scale', 40, 40);

  const fits = await page.evaluate(() => {
    const g = [...document.querySelectorAll('svg.board g.el')].find((el) => el.querySelector('.handle-width'))!;
    const box = g.querySelector('rect.ui-only:not(.handle)')!.getBoundingClientRect();
    const text = g.querySelector('text')!.getBoundingClientRect();
    return text.left >= box.left - 1 && text.right <= box.right + 1 && text.top >= box.top - 1 && text.bottom <= box.bottom + 1;
  });
  expect(fits).toBe(true);
});

test('borrar con el tachito no mueve la página', async ({ page }) => {
  const top = await page.evaluate(() => document.querySelector('.board-stage')!.getBoundingClientRect().top + scrollY);
  await page.evaluate((t) => window.scrollTo(0, t + 150), top);
  const scroll = await page.evaluate(() => scrollY);

  const player = (await savedElements(page)).find((e) => e.kind === 'player' && e.team === 'A')!;
  const [x, y] = await boardPoint(page, player.x as number, player.y as number);
  await page.mouse.click(x, y);
  await expect(page.locator('.floating-panel')).toBeVisible();
  const trash = (await page.locator('.delete-button').boundingBox())!;
  await page.mouse.click(trash.x + trash.width / 2, trash.y + trash.height / 2);

  await expect.poll(async () => (await savedElements(page)).some((e) => e.id === player.id)).toBe(false);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
});

test('cerrar la tarjeta al final de la página no la hace saltar', async ({ page }) => {
  const player = (await savedElements(page)).find((e) => e.kind === 'player' && e.team === 'A')!;
  const [x, y] = await boardPoint(page, player.x as number, player.y as number);
  await page.mouse.click(x, y);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const scroll = await page.evaluate(() => scrollY);
  await page.keyboard.press('Escape');
  await expect(page.locator('.floating-panel')).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBe(scroll);
});
