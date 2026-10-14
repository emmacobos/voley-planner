import { ROLE_LABEL, useSharing, useSyncStatus } from '../cloud/state';
import { openWorkspace } from '../cloud/client';
import { hasData, useAppStore } from '../store';

/** Aviso mientras se ven los datos que compartió otra persona del cuerpo técnico. */
export function WorkspaceBanner() {
  const workspace = useSharing((s) => s.workspace);
  const syncState = useSyncStatus((s) => s.state);
  const empty = useAppStore((s) => !hasData(s));
  if (!workspace) return null;
  const loaded = syncState === 'saved' || syncState === 'readonly';
  return (
    <div className={`workspace-banner no-print${workspace.role === 'ver' ? ' read-only' : ''}`} role="status">
      <p>
        Estás viendo los datos de <b>{workspace.ownerName}</b> · {ROLE_LABEL[workspace.role]}
        {workspace.role === 'ver' && ': los cambios no se guardan.'}
        {loaded && empty && (
          <>
            <br />
            Su cuenta todavía no tiene nada guardado en la nube. Si cargó el plantel o los ejercicios sin haber entrado
            a su cuenta, tiene que entrar y elegir "Sumarlos a mi cuenta".
          </>
        )}
      </p>
      <button onClick={() => openWorkspace(null)}>Volver a mis datos</button>
    </div>
  );
}
