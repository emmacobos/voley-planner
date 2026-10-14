import { RPE_SCALE, sessionAttendanceSummary } from '../domain/load';
import { sessionDuration } from '../domain/sessions';
import type { AttendanceRecord, Player, TrainingSession } from '../domain/types';

/**
 * Asistencia y esfuerzo percibido (RPE) de cada convocada. Se completa al
 * terminar el entrenamiento; con eso se calcula la carga (RPE × minutos).
 */
export function AttendancePanel({
  session,
  called,
  onChange,
}: {
  session: TrainingSession;
  called: Player[];
  onChange: (attendance: Record<string, AttendanceRecord>) => void;
}) {
  const attendance = session.attendance ?? {};
  const set = (playerId: string, record: AttendanceRecord | undefined) => {
    const next = { ...attendance };
    if (record) next[playerId] = record;
    else delete next[playerId];
    onChange(next);
  };
  const summary = sessionAttendanceSummary(session);
  const minutes = sessionDuration(session);

  return (
    <section className="panel attendance">
      <div className="attendance-head">
        <h2>Asistencia y esfuerzo</h2>
        {called.length > 0 && (
          <button
            className="link"
            onClick={() =>
              onChange(Object.fromEntries(called.map((p) => [p.id, { ...attendance[p.id], present: true }])))
            }
          >
            Marcar a todas presentes
          </button>
        )}
      </div>
      <p className="hint">
        Completalo al terminar el entrenamiento. El esfuerzo es la respuesta de cada jugadora a "¿qué tan duro fue?" (de
        1 a 10); la carga es esfuerzo × minutos ({minutes} min).
      </p>
      {called.length === 0 ? (
        <p className="muted">Convocá jugadores para tomar asistencia.</p>
      ) : (
        <>
          <ul className="attendance-list">
            {called.map((p) => {
              const record = attendance[p.id];
              return (
                <li key={p.id} className={record ? (record.present ? 'is-present' : 'is-absent') : ''}>
                  <span className="attendance-name">
                    <b>{p.number}</b> {p.name}
                  </span>
                  <div className="segmented attendance-toggle" role="group" aria-label={`Asistencia de ${p.name}`}>
                    <button
                      className={record?.present ? 'active' : ''}
                      aria-pressed={record?.present === true}
                      onClick={() => set(p.id, record?.present ? undefined : { ...record, present: true })}
                    >
                      Vino
                    </button>
                    <button
                      className={record && !record.present ? 'active absent' : ''}
                      aria-pressed={record?.present === false}
                      onClick={() => set(p.id, record && !record.present ? undefined : { present: false })}
                    >
                      Faltó
                    </button>
                  </div>
                  <select
                    aria-label={`Esfuerzo de ${p.name}`}
                    value={record?.rpe ?? ''}
                    disabled={!record?.present}
                    onChange={(e) => set(p.id, { present: true, rpe: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">Esfuerzo…</option>
                    {RPE_SCALE.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.value} · {r.label}
                      </option>
                    ))}
                  </select>
                  <span className="attendance-load" title="Carga de la sesión (UA)">
                    {record?.present && record.rpe ? `${record.rpe * minutes} UA` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="attendance-summary">
            Presentes <b>{summary.present}</b> de {summary.called}
            {summary.avgRpe !== null && (
              <>
                {' '}
                · Esfuerzo promedio <b>{summary.avgRpe.toFixed(1)}</b> · Carga promedio <b>{summary.avgLoad} UA</b>
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}
