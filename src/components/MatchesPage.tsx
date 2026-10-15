import { useState } from 'react';
import { outcome } from '../domain/matches';
import { formatDate, todayISO } from '../domain/sessions';
import type { Match } from '../domain/types';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { MatchDialog } from './MatchDialog';

const byDate = (a: Match, b: Match) => (a.date + a.time).localeCompare(b.date + b.time);

/** Todos los partidos: el próximo bien a mano y accesos directos al plan y a las estadísticas. */
export function MatchesPage() {
  const allMatches = useAppStore((s) => s.matches);
  const squads = useAppStore((s) => s.squads);
  const createMatch = useAppStore((s) => s.createMatch);
  const updateMatch = useAppStore((s) => s.updateMatch);
  const removeMatch = useAppStore((s) => s.removeMatch);
  const [squadId, setSquadId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [today] = useState(() => todayISO(new Date()));

  const matches = allMatches.filter((m) => !squadId || m.squadId === squadId);
  const upcoming = matches.filter((m) => m.date >= today).sort(byDate);
  const played = matches.filter((m) => m.date < today).sort((a, b) => byDate(b, a));
  const next = upcoming[0];
  const won = played.filter((m) => outcome(m.result) === 'ganado').length;
  const lost = played.filter((m) => outcome(m.result) === 'perdido').length;
  const open = allMatches.find((m) => m.id === openId);
  const squadName = (id: string | null) => squads.find((s) => s.id === id)?.name;

  const close = () => {
    // Un partido nuevo sin rival se descarta al cerrar.
    if (open && !open.opponent.trim() && !open.notes.trim()) removeMatch(open.id);
    setOpenId(null);
  };

  return (
    <div className="page matches-page">
      <div className="page-header">
        <div>
          <h1>Partidos</h1>
          <p className="muted">
            {played.length > 0 ? `${won} ${won === 1 ? 'ganado' : 'ganados'} · ${lost} ${lost === 1 ? 'perdido' : 'perdidos'} · ` : ''}
            {upcoming.length} por jugar
          </p>
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
          <button className="primary" onClick={() => setOpenId(createMatch(today, squadId ?? squads[0]?.id ?? null))}>
            + Nuevo partido
          </button>
        </div>
      </div>

      {next ? (
        <section className="next-match">
          <span className="next-match-kicker">{next.date === today ? 'Hoy se juega' : 'Próximo partido'}</span>
          <h2>vs {next.opponent || 'rival sin nombre'}</h2>
          <p>
            {formatDate(next.date)}
            {next.time && ` · ${next.time} h`} · {next.home ? 'Local' : 'Visitante'}
            {next.venue && ` · ${next.venue}`}
            {next.competition && ` · ${next.competition}`}
          </p>
          <div className="row">
            <button className="primary" onClick={() => navigate(`/partidos/${next.id}/estadisticas`)}>
              📊 {next.stats?.events.length ? 'Seguir anotando estadísticas' : 'Anotar estadísticas en vivo'}
            </button>
            <button onClick={() => navigate(`/partidos/${next.id}`)}>Plan del partido</button>
            <button onClick={() => setOpenId(next.id)}>Editar datos</button>
          </div>
        </section>
      ) : (
        <section className="panel">
          <p style={{ margin: 0 }}>
            No hay partidos por jugar. Cargá el próximo con <b>+ Nuevo partido</b> (también se puede desde el calendario).
          </p>
        </section>
      )}

      {upcoming.length > 1 && (
        <section className="panel">
          <h2>Por jugar</h2>
          <MatchList matches={upcoming.slice(1)} squadName={squads.length > 1 ? squadName : undefined} onEdit={setOpenId} />
        </section>
      )}

      {played.length > 0 && (
        <section className="panel">
          <h2>Jugados</h2>
          <MatchList matches={played} squadName={squads.length > 1 ? squadName : undefined} onEdit={setOpenId} />
        </section>
      )}

      {open && (
        <MatchDialog
          match={open}
          squads={squads}
          onChange={(patch) => updateMatch(open.id, patch)}
          onRemove={() => {
            removeMatch(open.id);
            setOpenId(null);
          }}
          onClose={close}
        >
          <button
            className="plan-link"
            onClick={() => {
              setOpenId(null);
              navigate(`/partidos/${open.id}`);
            }}
          >
            Abrir el plan de partido (scouting del rival y pizarra) →
          </button>
        </MatchDialog>
      )}
    </div>
  );
}

function MatchList({
  matches,
  squadName,
  onEdit,
}: {
  matches: Match[];
  squadName?: (id: string | null) => string | undefined;
  onEdit: (id: string) => void;
}) {
  return (
    <ul className="match-list">
      {matches.map((m) => {
        const result = outcome(m.result);
        const hasStats = !!m.stats?.events.length;
        return (
          <li key={m.id}>
            <button className="match-main" onClick={() => onEdit(m.id)} title="Editar datos del partido">
              <b>vs {m.opponent || 'rival sin nombre'}</b>
              <span className="muted">
                {formatDate(m.date)} · {m.home ? 'Local' : 'Visitante'}
                {m.competition && ` · ${m.competition}`}
                {squadName?.(m.squadId) && ` · ${squadName(m.squadId)}`}
              </span>
            </button>
            {m.result && <span className={`result-badge ${result ?? ''}`}>{m.result}</span>}
            <div className="match-actions">
              <button onClick={() => navigate(`/partidos/${m.id}`)}>Plan</button>
              <button className={hasStats ? 'primary' : ''} onClick={() => navigate(`/partidos/${m.id}/estadisticas`)}>
                📊 {hasStats ? 'Estadísticas' : 'Anotar'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
