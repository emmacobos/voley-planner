# 🏐 Voley Planner

Pizarra táctica para planificar entrenamientos de voleibol: cancha completa con
los dos equipos, rotaciones de los sistemas 5-1, 4-2 y 6-0 con control de faltas de posición, jugadas
animadas paso a paso, una biblioteca de ejercicios (analíticos, sintéticos y
globales) y sesiones de entrenamiento por bloques que se exportan a PDF.

Online: https://emmacobos.github.io/voley-planner/

La visión completa del producto y la hoja de ruta están en
[`docs/VISION.md`](docs/VISION.md).

## Cómo usarla

La primera vez, el inicio muestra una **portada** con una jugada animada, lo que
hace la app y los **primeros pasos** (plantel → ejercicio → sesión) con su
progreso. **▶ Ver un ejemplo** carga un plantel, tres ejercicios (uno con una
jugada K1 animada) y cuatro sesiones de muestra (tres ya hechas, con asistencia)
para recorrer la app; se borran
todos juntos con **Borrar el ejemplo** sin tocar lo que cargaste vos. Cuando
ya tenés sesiones, el inicio te saluda con la fecha, la **próxima sesión** (con
sus bloques y accesos rápidos), lo que hay en tu biblioteca y un tip.

1. **Planteles:** creá un plantel por equipo o categoría (por ejemplo
   "Primera femenina" y "Sub 18") y cargá a sus jugadores con nombre, número y
   posición.
2. **Ejercicios → Nuevo ejercicio:** elegí el plantel, completá tipo,
   duración, intensidad, objetivo y notas, y marcá los jugadores que
   participan.
   **Ejercicios modelo** (en la biblioteca) trae 16 ejercicios clásicos
   —analíticos, sintéticos y globales— con su pizarra, consignas y variantes:
   se ven animados y se copian a tu biblioteca para adaptarlos.
3. **Pizarra:**
   - *Sistema de juego*: elegí el sistema (**5-1**, **4-2** o **6-0**, se
     guarda en el ejercicio), el equipo y la rotación, y colocá una formación:
     zonas (base), K1 recepción, K1 ataque, K2 saque, defensa perimetral o
     defensa 6 adelante (con el ataque rival por zona 4 o zona 2). En el equipo
     A usa los jugadores del ejercicio según su posición.
     - *5-1*: un armador que arma en las 6 rotaciones (penetra desde atrás),
       opuesto, 2 puntas, 2 centrales; el líbero entra por el central zaguero.
     - *4-2*: dos armadores enfrentados; arma siempre el que está adelante y
       el otro juega atrás como opuesto. Si hay un solo armador, el opuesto
       hace de segundo. Líbero por el central zaguero.
     - *6-0*: seis jugadores universales, sin líbero; arma el que pasa por la
       zona 3 o la zona 2 (se elige) y en recepción los otros 5 forman la W.
   - *Agregar* suma jugadores, pelota, conos, entrenadores y carros.
   - *Mover* para arrastrar; *Flecha desplazamiento*, *Flecha pelota*,
     *Flecha curva* y *Curva punteada* para dibujar arrastrando sobre la
     cancha. Cada tipo tiene su color: desplazamiento azul (punteada), pelota
     azul marino, curva roja y curva punteada verde. Para **curvar cualquier
     flecha**, seleccionala y arrastrá el punto amarillo del medio (o usá el
     control *Curva*); al curvarla toma el color de la curva. El tipo también
     se cambia desde el panel de la flecha seleccionada.
   - *Sombra de bloqueo*: arrastrá desde el bloqueo hacia el fondo de la
     cancha y aparece la zona que tapa el bloqueo (un cono translúcido). Desde
     el panel ajustás el ancho en el bloqueo y al final; en la animación
     acompaña al bloqueo.
   - *Texto*: tocá la cancha para escribir. Se puede mover, tiene tres
     tamaños (chico, mediano, grande) y cuatro colores.
   - Al tocar un elemento se abre su **tarjeta** al lado, sobre la pizarra,
     con todo lo que se puede cambiar (en el celular aparece debajo de la
     pizarra). Se cierra con la ✕ o con Esc.
   - Al seleccionar un jugador aparece, al lado del tachito, el **globito de
     comentario**: lo que escribas (por ejemplo "Se desplaza a 1") se ve
     debajo del jugador en la pizarra. Cada paso tiene su propio comentario.
   - El panel *Reglas de rotación* avisa si hay faltas de posición. Se
     controla solo al momento del saque y solo al equipo que recibe; cada paso
     tiene un *Momento* (saque de A, saque de B o pelota en juego) que se
     ajusta solo al colocar una formación.
4. **Animación:** *+ Paso* duplica la pizarra actual; mové los elementos y
   tocá *Reproducir*. Las flechas de un paso se ven mientras ocurre el
   movimiento hacia el siguiente. Debajo de la pizarra está la guía
   *¿Cómo se arma y se reproduce una jugada?* con el paso a paso.
   Para borrar un elemento, tocalo y usá el **tachito** rojo que aparece al
   lado.
5. **Exportar PNG** descarga una imagen del paso actual. **Presentar** muestra
   la jugada a pantalla completa (para una tablet o una tele en el gimnasio),
   con botones grandes de paso anterior/siguiente, reproducir y la descripción
   de cada paso; se maneja también con ← →, Espacio y Esc. **Exportar video**
   graba la jugada animada (con una pausa en cada paso y su descripción abajo)
   y la descarga en MP4 —o WebM si el navegador no graba MP4— para mandarla
   por WhatsApp.
6. **Sesiones → Nueva sesión:** fecha, hora, plantel, objetivo y convocados.
   La sesión arranca con 5 bloques (90 minutos) que podés cambiar, reordenar
   o borrar. A cada bloque le agregás ejercicios de la biblioteca (con su
   duración) y elegís qué jugadores participan. El resumen muestra la
   duración total, la intensidad promedio y los minutos por tipo de ejercicio.
   **Guardar como plantilla** guarda los bloques y ejercicios de una sesión
   (por ejemplo "Martes técnico") para crear sesiones nuevas con
   **Desde plantilla** (en el inicio, en el calendario o en el + de cada día);
   las plantillas se administran al final de la lista de sesiones.
7. **Asistencia y carga:** al final de cada sesión marcás quién vino y el
   esfuerzo de cada jugadora (1 a 10). La carga es esfuerzo × minutos (UA). En
   *Planteles* ves la asistencia de las últimas 4 semanas y la carga semanal de
   cada jugadora contra su promedio, con avisos si la carga sube más de 30 %,
   si faltó a las últimas 2 sesiones o si su asistencia es baja.
8. **Calendario:** el mes con las sesiones y los partidos de cada día (con el
   + de cada día agregás una sesión o un partido). Cada semana muestra cuántas
   sesiones y minutos tiene y su **objetivo** (microciclo), por plantel. Cada
   partido guarda rival, local/visitante, lugar, torneo, resultado y notas; el
   inicio avisa cuándo es el próximo partido.
   **Plan de partido:** desde la ficha del partido (o el aviso del inicio)
   abrís el plan: scouting del rival (sistema, jugadoras clave, fortalezas y
   debilidades), nuestro plan (saque, bloqueo y defensa, claves), el historial
   contra ese rival y una pizarra con modo presentación para la charla previa.
   Si ya jugaste contra ese rival, ofrece copiar el plan anterior.
9. **Exportar PDF:** abre una versión para imprimir con toda la sesión y las
   pizarras; en el diálogo de impresión elegí "Guardar como PDF".

Arriba a la derecha están tu **cuenta** y el botón de **modo oscuro** (se recuerda en cada
navegador; la primera vez toma la preferencia del sistema). La pantalla de
Sesiones muestra el **resumen de la semana**: sesiones, minutos planificados,
reparto por tipo de ejercicio y la próxima sesión.

Atajos: `Ctrl+Z` deshacer, `Ctrl+Shift+Z` rehacer, `Supr` eliminar el
elemento seleccionado, `Esc` deseleccionar.

### Copia de seguridad

En **Tus datos** descargás un archivo `.json` con todo (planteles, jugadores,
ejercicios, sesiones, partidos y plantillas) y lo restaurás cuando quieras:
**Sumar a lo que tengo** (agrega lo que falta y se queda con lo más reciente)
o **Reemplazar todo**. Sirve también para pasar los datos a otra compu. Si
usás la app sin cuenta y hace más de un mes que no bajás una copia, el inicio
te lo recuerda.

Además, cada vez que abrís la app se guarda una **copia automática** de lo que
tiene ese navegador (las últimas 5), antes de conectarse a la nube. Aparecen en
*Tus datos → Copias automáticas de este navegador* y se pueden sumar de nuevo a
tus datos o descargar.

### Cuerpo técnico

Con tu cuenta, en **Tus datos → Cuerpo técnico** invitás por email a tu
asistente o preparador físico con permiso **Puede ver** o **Puede editar**
(se cambia o se quita cuando quieras). La persona entra con esa cuenta —si
usa email y contraseña, primero verifica su email— y le aparece un aviso
arriba para **ver tus datos** (también desde su menú de cuenta o desde *Tus
datos*). Los datos compartidos no se mezclan con los propios: se pasa de unos
a otros con un clic. Mientras los ve, un aviso arriba
indica de quién son; con solo lectura, los cambios no se guardan. Si dejás de
compartir, vuelve automáticamente a sus propios datos.

### Tu cuenta

La app se puede usar sin cuenta: los datos quedan solo en ese navegador. Con
**Entrar** (arriba a la derecha) creás una cuenta con Google o con email y
contraseña, y todo se guarda en la nube y se sincroniza entre dispositivos,
incluso si trabajás sin internet. La primera vez que entrás en un navegador con
datos cargados, la app pregunta si querés sumarlos a tu cuenta. Al salir de la
cuenta, los datos se borran de ese navegador (siguen en la nube).

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
  cloud/        Firebase: cuentas (auth.ts) y sincronización con Firestore (sync.ts)
  store.ts      estado global (Zustand, guardado en localStorage)
docs/VISION.md  visión del producto y hoja de ruta
firestore.rules reglas de seguridad de Firestore (se publican a mano en la consola de Firebase)
```

### Publicación

Cada push a `main` se publica en GitHub Pages con el workflow de
`.github/workflows/deploy.yml`. Para activarlo: en GitHub, *Settings → Pages →
Source: GitHub Actions*.
