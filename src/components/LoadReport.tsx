import { hasAttendance, playerLoadReports } from '../domain/load';
import type { Player, TrainingSession } from '../domain/types';

/** Asistencia de las últimas 4 semanas y carga semanal de cada jugadora del plantel. */
export function LoadReport({ players, sessions }: { players: Player[]; sessions: TrainingSession[] }) {
  const ids = new Set(players.map((p) => p.id));
  const withData = sessions.filter((s) => hasAttendance(s) && s.playerIds.some((id) => ids.has(id)));
  const reports = playerLoadReports(
    [...players].sort((a, b) => a.number - b.number),
    withData,
  );
  const maxLoad = Math.max(1, ...reports.map((r) => Math.max(r.weekLoad, r.prevAvgLoad)));
  const alerts = reports.filter((r) => r.alerts.length).length;

  return (
    <section className="panel load-report">
      <div className="load-report-head">
        <h2>Carga y asistencia</h2>
        {alerts > 0 && (
          <span className="load-alert-count">
            ⚠ {alerts} {alerts === 1 ? 'jugadora con aviso' : 'jugadoras con avisos'}
          </span>
        )}
      </div>
      {withData.length === 0 ? (
        <p className="muted">
          Cuando tomes asistencia y esfuerzo en las sesiones (al final de cada sesión), acá vas a ver la asistencia de cada
          jugadora y su carga semanal, con avisos si la carga se dispara o si falta seguido.
        </p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="roster load-table">
              <thead>
                <tr>
                  <th>Jugadora</th>
                  <th>Asistencia (4 sem.)</th>
                  <th>Carga esta semana</th>
                  <th>Avisos</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.player.id} className={r.alerts.length ? 'has-alert' : ''}>
                    <td>
                      <b>{r.player.number}</b> {r.player.name}
                    </td>
                    <td>
                      {r.attendanceRate === null ? (
                        <span className="muted">—</span>
                      ) : (
                        <>
                          <b>{r.attendanceRate} %</b>{' '}
                          <span className="muted">
                            ({r.attended}/{r.called})
                          </span>
                        </>
                      )}
                    </td>
                    <td>
                      <div className="load-bars" title={`Esta semana ${r.weekLoad} UA · promedio de las 3 anteriores ${r.prevAvgLoad} UA`}>
                        <span className="load-bar" style={{ width: `${(r.weekLoad / maxLoad) * 100}%` }} />
                        <span className="load-avg" style={{ left: `${(r.prevAvgLoad / maxLoad) * 100}%` }} />
                      </div>
                      <span className="load-numbers">
                        <b>{r.weekLoad} UA</b> <span className="muted">· prom. {r.prevAvgLoad}</span>
                      </span>
                    </td>
                    <td className="load-alerts">
                      {r.alerts.length ? r.alerts.map((a) => <div key={a}>⚠ {a}</div>) : <span className="ok">Todo bien</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">
            Carga = esfuerzo (1 a 10) × minutos de la sesión, en unidades arbitrarias (UA). La rayita marca el promedio de
            las 3 semanas anteriores: conviene no superarlo en más de un 30 % de una semana a otra.
          </p>
        </>
      )}
    </section>
  );
}
