/**
 * Evita que la página salte hacia arriba cuando algo se cierra (por ejemplo
 * la tarjeta del elemento seleccionado) y la página queda más corta que lo
 * que se estaba viendo: mantiene el alto anterior hasta que la persona
 * vuelva a subir por su cuenta o cambie de pantalla.
 */
let held = false;

function natural(): number {
  // El alto real del contenido (el body no se estira con el min-height del html).
  return document.body.getBoundingClientRect().bottom + window.scrollY;
}

function release() {
  if (!held) return;
  held = false;
  document.documentElement.style.minHeight = '';
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('hashchange', release);
}

function onScroll() {
  if (window.scrollY + window.innerHeight <= natural() + 1) release();
}

export function holdPageHeight(height: number) {
  if (!height) return;
  // Primero fijar el alto y después medir: medir antes ya haría saltar la página.
  document.documentElement.style.minHeight = `${Math.ceil(height)}px`;
  if (height <= natural() + 1) {
    if (!held) document.documentElement.style.minHeight = '';
    return;
  }
  if (!held) {
    held = true;
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', release);
  }
}
