import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { elementsAtProgress, playbackDuration, playbackProgress } from '../domain/animation';
import type { Frame, Player } from '../domain/types';
import { Board } from '../components/Board';

const WIDTH = 1280;
const BOARD_HEIGHT = 800; // la cancha mide 24 × 15
const BAND = 96;
const FPS = 30;
const noop = () => {};

/** Formatos en orden de preferencia: MP4 se comparte mejor (WhatsApp); si no, WebM. */
const MIME_TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];

export function videoSupport(): { mimeType: string; extension: string } | null {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  const mimeType = MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType) return null;
  return { mimeType, extension: mimeType.startsWith('video/mp4') ? 'mp4' : 'webm' };
}

function loadImage(svg: string): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo dibujar la pizarra'));
    };
    img.src = url;
  });
}

const nextPaint = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/**
 * Graba la jugada animada (con una pausa en cada paso y su descripción abajo)
 * y descarga el video. `onProgress` recibe de 0 a 1.
 */
export async function exportPlayVideo({
  title,
  frames,
  players,
  fileName,
  onProgress,
}: {
  title: string;
  frames: Frame[];
  players: Player[];
  fileName: string;
  onProgress?: (fraction: number) => void;
}): Promise<void> {
  const support = videoSupport();
  if (!support) throw new Error('Este navegador no puede grabar video. Probá con Chrome, Edge o Firefox.');

  // Pizarra fuera de la pantalla que se va actualizando cuadro a cuadro.
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-20000px;top:0;width:${WIDTH}px;pointer-events:none;`;
  document.body.appendChild(host);
  const root = createRoot(host);
  const frameElements = frames.map((f) => f.elements);

  const svgAt = (progress: number) => {
    flushSync(() =>
      root.render(
        <Board
          elements={elementsAtProgress(frameElements, progress)}
          players={players}
          selectedId={null}
          tool="select"
          readOnly
          showZones
          onSelect={noop}
          onUpdate={noop}
          onAddArrow={noop}
        />,
      ),
    );
    const svg = host.querySelector('svg')!.cloneNode(true) as SVGSVGElement;
    svg.querySelectorAll('.ui-only').forEach((el) => el.remove());
    svg.setAttribute('width', String(WIDTH));
    svg.setAttribute('height', String(BOARD_HEIGHT));
    return new XMLSerializer().serializeToString(svg);
  };

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = BOARD_HEIGHT + BAND;
  const ctx = canvas.getContext('2d')!;

  const drawBand = (index: number) => {
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, BOARD_HEIGHT, WIDTH, BAND);
    ctx.fillStyle = '#DFB97D';
    ctx.fillRect(0, BOARD_HEIGHT, WIDTH, 5);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#DFB97D';
    ctx.font = "700 30px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    const step = `PASO ${index + 1}/${frames.length}`;
    ctx.fillText(step, 32, BOARD_HEIGHT + BAND / 2 + 2);
    const stepWidth = ctx.measureText(step).width;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = "700 32px Barlow, system-ui, sans-serif";
    const note = frames[index].note || title;
    ctx.fillText(note, 32 + stepWidth + 24, BOARD_HEIGHT + BAND / 2 + 2, WIDTH - stepWidth - 90);
  };

  const stream = canvas.captureStream(FPS);
  const recorder = new MediaRecorder(stream, { mimeType: support.mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  try {
    // Primer cuadro dibujado antes de empezar a grabar.
    ctx.drawImage(await loadImage(svgAt(0)), 0, 0, WIDTH, BOARD_HEIGHT);
    drawBand(0);
    const total = playbackDuration(frames.length);
    recorder.start(250);
    const start = performance.now();
    for (;;) {
      const elapsed = performance.now() - start;
      if (elapsed >= total) break;
      const progress = playbackProgress(elapsed, frames.length);
      const img = await loadImage(svgAt(progress));
      ctx.drawImage(img, 0, 0, WIDTH, BOARD_HEIGHT);
      drawBand(Math.round(progress));
      onProgress?.(Math.min(1, elapsed / total));
      await nextPaint();
    }
    recorder.stop();
    await stopped;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
    root.unmount();
    host.remove();
  }

  const blob = new Blob(chunks, { type: support.mimeType.split(';')[0] });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.${support.extension}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  onProgress?.(1);
}
