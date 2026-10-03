# 🏐 Voley Planner

Pizarra táctica para planificar entrenamientos de voleibol: cancha completa con
los dos equipos, rotaciones del 5-1 con control de faltas de posición, jugadas
animadas paso a paso y una biblioteca de ejercicios (analíticos, sintéticos y
globales) con tu plantel.

La visión completa del producto y la hoja de ruta están en
[`docs/VISION.md`](docs/VISION.md).

## Cómo usarla

1. **Planteles:** creá un plantel por equipo o categoría (por ejemplo
   "Primera femenina" y "Sub 18") y cargá a sus jugadores con nombre, número y
   posición.
2. **Ejercicios → Nuevo ejercicio:** elegí el plantel, completá tipo,
   duración, intensidad, objetivo y notas, y marcá los jugadores que
   participan.
3. **Pizarra:**
   - *Sistema 5-1*: elegí equipo y rotación y colocá una formación: zonas
     (base), K1 recepción, K1 ataque, K2 saque, defensa perimetral o defensa
     6 adelante (con el ataque rival por zona 4 o zona 2). En el equipo A usa
     los jugadores del ejercicio según su posición, y el líbero entra por el
     central zaguero.
   - *Agregar* suma jugadores, pelota, conos, entrenadores y carros.
   - *Mover* para arrastrar; *Flecha desplazamiento* / *Flecha pelota* para
     dibujar arrastrando sobre la cancha.
   - El panel *Reglas de rotación* avisa si hay faltas de posición. Se
     controla solo al momento del saque y solo al equipo que recibe; cada paso
     tiene un *Momento* (saque de A, saque de B o pelota en juego) que se
     ajusta solo al colocar una formación.
4. **Animación:** *+ Paso* duplica la pizarra actual; mové los elementos y
   tocá *Reproducir*. Las flechas de un paso se ven mientras ocurre el
   movimiento hacia el siguiente.
5. **Exportar PNG** descarga una imagen del paso actual.

Atajos: `Ctrl+Z` deshacer, `Ctrl+Shift+Z` rehacer, `Supr` eliminar el
elemento seleccionado, `Esc` deseleccionar.

> Por ahora los datos se guardan en el navegador. Las cuentas de usuario
> llegan en la Etapa 3 (ver hoja de ruta).

## Desarrollo

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm test         # tests de la lógica (rotaciones, reglas, animación)
npm run lint
npm run build
```

### Estructura

```
src/
  domain/       lógica pura: tipos, cancha, rotaciones, reglas, animación (+ tests)
  components/   pizarra (SVG), editor, biblioteca y plantel
  store.ts      estado global (Zustand, guardado en localStorage)
docs/VISION.md  visión del producto y hoja de ruta
```

### Publicación

Cada push a `main` se publica en GitHub Pages con el workflow de
`.github/workflows/deploy.yml`. Para activarlo: en GitHub, *Settings → Pages →
Source: GitHub Actions*.
