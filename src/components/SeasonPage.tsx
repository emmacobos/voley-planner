import { useState } from 'react';
import {
  CONTENTS,
  PHASE_KINDS,
  contentInfo,
  contentRanking,
  monthBounds,
  phaseKindInfo,
  phaseMatches,
  phaseOn,
  phasesFor,
  phaseWeeks,
  sessionsBetween,
  workSummary,
} from '../domain/season';
import type { ContentKey, WorkSummary } from '../domain/season';
import { todayISO } from '../domain/sessions';
import type { Content, SeasonPhase } from '../domain/types';
import { useAppStore } from '../store';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const label = (key: ContentKey) => (key === 'otros' ? 'Otros / sin clasificar' : contentInfo(key).label);
const color = (key: ContentKey) => (key === 'otros' ? '#b9b1a3' : contentInfo(key).color);
const dayMs = 86400000;
const shortDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MONTHS[m - 1].slice(0, 3)} ${y}`;
};
const toTime = (iso: string) => Date.parse(`${iso}T00:00:00`);

/** Plan de temporada: etapas de varias semanas y cuánto se trabajó cada contenido. */
export function SeasonPage() {
  const squads = useAppStore((s) => s.squads);
  const phases = useAppStore((s) => s.phases);
  const sessions = useAppStore((s) => s.sessions);
  const exercises = useAppStore((s) => s.exercises);
  const matches = useAppStore((s) => s.matches);
  const removePhase = useAppStore((s) => s.removePhase);
  const [squadId, setSquadId] = useState<string | null>(squads.length === 1 ? squads[0].id : null);
  const [editing, setEditing] = useState<SeasonPhase | 'new' | null>(null);
  const [today] = useState(() => new Date());
  const [month, setMonth] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));

  const todayStr = todayISO(today);
  const list = phasesFor(phases, squadId);
  const current = phaseOn(phases, todayStr, squadId);
  const { from, to } = monthBounds(month.year, month.month);
  const monthSummary = workSummary(sessionsBetween(sessions, from, to, squadId), exercises);
  const monthPhase = list.find((p) => p.start <= to && p.end >= from);
  const moveMonth = (delta: number) =>
    setMonth(({ year, month: m }) => {
      const d = new Date(year, m + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  return (
    <div className="page season-page">
      <div className="page-header">
        <div>
          <h1>Temporada</h1>
          <p className="muted">Las etapas del año (pretemporada, competencia…) y cuánto se entrenó cada cosa.</p>
        </div>
        <div className="row">
          {squads.length > 1 && (
            <select value={squadId ?? ''} onChange={(e) => setSquadId(e.target.value || null)} aria-label="Plantel">
              <option value="">Todos los planteles</option>
              {squads.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <button className="primary" onClick={() => setEditing('new')}>
            + Nueva etapa
          </button>
        </div>
      </div>

      {list.length ? (
        <Timeline phases={list} today={todayStr} onOpen={setEditing} />
      ) : (
        <section className="panel season-empty">
          <h2>Armá el plan de la temporada</h2>
          <p>
            Dividí el año en etapas de varias semanas, cada una con su objetivo: por ejemplo <b>Pretemporada</b> (base
            física y técnica), <b>Primera rueda</b> (sistema y competencia) y <b>Puesta a punto</b> antes de las finales.
            Cada etapa muestra cuántas sesiones y minutos llevás y qué contenidos se trabajaron.
          </p>
          <button className="primary" onClick={() => setEditing('new')}>
            + Crear la primera etapa
          </button>
        </section>
      )}

      {current && (
        <p className="season-now">
          Hoy estás en <b style={{ color: phaseKindInfo(current.kind).color }}>{current.name}</b>
          {current.objective && <> · {current.objective}</>}
        </p>
      )}

      <section className="panel">
        <div className="month-head">
          <h2>
            Lo trabajado en {MONTHS[month.month]} {month.year}
          </h2>
          <div className="row">
            <button className="icon-button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
              ‹
            </button>
            <button className="icon-button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
              ›
            </button>
          </div>
        </div>
        {monthPhase && (
          <p className="muted" style={{ marginTop: 0 }}>
            Etapa: <b>{monthPhase.name}</b>
            {monthPhase.focus.length > 0 && <> · prioridad: {monthPhase.focus.map((c) => contentInfo(c).label.toLowerCase()).join(', ')}</>}
          </p>
        )}
        <WorkBars summary={monthSummary} focus={monthPhase?.focus ?? []} />
      </section>

      {list
        .slice()
        .reverse()
        .map((phase) => {
          const summary = workSummary(sessionsBetween(sessions, phase.start, phase.end, squadId ?? phase.squadId), exercises);
          const games = phaseMatches(matches, phase, squadId);
          const info = phaseKindInfo(phase.kind);
          const status = phase.end < todayStr ? 'Terminada' : phase.start > todayStr ? 'Por venir' : 'En curso';
          return (
            <section key={phase.id} className="panel phase-card" style={{ borderTopColor: info.color }}>
              <div className="phase-head">
                <div>
                  <span className="phase-kind" style={{ color: info.color }}>
                    {info.label} · {status}
                  </span>
                  <h2>{phase.name}</h2>
                  <p className="muted">
                    {shortDate(phase.start)} al {shortDate(phase.end)} · {phaseWeeks(phase)} semanas
                    {phase.squadId && ` · ${squads.find((s) => s.id === phase.squadId)?.name ?? ''}`}
                  </p>
                </div>
                <div className="row">
                  <button onClick={() => setEditing(phase)}>Editar</button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (confirm(`¿Borrar la etapa "${phase.name}"?`)) removePhase(phase.id);
                    }}
                  >
                    Borrar
                  </button>
                </div>
              </div>
              {phase.objective && <p className="phase-objective">{phase.objective}</p>}
              <div className="phase-numbers">
                <span>
                  <b>{summary.sessions}</b> sesiones
                </span>
                <span>
                  <b>{Math.round(summary.minutes / 60)}</b> horas
                </span>
                {games.total > 0 && (
                  <span>
                    <b>{games.total}</b> partidos
                    {games.played > 0 && ` (${games.won} ${games.won === 1 ? 'ganado' : 'ganados'}, ${games.lost} ${games.lost === 1 ? 'perdido' : 'perdidos'})`}
                  </span>
                )}
              </div>
              <WorkBars summary={summary} focus={phase.focus} />
            </section>
          );
        })}

      {editing && (
        <PhaseDialog
          phase={editing === 'new' ? null : editing}
          squadId={squadId}
          squads={squads}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** Línea de tiempo con las etapas y el día de hoy. */
function Timeline({ phases, today, onOpen }: { phases: SeasonPhase[]; today: string; onOpen: (p: SeasonPhase) => void }) {
  const start = Math.min(...phases.map((p) => toTime(p.start)), toTime(today));
  const end = Math.max(...phases.map((p) => toTime(p.end)), toTime(today)) + dayMs;
  const span = end - start;
  const pos = (iso: string) => ((toTime(iso) - start) / span) * 100;
  // Marcas de cada mes.
  const months: { left: number; label: string }[] = [];
  const first = new Date(start);
  for (let d = new Date(first.getFullYear(), first.getMonth() + 1, 1); d.getTime() < end; d.setMonth(d.getMonth() + 1)) {
    months.push({ left: ((d.getTime() - start) / span) * 100, label: MONTHS[d.getMonth()].slice(0, 3) });
  }
  // Etapas superpuestas van en otra fila.
  const rows: SeasonPhase[][] = [];
  for (const p of phases) {
    const row = rows.find((r) => r.every((q) => q.end < p.start || q.start > p.end));
    if (row) row.push(p);
    else rows.push([p]);
  }

  return (
    <div className="timeline" style={{ height: `${2.4 + rows.length * 2.6}rem` }}>
      {months.map((m) => (
        <span key={m.left} className="timeline-month" style={{ left: `${m.left}%` }}>
          {m.label}
        </span>
      ))}
      {rows.map((row, r) =>
        row.map((p) => {
          const info = phaseKindInfo(p.kind);
          return (
            <button
              key={p.id}
              className="timeline-phase"
              style={{
                left: `${pos(p.start)}%`,
                width: `${Math.max(2, pos(p.end) - pos(p.start) + (dayMs / span) * 100)}%`,
                top: `${1.6 + r * 2.6}rem`,
                background: info.color,
              }}
              onClick={() => onOpen(p)}
              title={`${p.name}: ${shortDate(p.start)} al ${shortDate(p.end)}`}
            >
              {p.name}
            </button>
          );
        }),
      )}
      <span className="timeline-today" style={{ left: `${pos(today)}%` }}>
        <em>Hoy</em>
      </span>
    </div>
  );
}

/** Minutos por contenido, de mayor a menor; los prioritarios de la etapa van marcados. */
function WorkBars({ summary, focus }: { summary: WorkSummary; focus: Content[] }) {
  const ranking = contentRanking(summary);
  if (!ranking.length) return <p className="muted">No hay sesiones en este período.</p>;
  const max = ranking[0].minutes;
  const missing = focus.filter((c) => !ranking.some((r) => r.key === c));
  return (
    <div className="work-bars">
      {ranking.map((r) => (
        <div key={r.key} className={`work-row${focus.includes(r.key as Content) ? ' focus' : ''}`}>
          <span>
            {label(r.key)}
            {focus.includes(r.key as Content) && <i title="Prioridad de la etapa"> ★</i>}
          </span>
          <div className="work-track">
            <i style={{ width: `${(r.minutes / max) * 100}%`, background: color(r.key) }} />
          </div>
          <b>
            {r.minutes} min <small>{r.percent} %</small>
          </b>
        </div>
      ))}
      {missing.length > 0 && (
        <p className="work-missing">
          ⚠ Sin trabajar todavía, aunque es prioridad: {missing.map((c) => contentInfo(c).label.toLowerCase()).join(', ')}.
        </p>
      )}
    </div>
  );
}

function PhaseDialog({
  phase,
  squadId,
  squads,
  onClose,
}: {
  phase: SeasonPhase | null;
  squadId: string | null;
  squads: { id: string; name: string }[];
  onClose: () => void;
}) {
  const createPhase = useAppStore((s) => s.createPhase);
  const updatePhase = useAppStore((s) => s.updatePhase);
  const [today] = useState(() => todayISO(new Date()));
  const [draft, setDraft] = useState(() => ({
    name: phase?.name ?? '',
    kind: phase?.kind ?? ('pretemporada' as SeasonPhase['kind']),
    start: phase?.start ?? today,
    end: phase?.end ?? todayISO(new Date(Date.now() + 8 * 7 * dayMs)),
    objective: phase?.objective ?? '',
    focus: phase?.focus ?? ([] as Content[]),
    squadId: phase ? phase.squadId : squadId,
  }));
  const valid = draft.name.trim() && draft.start && draft.end && draft.start <= draft.end;
  const save = () => {
    if (!valid) return;
    const data = { ...draft, name: draft.name.trim() };
    if (phase) updatePhase(phase.id, data);
    else createPhase(data);
    onClose();
  };
  const toggle = (c: Content) =>
    setDraft((d) => ({ ...d, focus: d.focus.includes(c) ? d.focus.filter((x) => x !== c) : [...d.focus, c] }));

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal phase-dialog" role="dialog" aria-modal="true" aria-labelledby="phase-title">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 id="phase-title">{phase ? 'Editar etapa' : 'Nueva etapa'}</h2>
        <div className="match-grid">
          <label className="field span-2">
            Nombre
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ej.: Pretemporada, Primera rueda, Play-off"
              autoFocus
            />
          </label>
          <label className="field">
            Tipo
            <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as SeasonPhase['kind'] })}>
              {PHASE_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          {squads.length > 1 ? (
            <label className="field">
              Plantel
              <select value={draft.squadId ?? ''} onChange={(e) => setDraft({ ...draft, squadId: e.target.value || null })}>
                <option value="">Todos</option>
                {squads.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span />
          )}
          <label className="field">
            Desde
            <input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
          </label>
          <label className="field">
            Hasta
            <input type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
          </label>
          <label className="field span-2">
            Objetivo
            <textarea
              rows={2}
              value={draft.objective}
              onChange={(e) => setDraft({ ...draft, objective: e.target.value })}
              placeholder="Ej.: base física y recepción; sistema 5-1 aceitado para el torneo."
            />
          </label>
          <div className="field span-2">
            Contenidos prioritarios
            <div className="chips">
              {CONTENTS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`chip${draft.focus.includes(c.value) ? ' on' : ''}`}
                  aria-pressed={draft.focus.includes(c.value)}
                  onClick={() => toggle(c.value)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {draft.start > draft.end && <p className="error-text">La fecha de fin tiene que ser después del inicio.</p>}
        <div className="row modal-actions">
          <button className="primary" onClick={save} disabled={!valid}>
            {phase ? 'Guardar' : 'Crear etapa'}
          </button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
