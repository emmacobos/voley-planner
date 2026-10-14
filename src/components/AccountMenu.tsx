import { useEffect, useRef, useState } from 'react';
import { logOut, useAuth } from '../cloud/auth';
import { useSyncStatus } from '../cloud/sync';
import type { SyncState } from '../cloud/sync';
import { hasData, useAppStore } from '../store';
import { AuthDialog } from './AuthDialog';

const SYNC_LABEL: Record<SyncState, string> = {
  off: '',
  loading: 'Cargando…',
  saving: 'Guardando…',
  saved: '✓ Guardado',
  offline: 'Sin conexión: se guarda al volver',
  error: '⚠ Error al guardar',
};

/** Botón de cuenta en la barra superior: entrar, estado de sincronización y salir. */
export function AccountMenu() {
  const { ready, user } = useAuth();
  const sync = useSyncStatus();
  const localHasData = useAppStore((s) => s.ownerUid === null && hasData(s));
  const [dialog, setDialog] = useState(false);
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!ready) return null;

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
      <span className={`sync-status sync-${sync.state}`} title={sync.error ?? undefined}>
        {SYNC_LABEL[sync.state]}
      </span>
      <button className="account-button" onClick={() => setOpen((o) => !o)} aria-expanded={open} title={label}>
        {user.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="avatar">{label.charAt(0).toUpperCase()}</span>
        )}
      </button>
      {open && (
        <div className="account-dropdown">
          <p className="account-name">{user.name ?? 'Mi cuenta'}</p>
          {user.email && <p className="muted small">{user.email}</p>}
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
