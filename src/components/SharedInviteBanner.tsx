import { useState } from 'react';
import { ROLE_LABEL, useSharing } from '../cloud/state';
import { openWorkspace } from '../cloud/client';

const DISMISSED_KEY = 'voley-planner-shares-seen';

function seen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/**
 * Avisa cuando alguien del cuerpo técnico te compartió sus datos, con un botón
 * para verlos (si no, quedan escondidos en el menú de la cuenta).
 */
export function SharedInviteBanner() {
  const sharedWithMe = useSharing((s) => s.sharedWithMe);
  const workspace = useSharing((s) => s.workspace);
  const [dismissed, setDismissed] = useState(seen);
  const pending = workspace ? [] : sharedWithMe.filter((w) => !dismissed.includes(w.ownerUid));
  if (pending.length === 0) return null;

  const dismiss = (ownerUid: string) => {
    const next = [...dismissed, ownerUid];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    } catch {
      // Sin almacenamiento: vuelve a aparecer al recargar.
    }
  };

  return (
    <>
      {pending.map((w) => (
        <div key={w.ownerUid} className="workspace-banner no-print" role="status">
          <p>
            <b>{w.ownerName}</b> te compartió sus planteles, ejercicios y sesiones ({ROLE_LABEL[w.role].toLowerCase()}).
            Para verlos, entrá a sus datos; después volvés a los tuyos con un clic.
          </p>
          <div className="restore-actions">
            <button
              className="primary"
              onClick={() => {
                dismiss(w.ownerUid);
                openWorkspace(w);
              }}
            >
              Ver sus datos
            </button>
            <button onClick={() => dismiss(w.ownerUid)}>Ahora no</button>
          </div>
        </div>
      ))}
    </>
  );
}
