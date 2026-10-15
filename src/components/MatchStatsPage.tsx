import { useEffect, useState } from 'react';
import { formatDate } from '../domain/sessions';
import { newId } from '../domain/ids';
import {
  SKILLS,
  percent,
  playerStats,
  replay,
  resultInfo,
  rotationStats,
  setFinished,
  setsResult,
  skillInfo,
  skillSummary,
} from '../domain/stats';
import type { Side } from '../domain/stats';
import type { MatchStats, Player, StatEvent, StatSkill } from '../domain/types';
import { positionShort } from '../domain/types';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';
import { hasSeenTutorial } from '../utils/tutorials';
import { StatsTutorial } from './StatsTutorial';

const ROTATIONS = [1, 6, 5, 4, 3, 2];
const firstName = (p: Player) => p.name.split(' ')[0] || `#${p.number}`;

/** Estadísticas de un partido: anotar en vivo y ver el resumen. */
export function MatchStatsPage({ id }: { id: string }) {
  const match = useAppStore((s) => s.matches.find((m) => m.id === id));
  const allPlayers = useAppStore((s) => s.players);
  const updateMatch = useAppStore((s) => s.updateMatch);
  const [tab, setTab] = useState<'anotar' | 'resumen'>('anotar');
  const [tutorial, setTutorial] = useState(() => !hasSeenTutorial('estadisticas'));

  if (!match) {
    return (
      <div className="empty">
        <p>No se encontró el partido.</p>
        <button onClick={() => navigate('/partidos')}>Volver a partidos</button>
      </div>
    );
  }

  const stats: MatchStats = match.stats ?? { events: [] };
  const setEvents = (events: StatEvent[]) => updateMatch(match.id, { stats: { events } });
  const squadPlayers = allPlayers.filter((p) => p.squadId === match.squadId);
  const players = (squadPlayers.length ? squadPlayers : allPlayers).slice().sort((a, b) => a.number - b.number);

  return (
    <div className="page match-stats">
      <div className="exercise-header">
        <button className="link" onClick={() => navigate(`/partidos/${match.id}`)}>
          ← Plan del partido
        </button>
        <h1 className="match-title">Estadísticas vs {match.opponent || 'rival sin nombre'}</h1>
        <button onClick={() => setTutorial(true)}>¿Cómo se usa?</button>
      </div>
      <p className="match-meta">
        {formatDate(match.date)} · {match.home ? 'Local' : 'Visitante'}
        {match.competition && ` · ${match.competition}`}
      </p>

      <div className="segmented stats-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'anotar'} className={tab === 'anotar' ? 'active' : ''} onClick={() => setTab('anotar')}>
          Anotar en vivo
        </button>
        <button role="tab" aria-selected={tab === 'resumen'} className={tab === 'resumen' ? 'active' : ''} onClick={() => setTab('resumen')}>
          Resumen
        </button>
      </div>

      {tab === 'anotar' ? (
        <LiveEntry
          stats={stats}
          players={players}
          onChange={setEvents}
          result={match.result}
          onSaveResult={(result) => updateMatch(match.id, { result })}
        />
      ) : (
        <Summary stats={stats} players={players} allPlayers={allPlayers} />
      )}

      {tutorial && <StatsTutorial onClose={() => setTutorial(false)} />}
    </div>
  );
}

function LiveEntry({
  stats,
  players,
  onChange,
  result,
  onSaveResult,
}: {
  stats: MatchStats;
  players: Player[];
  onChange: (events: StatEvent[]) => void;
  result: string;
  onSaveResult: (result: string) => void;
}) {
  const state = replay(stats);
  const events = stats.events;
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [skill, setSkill] = useState<StatSkill | null>(null);
  const [starting, setStarting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  const add = (event: StatEvent, message: string) => {
    onChange([...events, event]);
    setPlayerId(null);
    setSkill(null);
    setFlash(message);
  };
  const undo = () => {
    if (!events.length) return;
    onChange(events.slice(0, -1));
    setFlash('Se deshizo la última anotación');
  };

  const current = state.current;
  const finished = current ? setFinished(current) : false;
  const playerName = (pid: string | null) => {
    const p = players.find((x) => x.id === pid);
    return p ? `#${p.number} ${firstName(p)}` : 'Equipo';
  };

  if (!current || starting) {
    return (
      <StartSet
        number={state.sets.length + 1}
        rotation={state.rotation}
        serving={current ? (state.serving === 'nosotros' ? 'rival' : 'nosotros') : 'nosotros'}
        onCancel={current ? () => setStarting(false) : undefined}
        onStart={(rotation, serving) => {
          onChange([...events, { id: newId(), type: 'set', rotation, serving }]);
          setStarting(false);
        }}
      />
    );
  }

  const options = skill ? skillInfo(skill).results : [];
  const won = state.sets.filter((s) => setFinished(s) && s.us > s.them).length;
  const lost = state.sets.filter((s) => setFinished(s) && s.them > s.us).length;
  const matchOver = won === 3 || lost === 3;

  return (
    <div className="stats-live">
      <section className="scoreboard" aria-live="polite">
        <div className="score-side">
          <span className="score-label">Nosotros {state.serving === 'nosotros' && <i className="serve-dot" title="Saca" />}</span>
          <span className="score-num">{current.us}</span>
        </div>
        <div className="score-center">
          <span className="score-set">Set {current.number}</span>
          <span className="score-sets" title="Sets ganados y perdidos">
            Sets {won} – {lost}
          </span>
          <label className="rotation-chip" title="Rotación: en qué zona está el armador. Cambiala si no coincide con la cancha.">
            R
            <select
              value={state.rotation}
              onChange={(e) => onChange([...events, { id: newId(), type: 'rotacion', rotation: Number(e.target.value) }])}
              aria-label="Rotación actual"
            >
              {ROTATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="score-side them">
          <span className="score-label">{state.serving === 'rival' && <i className="serve-dot" title="Saca" />} Rival</span>
          <span className="score-num">{current.them}</span>
        </div>
      </section>
      {state.sets.length > 1 && (
        <p className="sets-line">
          {state.sets.slice(0, -1).map((s) => (
            <span key={s.number} className={s.us > s.them ? 'won' : 'lost'}>
              {s.us}-{s.them}
            </span>
          ))}
        </p>
      )}

      {finished && (
        <div className="set-over">
          <b>
            {matchOver ? 'Terminó el partido' : `Terminó el set ${current.number}`} ({current.us}-{current.them})
          </b>
          <div className="row">
            {matchOver ? (
              setsResult(state.sets) !== result && (
                <button className="primary" onClick={() => onSaveResult(setsResult(state.sets))}>
                  Guardar resultado {setsResult(state.sets)}
                </button>
              )
            ) : (
              <button className="primary" onClick={() => setStarting(true)}>
                Empezar el set {current.number + 1}
              </button>
            )}
          </div>
        </div>
      )}

      <section className="entry-step">
        <h3>
          <span className="step-num">1</span> ¿Quién?
        </h3>
        <div className="player-pad">
          {players.map((p) => (
            <button
              key={p.id}
              className={playerId === p.id ? 'active' : ''}
              aria-pressed={playerId === p.id}
              onClick={() => setPlayerId(playerId === p.id ? null : p.id)}
            >
              <b>{p.number}</b>
              <span>{firstName(p)}</span>
              <small>{positionShort(p.position)}</small>
            </button>
          ))}
          {!players.length && <p className="muted">Cargá el plantel del partido para anotar por jugadora.</p>}
        </div>
      </section>

      <section className="entry-step">
        <h3>
          <span className="step-num">2</span> ¿Qué hizo?
        </h3>
        <div className="skill-pad">
          {SKILLS.map((s) => (
            <button
              key={s.id}
              className={skill === s.id ? 'active' : ''}
              aria-pressed={skill === s.id}
              onClick={() => setSkill(skill === s.id ? null : s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className={`entry-step${skill ? '' : ' waiting'}`}>
        <h3>
          <span className="step-num">3</span> ¿Cómo salió?
        </h3>
        {skill ? (
          <div className="result-pad">
            {options.map((r) => (
              <button
                key={r.id}
                className={`tone-${r.tone}`}
                title={r.hint}
                onClick={() =>
                  add(
                    { id: newId(), type: 'accion', playerId, skill, result: r.id },
                    `${playerName(playerId)} · ${skillInfo(skill).label} · ${r.label}`,
                  )
                }
              >
                <b>{r.label}</b>
                <small>{r.hint}</small>
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">Elegí primero el fundamento.</p>
        )}
      </section>

      <div className="quick-points">
        <button className="tone-punto" onClick={() => add({ id: newId(), type: 'rival', result: 'error' }, 'Error del rival: punto nuestro')}>
          + Error del rival
        </button>
        <button className="tone-error" onClick={() => add({ id: newId(), type: 'rival', result: 'punto' }, 'Punto del rival')}>
          Punto del rival
        </button>
        <button onClick={undo} disabled={!events.length}>
          ↶ Deshacer
        </button>
      </div>

      {flash && <div className="stats-flash">✓ {flash}</div>}

      <RecentEvents stats={stats} playerName={playerName} />
    </div>
  );
}

function StartSet({
  number,
  rotation: initialRotation,
  serving: initialServing,
  onStart,
  onCancel,
}: {
  number: number;
  rotation: number;
  serving: Side;
  onStart: (rotation: number, serving: Side) => void;
  onCancel?: () => void;
}) {
  const [rotation, setRotation] = useState(initialRotation);
  const [serving, setServing] = useState<Side>(initialServing);
  return (
    <section className="panel start-set">
      <h2>Empezar el set {number}</h2>
      <div className="field">
        ¿En qué rotación arrancamos? (zona del armador)
        <div className="rotation-pad">
          {ROTATIONS.map((r) => (
            <button key={r} className={rotation === r ? 'active' : ''} aria-pressed={rotation === r} onClick={() => setRotation(r)}>
              R{r}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        ¿Quién saca primero?
        <div className="segmented">
          {(['nosotros', 'rival'] as Side[]).map((s) => (
            <button key={s} className={serving === s ? 'active' : ''} aria-pressed={serving === s} onClick={() => setServing(s)}>
              {s === 'nosotros' ? 'Nosotros' : 'El rival'}
            </button>
          ))}
        </div>
      </div>
      <div className="row">
        <button className="primary" onClick={() => onStart(rotation, serving)}>
          Empezar
        </button>
        {onCancel && <button onClick={onCancel}>Cancelar</button>}
      </div>
    </section>
  );
}

function RecentEvents({ stats, playerName }: { stats: MatchStats; playerName: (id: string | null) => string }) {
  // Marcador después de cada evento, para mostrarlo al lado.
  const rows: { id: string; text: string; score: string; tone: string }[] = [];
  let us = 0;
  let them = 0;
  let set = 0;
  for (const e of stats.events) {
    if (e.type === 'set') {
      set++;
      us = 0;
      them = 0;
      rows.push({ id: e.id, text: `Empieza el set ${set} en R${e.rotation}`, score: '', tone: 'neutro' });
      continue;
    }
    if (e.type === 'rotacion') {
      rows.push({ id: e.id, text: `Rotación corregida a R${e.rotation}`, score: `${us}-${them}`, tone: 'neutro' });
      continue;
    }
    let text: string;
    let tone: string;
    if (e.type === 'rival') {
      text = e.result === 'error' ? 'Error del rival' : 'Punto del rival';
      tone = e.result === 'error' ? 'punto' : 'error';
      if (e.result === 'error') us++;
      else them++;
    } else {
      const r = resultInfo(e.skill, e.result);
      text = `${playerName(e.playerId)} · ${skillInfo(e.skill).label} · ${r?.label ?? e.result}`;
      tone = r?.tone ?? 'neutro';
      if (r?.point === 'nosotros') us++;
      if (r?.point === 'rival') them++;
    }
    rows.push({ id: e.id, text, score: `${us}-${them}`, tone });
  }
  if (!rows.length) return null;
  return (
    <section className="recent-events">
      <h3>Últimas anotaciones</h3>
      <ol reversed>
        {rows
          .slice(-8)
          .reverse()
          .map((r) => (
            <li key={r.id} className={`tone-${r.tone}`}>
              <span>{r.text}</span>
              <b>{r.score}</b>
            </li>
          ))}
      </ol>
    </section>
  );
}

const show = (n: number | null | undefined, suffix = '') => (n === null || n === undefined ? '—' : `${n}${suffix}`);

function Summary({ stats, players, allPlayers }: { stats: MatchStats; players: Player[]; allPlayers: Player[] }) {
  const state = replay(stats);
  const [set, setSet] = useState(0);
  const rows = playerStats(stats, set || undefined);
  const rotations = rotationStats(state, set || undefined);
  const find = (pid: string | null) => allPlayers.find((p) => p.id === pid);
  const ordered = rows.slice().sort((a, b) => (find(a.playerId)?.number ?? 999) - (find(b.playerId)?.number ?? 999));

  if (!stats.events.some((e) => e.type === 'accion' || e.type === 'rival')) {
    return (
      <div className="empty">
        <p>Todavía no hay nada anotado. Empezá desde "Anotar en vivo".</p>
      </div>
    );
  }

  const totalRec = rotations.reduce((a, r) => a + r.receiving, 0);
  const totalSO = rotations.reduce((a, r) => a + r.sideOut, 0);
  const totalSrv = rotations.reduce((a, r) => a + r.serving, 0);
  const totalBrk = rotations.reduce((a, r) => a + r.breaks, 0);
  const played = rotations.filter((r) => r.receiving >= 2);
  const weakest = played.length ? played.reduce((a, b) => (b.sideOut / b.receiving < a.sideOut / a.receiving ? b : a)) : null;
  const bestReceiver = ordered
    .map((r) => ({ r, s: skillSummary('recepcion', r.skills.recepcion) }))
    .filter((x) => x.s.total >= 3 && x.r.playerId)
    .sort((a, b) => (b.s as { positive: number }).positive - (a.s as { positive: number }).positive)[0];
  const topScorer = ordered.filter((r) => r.playerId).sort((a, b) => b.points - a.points)[0];

  return (
    <div className="stats-summary">
      <div className="segmented set-filter" role="group" aria-label="Set">
        <button className={set === 0 ? 'active' : ''} onClick={() => setSet(0)}>
          Todo el partido
        </button>
        {state.sets.map((s) => (
          <button key={s.number} className={set === s.number ? 'active' : ''} onClick={() => setSet(s.number)}>
            Set {s.number} <small>({s.us}-{s.them})</small>
          </button>
        ))}
      </div>

      <div className="stats-cards">
        <article>
          <span>Side-out</span>
          <b>{show(percent(totalSO, totalRec), ' %')}</b>
          <small>
            Puntos ganados recibiendo: {totalSO} de {totalRec}
          </small>
        </article>
        <article>
          <span>Break</span>
          <b>{show(percent(totalBrk, totalSrv), ' %')}</b>
          <small>
            Puntos ganados sacando: {totalBrk} de {totalSrv}
          </small>
        </article>
        {topScorer && topScorer.points > 0 && (
          <article>
            <span>Más puntos</span>
            <b>{find(topScorer.playerId)?.name ?? '—'}</b>
            <small>{topScorer.points} puntos (ataque, saque y bloqueo)</small>
          </article>
        )}
        {bestReceiver && (
          <article>
            <span>Mejor recepción</span>
            <b>{find(bestReceiver.r.playerId)?.name}</b>
            <small>{show((bestReceiver.s as { positive: number | null }).positive, ' %')} positiva</small>
          </article>
        )}
        {weakest && (
          <article className="warn">
            <span>Rotación a trabajar</span>
            <b>R{weakest.rotation}</b>
            <small>
              Side-out {show(percent(weakest.sideOut, weakest.receiving), ' %')} ({weakest.sideOut} de {weakest.receiving})
            </small>
          </article>
        )}
      </div>

      <section className="panel">
        <h2>Por jugadora</h2>
        <div className="table-scroll">
          <table className="stats-table">
            <thead>
              <tr>
                <th rowSpan={2}>Jugadora</th>
                <th rowSpan={2} title="Puntos ganados (ace, ataque y bloqueo)">Pts</th>
                <th rowSpan={2} title="Errores que dieron punto al rival">Err</th>
                <th colSpan={3}>Saque</th>
                <th colSpan={4}>Recepción</th>
                <th colSpan={4}>Ataque</th>
                <th colSpan={2}>Bloqueo</th>
                <th>Def.</th>
              </tr>
              <tr>
                <th title="Total">Tot</th>
                <th title="Aces">Ace</th>
                <th title="Errores">Err</th>
                <th title="Total">Tot</th>
                <th title="Perfectas (#)">#</th>
                <th title="Positivas: perfectas + buenas">Pos</th>
                <th title="Errores (aces del rival)">Err</th>
                <th title="Total">Tot</th>
                <th title="Puntos">Pts</th>
                <th title="Errores y bloqueados">Err</th>
                <th title="Eficacia: (puntos − errores) / total">Ef</th>
                <th title="Puntos">Pts</th>
                <th title="Toques que amortiguan">Toq</th>
                <th title="Defensas levantadas">Lev</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((r) => {
                const p = find(r.playerId);
                const sv = skillSummary('saque', r.skills.saque) as { total: number; main: number; errors: number };
                const rc = skillSummary('recepcion', r.skills.recepcion) as { total: number; perfect: number | null; positive: number | null; errors: number };
                const at = skillSummary('ataque', r.skills.ataque) as { total: number; main: number; errors: number; efficiency: number | null };
                const bl = skillSummary('bloqueo', r.skills.bloqueo) as { main: number; touches: number };
                const df = skillSummary('defensa', r.skills.defensa) as { main: number };
                return (
                  <tr key={r.playerId ?? 'equipo'}>
                    <th scope="row">{p ? `#${p.number} ${p.name}` : 'Sin jugadora'}</th>
                    <td className="strong">{r.points}</td>
                    <td>{r.errors}</td>
                    <td>{sv.total || '—'}</td>
                    <td>{sv.total ? sv.main : '—'}</td>
                    <td>{sv.total ? sv.errors : '—'}</td>
                    <td>{rc.total || '—'}</td>
                    <td>{show(rc.perfect, '%')}</td>
                    <td>{show(rc.positive, '%')}</td>
                    <td>{rc.total ? rc.errors : '—'}</td>
                    <td>{at.total || '—'}</td>
                    <td>{at.total ? at.main : '—'}</td>
                    <td>{at.total ? at.errors : '—'}</td>
                    <td>{show(at.efficiency, '%')}</td>
                    <td>{bl.main || '—'}</td>
                    <td>{bl.touches || '—'}</td>
                    <td>{df.main || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {players.length > 0 && <p className="hint">Tocá el título de cada columna para ver qué significa.</p>}
      </section>

      <section className="panel">
        <h2>Por rotación</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          R1 es con el armador en la zona 1, R6 con el armador en la zona 6, y así. Side-out: cuántas veces ganamos el
          punto cuando sacaba el rival. Break: cuántas veces ganamos el punto con nuestro saque.
        </p>
        <div className="rotation-bars">
          {rotations.map((r) => {
            const so = percent(r.sideOut, r.receiving);
            const br = percent(r.breaks, r.serving);
            return (
              <div key={r.rotation} className={`rotation-row${weakest?.rotation === r.rotation ? ' weakest' : ''}`}>
                <b>R{r.rotation}</b>
                <span className="rot-score">
                  +{r.won} / −{r.lost}
                </span>
                <div className="rot-bar" title={`Side-out ${show(so, ' %')}`}>
                  <span>Side-out</span>
                  <i style={{ width: `${so ?? 0}%` }} />
                  <em>{show(so, ' %')}</em>
                </div>
                <div className="rot-bar break" title={`Break ${show(br, ' %')}`}>
                  <span>Break</span>
                  <i style={{ width: `${br ?? 0}%` }} />
                  <em>{show(br, ' %')}</em>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Glossary />
    </div>
  );
}

function Glossary() {
  return (
    <details className="panel glossary">
      <summary>¿Qué significa cada número?</summary>
      <dl>
        <dt>Side-out</dt>
        <dd>
          Porcentaje de puntos que ganamos cuando saca el rival. Mide qué tan bien recibimos y atacamos de primera. Un
          buen equipo anda por encima del 55-60 %.
        </dd>
        <dt>Break</dt>
        <dd>Porcentaje de puntos que ganamos con nuestro saque (saque, bloqueo, defensa y contraataque).</dd>
        <dt>Recepción positiva</dt>
        <dd>Recepciones perfectas (#) más buenas (+), sobre el total. Perfecta: al armador con todas las opciones.</dd>
        <dt>Eficacia de ataque</dt>
        <dd>(Puntos − errores − bloqueados) / ataques. Por encima del 25-30 % es un buen ataque.</dd>
        <dt>Rotación a trabajar</dt>
        <dd>La rotación con menor side-out (con al menos 2 puntos recibiendo): ahí conviene enfocar el próximo entrenamiento.</dd>
      </dl>
    </details>
  );
}
