import { useContext, useEffect, useRef, useState } from 'react';
import { elementsAtProgress } from '../domain/animation';
import { ARROW_KINDS, arrowColor, arrowKind } from '../domain/arrows';
import type { ArrowKind } from '../domain/arrows';
import { TEXT_COLORS, TEXT_FONT_RANGE, TEXT_SIZES, textBox, textFontSize, textMinWidth } from '../domain/shadows';
import { NET_X } from '../domain/court';
import { newId } from '../domain/ids';
import {
  GAME_SYSTEMS,
  formationTokenIds,
  formationTokens,
  phaseSituation,
  phasesFor,
  rotationLabel,
} from '../domain/formations';
import type { AttackSide, Phase, SetterZone } from '../domain/formations';
import { frameRuleStatus } from '../domain/rotationRules';
import { assignLineup, assignLineup42, assignLineup60 } from '../domain/rotations';
import type {
  ArrowElement,
  BlockShadowElement,
  BoardElement,
  TextElement,
  TextSize,
  Frame,
  GameSystem,
  Player,
  PlayerToken,
  PointElement,
  Situation,
  Team,
  Zone,
} from '../domain/types';
import { POSITIONS, SITUATIONS } from '../domain/types';
import { downloadSvgAsPng, slugify } from '../utils/exportPng';
import { exportPlayVideo, videoSupport } from '../utils/exportVideo';
import { Board, DEFAULT_BEND } from './Board';
import { useBoardOrientation } from '../utils/boardOrientation';
import { FloatingPanel } from './FloatingPanel';
import { FloatingPanelReady } from './floatingPanelReady';
import { Presentation } from './Presentation';
import { ShareLinkDialog } from './ShareLinkDialog';
import type { Tool } from './boardTheme';

interface BoardEditorProps {
  frames: Frame[];
  onChange: (frames: Frame[]) => void;
  /** Todos los jugadores (para mostrar nombres en la pizarra). */
  allPlayers: Player[];
  /** Jugadores del plantel del ejercicio (para vincular fichas). */
  roster: Player[];
  /** Jugadores asignados al ejercicio (para armar las formaciones). */
  exercisePlayers: Player[];
  title: string;
  /** Sistema de juego del ejercicio (5-1 si no tiene). */
  system?: GameSystem;
  onSystemChange?: (system: GameSystem) => void;
}

const TRANSITION_MS = 1200;
const ZONES: Zone[] = [1, 2, 3, 4, 5, 6];

type AddKind = 'playerA' | 'playerB' | 'ball' | 'cone' | 'coach' | 'cart';

const DEFAULT_SPOT: Record<'ball' | 'cone' | 'coach' | 'cart', { x: number; y: number }> = {
  ball: { x: NET_X - 1, y: 4.5 },
  cone: { x: NET_X - 3, y: 1 },
  coach: { x: -1.5, y: 4.5 },
  cart: { x: -1.5, y: 7 },
};

const ADD_BUTTONS: { kind: AddKind; label: string }[] = [
  { kind: 'playerA', label: '+ Jugador A' },
  { kind: 'playerB', label: '+ Jugador B' },
  { kind: 'ball', label: '+ Pelota' },
  { kind: 'cone', label: '+ Cono' },
  { kind: 'coach', label: '+ Entrenador' },
  { kind: 'cart', label: '+ Carro' },
];

export function BoardEditor({
  frames,
  onChange,
  allPlayers,
  roster,
  exercisePlayers,
  title,
  system = '5-1',
  onSystemChange,
}: BoardEditorProps) {
  const [current, setCurrent] = useState(0);
  const [tool, setTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showZones, setShowZones] = useState(true);
  const vertical = useBoardOrientation((s) => s.vertical);
  const setVertical = useBoardOrientation((s) => s.setVertical);
  const [rotationTeam, setRotationTeam] = useState<Team>('A');
  const [rotation, setRotation] = useState<Zone>(1);
  const [attackSide, setAttackSide] = useState<AttackSide>('zona4');
  const [setterZone, setSetterZone] = useState<SetterZone>(3);
  const [past, setPast] = useState<Frame[][]>([]);
  const [future, setFuture] = useState<Frame[][]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [presenting, setPresenting] = useState(false);
  const [sharing, setSharing] = useState(false);
  /** Mientras se arrastra un elemento, su tarjeta se esconde (aparece al soltar). */
  const [dragging, setDragging] = useState(false);
  /** Avance de la grabación del video (0 a 1) mientras se genera. */
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  const index = Math.max(0, Math.min(current, frames.length - 1));
  const frame = frames[index];
  const playing = progress !== null;
  const elements = playing
    ? elementsAtProgress(frames.map((f) => f.elements), progress)
    : frame.elements;
  const selected = frame.elements.find((e) => e.id === selectedId) ?? null;

  const commit = (next: Frame[]) => {
    setPast((p) => [...p.slice(-99), frames]);
    setFuture([]);
    onChange(next);
  };

  const setElements = (fn: (els: BoardElement[]) => BoardElement[]) =>
    commit(frames.map((f, i) => (i === index ? { ...f, elements: fn(f.elements) } : f)));

  const updateElement = (el: BoardElement) =>
    setElements((els) => els.map((e) => (e.id === el.id ? el : e)));

  const removeElement = (id: string) => {
    setElements((els) => els.filter((e) => e.id !== id));
    setSelectedId(null);
  };

  const removeSelected = () => {
    if (selectedId) removeElement(selectedId);
  };

  const undo = () => {
    const prev = past.at(-1);
    if (!prev) return;
    setPast(past.slice(0, -1));
    setFuture([frames, ...future]);
    onChange(prev);
  };

  const redo = () => {
    const [next, ...rest] = future;
    if (!next) return;
    setFuture(rest);
    setPast([...past, frames]);
    onChange(next);
  };

  const addElement = (kind: AddKind) => {
    const count = frame.elements.length;
    const offset = (count % 5) * 0.9;
    let el: PointElement;
    if (kind === 'playerA' || kind === 'playerB') {
      const team: Team = kind === 'playerA' ? 'A' : 'B';
      const n = frame.elements.filter((e) => e.kind === 'player' && e.team === team).length + 1;
      el = {
        id: newId(),
        kind: 'player',
        team,
        label: String(n),
        x: team === 'A' ? NET_X - 4.5 : NET_X + 4.5,
        y: 1.5 + offset * 1.5,
      };
    } else {
      el = { id: newId(), kind, ...DEFAULT_SPOT[kind] };
      if (kind === 'cone') el.y += offset;
    }
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
    setTool('select');
  };

  const addArrow = (arrow: Omit<ArrowElement, 'id'>) => {
    const el = { ...arrow, id: newId() };
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
  };

  // Un texto que quedó vacío al dejar de seleccionarlo se borra solo.
  const lastSelected = useRef<string | null>(null);
  useEffect(() => {
    const prev = lastSelected.current;
    lastSelected.current = selectedId;
    if (!prev || prev === selectedId) return;
    const el = frame.elements.find((e) => e.id === prev);
    if (el?.kind === 'text' && !el.text.trim()) setElements((els) => els.filter((e) => e.id !== prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  /** Campo del panel que hay que enfocar (texto recién creado o comentario de un jugador). */
  const [focusField, setFocusField] = useState<{ id: string; field: 'text' | 'comment' } | null>(null);

  const addDrawn = (element: Omit<BlockShadowElement, 'id'> | Omit<TextElement, 'id'>) => {
    const el = { ...element, id: newId() } as BoardElement;
    setElements((els) => [...els, el]);
    setSelectedId(el.id);
    if (el.kind === 'text') {
      setFocusField({ id: el.id, field: 'text' });
      setTool('select');
    }
  };

  /** Coloca al equipo en una formación del sistema de juego y ajusta el momento del paso. */
  const placeFormation = (phase: Phase) => {
    const pool = exercisePlayers.length ? exercisePlayers : roster;
    const assign = system === '4-2' ? assignLineup42 : system === '6-0' ? assignLineup60 : assignLineup;
    const lineup = rotationTeam === 'A' ? assign(pool) : {};
    const tokens = formationTokens(rotationTeam, rotation, phase, { system, lineup, attackSide, setterZone });
    const replaced = formationTokenIds(rotationTeam);
    const keep = (e: BoardElement) =>
      !(e.kind === 'player' && e.team === rotationTeam && (e.zone !== undefined || replaced.has(e.id)));
    commit(
      frames.map((f, i) =>
        i === index
          ? { ...f, situation: phaseSituation(phase, rotationTeam), elements: [...f.elements.filter(keep), ...tokens] }
          : f,
      ),
    );
  };

  const setSituation = (situation: Situation) =>
    commit(frames.map((f, i) => (i === index ? { ...f, situation } : f)));

  const addFrame = () => {
    const copy: Frame = { id: newId(), note: '', situation: 'juego', elements: structuredClone(frame.elements) };
    commit([...frames.slice(0, index + 1), copy, ...frames.slice(index + 1)]);
    setCurrent(index + 1);
  };

  const removeFrame = () => {
    if (frames.length <= 1) return;
    commit(frames.filter((_, i) => i !== index));
    setCurrent(Math.max(0, index - 1));
  };

  const setNote = (note: string) =>
    onChange(frames.map((f, i) => (i === index ? { ...f, note } : f)));

  const play = () => {
    if (frames.length < 2) return;
    setSelectedId(null);
    const from = index >= frames.length - 1 ? 0 : index;
    progressRef.current = from;
    setProgress(from);
  };

  // Reproducción de la animación. Cada cambio de velocidad reinicia el reloj
  // desde el progreso actual.
  const last = frames.length - 1;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    const from = progressRef.current;
    const tick = (time: number) => {
      // El tiempo del primer cuadro puede ser anterior a `start`: nunca retroceder.
      const p = Math.max(from, from + ((time - start) * speed) / TRANSITION_MS);
      if (p >= last) {
        setProgress(null);
        setCurrent(last);
        return;
      }
      progressRef.current = p;
      setProgress(p);
      setCurrent(Math.floor(p));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, last]);

  // Atajos de teclado.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !playing) {
        e.preventDefault();
        removeSelected();
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setTool('select');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const nameOf = (t: PlayerToken) => {
    const p = t.playerId ? allPlayers.find((x) => x.id === t.playerId) : undefined;
    return p ? `${p.number} ${p.name}` : t.label;
  };
  const checks = (['A', 'B'] as Team[]).map((team) => frameRuleStatus(frame, team, nameOf));

  return (
    <div className="board-editor">
      {sharing && <ShareLinkDialog title={title} frames={frames} players={allPlayers} onClose={() => setSharing(false)} />}
      {presenting && (
        <Presentation title={title} frames={frames} players={allPlayers} startAt={index} onClose={() => setPresenting(false)} />
      )}
      <div className="board-main">
        <div className="toolbar">
          <div className="segmented tool-bar" role="group" aria-label="Herramienta">
            <button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')} title="Seleccionar y mover (Esc)">
              <Icon d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-1.5v-2a1.5 1.5 0 0 1 3 0V12m0-1v-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.8-2.4L4.3 16a1.5 1.5 0 0 1 2.4-1.8L8 16" />
              <span className="tool-label">Mover</span>
            </button>
            <button
              className={tool === 'arrow-move' ? 'active' : ''}
              onClick={() => setTool('arrow-move')}
              title="Arrastrá sobre la cancha para dibujar. Para curvarla, seleccionala y arrastrá su punto del medio."
            >
              <Icon d="M4 18c4-1 7-5 9-9m0 0-4 .5M13 9l1 4" dashed color={kindColor('desplazamiento')} />
              <span className="tool-label">Flecha desplazamiento</span>
              <span className="tool-short">Despl.</span>
            </button>
            <button
              className={tool === 'arrow-ball' ? 'active' : ''}
              onClick={() => setTool('arrow-ball')}
              title="Arrastrá sobre la cancha para dibujar. Para curvarla, seleccionala y arrastrá su punto del medio."
            >
              <Icon d="M4 18c4-1 7-5 9-9m0 0-4 .5M13 9l1 4" color={kindColor('pelota')} />
              <span className="tool-label">Flecha pelota</span>
              <span className="tool-short">Pelota</span>
            </button>
            <button
              className={tool === 'arrow-curve' ? 'active' : ''}
              onClick={() => setTool('arrow-curve')}
              title="Arrastrá sobre la cancha para dibujar una flecha curva. Ajustá la curva con su punto del medio."
            >
              <Icon d="M4 19C5 9 13 5 19 7m0 0-3.5-2.5M19 7l-2.5 3.2" color={kindColor('curva')} />
              <span className="tool-label">Flecha curva</span>
              <span className="tool-short">Curva</span>
            </button>
            <button
              className={tool === 'arrow-curve-dashed' ? 'active' : ''}
              onClick={() => setTool('arrow-curve-dashed')}
              title="Arrastrá sobre la cancha para dibujar una flecha curva punteada. Ajustá la curva con su punto del medio."
            >
              <Icon d="M4 19C5 9 13 5 19 7m0 0-3.5-2.5M19 7l-2.5 3.2" dashed color={kindColor('curva-punteada')} />
              <span className="tool-label">Curva punteada</span>
              <span className="tool-short">Punteada</span>
            </button>
            <button
              className={tool === 'shadow' ? 'active' : ''}
              onClick={() => setTool('shadow')}
              title="Arrastrá desde el bloqueo hacia el fondo de la cancha para marcar la zona que tapa."
            >
              <Icon d="M4 10.5h3v3H4zM7 10.5 20 4v16L7 13.5" />
              <span className="tool-label">Sombra de bloqueo</span>
              <span className="tool-short">Sombra</span>
            </button>
            <button
              className={tool === 'text' ? 'active' : ''}
              onClick={() => setTool('text')}
              title="Tocá la cancha donde quieras escribir."
            >
              <Icon d="M5 5h14M12 5v14M9 19h6" />
              <span className="tool-label">Texto</span>
            </button>
          </div>
          <div className="toolbar-group">
            <button className="icon-button" onClick={undo} disabled={!past.length || playing} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
              <Icon d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
            </button>
            <button className="icon-button" onClick={redo} disabled={!future.length || playing} title="Rehacer (Ctrl+Shift+Z)" aria-label="Rehacer">
              <Icon d="m15 14 5-5-5-5M20 9H10a6 6 0 0 0 0 12h3" />
            </button>
            <div className="segmented orientation-switch" role="group" aria-label="Orientación de la pizarra">
              <button
                className={!vertical ? 'active' : ''}
                aria-pressed={!vertical}
                onClick={() => setVertical(false)}
                title="Pizarra horizontal: la red de arriba a abajo"
              >
                <Icon d="M3 7h18v10H3zM12 7v10" />
                <span className="orientation-label">Horizontal</span>
              </button>
              <button
                className={vertical ? 'active' : ''}
                aria-pressed={vertical}
                onClick={() => setVertical(true)}
                title="Pizarra vertical: la red de lado a lado, tu equipo abajo (cómodo en el celular)"
              >
                <Icon d="M7 3h10v18H7zM7 12h10" />
                <span className="orientation-label">Vertical</span>
              </button>
            </div>
            <label className="check">
              <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} /> Zonas
            </label>
            <button onClick={() => svgRef.current && downloadSvgAsPng(svgRef.current, `${slugify(title)}-paso-${index + 1}`)}>
              Exportar PNG
            </button>
            <button
              className="video-button"
              disabled={frames.length < 2 || videoProgress !== null || playing}
              onClick={async () => {
                if (!videoSupport()) {
                  alert('Este navegador no puede grabar video. Probá con Chrome, Edge o Firefox.');
                  return;
                }
                setSelectedId(null);
                setVideoProgress(0);
                try {
                  await exportPlayVideo({
                    title,
                    frames,
                    players: allPlayers,
                    fileName: slugify(title),
                    onProgress: setVideoProgress,
                  });
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'No se pudo generar el video.');
                } finally {
                  setVideoProgress(null);
                }
              }}
              title={
                frames.length < 2
                  ? 'Agregá al menos un paso más para grabar la animación'
                  : 'Descarga la jugada animada en video, para mandarla por WhatsApp'
              }
            >
              <Icon d="M4 6h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM16 10l5-3v10l-5-3" />
              {videoProgress === null ? 'Exportar video' : `Grabando… ${Math.round(videoProgress * 100)}%`}
            </button>
            <button onClick={() => setSharing(true)} title="Link para ver la jugada animada, sin cuenta (por ejemplo, para el grupo de WhatsApp)">
              <Icon d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              Compartir link
            </button>
            <button
              className="present-button"
              onClick={() => {
                setProgress(null);
                setSelectedId(null);
                setPresenting(true);
              }}
              title="Mostrar la jugada a pantalla completa (por ejemplo en una tablet o una tele)"
            >
              <Icon d="M3 4h18v12H3zM8 20h8M12 16v4" />
              Presentar
            </button>
          </div>
        </div>

        <div className="board-stage" ref={stageRef}>
          <Board
            svgRef={svgRef}
            elements={elements}
            players={allPlayers}
            selectedId={selectedId}
            tool={tool}
            readOnly={playing}
            showZones={showZones}
            vertical={vertical}
            onSelect={setSelectedId}
            onUpdate={updateElement}
            onAddArrow={addArrow}
            onAddElement={addDrawn}
            onDelete={removeElement}
            onComment={(id) => {
              setSelectedId(id);
              setFocusField({ id, field: 'comment' });
            }}
            onDraggingChange={setDragging}
          />
          {selected && !playing && (
            <FloatingPanel
              element={selected}
              stageRef={stageRef}
              svgRef={svgRef}
              hidden={dragging}
              onClose={() => setSelectedId(null)}
            >
              <SelectedPanel
                element={selected}
                roster={roster}
                onUpdate={updateElement}
                focusField={focusField?.id === selected.id ? focusField.field : null}
                onFocused={() => setFocusField(null)}
              />
              <button className="danger full" onClick={removeSelected}>
                Eliminar (Supr)
              </button>
            </FloatingPanel>
          )}
        </div>

        <div className="frames">
          <button className="primary play-button" onClick={playing ? () => setProgress(null) : play} disabled={frames.length < 2}>
            {playing ? <Icon d="M7 6h10v12H7z" filled /> : <Icon d="M7 4.5v15l13-7.5z" filled />}
            {playing ? 'Detener' : 'Reproducir'}
          </button>
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Velocidad">
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
          <div className="frame-list">
            {frames.map((f, i) => (
              <button
                key={f.id}
                className={`frame-chip${i === index ? ' active' : ''}`}
                onClick={() => {
                  setProgress(null);
                  setCurrent(i);
                }}
                title={f.note || `Paso ${i + 1}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button className="add-frame" onClick={addFrame} disabled={playing} title="Duplica el paso actual para mover los elementos">
            + Paso
          </button>
          <button onClick={removeFrame} disabled={playing || frames.length <= 1}>
            Eliminar paso
          </button>
        </div>
        <div className="frame-details">
          <label className="check">
            Momento del paso {index + 1}:
            <select
              value={frame.situation ?? 'juego'}
              onChange={(e) => setSituation(e.target.value as Situation)}
              disabled={playing}
            >
              {SITUATIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <input
            className="frame-note"
            placeholder="Descripción del paso (opcional)"
            value={frame.note}
            onChange={(e) => setNote(e.target.value)}
            disabled={playing}
          />
        </div>

        <details className="help-box" open={frames.length < 2}>
          <summary>¿Cómo se arma y se reproduce una jugada?</summary>
          <ol>
            <li>
              <b>El paso 1 es la posición inicial.</b> Ubicá jugadores, pelota y elementos (o usá una formación del
              sistema de juego: 5-1, 4-2 o 6-0).
            </li>
            <li>
              <b>Tocá "+ Paso"</b> para copiar el paso actual en uno nuevo, y en ese paso <b>mové</b> lo que cambia: los
              jugadores que se desplazan, la pelota, etc. Repetilo por cada momento de la jugada (saque, recepción,
              armado, ataque…).
            </li>
            <li>
              <b>Las flechas se dibujan en el paso de origen:</b> durante la animación se ven mientras los jugadores se
              mueven hacia el paso siguiente, y desaparecen al llegar.
            </li>
            <li>
              <b>Tocá "Reproducir"</b> para ver la jugada animada desde el paso en el que estás hasta el último (si estás
              en el último, arranca desde el 1). Elegí la velocidad (0.5×, 1× o 2×) y usá "Detener" para cortarla.
            </li>
            <li>
              Tocá un <b>número de paso</b> para ir a él; "Eliminar paso" borra el actual. A cada paso le podés poner su{' '}
              <b>momento</b> (saque o pelota en juego) y una <b>descripción</b>.
            </li>
            <li>
              Al tocar un <b>jugador</b> aparece también un <b>globito</b> azul para escribirle un <b>comentario</b> (por
              ejemplo "Se desplaza a 1"), que se ve debajo de él en ese paso.
            </li>
            <li>
              Con <b>Texto</b> tocás la cancha y escribís donde quieras. Con <b>Sombra de bloqueo</b> arrastrás desde el
              bloqueo hacia el fondo para marcar la zona que tapa; en la animación acompaña al bloqueo.
            </li>
            <li>
              Para <b>borrar</b> un elemento, tocalo y usá el <b>tachito</b> rojo que aparece al lado (o la tecla Supr).
              Para <b>corregir</b>, arrastralo a su lugar; Ctrl+Z deshace el último cambio.
            </li>
          </ol>
          <p className="hint">
            Truco: colocá cada fase del sistema en un paso nuevo (por ejemplo K1 recepción → K1 ataque) y la app anima
            el cambio de posiciones sola.
          </p>
        </details>
      </div>

      <aside className="board-side">
        <section>
          <h3>Agregar</h3>
          <div className="button-grid">
            {ADD_BUTTONS.map((b) => (
              <button key={b.kind} onClick={() => addElement(b.kind)} disabled={playing}>
                {b.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Sistema de juego</h3>
          <label className="field system-select">
            Sistema
            <select value={system} onChange={(e) => onSystemChange?.(e.target.value as GameSystem)} disabled={playing}>
              {GAME_SYSTEMS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <p className="hint system-description">{GAME_SYSTEMS.find((g) => g.value === system)!.description}</p>
          <div className="segmented team-switch" role="group" aria-label="Equipo">
            {(['A', 'B'] as Team[]).map((t) => (
              <button
                key={t}
                className={rotationTeam === t ? `active team-${t}` : ''}
                onClick={() => setRotationTeam(t)}
                aria-pressed={rotationTeam === t}
              >
                Equipo {t}
              </button>
            ))}
          </div>
          <div className="rotation-label">{rotationLabel(system, rotation)}</div>
          <div className="rotation-picker" role="group" aria-label="Rotación">
            {ZONES.map((z) => (
              <button
                key={z}
                className={rotation === z ? 'active' : ''}
                onClick={() => setRotation(z)}
                aria-pressed={rotation === z}
                title={`R${z}: armador en la zona ${z}`}
              >
                R{z}
              </button>
            ))}
          </div>
          <div className="button-grid formation-buttons">
            {phasesFor(system, setterZone).map((p) => (
              <button key={p.value} onClick={() => placeFormation(p.value)} disabled={playing} title={p.description}>
                {p.label}
              </button>
            ))}
          </div>
          {system === '6-0' && (
            <label className="field">
              Arma el jugador que está en
              <select value={setterZone} onChange={(e) => setSetterZone(Number(e.target.value) as SetterZone)}>
                <option value={3}>zona 3</option>
                <option value={2}>zona 2</option>
              </select>
            </label>
          )}
          <label className="field">
            En defensa, el rival ataca por
            <select value={attackSide} onChange={(e) => setAttackSide(e.target.value as AttackSide)}>
              <option value="zona4">su zona 4 (bloqueo a nuestra derecha)</option>
              <option value="zona2">su zona 2 (bloqueo a nuestra izquierda)</option>
            </select>
          </label>
          <p className="hint">
            {system === '6-0'
              ? 'En el equipo A se usan los jugadores del ejercicio por número (sin líbero).'
              : system === '4-2'
                ? 'En el equipo A se usan los jugadores del ejercicio según su posición: dos armadores (si hay uno solo, el opuesto hace de segundo), puntas, centrales y líbero.'
                : 'En el equipo A se usan los jugadores del ejercicio según su posición (incluido el líbero).'}{' '}
            Armá cada fase en un paso nuevo para animar la jugada: por ejemplo K1 recepción → K1 ataque.
          </p>
        </section>

        <section>
          <h3>Reglas de rotación</h3>
          {checks.map((c) => (
            <div
              key={c.team}
              className={`rule-check ${!c.checked || !c.applicable ? 'rule-off' : c.faults.length ? 'rule-fault' : 'rule-ok'}`}
            >
              <strong className={`team-name team-name-${c.team}`}>Equipo {c.team}: </strong>
              {!c.checked ? (
                <span className="muted">{c.reason}</span>
              ) : !c.applicable ? (
                <span className="muted">necesita 6 jugadores con zona asignada.</span>
              ) : c.faults.length === 0 ? (
                <span className="ok">sin faltas de posición</span>
              ) : (
                <ul className="faults">
                  {c.faults.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <p className="hint">
            Las zonas se controlan solo al momento del saque y solo al equipo que recibe. Cambialo en "Momento del
            paso".
          </p>
        </section>

      </aside>
    </div>
  );
}

function SelectedPanel({
  element,
  roster,
  onUpdate,
  focusField = null,
  onFocused,
}: {
  element: BoardElement;
  roster: Player[];
  onUpdate: (el: BoardElement) => void;
  /** Campo a enfocar al mostrarse (para escribir directamente). */
  focusField?: 'text' | 'comment' | null;
  onFocused?: () => void;
}) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const ready = useContext(FloatingPanelReady);
  useEffect(() => {
    const field = fieldRef.current;
    // Esperar a que la tarjeta esté ubicada: oculta, el foco falla o mueve la página.
    if (!focusField || !field || !ready) return;
    field.focus({ preventScroll: true });
    // Solo desplazar la página si el campo quedó abajo, fuera de la pantalla (por ejemplo en el celular).
    if (field.getBoundingClientRect().bottom > window.innerHeight) field.scrollIntoView({ block: 'nearest' });
    if (focusField === 'text') field.select();
    onFocused?.();
  }, [focusField, element.id, onFocused, ready]);

  if (element.kind === 'text') {
    const fontSize = textFontSize(element);
    return (
      <div className="stack">
        <label className="field">
          Texto
          <textarea
            rows={2}
            value={element.text}
            ref={fieldRef}
            onChange={(e) => onUpdate({ ...element, text: e.target.value })}
            // Textos viejos que quedaron con "Texto": al tocarlos se marca todo para escribir encima.
            onFocus={(e) => {
              if (e.target.value === 'Texto') e.target.select();
            }}
            placeholder="Escribí acá"
          />
        </label>
        <div className="field">
          <span className="field-row">
            Tamaño de letra <output>{Math.round((fontSize / TEXT_SIZES.M) * 100)} %</output>
          </span>
          <input
            type="range"
            min={TEXT_FONT_RANGE.min}
            max={TEXT_FONT_RANGE.max}
            step={0.05}
            value={fontSize}
            onChange={(e) => onUpdate({ ...element, fontSize: Number(e.target.value) })}
            aria-label="Tamaño de letra"
          />
          <div className="segmented" role="group" aria-label="Tamaños rápidos">
            {(
              [
                ['S', 'Chico'],
                ['M', 'Mediano'],
                ['L', 'Grande'],
              ] as [TextSize, string][]
            ).map(([value, label]) => {
              const active = Math.abs(fontSize - TEXT_SIZES[value]) < 0.001;
              return (
                <button
                  key={value}
                  className={active ? 'active' : ''}
                  aria-pressed={active}
                  onClick={() => {
                    const { fontSize: _custom, ...rest } = element;
                    onUpdate({ ...rest, size: value });
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="field">
          <span className="field-row">
            Ancho del cuadro{' '}
            {element.width ? (
              <button className="link-button" onClick={() => {
                  const { width: _width, ...rest } = element;
                  onUpdate(rest);
                }}>
                Automático
              </button>
            ) : (
              <output>automático</output>
            )}
          </span>
          <input
            type="range"
            min={Math.round(textMinWidth(element) * 10) / 10}
            max={16}
            step={0.1}
            value={textBox(element).width}
            onChange={(e) => onUpdate({ ...element, width: Number(e.target.value) })}
            aria-label="Ancho del cuadro"
          />
        </div>
        <div className="field">
          Color
          <div className="swatches" role="group" aria-label="Color del texto">
            {TEXT_COLORS.map((c) => (
              <button
                key={c.value}
                className={`color-swatch${element.color === c.value ? ' active' : ''}`}
                style={{ background: c.value }}
                onClick={() => onUpdate({ ...element, color: c.value })}
                aria-label={c.label}
                aria-pressed={element.color === c.value}
                title={c.label}
              />
            ))}
          </div>
        </div>
        <div className="field">
          Borde
          <div className="segmented" role="group" aria-label="Borde del texto">
            <button
              className={element.outline !== false ? 'active' : ''}
              aria-pressed={element.outline !== false}
              onClick={() => {
                const { outline: _outline, ...rest } = element;
                onUpdate(rest);
              }}
              title="Contorno que lo hace leer sobre cualquier fondo"
            >
              Con borde
            </button>
            <button
              className={element.outline === false ? 'active' : ''}
              aria-pressed={element.outline === false}
              onClick={() => onUpdate({ ...element, outline: false })}
            >
              Sin borde
            </button>
          </div>
        </div>
        <p className="hint">
          Arrastralo para moverlo. En la pizarra, el borde derecho cambia el ancho y la esquina el tamaño de la letra.
          Enter hace una línea nueva.
        </p>
      </div>
    );
  }
  if (element.kind === 'shadow') {
    return (
      <div className="stack">
        <p className="hint" style={{ marginTop: 0 }}>
          Sombra del bloqueo: arrastrá el punto del bloqueo y el del fondo para orientarla.
        </p>
        <label className="field">
          Ancho en el bloqueo ({element.startWidth.toFixed(1)} m)
          <input
            type="range"
            min={0.4}
            max={3}
            step={0.1}
            value={element.startWidth}
            onChange={(e) => onUpdate({ ...element, startWidth: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          Ancho al final ({element.endWidth.toFixed(1)} m)
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.1}
            value={element.endWidth}
            onChange={(e) => onUpdate({ ...element, endWidth: Number(e.target.value) })}
          />
        </label>
      </div>
    );
  }
  if (element.kind === 'arrow') {
    const curve = element.curve ?? 0;
    return (
      <div className="stack">
        <label className="field">
          Tipo de flecha
          <span className="arrow-kind-select">
            <span className="arrow-kind-dot" style={{ background: arrowColor(element) }} aria-hidden="true" />
            <select
              value={arrowKind(element)}
              onChange={(e) => {
                const kind = ARROW_KINDS.find((k) => k.value === e.target.value)!;
                const len = Math.hypot(element.x2 - element.x1, element.y2 - element.y1);
                onUpdate({
                  ...element,
                  style: kind.style,
                  // Al pasar a curva se curva un poco; al pasar a recta se endereza.
                  curve: kind.curved ? element.curve || Math.round(DEFAULT_BEND * len * 100) / 100 : undefined,
                });
              }}
            >
              {ARROW_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </span>
        </label>
        <label className="field">
          Curva
          <input
            type="range"
            min={-5}
            max={5}
            step={0.1}
            value={curve}
            onChange={(e) => onUpdate({ ...element, curve: Number(e.target.value) || undefined })}
          />
        </label>
        <p className="hint">También podés curvarla arrastrando el punto amarillo del medio de la flecha.</p>
        {curve !== 0 && (
          <button className="full" onClick={() => onUpdate({ ...element, curve: undefined })}>
            Enderezar flecha
          </button>
        )}
      </div>
    );
  }
  if (element.kind !== 'player') {
    return null;
  }
  const t = element;
  return (
    <div className="stack">
      <label className="field">
        Comentario (se ve debajo del jugador)
        <textarea
          ref={fieldRef}
          rows={2}
          value={t.comment ?? ''}
          placeholder="Ej.: Se desplaza a 1"
          onChange={(e) => onUpdate({ ...t, comment: e.target.value || undefined })}
        />
      </label>
      <label className="field">
        Jugador del plantel
        <select
          value={t.playerId ?? ''}
          onChange={(e) => {
            const p = roster.find((x) => x.id === e.target.value);
            onUpdate(p ? { ...t, playerId: p.id, label: String(p.number), role: p.position } : { ...t, playerId: undefined });
          }}
        >
          <option value="">— Sin vincular —</option>
          {roster.map((p) => (
            <option key={p.id} value={p.id}>
              {p.number} · {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <label className="field">
          Etiqueta
          <input value={t.label} maxLength={3} onChange={(e) => onUpdate({ ...t, label: e.target.value })} />
        </label>
        <label className="field">
          Equipo
          <select value={t.team} onChange={(e) => onUpdate({ ...t, team: e.target.value as Team })}>
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </label>
      </div>
      <div className="row">
        <label className="field">
          Posición
          <select value={t.role ?? ''} onChange={(e) => onUpdate({ ...t, role: (e.target.value || undefined) as PlayerToken['role'] })}>
            <option value="">—</option>
            {POSITIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Zona
          <select
            value={t.zone ?? ''}
            onChange={(e) => onUpdate({ ...t, zone: e.target.value ? (Number(e.target.value) as Zone) : undefined })}
          >
            <option value="">—</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/** Ícono de trazo (24×24). */
function Icon({
  d,
  filled = false,
  dashed = false,
  color,
}: {
  d: string;
  filled?: boolean;
  dashed?: boolean;
  /** Color propio (por ejemplo, el de un tipo de flecha); si falta, el del texto. */
  color?: string;
}) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className={color ? 'icon arrow-icon' : 'icon'} style={color ? { color } : undefined}>
      <path
        d={d}
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={dashed ? '3 3' : undefined}
      />
    </svg>
  );
}

function kindColor(kind: ArrowKind): string {
  return ARROW_KINDS.find((k) => k.value === kind)!.color;
}
