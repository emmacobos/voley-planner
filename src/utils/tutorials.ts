/** Recuerda en este navegador qué tutoriales ya se vieron. */
const key = (name: string) => `voley-planner-tutorial-${name}`;

export function hasSeenTutorial(name: string): boolean {
  try {
    return localStorage.getItem(key(name)) === '1';
  } catch {
    return true;
  }
}

export function markTutorialSeen(name: string) {
  try {
    localStorage.setItem(key(name), '1');
  } catch {
    // Sin almacenamiento: se vuelve a mostrar la próxima vez.
  }
}
