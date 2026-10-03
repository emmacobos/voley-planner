import { useEffect, useRef, useState } from 'react';
import { elementsAtProgress } from '../domain/animation';
import { NET_X } from '../domain/court';
import { newId } from '../domain/ids';
import { PHASES, formationTokenIds, formationTokens, phaseSituation } from '../domain/formations';
import type { AttackSide, Phase } from '../domain/formations';
import { frameRuleStatus } from '../domain/rotationRules';
import { assignLineup } from '../domain/rotations';
import type {
  ArrowElement,
  BoardElement,
  Frame,
  Player,
  PlayerToken,
  PointElement,
  Situation,
  Team,
  Zone,
} from '../domain/types';
import { POSITIONS, SITUATIONS } from '../domain/types';
import { downloadSvgAsPng, slugify } from '../utils/exportPng';
import { Board } from './Board';
import { TEAM_COLORS } from './boardTheme';
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

export function BoardEditor({ frames, onChange, allPlayers, roster, exercisePlayers, title }: BoardEditorProps) {
  const [current, setCurrent] = useState(0);
  const [tool, setTool] = useState<Tool>('select');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showZones, setShowZones] = useState(true);
  const [rotationTeam, setRotationTeam] = useState<Team>('A');
  const [rotation, setRotation] = useState<Zone>(1);
  const [attackSide, setAttackSide] = useState<AttackSide>('zona4');
  const [past, setPast] = useState<Frame[][]>([]);
  const [future, setFuture] = useState<Frame[][]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
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

  const removeSelected = () => {
    if (!selectedId) return;
    setElements((els) => els.filter((e) => e.id !== selectedId));
    setSelectedId(null);
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

  /** Coloca al equipo en una formación del 5-1 y ajusta el momento del paso. */
  const placeFormation = (phase: Phase) => {
    const lineup = rotationTeam === 'A' ? assignLineup(exercisePlayers.length ? exercisePlayers : roster) : {};
    const tokens = formationTokens(rotationTeam, rotation, phase, { lineup, attackSide });
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
      <div className="board-main">
        <div className="toolbar">
          <div className="segmented" role="group" aria-label="Herramienta">
            <button className={tool === 'select' ? 'active' : ''} onClick={() => setTool('select')} title="Seleccionar y mover (Esc)">
              ✋ Mover
            </button>
            <button className={tool === 'arrow-move' ? 'active' : ''} onClick={() => setTool('arrow-move')} title="Arrastrá sobre la cancha para dibujar">
              ⇢ Flecha desplazamiento
            </button>
            <button className={tool === 'arrow-ball' ? 'active' : ''} onClick={() => setTool('arrow-ball')} title="Arrastrá sobre la cancha para dibujar">
              ➝ Flecha pelota
            </button>
          </div>
          <div className="toolbar-group">
            <button onClick={undo} disabled={!past.length || playing} title="Deshacer (Ctrl+Z)">↶</button>
            <button onClick={redo} disabled={!future.length || playing} title="Rehacer (Ctrl+Shift+Z)">↷</button>
            <label className="check">
              <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} /> Zonas
            </label>
            <button onClick={() => svgRef.current && downloadSvgAsPng(svgRef.current, `${slugify(title)}-paso-${index + 1}`)}>
              Exportar PNG
            </button>
          </div>
        </div>

        <Board
          svgRef={svgRef}
          elements={elements}
          players={allPlayers}
          selectedId={selectedId}
          tool={tool}
          readOnly={playing}
          showZones={showZones}
          onSelect={setSelectedId}
          onUpdate={updateElement}
          onAddArrow={addArrow}
        />

        <div className="frames">
          <button className="primary" onClick={playing ? () => setProgress(null) : play} disabled={frames.length < 2}>
            {playing ? '■ Detener' : '▶ Reproducir'}
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
          <button onClick={addFrame} disabled={playing} title="Duplica el paso actual para mover los elementos">
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
          <h3>Sistema 5-1</h3>
          <div className="row">
            <select value={rotationTeam} onChange={(e) => setRotationTeam(e.target.value as Team)} aria-label="Equipo">
              <option value="A">Equipo A</option>
              <option value="B">Equipo B</option>
            </select>
            <select value={rotation} onChange={(e) => setRotation(Number(e.target.value) as Zone)} aria-label="Rotación">
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  R{z} (armador en {z})
                </option>
              ))}
            </select>
          </div>
          <div className="button-grid formation-buttons">
            {PHASES.map((p) => (
              <button key={p.value} onClick={() => placeFormation(p.value)} disabled={playing} title={p.description}>
                {p.label}
              </button>
            ))}
          </div>
          <label className="field">
            En defensa, el rival ataca por
            <select value={attackSide} onChange={(e) => setAttackSide(e.target.value as AttackSide)}>
              <option value="zona4">su zona 4 (bloqueo a nuestra derecha)</option>
              <option value="zona2">su zona 2 (bloqueo a nuestra izquierda)</option>
            </select>
          </label>
          <p className="hint">
            En el equipo A se usan los jugadores del ejercicio según su posición (incluido el líbero). Armá cada fase en
            un paso nuevo para animar la jugada: por ejemplo K1 recepción → K1 ataque.
          </p>
        </section>

        <section>
          <h3>Reglas de rotación</h3>
          {checks.map((c) => (
            <div key={c.team} className="rule-check">
              <strong style={{ color: TEAM_COLORS[c.team] }}>Equipo {c.team}: </strong>
              {!c.checked ? (
                <span className="muted">{c.reason}</span>
              ) : !c.applicable ? (
                <span className="muted">necesita 6 jugadores con zona asignada.</span>
              ) : c.faults.length === 0 ? (
                <span className="ok">✓ sin faltas de posición</span>
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

        {selected && !playing && (
          <section>
            <h3>Elemento seleccionado</h3>
            <SelectedPanel element={selected} roster={roster} onUpdate={updateElement} />
            <button className="danger full" onClick={removeSelected}>
              Eliminar (Supr)
            </button>
          </section>
        )}
      </aside>
    </div>
  );
}

function SelectedPanel({
  element,
  roster,
  onUpdate,
}: {
  element: BoardElement;
  roster: Player[];
  onUpdate: (el: BoardElement) => void;
}) {
  if (element.kind === 'arrow') {
    return (
      <label className="field">
        Tipo de flecha
        <select value={element.style} onChange={(e) => onUpdate({ ...element, style: e.target.value as ArrowElement['style'] })}>
          <option value="move">Desplazamiento</option>
          <option value="ball">Trayectoria de pelota</option>
        </select>
      </label>
    );
  }
  if (element.kind !== 'player') {
    return null;
  }
  const t = element;
  return (
    <div className="stack">
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
