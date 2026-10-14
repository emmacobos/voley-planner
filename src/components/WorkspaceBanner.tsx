import { ROLE_LABEL, openWorkspace, useSharing } from '../cloud/sharing';

/** Aviso mientras se ven los datos que compartió otra persona del cuerpo técnico. */
export function WorkspaceBanner() {
  const workspace = useSharing((s) => s.workspace);
  if (!workspace) return null;
  return (
    <div className={`workspace-banner no-print${workspace.role === 'ver' ? ' read-only' : ''}`} role="status">
      <p>
        Estás viendo los datos de <b>{workspace.ownerName}</b> · {ROLE_LABEL[workspace.role]}
        {workspace.role === 'ver' && ': los cambios no se guardan.'}
      </p>
      <button onClick={() => openWorkspace(null)}>Volver a mis datos</button>
    </div>
  );
}
