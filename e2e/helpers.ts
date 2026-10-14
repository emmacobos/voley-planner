import type { Page } from '@playwright/test';

export const EXERCISE = 'ejemplo-ejercicio-k1';

/** Abre el ejercicio de ejemplo con la jugada K1, con datos limpios. */
export async function openDemoExercise(page: Page) {
  await page.goto('./#/sesiones');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('voley-planner-theme', 'light');
  });
  await page.reload();
  await page.click('.welcome-ghost');
  await page.goto(`./#/ejercicios/${EXERCISE}`);
  await page.locator('svg.board').waitFor();
}

/** Punto de la pantalla que corresponde a (x, y) en metros de la pizarra. */
export async function boardPoint(page: Page, x: number, y: number): Promise<[number, number]> {
  const m = await page.evaluate(() => {
    const ctm = document.querySelector<SVGSVGElement>('svg.board')!.getScreenCTM()!;
    return [ctm.a, ctm.d, ctm.e, ctm.f];
  });
  return [m[0] * x + m[2], m[1] * y + m[3]];
}

/** Elige una herramienta sin que la página se desplace (como un clic real en la barra). */
export async function chooseTool(page: Page, name: string) {
  await page.evaluate((n) => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.tool-bar button')];
    buttons.find((b) => b.textContent?.includes(n))!.click();
  }, name);
}

type Element = { id: string; kind: string; [key: string]: unknown };

/** Elementos guardados del primer paso del ejercicio. */
export async function savedElements(page: Page): Promise<Element[]> {
  return page.evaluate((id) => {
    const state = JSON.parse(localStorage.getItem('voley-planner')!).state;
    return state.exercises.find((e: { id: string }) => e.id === id).frames[0].elements;
  }, EXERCISE);
}

/** Arrastra con el mouse desde el centro de un elemento. */
export async function dragFrom(page: Page, selector: string, dx: number, dy: number) {
  const box = (await page.locator(selector).boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 6 });
  await page.mouse.up();
}
