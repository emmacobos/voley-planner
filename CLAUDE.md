# Voley Planner

Pizarra táctica y planificador de entrenamientos de voleibol (React + TypeScript + Vite).
La visión y la hoja de ruta están en `docs/VISION.md`.

## Idioma
- La app, los textos de la interfaz, los comentarios y los commits van en español.
- Hablarle a la usuaria en español rioplatense.

## Comandos
- `npm run dev` — servidor de desarrollo
- `npm test` — tests (Vitest) de la lógica en `src/domain`
- `npm run lint` — oxlint
- `npm run build` — typecheck + build

Correr lint, tests y build antes de cada commit.

## Publicación
- La usuaria pidió que **cada cambio se publique siempre**: después de validar, subir la rama de
  trabajo y actualizar `main` (fast-forward). Cada push a `main` se publica solo en GitHub Pages
  (`.github/workflows/deploy.yml`): https://emmacobos.github.io/voley-planner/
- Verificar que el workflow "Deploy a GitHub Pages" termine en verde.

## Datos
- Todo se guarda en `localStorage` (Zustand `persist`, clave `voley-planner`). Si cambia la forma
  del estado, subir `version` en `src/store.ts` y agregar el paso en `migrate` para no perder datos.
- Con cuenta, `src/cloud/sync.ts` sincroniza el store con Firestore en
  `users/{uid}/{squads|players|exercises|sessions|matches|weeks|templates}/{id}` (un documento por entidad). Una colección
  nueva tiene que sumarse a `DATA_KEYS` en `src/store.ts`.
- Proyecto Firebase `voley-planner` (plan Spark). Las reglas están en `firestore.rules` y se
  publican a mano en la consola de Firebase: si cambian, avisarle a la usuaria.

## Estructura
- `src/domain/` — lógica pura (cancha, rotaciones, formaciones 5-1, reglas, animación, sesiones) con tests
- `src/components/` — pizarra SVG, editores, listas, vista de impresión
- `src/cloud/` — Firebase: cuentas (`auth.ts`) y sincronización (`sync.ts`)
- `src/store.ts` — estado global
