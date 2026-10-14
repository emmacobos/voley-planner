import { blockDuration, formatMinutes } from '../domain/sessions';
import { navigate } from '../hooks/useHashRoute';
import { useAppStore } from '../store';

/** Plantillas guardadas: usar, renombrar o eliminar. */
export function TemplateList() {
  const templates = useAppStore((s) => s.templates);
  const fromTemplate = useAppStore((s) => s.createSessionFromTemplate);
  const renameTemplate = useAppStore((s) => s.renameTemplate);
  const removeTemplate = useAppStore((s) => s.removeTemplate);
  if (templates.length === 0) return null;

  return (
    <>
      <h3 className="list-title">Plantillas de sesión</h3>
      <div className="template-list">
        {templates.map((t) => {
          const minutes = t.blocks.reduce((sum, b) => sum + blockDuration(b), 0);
          return (
            <article key={t.id} className="template-card">
              <input
                className="template-name"
                value={t.name}
                onChange={(e) => renameTemplate(t.id, e.target.value)}
                aria-label="Nombre de la plantilla"
              />
              <p className="muted small">
                {t.blocks.length} bloques · {formatMinutes(minutes)}
                {t.objective && ` · ${t.objective}`}
              </p>
              <div className="card-actions">
                <button
                  className="primary"
                  onClick={() => {
                    const id = fromTemplate(t.id);
                    if (id) navigate(`/sesiones/${id}`);
                  }}
                >
                  Usar
                </button>
                <button
                  className="danger"
                  onClick={() => {
                    if (confirm(`¿Eliminar la plantilla "${t.name}"? Las sesiones creadas con ella no se tocan.`)) removeTemplate(t.id);
                  }}
                >
                  Eliminar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
