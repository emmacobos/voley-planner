import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { useAuth } from '../cloud/auth';
import { describeBackup, makeBackup, mergeBackup, parseBackup } from '../domain/backup';
import type { Backup, BackupData } from '../domain/backup';
import { todayISO } from '../domain/sessions';
import { DATA_KEYS, useAppStore } from '../store';
import { lastBackupAt, rememberBackup } from '../utils/backupReminder';
import { readSnapshots, removeSnapshot } from '../utils/localSnapshots';
import type { LocalSnapshot } from '../utils/localSnapshots';
import { TeamSharing } from './TeamSharing';
import type { AppData } from '../store';

const currentData = (): BackupData => {
  const s = useAppStore.getState();
  return Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as BackupData;
};

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Copia de seguridad: descargar todo en un archivo y restaurarlo. */
export function DataPage() {
  const user = useAuth((s) => s.user);
  const restoreData = useAppStore((s) => s.restoreData);
  // Se vuelve a leer en cada render para mostrar los números al día.
  const counts = useAppStore((s) => describeBackup(Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as BackupData));
  const [last, setLast] = useState(lastBackupAt);
  const [pending, setPending] = useState<Backup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState(readSnapshots);
  const ownerUid = useAppStore((s) => s.ownerUid);

  const download = () => {
    const backup = makeBackup(currentData());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `voley-planner-copia-${todayISO()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    rememberBackup(backup.exportedAt);
    setLast(backup.exportedAt);
  };

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setError(null);
    setDone(null);
    if (!file) return;
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setPending(null);
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    }
  };

  const recover = (snap: LocalSnapshot) => {
    if (!confirm(`¿Sumar a tus datos lo que tiene la copia del ${formatWhen(snap.at)} (${describeBackup(snap.data)})?`)) return;
    restoreData(mergeBackup(currentData(), snap.data) as unknown as AppData);
    setDone('Listo: la copia automática se sumó a tus datos.');
  };

  const downloadSnapshot = (snap: LocalSnapshot) => {
    const blob = new Blob([JSON.stringify(makeBackup(snap.data, new Date(snap.at)), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `voley-planner-copia-automatica-${snap.at.slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const apply = (mode: 'merge' | 'replace') => {
    if (!pending) return;
    if (mode === 'replace' && !confirm('Se va a borrar todo lo que tenés ahora y quedará solo lo de la copia. ¿Seguir?')) return;
    const data = mode === 'merge' ? mergeBackup(currentData(), pending.data) : pending.data;
    restoreData(data as unknown as AppData);
    setDone(mode === 'merge' ? 'Listo: la copia se sumó a tus datos.' : 'Listo: tus datos quedaron como en la copia.');
    setPending(null);
  };

  return (
    <div className="page data-page">
      <div className="page-header">
        <div>
          <h1>Tus datos</h1>
          <p className="muted">
            Tenés guardado: <b>{counts}</b>.{' '}
            {user
              ? 'Con tu cuenta se guarda solo en la nube.'
              : 'Sin cuenta, todo está solo en este navegador: si se borran los datos del navegador, se pierde.'}
          </p>
        </div>
      </div>

      <div className="data-grid">
        <section className="panel">
          <h2>Descargar una copia</h2>
          <p>
            Baja un archivo con todos tus planteles, jugadores, ejercicios, sesiones, partidos y plantillas. Guardalo en tu
            compu, en un pendrive o en Drive.
          </p>
          <button className="primary" onClick={download}>
            Descargar copia (.json)
          </button>
          <p className="muted small">
            {last ? `Última copia en este navegador: ${formatWhen(last)}.` : 'Todavía no descargaste ninguna copia en este navegador.'}
          </p>
        </section>

        <section className="panel">
          <h2>Restaurar una copia</h2>
          <p>Elegí un archivo de copia para recuperar tus datos o pasarlos a otra compu.</p>
          <label className="file-button">
            Elegir archivo…
            <input type="file" accept="application/json,.json" onChange={pick} />
          </label>
          {error && <p className="form-error">{error}</p>}
          {done && <p className="ok">{done}</p>}
          {pending && (
            <div className="restore-box">
              <p>
                La copia {pending.exportedAt && `del ${formatWhen(pending.exportedAt)} `}tiene: <b>{describeBackup(pending.data)}</b>.
              </p>
              <div className="restore-actions">
                <button className="primary" onClick={() => apply('merge')}>
                  Sumar a lo que tengo
                </button>
                <button className="danger" onClick={() => apply('replace')}>
                  Reemplazar todo
                </button>
                <button onClick={() => setPending(null)}>Cancelar</button>
              </div>
              <p className="muted small">
                "Sumar" agrega lo que no tenés y, si algo está en los dos lados, se queda con lo modificado más recientemente.
              </p>
            </div>
          )}
        </section>

        <TeamSharing />

        {snapshots.length > 0 && (
          <section className="panel">
            <h2>Copias automáticas de este navegador</h2>
            <p>
              Cada vez que abrís la app se guarda acá una copia de lo que había en este navegador (las últimas 5). Si algo
              se borró, podés sumarlo de nuevo a tus datos.
            </p>
            <ul className="share-list">
              {snapshots.map((snap) => (
                <li key={snap.at}>
                  <span className="share-email">
                    <b>{formatWhen(snap.at)}</b>
                    <br />
                    <span className="muted small">
                      {describeBackup(snap.data)}
                      {snap.ownerUid && snap.ownerUid !== ownerUid && ' · de otra cuenta'}
                      {!snap.ownerUid && ' · sin cuenta'}
                    </span>
                  </span>
                  <button className="primary" onClick={() => recover(snap)}>
                    Sumar a mis datos
                  </button>
                  <button onClick={() => downloadSnapshot(snap)}>Descargar</button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (confirm('¿Borrar esta copia automática?')) {
                        removeSnapshot(snap.at);
                        setSnapshots(readSnapshots());
                      }
                    }}
                  >
                    Borrar
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
