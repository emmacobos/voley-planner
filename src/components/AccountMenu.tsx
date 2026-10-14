import { useEffect, useRef, useState } from 'react';
import { logOut, useAuth } from '../cloud/auth';
import { useSyncStatus } from '../cloud/sync';
import type { SyncState } from '../cloud/sync';
import { hasData, useAppStore } from '../store';
import { AuthDialog } from './AuthDialog';
import { ROLE_LABEL, openWorkspace, useSharing } from '../cloud/sharing';

const SYNC_LABEL: Record<SyncState, string> = {
  off: '',
  loading: 'Cargando…',
  saving: 'Guardando…',
  saved: 'Guardado en la nube',
  offline: 'Sin conexión: se guarda al volver',
  error: 'Error al guardar',
  readonly: 'Solo lectura',
};

/** Cuenta, arriba a la derecha: entrar, estado de sincronización y salir. */
export function AccountMenu() {
  const { ready, user } = useAuth();
  const sync = useSyncStatus();
  const localHasData = useAppStore((s) => s.ownerUid === null && hasData(s));
  const [dialog, setDialog] = useState(false);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const sharedWithMe = useSharing((s) => s.sharedWithMe);
  const workspace = useSharing((s) => s.workspace);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!ready) return <div className="account" />;

  if (!user) {
    return (
      <div className="account">
        {localHasData && <span className="account-hint">Tus datos están solo en este navegador</span>}
        <button className="account-login" onClick={() => setDialog(true)}>
          Entrar
        </button>
        {dialog && <AuthDialog onClose={() => setDialog(false)} />}
      </div>
    );
  }

  const label = user.name ?? user.email ?? 'Mi cuenta';
  const leave = async () => {
    if (!navigator.onLine) {
      alert('Para salir sin perder cambios necesitás conexión a internet.');
      return;
    }
    if (!confirm('¿Salir de tu cuenta? Tus datos quedan guardados en la nube y se borran de este navegador.')) return;
    setLeaving(true);
    await logOut();
  };

  return (
    <div className="account" ref={menuRef}>
      <button className="account-card" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={label}>
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="avatar" />
        ) : (
          <span className="avatar">{label.charAt(0).toUpperCase()}</span>
        )}
        <span className="account-text">
          <span className="account-label">{user.name ?? 'Mi cuenta'}</span>
          <span className={`sync-status sync-${sync.state}`} title={sync.error ?? undefined}>
            <span className="sync-dot" aria-hidden="true" />
            {SYNC_LABEL[sync.state]}
          </span>
        </span>
      </button>
      {open && (
        <div className="account-dropdown">
          <p className="account-name">{user.name ?? 'Mi cuenta'}</p>
          {user.email && <p className="muted small">{user.email}</p>}
          {sharedWithMe.length > 0 && (
            <div className="workspace-switch" role="group" aria-label="Datos que ves">
              <p className="muted small">Datos que ves (te compartieron sus datos)</p>
              <button className={!workspace ? 'active' : ''} onClick={() => openWorkspace(null)} aria-pressed={!workspace}>
                Mis datos
              </button>
              {sharedWithMe.map((w) => (
                <button
                  key={w.ownerUid}
                  className={workspace?.ownerUid === w.ownerUid ? 'active' : ''}
                  aria-pressed={workspace?.ownerUid === w.ownerUid}
                  onClick={() => {
                    openWorkspace(w);
                    setOpen(false);
                  }}
                >
                  {w.ownerName} <span className="muted small">· {ROLE_LABEL[w.role]}</span>
                </button>
              ))}
            </div>
          )}
          <a className="account-link" href="#/datos" onClick={() => setOpen(false)}>
            Compartir con el cuerpo técnico
          </a>
          {sync.state === 'error' && (
            <p className="form-error small">No se pudieron guardar algunos cambios. Recargá la página para reintentar.</p>
          )}
          <button className="full" onClick={leave} disabled={leaving}>
            {leaving ? 'Saliendo…' : 'Salir'}
          </button>
        </div>
      )}
    </div>
  );
}
