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
| **Jugador** | Integrante del plantel: nombre, número, posición (armador, opuesto, central, punta, líbero). |
| **Plantel** | Lista de jugadores del equipo del entrenador. |
| **Pizarra** | Cancha completa vista desde arriba con jugadores de ambos equipos, pelota, conos, carros, entrenadores y flechas. |
| **Paso (frame)** | Una "foto" de la pizarra. Varios pasos seguidos forman una animación. |
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
  equipo.
- **Validación de reglas de rotación**: avisa si hay falta de posición al
  momento del saque.
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
- Cuentas de usuario (registro e inicio de sesión).
- Datos guardados en la nube y sincronizados entre dispositivos.

## Hoja de ruta

El proyecto avanza por etapas chicas para poder probarlo en entrenamientos
reales lo antes posible.

### Etapa 1 — MVP: pizarra + biblioteca de ejercicios ✅ (esta versión)
- Pizarra de cancha completa con todos los elementos.
- Rotaciones 5-1 predefinidas y validación de faltas de posición.
- Pasos y animación con reproducción, velocidad y deshacer.
- Plantel (nombre, número, posición) y vinculación de jugadores a la pizarra.
- Biblioteca de ejercicios: tipo, objetivo, duración, intensidad,
  jugadores, notas.
- Exportar PNG.
- Guardado local en el navegador (sin cuenta todavía).
- Publicación en GitHub Pages.

### Etapa 2 — Sesiones de entrenamiento
- Crear sesiones con fecha, objetivo y bloques.
- Agregar ejercicios de la biblioteca a cada bloque y asignar jugadores.
- Duración total e intensidad de la sesión.
- Exportar la sesión a PDF (con las pizarras de cada ejercicio).

### Etapa 3 — Usuarios y nube
- Registro e inicio de sesión.
- Base de datos en la nube (propuesta: Supabase — autenticación + Postgres,
  con plan gratuito).
- Migración de los datos guardados localmente a la cuenta.

### Etapa 4 — Calendario y temporada
- Vista de calendario semanal/mensual.
- Microciclos y objetivos por período.
- Estadísticas simples (minutos por tipo de ejercicio, carga por semana).

### Ideas a futuro
- Más sistemas de juego (4-2, 6-2) y formaciones de recepción por rotación.
- Trayectorias curvas y zonas sombreadas.
- Plantillas de ejercicios clásicos.
- Compartir un ejercicio con un link de solo lectura.

## Decisiones técnicas

- **Frontend:** React + TypeScript + Vite.
- **Pizarra:** SVG con coordenadas en metros reales (la cancha mide 18 × 9),
  lo que simplifica las reglas y la exportación.
- **Estado:** Zustand. En la Etapa 1 se persiste en `localStorage`; en la
  Etapa 3 la misma capa pasa a sincronizar con el backend.
- **Lógica de dominio** (rotaciones, reglas, animación) separada de la UI en
  `src/domain`, con tests (Vitest).
- **Deploy:** GitHub Pages mediante GitHub Actions.
