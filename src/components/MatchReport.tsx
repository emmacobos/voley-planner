import { useState } from 'react';
import { newId } from '../domain/ids';
import { playerCards, pointSources, previousWithStats, setMoments, suggestExercise, trends, workItems } from '../domain/report';
import type { Suggestion, WorkItem } from '../domain/report';
import { formatDate, todayISO } from '../domain/sessions';
import { percent } from '../domain/stats';
import type { Match, Player } from '../domain/types';
import { positionLabel } from '../domain/types';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';

const show = (n: number | null | undefined, suffix = '') => (n === null || n === undefined ? '—' : `${n}${suffix}`);

/**
 * Informe del partido (debajo del resumen): de dónde salieron los puntos,
 * momentos de cada set, ficha de cada jugadora, qué trabajar, comparación con
 * los partidos anteriores y las conclusiones del cuerpo técnico.
 */
export function MatchReport({ match, players }: { match: Match; players: Player[] }) {
  const matches = useAppStore((s) => s.matches);
  const exercises = useAppStore((s) => s.exercises);
  const updateMatch = useAppStore((s) => s.updateMatch);
  const bestOf = match.bestOf ?? 5;
  const find = (id: string | null) => players.find((p) => p.id === id);

  const sources = pointSources(match.stats);
  const moments = setMoments(match.stats, bestOf);
  const cards = playerCards(match.stats, players);
  const work = workItems(match.stats, players, bestOf);
  const previous = previousWithStats(matches, match);
  const trend = trends(match, previous);
  const ownShare = percent(sources.theirs.ownErrors, sources.theirs.total);

  return (
    <div className="match-report">
      <section className="panel">
        <h2>De dónde salieron los puntos</h2>
        <p className="hint report-sub">
          Cómo ganamos nuestros {sources.ours.total} puntos y cómo sumó el rival los suyos ({sources.theirs.total}).
        </p>
        <h3 className="bar-title">Nuestros puntos</h3>
        <StackBar
          parts={[
            { label: 'Ataque', value: sources.ours.ataque, className: 's-ataque' },
            { label: 'Saque', value: sources.ours.saque, className: 's-saque' },
            { label: 'Bloqueo', value: sources.ours.bloqueo, className: 's-bloqueo' },
            { label: 'Errores del rival', value: sources.ours.rivalError, className: 's-regalo' },
          ]}
        />
        <h3 className="bar-title">Puntos del rival</h3>
        <StackBar
          parts={[
            { label: 'Puntos del rival', value: sources.theirs.rival, className: 't-rival' },
            { label: 'Nos bloquearon', value: sources.theirs.blocked, className: 't-bloqueo' },
            { label: 'Aces del rival', value: sources.theirs.aces, className: 't-ace' },
            { label: 'Errores de ataque', value: sources.theirs.attackErrors, className: 'e-ataque' },
            { label: 'Errores de saque', value: sources.theirs.serveErrors, className: 'e-saque' },
            { label: 'Errores de bloqueo', value: sources.theirs.blockErrors, className: 'e-bloqueo' },
          ]}
        />
        {ownShare !== null && (
          <p className={`report-insight${ownShare >= 30 ? ' warn' : ''}`}>
            {ownShare >= 30 ? '⚠ ' : ''}
            {ownShare} % de los puntos del rival fueron errores nuestros de saque, ataque o bloqueo ({sources.theirs.ownErrors} de{' '}
            {sources.theirs.total}).
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Momentos del partido</h2>
        <p className="hint report-sub">Rachas y finales de set: dónde se ganó y dónde se escapó.</p>
        <div className="moments">
          {moments.map((m) => {
            const lostSet = m.finished && m.them > m.us;
            return (
              <article key={m.number} className={lostSet ? 'lost' : ''}>
                <b>
                  Set {m.number} · {m.us}-{m.them}
                </b>
                <small>
                  Mejor racha:{' '}
                  {m.bestRun ? (
                    <>
                      <span className="good">{m.bestRun.length} seguidos</span> (de {m.bestRun.from} a {m.bestRun.to}, en R{m.bestRun.rotation})
                    </>
                  ) : (
                    '—'
                  )}
                </small>
                <small>
                  Peor racha:{' '}
                  {m.worstRun ? (
                    <>
                      <span className="bad">{m.worstRun.length} seguidos</span> (de {m.worstRun.from} a {m.worstRun.to}, en R{m.worstRun.rotation})
                    </>
                  ) : (
                    '—'
                  )}
                </small>
                <small>
                  Final del set (desde {m.closing.from}):{' '}
                  {m.closing.played ? `${m.closing.won} de ${m.closing.played} puntos` : 'no se llegó'}
                </small>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Ficha de cada jugadora</h2>
        <p className="hint report-sub">
          Balance (puntos − errores), sus números comparados con el promedio del equipo (la rayita), lo que hizo bien y lo
          que tiene que trabajar.
        </p>
        <div className="player-cards">
          {cards.map((c) => {
            const p = find(c.playerId);
            return (
              <article key={c.playerId} className="player-card">
                <header>
                  <span className="pc-num">{p?.number ?? '?'}</span>
                  <div>
                    <b>{p?.name ?? 'Jugadora'}</b>
                    <small>
                      {p ? positionLabel(p.position) : ''} · {c.points} puntos · {c.errors} errores
                    </small>
                  </div>
                  <span className={`pc-balance ${c.balance >= 0 ? 'pos' : 'neg'}`} title="Puntos menos errores">
                    {c.balance > 0 ? '+' : c.balance < 0 ? '−' : ''}
                    {Math.abs(c.balance)}
                  </span>
                </header>
                {c.metrics.map((m) => (
                  <div key={m.skill} className="pc-metric" title={`${m.good} de ${m.total} · el equipo ${show(m.team, ' %')}`}>
                    <span>
                      {m.label} <small>{m.measure}</small>
                    </span>
                    <div className="pc-track">
                      <i style={{ width: `${m.value}%` }} />
                      {m.team !== null && <em style={{ left: `${m.team}%` }} />}
                    </div>
                    <b>{m.value} %</b>
                  </div>
                ))}
                {c.strengths.map((t) => (
                  <p key={t} className="pc-tag ok">
                    ✓ {t}
                  </p>
                ))}
                {c.weaknesses.map((t) => (
                  <p key={t} className="pc-tag bad">
                    ⚠ {t}
                  </p>
                ))}
                {!c.strengths.length && !c.weaknesses.length && <p className="pc-tag">Partido parejo, sin nada que se destaque.</p>}
              </article>
            );
          })}
        </div>
        {!cards.length && <p className="muted">Anotá acciones por jugadora para ver su ficha.</p>}
      </section>

      <section className="panel">
        <h2>Para trabajar en los entrenamientos</h2>
        <p className="hint report-sub">
          Lo arma la app con los números del partido, de lo más urgente a lo menos, con un ejercicio sugerido (tuyo o de la
          biblioteca).
        </p>
        {work.length ? (
          <ol className="work-list">
            {work.map((item, i) => (
              <WorkRow key={item.id} item={item} index={i} match={match} suggestion={suggestExercise(item, exercises)} />
            ))}
          </ol>
        ) : (
          <p className="report-insight">No aparece nada flojo que se destaque en este partido. ¡Buen trabajo!</p>
        )}
      </section>

      <section className="panel">
        <h2>Comparado con los partidos anteriores</h2>
        {previous.length ? (
          <>
            <p className="hint report-sub">
              Este partido contra el promedio de {previous.length === 1 ? 'el partido anterior' : `los ${previous.length} anteriores`} del
              plantel con estadísticas.
            </p>
            <div className="trend-cards">
              {trend.map((t) => {
                const diff = t.value !== null && t.average !== null ? t.value - t.average : null;
                const better = diff !== null && diff !== 0 && diff > 0 === t.higherIsBetter;
                return (
                  <article key={t.id}>
                    <span>{t.label}</span>
                    <b>
                      {show(t.value, t.suffix)}{' '}
                      {diff !== null && diff !== 0 && (
                        <em className={better ? 'good' : 'bad'}>
                          {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
                        </em>
                      )}
                    </b>
                    <small>promedio {show(t.average, t.suffix)}</small>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <p className="hint report-sub">
            Cuando haya otros partidos de este plantel con estadísticas, acá vas a ver si el equipo viene mejorando.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Conclusiones del cuerpo técnico</h2>
        <p className="hint report-sub">Lo que quieras agregar: se guarda con el partido y sale en el PDF.</p>
        <textarea
          className="conclusions"
          rows={4}
          value={match.conclusions ?? ''}
          placeholder="Qué salió bien, qué hay que corregir, a quién felicitar…"
          onChange={(e) => updateMatch(match.id, { conclusions: e.target.value })}
          aria-label="Conclusiones del cuerpo técnico"
        />
      </section>
    </div>
  );
}

function StackBar({ parts }: { parts: { label: string; value: number; className: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  const shown = parts.filter((p) => p.value > 0);
  if (!total) return <p className="muted">Sin puntos anotados.</p>;
  return (
    <>
      <div className="stack-bar" role="img" aria-label={shown.map((p) => `${p.label}: ${p.value}`).join(', ')}>
        {shown.map((p) => (
          <i key={p.label} className={p.className} style={{ flexGrow: p.value }} title={`${p.label}: ${p.value} (${percent(p.value, total)} %)`}>
            {p.value / total >= 0.08 ? p.value : ''}
          </i>
        ))}
      </div>
      <ul className="stack-legend">
        {shown.map((p) => (
          <li key={p.label}>
            <span className={`dot ${p.className}`} /> {p.label} <b>{p.value}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Un punto a trabajar, con el ejercicio sugerido y el botón para sumarlo a la próxima sesión. */
function WorkRow({ item, index, match, suggestion }: { item: WorkItem; index: number; match: Match; suggestion: Suggestion | null }) {
  const [added, setAdded] = useState<{ sessionId: string; text: string } | null>(null);

  const addToNextSession = () => {
    if (!suggestion) return;
    const st = useAppStore.getState();
    const today = todayISO();
    const squadId = match.squadId;
    // La próxima sesión del plantel (o una nueva para mañana).
    let session = st.sessions
      .filter((s) => s.date >= today && (!squadId || s.squadId === squadId))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
    let created = false;
    if (!session) {
      const id = st.createSession();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      st.updateSession(id, { name: `Después del partido vs ${match.opponent || 'el rival'}`, date: todayISO(tomorrow), squadId });
      session = useAppStore.getState().sessions.find((s) => s.id === id)!;
      created = true;
    }
    let exerciseId: string;
    if (suggestion.kind === 'propio') exerciseId = suggestion.exercise.id;
    else {
      exerciseId = st.copyLibraryExercise(suggestion.exercise);
      st.updateExercise(exerciseId, { squadId });
    }
    const exercise = useAppStore.getState().exercises.find((e) => e.id === exerciseId)!;
    const already = session.blocks.some((b) => b.items.some((it) => it.exerciseId === exerciseId));
    if (!already) {
      const kind = item.content === 'juego' ? 'juego' : 'tecnica';
      const target = session.blocks.find((b) => b.kind === kind) ?? session.blocks.find((b) => b.kind !== 'calentamiento') ?? session.blocks[0];
      const blocks = session.blocks.map((b) =>
        b === target ? { ...b, items: [...b.items, { id: newId(), exerciseId, durationMin: exercise.durationMin }] } : b,
      );
      const objective = session.objective.includes(item.title)
        ? session.objective
        : session.objective.trim()
          ? `${session.objective} · ${item.title}`
          : `Trabajar: ${item.title}`;
      st.updateSession(session.id, { blocks, objective });
    }
    const date = formatDate(session.date);
    const when = date.charAt(0).toLowerCase() + date.slice(1);
    setAdded({
      sessionId: session.id,
      text: already ? `Ya estaba en la sesión del ${when}` : created ? `Se creó una sesión para el ${when} con este ejercicio` : `Agregado a la sesión del ${when}`,
    });
  };

  return (
    <li>
      <span className={`work-prio p${Math.min(index, 3)}`}>{index + 1}</span>
      <div>
        <b>{item.title}</b>
        <p className="work-why">{item.why}</p>
        {suggestion && (
          <p className="work-ex">
            Ejercicio sugerido: <b>{suggestion.exercise.name}</b>
            {suggestion.kind === 'biblioteca' && <small> (de la biblioteca)</small>}
          </p>
        )}
        {added && (
          <p className="work-added">
            ✓ {added.text} ·{' '}
            <button className="link-button" onClick={() => navigate(`/sesiones/${added.sessionId}`)}>
              Ver la sesión
            </button>
          </p>
        )}
      </div>
      {suggestion && !added && (
        <button className="primary" onClick={addToNextSession} title="Suma el ejercicio a la próxima sesión del plantel (o crea una)">
          + A la próxima sesión
        </button>
      )}
    </li>
  );
}
