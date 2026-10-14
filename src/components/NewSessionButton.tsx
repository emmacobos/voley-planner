import { useEffect, useRef, useState } from 'react';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';

/**
 * "+ Nueva sesión" y, si hay plantillas, un menú para crearla desde una
 * plantilla. `date` fija la fecha (por ejemplo desde el calendario).
 */
export function NewSessionButton({ date, squadId }: { date?: string; squadId?: string | null }) {
  const templates = useAppStore((s) => s.templates);
  const createSession = useAppStore((s) => s.createSession);
  const updateSession = useAppStore((s) => s.updateSession);
  const fromTemplate = useAppStore((s) => s.createSessionFromTemplate);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const blank = () => {
    const id = createSession();
    if (date || squadId) updateSession(id, { ...(date ? { date } : {}), ...(squadId ? { squadId } : {}) });
    navigate(`/sesiones/${id}`);
  };

  return (
    <div className="new-session" ref={ref}>
      <button className="primary" onClick={blank}>
        + Nueva sesión
      </button>
      {templates.length > 0 && (
        <>
          <button className="new-session-more" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
            Desde plantilla ▾
          </button>
          {open && (
            <div className="new-session-menu" role="menu">
              {templates.map((t) => (
                <button
                  key={t.id}
                  role="menuitem"
                  onClick={() => {
                    const id = fromTemplate(t.id, date);
                    if (id) navigate(`/sesiones/${id}`);
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
