import { useState } from 'react';
import { emptyPlan, hasContent, matchesAgainst, outcome, previousPlan } from '../domain/matches';
import { formatDate } from '../domain/sessions';
import { GAME_SYSTEMS } from '../domain/formations';
import type { Frame, GameSystem, MatchPlan } from '../domain/types';
import { newId } from '../domain/ids';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { BoardEditor } from './BoardEditor';
import { MatchDialog } from './MatchDialog';

const blankFrame = (): Frame => ({ id: newId(), note: '', situation: 'juego', elements: [] });

/** Plan de partido: scouting del rival, nuestro plan y una pizarra. */
export function MatchPlanPage({ id }: { id: string }) {
  const match = useAppStore((s) => s.matches.find((m) => m.id === id));
  const matches = useAppStore((s) => s.matches);
  const squads = useAppStore((s) => s.squads);
  const allPlayers = useAppStore((s) => s.players);
  const updateMatch = useAppStore((s) => s.updateMatch);
  const removeMatch = useAppStore((s) => s.removeMatch);
  const [editing, setEditing] = useState(false);
  // Paso inicial de la pizarra mientras el plan todavía no tiene ninguno.
  const [firstFrame] = useState(blankFrame);

  if (!match) {
    return (
      <div className="empty">
        <p>No se encontró el partido.</p>
        <button onClick={() => navigate('/partidos')}>Volver a partidos</button>
      </div>
    );
  }

  const plan = match.plan ?? emptyPlan();
  const setPlan = (patch: Partial<MatchPlan>) => updateMatch(match.id, { plan: { ...plan, ...patch } });
  const squadPlayers = allPlayers.filter((p) => p.squadId === match.squadId).sort((a, b) => a.number - b.number);
  const history = matchesAgainst(matches, match);
  const previous = !hasContent(plan) ? previousPlan(matches, match) : undefined;
  const frames = plan.frames.length ? plan.frames : [firstFrame];

  const text = (field: 'keyPlayers' | 'strengths' | 'weaknesses' | 'serve' | 'defense' | 'keys', label: string, placeholder: string) => (
    <label className="field">
      {label}
      <textarea rows={3} value={plan[field]} placeholder={placeholder} onChange={(e) => setPlan({ [field]: e.target.value })} />
    </label>
  );

  return (
    <div className="page match-plan">
      <div className="exercise-header">
        <button className="link" onClick={() => navigate('/partidos')}>
          ← Partidos
        </button>
        <h1 className="match-title">vs {match.opponent || 'rival sin nombre'}</h1>
        <div className="row">
          <button className="primary" onClick={() => navigate(`/partidos/${match.id}/estadisticas`)}>
            {match.stats?.events.length ? 'Estadísticas' : 'Anotar estadísticas'}
          </button>
          <button onClick={() => setEditing(true)}>Editar datos del partido</button>
        </div>
      </div>
      <p className="match-meta">
        {formatDate(match.date)}
        {match.time && ` · ${match.time} h`} · {match.home ? 'Local' : 'Visitante'}
        {match.venue && ` · ${match.venue}`}
        {match.competition && ` · ${match.competition}`}
        {match.result && (
          <span className={`result-badge ${outcome(match.result) ?? ''}`}>Resultado {match.result}</span>
        )}
      </p>

      {previous && (
        <div className="reuse-plan">
          <p>
            Tenés un plan del partido del <b>{formatDate(previous.date)}</b> contra este rival.
          </p>
          <button
            className="primary"
            onClick={() =>
              setPlan({
                ...structuredClone(previous.plan!),
                frames: previous.plan!.frames.map((f) => ({ ...structuredClone(f), id: newId() })),
              })
            }
          >
            Copiar ese plan
          </button>
        </div>
      )}

      <div className="plan-grid">
        <section className="panel">
          <h2>Scouting del rival</h2>
          <div className="stack">
            <label className="field">
              Sistema del rival
              <select
                value={plan.rivalSystem ?? ''}
                onChange={(e) => setPlan({ rivalSystem: (e.target.value || undefined) as GameSystem | undefined })}
              >
                <option value="">—</option>
                {GAME_SYSTEMS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </label>
            {text('keyPlayers', 'Jugadoras clave', 'Ej.: #7 punta zurda, ataca la diagonal larga; #3 central rápida.')}
            {text('strengths', 'Fortalezas', 'Saque en suspensión, bloqueo alto por zona 4…')}
            {text('weaknesses', 'Debilidades', 'Recepción en R1, defensa de la finta…')}
          </div>
        </section>
        <section className="panel">
          <h2>Nuestro plan</h2>
          <div className="stack">
            {text('serve', 'Saque', 'A qué zona y a quién sacar en cada rotación.')}
            {text('defense', 'Bloqueo y defensa', 'Qué cerrar con el bloqueo y dónde defender.')}
            {text('keys', 'Claves del partido', '3 consignas para el equipo.')}
          </div>
        </section>
        {history.length > 0 && (
          <section className="panel">
            <h2>Historial contra {match.opponent}</h2>
            <ul className="history-list">
              {history.map((m) => (
                <li key={m.id}>
                  <a href={`#/partidos/${m.id}`}>{formatDate(m.date)}</a>
                  <span className="muted"> · {m.home ? 'Local' : 'Visitante'}</span>
                  {m.result ? (
                    <span className={`result-badge ${outcome(m.result) ?? ''}`}>{m.result}</span>
                  ) : (
                    <span className="muted"> · sin resultado</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <h2 className="plan-board-title">Pizarra del plan</h2>
      <p className="hint">
        Dibujá las rotaciones del rival, a dónde sacar o cómo defender. Con "Presentar" se lo mostrás al equipo en la
        charla previa.
      </p>
      <BoardEditor
        key={match.id}
        frames={frames}
        onChange={(next) => setPlan({ frames: next })}
        allPlayers={allPlayers}
        roster={squadPlayers}
        exercisePlayers={squadPlayers}
        title={`Plan vs ${match.opponent || 'rival'}`}
        system={plan.system}
        onSystemChange={(system) => setPlan({ system })}
      />

      {editing && (
        <MatchDialog
          match={match}
          squads={squads}
          onChange={(patch) => updateMatch(match.id, patch)}
          onRemove={() => {
            removeMatch(match.id);
            navigate('/partidos');
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
