# Voley Planner — Visión del producto

## Qué es

Una aplicación web para que un **entrenador de voleibol** planifique sus
entrenamientos desde la computadora, antes de la práctica. El centro de la
app es una **pizarra táctica** de cancha completa (los dos equipos) donde se
dibujan ejercicios y jugadas, que se pueden **animar** paso a paso. Sobre esa
pizarra se construye la **planificación**: ejercicios reutilizables, sesiones
de entrenamiento y, más adelante, ciclos de temporada.

## Para quién

- **Usuario principal:** el entrenador (un solo rol por ahora).
- **Contexto de uso:** en la computadora, planificando antes del
  entrenamiento. No se optimiza para usarla en la cancha durante la práctica.
- **Idioma:** español.

## Conceptos (glosario)

| Concepto | Qué es |
|---|---|
| **Jugador** | Integrante del plantel: nombre, número, posición (armador, opuesto, central, punta, líbero), fecha de nacimiento, teléfono y observaciones. |
| **Plantel** | Grupo de jugadores con nombre propio (por ejemplo "Primera femenina" o "Sub 18"). Un entrenador puede tener varios. |
| **Pizarra** | Cancha completa vista desde arriba con jugadores de ambos equipos, pelota, conos, carros, entrenadores y flechas. |
| **Paso (frame)** | Una "foto" de la pizarra. Varios pasos seguidos forman una animación. Cada paso tiene un **momento**: saque de A, saque de B o pelota en juego. |
| **Complejos** | **K1**: recepción, armado y ataque (side-out). **K2**: saque, bloqueo, defensa y contraataque. |
| **Ejercicio** | Unidad reutilizable de la biblioteca. Tiene tipo, objetivo, duración, intensidad, jugadores asignados, notas y una pizarra animada. |
| **Tipo de ejercicio** | **Analítico** (técnica aislada de un fundamento), **Sintético** (combina 2–3 fundamentos o una fase del juego) o **Global** (situación real de juego). |
| **Sesión de entrenamiento** | Fecha, objetivo y una secuencia de **bloques**. |
| **Bloque** | Parte de la sesión (calentamiento, técnica, táctica, juego, vuelta a la calma) con uno o más ejercicios, duración, intensidad y **los jugadores que participan** (nombre + posición). |
| **Microciclo / calendario** | Agrupación de sesiones por semana y temporada. |

## Funcionalidades

### Pizarra táctica
- Cancha completa reglamentaria (18 × 9 m) con zona libre, red, líneas de
  ataque y zonas numeradas.
- Jugadores de ambos equipos con número, posición y nombre (vinculados al
  plantel).
- Pelota, conos, carros de pelotas y entrenadores.
- Flechas de desplazamiento y de trayectoria de la pelota.
- **Rotaciones predefinidas** (sistema 5-1, las 6 rotaciones) para cada
  equipo, con formaciones de K1 (recepción y ataque), K2 (saque) y defensa
  (perimetral y 6 adelante, según por dónde ataca el rival). El líbero entra
  por el central zaguero.
- **Validación de reglas de rotación**: avisa si hay falta de posición. Se
  controla solo al equipo que recibe en el momento del saque (con las reglas
  nuevas, el equipo que saca no tiene faltas de posición, y con la pelota en
  juego no existen las zonas).
- **Animaciones**: se encadenan pasos y la app interpola los movimientos.
- Exportar la pizarra como imagen (PNG) y, más adelante, la sesión completa
  en PDF.

### Planificación
- Biblioteca de ejercicios reutilizables, filtrable por tipo.
- Sesiones de entrenamiento armadas por bloques, con duración total
  calculada.
- Jugadores asignados a cada bloque/ejercicio, con nombre y posición.
- Calendario y microciclos.
- Exportar a PDF para imprimir o compartir.

### Usuarios
- Cuentas de usuario: cada entrenador tiene su cuenta y sus datos.
- Entrar con Google o con email y contraseña.
- La cuenta es opcional: se puede usar la app sin entrar (datos solo en ese
  navegador) y entrar para guardar en la nube.
- Datos guardados en la nube y sincronizados entre dispositivos, con
  funcionamiento sin internet.

## Hoja de ruta

El proyecto avanza por etapas chicas para poder probarlo en entrenamientos
reales lo antes posible.

### Etapa 1 — MVP: pizarra + biblioteca de ejercicios ✅
- Pizarra de cancha completa con todos los elementos.
- Rotaciones 5-1 con formaciones K1, K2 y defensas, y validación de faltas
  de posición según el momento de cada paso.
- Pasos y animación con reproducción, velocidad y deshacer.
- Varios planteles con nombre (nombre, número y posición de cada jugador) y
  vinculación de jugadores a la pizarra.
- Biblioteca de ejercicios: tipo, objetivo, duración, intensidad,
  jugadores, notas.
- Exportar PNG.
- Guardado local en el navegador (sin cuenta todavía).
- Publicación en GitHub Pages.

### Etapa 2 — Sesiones de entrenamiento ✅
- Crear sesiones con fecha, hora, plantel, objetivo, notas y convocados.
- Bloques (calentamiento, técnica, táctica, juego, vuelta a la calma, otro)
  con ejercicios de la biblioteca, duración ajustable, jugadores y notas.
- Resumen: duración total, intensidad promedio ponderada por minutos y
  minutos por tipo de ejercicio.
- Exportar la sesión a PDF (con las pizarras de cada ejercicio).

### Etapa 3 — Usuarios y nube
Decisiones tomadas:
- **Servicio:** Firebase (Authentication + Firestore), plan gratuito. Se
  eligió sobre Supabase porque no se pausa por inactividad (pretemporada,
  vacaciones) y trae funcionamiento sin internet.
- **Quién:** cada entrenador con su cuenta y sus datos, sin compartir por
  ahora. El modelo de datos queda preparado para compartir más adelante.
- **Cómo se entra:** Google y email + contraseña (con recuperación de
  contraseña).
- **Cuenta opcional:** sin entrar, la app funciona como hasta ahora (datos en
  el navegador). Al entrar por primera vez, ofrece subir los datos locales a
  la cuenta.
- **Sincronización:** automática, con indicador de estado ("Guardado" /
  "Sincronizando…"), funciona sin internet y sincroniza al volver la
  conexión. Si se edita lo mismo en dos dispositivos, queda el último cambio.
- **Seguridad:** reglas de Firestore para que cada cuenta solo pueda leer y
  escribir sus propios datos.
- **Datos de jugadores:** nombre, número, posición, fecha de nacimiento,
  teléfono y observaciones. Los datos personales (teléfono, nacimiento,
  observaciones) no se incluyen en el PDF de las sesiones.

### Pendiente — Compartir con el cuerpo técnico
- Invitar a asistentes a ver o editar planteles, ejercicios y sesiones.
- Roles (dueño / editor / lector).

### Etapa 4 — Calendario y temporada
- Vista de calendario semanal/mensual.
- Microciclos y objetivos por período.
- Estadísticas simples (minutos por tipo de ejercicio, carga por semana).

### Ideas a futuro
- Más sistemas de juego (4-2, 6-2) y variantes de recepción (de 2, de 4).
- Generar automáticamente la secuencia completa de una rotación (recepción →
  ataque → cobertura) como pasos animados.
- Defensa contra ataque por zona 3 y por zaguero.
- Trayectorias curvas y zonas sombreadas.
- Plantillas de ejercicios clásicos.
- Compartir un ejercicio con un link de solo lectura.

## Decisiones técnicas

- **Frontend:** React + TypeScript + Vite.
- **Pizarra:** SVG con coordenadas en metros reales (la cancha mide 18 × 9),
  lo que simplifica las reglas y la exportación.
- **Estado:** Zustand. Se persiste en `localStorage`; en la Etapa 3 la
  misma capa se sincroniza con Firestore cuando hay una cuenta.
- **Lógica de dominio** (rotaciones, reglas, animación) separada de la UI en
  `src/domain`, con tests (Vitest).
- **Deploy:** GitHub Pages mediante GitHub Actions.
