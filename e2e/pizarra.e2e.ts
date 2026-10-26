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

test('mientras se arrastra un elemento no aparece su tarjeta; aparece al soltar', async ({ page }) => {
  await page.evaluate(() => document.querySelector('.board-stage')!.scrollIntoView());
  const player = (await savedElements(page)).find((e) => e.kind === 'player' && e.team === 'A')!;
  const [x, y] = await boardPoint(page, player.x as number, player.y as number);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 30, { steps: 5 });
  await expect(page.locator('.floating-panel')).toBeHidden();
  await page.mouse.up();
  await expect(page.locator('.floating-panel')).toBeVisible();
  expect((await savedElements(page)).find((e) => e.id === player.id)!.x).not.toBe(player.x);
});

test('el texto se puede dejar sin borde', async ({ page }) => {
  await chooseTool(page, 'Texto');
  const [x, y] = await boardPoint(page, 9, 4);
  await page.mouse.click(x, y);
  await page.keyboard.type('Sin borde');
  await page.locator('.floating-panel button', { hasText: 'Sin borde' }).click();
  await expect.poll(async () => (await savedElements(page)).find((e) => e.kind === 'text')?.outline).toBe(false);
  const stroke = await page.locator('svg.board text', { hasText: 'Sin borde' }).getAttribute('stroke');
  expect(stroke).toBe('none');
  await page.locator('.floating-panel button', { hasText: 'Con borde' }).click();
  await expect.poll(async () => (await savedElements(page)).find((e) => e.kind === 'text')?.outline).toBeUndefined();
});

test('en la pizarra vertical se arrastra en la dirección de la pantalla y la opción se recuerda', async ({ page }) => {
  await page.locator('.orientation-switch button', { hasText: 'Vertical' }).click();
  await page.evaluate(() => document.querySelector('.board-stage')!.scrollIntoView());
  const player = (await savedElements(page)).find((e) => e.kind === 'player' && e.team === 'A')!;
  const [x, y] = await boardPoint(page, player.x as number, player.y as number);
  // Hacia arriba en la pantalla = hacia la red (x más grande en la cancha).
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 50, { steps: 5 });
  await page.mouse.up();
  const moved = (await savedElements(page)).find((e) => e.id === player.id)!;
  expect(moved.x as number).toBeGreaterThan(player.x as number);
  expect(moved.y).toBeCloseTo(player.y as number, 5);
  await page.reload();
  await expect(page.locator('svg.board.vertical')).toBeVisible();
});

test('se agregan aros de precisión (con color), el carro de pelotas y el banquito', async ({ page }) => {
  await page.locator('button', { hasText: '+ Aro de precisión' }).click();
  await page.locator('.floating-panel .color-swatch[aria-label="Azul"]').click();
  await page.locator('button', { hasText: '+ Carro de pelotas' }).click();
  await page.locator('button', { hasText: '+ Banquito / cajón' }).click();
  await page.locator('button', { hasText: '+ Máquina lanzadora' }).click();
  await page.locator('.floating-panel button', { hasText: '↻ 45°' }).click();
  const els = await savedElements(page);
  expect(els.some((e) => e.kind === 'step')).toBe(true);
  // La máquina arranca apuntando hacia el equipo A y se puede girar.
  expect(els.find((e) => e.kind === 'machine')?.rotation).toBe(225);
  expect(els.find((e) => e.kind === 'hoop')?.color).toBe('#2F7DD1');
  expect(els.some((e) => e.kind === 'cart')).toBe(true);
});

test('varias canchas: cada una con su jugada, media cancha y todas juntas', async ({ page }) => {
  await page.locator('button', { hasText: '+ Agregar cancha' }).click();
  await page.locator('.court-settings input').first().fill('Ataque');
  await page.locator('.court-settings button', { hasText: 'Media cancha' }).click();
  await page.locator('button', { hasText: '+ Jugador A' }).click();
  await expect(page.locator('svg.board.half')).toBeVisible();
  await page.locator('.board-side input[type="checkbox"]').first().uncheck();
  // Al agregar una cancha se ven todas juntas: los nombres se sacan solo de la que se edita.
  await expect(page.locator('.court-cell.active svg.board text', { hasText: 'EQUIPO A' })).toHaveCount(0);
  await expect(page.locator('svg.board text', { hasText: 'EQUIPO A' })).toHaveCount(1);

  await expect(page.locator('.court-cell')).toHaveCount(2);
  await expect(page.locator('.court-cell.active')).toContainText('Ataque');
  // Tocar la otra cancha la elige para editarla, sin salir de la vista de todas.
  await page.locator('.court-cell').first().click({ position: { x: 40, y: 40 } });
  await expect(page.locator('.court-cell.active')).toContainText('Cancha 1');
  await expect(page.locator('.court-cell')).toHaveCount(2);

  const ex = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('voley-planner')!).state.exercises.find((e: { id: string }) => e.id === 'ejemplo-ejercicio-k1'),
  );
  expect(ex.extraCourts).toHaveLength(1);
  expect(ex.extraCourts[0]).toMatchObject({ name: 'Ataque', half: true, teamNames: { hidden: true } });
  expect(ex.extraCourts[0].frames[0].elements).toHaveLength(1);
  // La cancha principal no cambió.
  expect(ex.frames[0].elements.length).toBeGreaterThan(1);
});

test('en la presentación, las marcas a mano se deshacen y rehacen de a una', async ({ page }) => {
  await page.locator('.present-button').click();
  await page.locator('.ink-toggle').click();
  const box = (await page.locator('.ink-layer').boundingBox())!;
  const stroke = async (dy: number) => {
    await page.mouse.move(box.x + 100, box.y + 100 + dy);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 140 + dy, { steps: 6 });
    await page.mouse.up();
  };
  await stroke(0);
  await stroke(80);
  await expect(page.locator('.ink-layer polyline')).toHaveCount(2);
  await page.getByRole('button', { name: 'Deshacer la última marca' }).click();
  await expect(page.locator('.ink-layer polyline')).toHaveCount(1);
  await page.getByRole('button', { name: 'Rehacer la marca' }).click();
  await expect(page.locator('.ink-layer polyline')).toHaveCount(2);
  await page.locator('.ink-clear').click();
  await expect(page.locator('.ink-layer polyline')).toHaveCount(0);
  const before = JSON.stringify(await savedElements(page));
  await page.keyboard.press('Control+z');
  await expect(page.locator('.ink-layer polyline')).toHaveCount(2);
  // Deshacer marcas no toca la jugada guardada.
  expect(JSON.stringify(await savedElements(page))).toBe(before);
});

test('pasar a media cancha avisa y borra lo del otro lado de la red', async ({ page }) => {
  let message = '';
  page.once('dialog', (d) => {
    message = d.message();
    void d.accept();
  });
  await page.locator('.court-settings button', { hasText: 'Media cancha' }).click();
  expect(message).toContain('media cancha');
  expect(message).toContain('Equipo B');
  const els = await savedElements(page);
  expect(els.every((e) => ('x1' in e ? Math.max(e.x1 as number, e.x2 as number) : (e.x as number)) <= 9.2)).toBe(true);
  await expect(page.locator('svg.board.half')).toBeVisible();
});

test('grupos que rotan entre las canchas', async ({ page }) => {
  await page.locator('button', { hasText: '+ Agregar cancha' }).click();
  await page.locator('summary', { hasText: 'Grupos que rotan' }).click();
  // Las jugadoras se marcan ahí mismo.
  await page.locator('.groups-picker button', { hasText: 'Marcar todas' }).click();
  await page.locator('button', { hasText: 'Armar 2 grupos' }).click();
  await expect(page.locator('.court-cell .group-badge b')).toHaveText(['Grupo 1', 'Grupo 2']);
  await page.locator('.groups-head button', { hasText: 'Rotar grupos' }).click();
  await expect(page.locator('.court-cell .group-badge b')).toHaveText(['Grupo 2', 'Grupo 1']);

  // Repartir de nuevo cambia el reparto.
  const lists = () => page.locator('.group-col').evaluateAll((cols) => cols.map((c) => c.textContent));
  const before = await lists();
  await page.locator('button', { hasText: 'Repartir de nuevo' }).click();
  expect(await lists()).not.toEqual(before);

  // Arrastrar una jugadora al otro grupo.
  const count = (i: number) => page.locator('.group-col').nth(i).locator('.drag-chip').count();
  const [a0, a1] = [await count(0), await count(1)];
  const chip = (await page.locator('.group-col').nth(0).locator('.drag-chip').first().boundingBox())!;
  const target = (await page.locator('.group-col').nth(1).boundingBox())!;
  await page.mouse.move(chip.x + chip.width / 2, chip.y + chip.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => count(1)).toBe(a1 + 1);
  expect(await count(0)).toBe(a0 - 1);
});

test('al rotar, las fichas de cada cancha muestran a las jugadoras del grupo que llegó (también en el equipo B)', async ({ page }) => {
  await page.locator('button', { hasText: '+ Agregar cancha' }).click();
  await page.locator('summary', { hasText: 'Grupos que rotan' }).click();
  await page.locator('.groups-picker button', { hasText: 'Marcar todas' }).click();
  await page.locator('button', { hasText: 'Armar 2 grupos' }).click();
  // En la cancha 2 (la que se edita) se agrega una ficha del equipo B.
  await page.locator('button', { hasText: '+ Jugador B' }).click();
  await page.mouse.click(20, 500);
  const captions = (i: number) =>
    page.locator('.court-cell').nth(i).locator('svg.board text').evaluateAll((ts) => ts.map((t) => t.textContent).filter((t) => t?.includes('·')));
  const groupNames = async (i: number) =>
    (await page.locator('.group-col').nth(i).locator('.drag-chip').allInnerTexts()).map((t) => t.replace(/^\d+\s*/, '').trim());
  const g1 = await groupNames(0);
  const g2 = await groupNames(1);
  const first = await captions(1);
  expect(first).toHaveLength(1);
  expect(g2.some((n) => first[0]!.startsWith(n))).toBe(true);
  await page.locator('.groups-head button', { hasText: 'Rotar grupos' }).click();
  const after = await captions(1);
  expect(g1.some((n) => after[0]!.startsWith(n))).toBe(true);
});

test('en la compu, ☰ achica el menú a solo íconos y se recuerda', async ({ page }) => {
  await page.locator('.menu-toggle').click();
  await expect(page.locator('.app')).toHaveClass(/menu-collapsed/);
  await expect.poll(async () => (await page.locator('.sidebar').boundingBox())!.width).toBeLessThan(80);
  await page.reload();
  await expect(page.locator('.app')).toHaveClass(/menu-collapsed/);
  await page.locator('.menu-toggle').click();
  await expect(page.locator('.app')).not.toHaveClass(/menu-collapsed/);
});
