import { useEffect, useState } from 'react';
import type { Frame, Player, TeamNames } from '../domain/types';
import { encodePlay, sharedPlayData, sharedPlayUrl } from '../utils/sharePlay';
import type { SharedInfo } from '../utils/sharePlay';

/** Arma el link de solo lectura de una jugada y ofrece copiarlo o mandarlo. */
export function ShareLinkDialog({
  title,
  frames,
  players,
  teamNames,
  half = false,
  info,
  onClose,
}: {
  title: string;
  frames: Frame[];
  players: Player[];
  teamNames?: TeamNames;
  half?: boolean;
  /** Objetivo y descripción del ejercicio, para mostrarlos al costado de la cancha. */
  info?: SharedInfo;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  // Mientras el cuadro está abierto no cambian (se toman al abrirlo).
  const [shared] = useState(info);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    encodePlay(sharedPlayData(title, frames, players, teamNames, half, shared)).then((code) => alive && setUrl(sharedPlayUrl(code)));
    return () => {
      alive = false;
    };
  }, [title, frames, players, teamNames, half, shared]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      prompt('Copiá el link:', url);
    }
  };
  const objective = shared?.objective?.trim();
  const message = url ? `${title || 'Jugada'}${objective ? `\nObjetivo: ${objective}` : ''}\nMiralo animado: ${url}` : '';
  const includes = [objective && 'el objetivo', shared?.description?.trim() && 'la descripción'].filter(Boolean);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal share-link" role="dialog" aria-modal="true" aria-labelledby="share-link-title">
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
        <h2 id="share-link-title">Compartir la jugada</h2>
        <p>
          Cualquiera con el link ve la jugada animada, paso a paso, <b>sin cuenta</b> y sin poder cambiarla. Sirve para
          mandarla al grupo antes del entrenamiento.
        </p>
        {includes.length > 0 && <p className="hint share-includes">✓ Lleva {includes.join(' y ')} del ejercicio, al costado de la cancha.</p>}
        <input className="share-url" readOnly value={url ?? 'Armando el link…'} onFocus={(e) => e.target.select()} aria-label="Link" />
        <div className="row share-actions">
          <button className="primary" onClick={copy} disabled={!url}>
            {copied ? '✓ Copiado' : 'Copiar link'}
          </button>
          <a
            className={`button-link${url ? '' : ' disabled'}`}
            href={url ? `https://wa.me/?text=${encodeURIComponent(message)}` : undefined}
            target="_blank"
            rel="noreferrer"
          >
            Mandar por WhatsApp
          </a>
          {'share' in navigator && (
            <button onClick={() => url && navigator.share({ title: title || 'Jugada', text: title, url }).catch(() => {})} disabled={!url}>
              Compartir…
            </button>
          )}
          <a className={`button-link${url ? '' : ' disabled'}`} href={url ?? undefined} target="_blank" rel="noreferrer">
            Ver cómo queda
          </a>
        </div>
        <p className="hint">El link lleva la jugada como está ahora: si después la cambiás, generá uno nuevo.</p>
      </div>
    </div>
  );
}
