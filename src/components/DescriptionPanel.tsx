import { useEffect, useRef } from 'react';

/** Lo que se edita en el panel: el texto y si se muestra al compartir el link. */
export interface DescriptionProps {
  text: string;
  onChange: (text: string) => void;
  shared: boolean;
  onSharedChange: (shared: boolean) => void;
}

/** Títulos rápidos para no arrancar de cero. */
const SNIPPETS: { label: string; text: string }[] = [
  { label: 'Organización', text: 'Organización: ' },
  { label: 'Consignas', text: 'Consignas:\n• ' },
  { label: 'Variantes', text: 'Variantes:\n• ' },
  { label: 'Puntuación', text: 'Puntuación: ' },
];

/** Botón "Descripción" de la barra de la pizarra (con un ✓ si ya tiene texto). */
export function DescriptionButton({ text, open, onToggle }: { text: string; open: boolean; onToggle: () => void }) {
  const has = text.trim().length > 0;
  return (
    <button
      className={`description-toggle${open ? ' open' : ''}`}
      onClick={onToggle}
      aria-expanded={open}
      title={has ? text.trim().slice(0, 140) : 'Escribí la organización, las consignas y las variantes del ejercicio'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5" />
      </svg>
      Descripción
      {has && (
        <span className="description-check" aria-label="tiene descripción">
          ✓
        </span>
      )}
      <span className="description-chevron" aria-hidden="true">
        {open ? '◂' : '▸'}
      </span>
    </button>
  );
}

/** Panel que se despliega al costado de la pizarra para escribir la descripción del ejercicio. */
export function DescriptionPanel({ text, onChange, shared, onSharedChange, onClose }: DescriptionProps & { onClose: () => void }) {
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Al abrirse queda listo para escribir; Esc lo cierra.
  useEffect(() => {
    fieldRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const add = (snippet: string) => {
    const base = text.trimEnd();
    const next = base ? `${base}\n\n${snippet}` : snippet;
    onChange(next);
    fieldRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      const field = fieldRef.current;
      if (!field) return;
      field.setSelectionRange(next.length, next.length);
      field.scrollTop = field.scrollHeight;
    });
  };

  return (
    <aside className="description-panel" aria-label="Descripción del ejercicio">
      <header>
        <h3>Descripción del ejercicio</h3>
        <button className="icon-button" onClick={onClose} aria-label="Cerrar la descripción" title="Cerrar (Esc)">
          ×
        </button>
      </header>
      <div className="description-snippets" role="group" aria-label="Agregar un título">
        {SNIPPETS.map((s) => (
          // Sin sacarle el foco al cuadro de texto: se sigue escribiendo directo.
          <button key={s.label} onMouseDown={(e) => e.preventDefault()} onClick={() => add(s.text)}>
            + {s.label}
          </button>
        ))}
      </div>
      <textarea
        ref={fieldRef}
        value={text}
        rows={12}
        placeholder="Organización, consignas, reglas, variantes, puntuación…"
        onChange={(e) => onChange(e.target.value)}
        aria-label="Descripción"
      />
      <label className="check">
        <input type="checkbox" checked={shared} onChange={(e) => onSharedChange(e.target.checked)} /> Mostrarla al compartir el link
      </label>
      <small className="hint">Se guarda sola. Quien abra el link la ve al lado de la cancha, junto con el objetivo.</small>
    </aside>
  );
}
