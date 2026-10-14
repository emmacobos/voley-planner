import { useState } from 'react';
import type { FormEvent } from 'react';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../cloud/auth';
import {
  ROLE_LABEL,
  openWorkspace,
  recheckVerification,
  retryInvites,
  sendVerification,
  shareWith,
  stopSharingWith,
  useSharing,
} from '../cloud/sharing';
import type { ShareRole } from '../cloud/sharing';
import { AuthDialog } from './AuthDialog';

/** Compartir los datos con el cuerpo técnico y ver lo que otros compartieron. */
export function TeamSharing() {
  const user = useAuth((s) => s.user);
  const { shares, sharedWithMe, workspace, needsVerification, invitesError } = useSharing();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('editar');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dialog, setDialog] = useState(false);

  if (!user) {
    return (
      <section className="panel team-sharing">
        <h2>Cuerpo técnico</h2>
        <p>
          Compartí tus planteles, ejercicios, sesiones y partidos con tu asistente o preparador físico. Para eso, entrá con
          tu cuenta.
        </p>
        <button className="primary" onClick={() => setDialog(true)}>
          Entrar
        </button>
        {dialog && <AuthDialog onClose={() => setDialog(false)} />}
      </section>
    );
  }

  const run = async (action: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ ok: true, text: ok });
    } catch (err) {
      const text =
        err instanceof FirebaseError && err.code === 'permission-denied'
          ? 'Firebase rechazó el pedido: faltan publicar las reglas nuevas de Firestore (firestore.rules).'
          : err instanceof Error
            ? err.message
            : 'No se pudo guardar.';
      setMessage({ ok: false, text });
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await shareWith(email, role);
      setEmail('');
    }, `Listo. Cuando ${email.trim()} entre con esa cuenta, le va a aparecer un aviso arriba para ver tus datos.`);
  };

  return (
    <section className="panel team-sharing">
      <h2>Cuerpo técnico</h2>
      <p>
        Invitá con su email a tu asistente o preparador físico. Va a ver tus planteles, jugadores, ejercicios, sesiones,
        partidos y plantillas; con "Puede editar" también los puede cambiar.
      </p>
      <form className="share-form" onSubmit={submit}>
        <input
          type="email"
          required
          placeholder="email@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email de la persona a invitar"
        />
        <select value={role} onChange={(e) => setRole(e.target.value as ShareRole)} aria-label="Permiso">
          <option value="editar">{ROLE_LABEL.editar}</option>
          <option value="ver">{ROLE_LABEL.ver}</option>
        </select>
        <button className="primary" type="submit" disabled={busy}>
          Invitar
        </button>
      </form>
      {message && <p className={message.ok ? 'ok' : 'form-error'}>{message.text}</p>}

      {shares.length > 0 && (
        <ul className="share-list">
          {shares.map((s) => (
            <li key={s.email}>
              <span className="share-email">{s.email}</span>
              <select
                value={s.role}
                disabled={busy}
                onChange={(e) => void run(() => shareWith(s.email, e.target.value as ShareRole), 'Permiso actualizado.')}
                aria-label={`Permiso de ${s.email}`}
              >
                <option value="editar">{ROLE_LABEL.editar}</option>
                <option value="ver">{ROLE_LABEL.ver}</option>
              </select>
              <button
                className="danger"
                disabled={busy}
                onClick={() => {
                  if (confirm(`¿Dejar de compartir tus datos con ${s.email}?`)) {
                    void run(() => stopSharingWith(s.email), 'Ya no comparte tus datos.');
                  }
                }}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <h3>Compartido con vos</h3>
      {needsVerification ? (
        <div className="verify-box">
          <p>Para ver datos que te compartieron, primero verificá tu email ({user.email}).</p>
          <div className="restore-actions">
            <button onClick={() => void run(sendVerification, 'Te mandamos un mail: abrí el link y después tocá "Ya lo verifiqué".')}>
              Mandarme el mail de verificación
            </button>
            <button
              onClick={() =>
                void run(async () => {
                  if (!(await recheckVerification())) throw new Error('Todavía no figura verificado. Abrí el link del mail.');
                }, 'Email verificado.')
              }
            >
              Ya lo verifiqué
            </button>
          </div>
        </div>
      ) : invitesError ? (
        <div className="verify-box">
          <p>No se pudieron buscar los datos que te compartieron. Se vuelve a intentar solo; si sigue, recargá la página.</p>
          <button onClick={retryInvites}>Intentar de nuevo</button>
        </div>
      ) : sharedWithMe.length === 0 ? (
        <p className="muted">
          Nadie te compartió sus datos todavía. Para que aparezcan acá, tienen que invitar a <b>{user.email}</b> (el email
          con el que entraste).
        </p>
      ) : (
        <ul className="share-list">
          <li className={!workspace ? 'current' : ''}>
            <span className="share-email">
              <b>Mis datos</b>
            </span>
            {workspace ? <button onClick={() => openWorkspace(null)}>Ver</button> : <span className="muted">Viendo</span>}
          </li>
          {sharedWithMe.map((w) => (
            <li key={w.ownerUid} className={workspace?.ownerUid === w.ownerUid ? 'current' : ''}>
              <span className="share-email">
                <b>{w.ownerName}</b> <span className="muted">· {ROLE_LABEL[w.role]}</span>
              </span>
              {workspace?.ownerUid === w.ownerUid ? (
                <span className="muted">Viendo</span>
              ) : (
                <button className="primary" onClick={() => openWorkspace(w)}>
                  Ver sus datos
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
