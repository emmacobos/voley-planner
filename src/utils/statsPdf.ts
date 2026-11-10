import { outcome } from '../domain/matches';
import { formatDate } from '../domain/sessions';
import { highlights, percent, playerStats, replay, rotationStats, setFinished, setsResult, skillSummary } from '../domain/stats';
import type { Match, Player } from '../domain/types';
import { slugify } from './exportPng';

/** Colores de la app (tinta, dorado, vino) para el PDF. */
const INK: [number, number, number] = [26, 24, 20];
const GOLD: [number, number, number] = [223, 185, 125];
const WINE: [number, number, number] = [122, 20, 36];
const MUTED: [number, number, number] = [110, 104, 96];
const LINE: [number, number, number] = [226, 220, 208];
const GREEN: [number, number, number] = [47, 107, 63];
const CARD: [number, number, number] = [250, 248, 243];
const WARN: [number, number, number] = [250, 240, 240];

const show = (n: number | null | undefined, suffix = '') => (n === null || n === undefined ? '-' : `${n}${suffix}`);

/**
 * Descarga las estadísticas del partido en PDF: resultado, lo más destacado,
 * la planilla por jugadora, por rotación y por set. La librería del PDF se
 * carga recién al tocar el botón.
 */
export async function downloadStatsPdf(match: Match, players: Player[]): Promise<void> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const stats = match.stats ?? { events: [] };
  const bestOf = match.bestOf ?? 5;
  const state = replay(stats);
  const find = (id: string | null) => players.find((p) => p.id === id);
  const rows = playerStats(stats).sort((a, b) => (find(a.playerId)?.number ?? 999) - (find(b.playerId)?.number ?? 999));
  const rotations = rotationStats(state);
  const h = highlights(rows, rotations);

  // Encabezado
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 34, 'F');
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('VOLEY PLANNER  ·  ESTADÍSTICAS DEL PARTIDO', M, 11);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(`vs ${match.opponent || 'rival sin nombre'}`, M, 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const meta = [formatDate(match.date), match.time && `${match.time} h`, match.home ? 'Local' : 'Visitante', match.venue, match.competition, `A ${bestOf} sets`]
    .filter(Boolean)
    .join('  ·  ');
  doc.setTextColor(...GOLD);
  doc.text(doc.splitTextToSize(meta, W - 2 * M)[0], M, 29);

  // Resultado y sets
  const result = match.result || setsResult(state.sets, bestOf);
  const won = outcome(result);
  let y = 46;
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Resultado ${result}`, M, y);
  if (won) {
    const label = won === 'ganado' ? 'GANADO' : 'PERDIDO';
    const x = M + doc.getTextWidth(`Resultado ${result}`) + 5;
    doc.setFontSize(9);
    doc.setFillColor(...(won === 'ganado' ? GREEN : WINE));
    doc.roundedRect(x, y - 5, doc.getTextWidth(label) + 6, 7, 1.5, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(label, x + 3, y);
  }
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const sets = state.sets.map((s) => `Set ${s.number}: ${s.us}-${s.them}${setFinished(s, bestOf) ? '' : ' (sin terminar)'}`).join('     ');
  if (sets) doc.text(sets, M, y + 7);

  // Lo más destacado
  y += 15;
  const name = (id: string | undefined) => (id ? (find(id)?.name ?? '-') : '-');
  const cards: [string, string, string][] = [
    ['Side-out', show(percent(h.sideOut.won, h.sideOut.of), ' %'), `${h.sideOut.won} de ${h.sideOut.of} recibiendo`],
    ['Break', show(percent(h.breaks.won, h.breaks.of), ' %'), `${h.breaks.won} de ${h.breaks.of} sacando`],
    ['Más puntos', name(h.topScorer?.playerId), h.topScorer ? `${h.topScorer.points} puntos` : 'Sin puntos anotados'],
    ['Mejor recepción', name(h.bestReceiver?.playerId), h.bestReceiver ? `${show(h.bestReceiver.positive, ' %')} positiva` : 'Pocas recepciones'],
    [
      'Rotación a trabajar',
      h.weakest ? `R${h.weakest.rotation}` : '-',
      h.weakest ? `Side-out ${show(percent(h.weakest.sideOut, h.weakest.receiving), ' %')}` : 'Faltan datos',
    ],
  ];
  const gap = 4;
  const cw = (W - 2 * M - gap * (cards.length - 1)) / cards.length;
  cards.forEach(([title, value, sub], i) => {
    const x = M + i * (cw + gap);
    const warn = i === cards.length - 1 && h.weakest;
    doc.setDrawColor(...(warn ? WINE : LINE));
    doc.setFillColor(...(warn ? WARN : CARD));
    doc.roundedRect(x, y, cw, 22, 2, 2, 'FD');
    doc.setTextColor(...MUTED);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), x + 4, y + 6);
    doc.setTextColor(...(warn ? WINE : INK));
    doc.setFontSize(value.length > 16 ? 10 : 14);
    doc.text(doc.splitTextToSize(value, cw - 8)[0], x + 4, y + 14);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(sub, x + 4, y + 19);
  });
  y += 30;

  const tableStyle = {
    theme: 'grid' as const,
    styles: { fontSize: 8.5, cellPadding: 1.6, halign: 'center' as const, lineColor: LINE, textColor: INK },
    headStyles: { fillColor: INK, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const },
    alternateRowStyles: { fillColor: CARD },
    margin: { left: M, right: M },
  };
  const heading = (text: string, at: number, x = M) => {
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(text, x, at);
  };

  // Por jugadora
  heading('Por jugadora', y);
  autoTable(doc, {
    ...tableStyle,
    startY: y + 3,
    head: [
      [
        { content: 'Jugadora', rowSpan: 2 },
        { content: 'Pts', rowSpan: 2 },
        { content: 'Err', rowSpan: 2 },
        { content: 'Saque', colSpan: 3 },
        { content: 'Recepción', colSpan: 4 },
        { content: 'Ataque', colSpan: 4 },
        { content: 'Bloqueo', colSpan: 2 },
        { content: 'Defensa', colSpan: 1 },
      ],
      ['Tot', 'Ace', 'Err', 'Tot', '#', 'Pos', 'Err', 'Tot', 'Pts', 'Err', 'Ef', 'Pts', 'Toq', 'Lev'],
    ],
    body: rows.map((r) => {
      const p = find(r.playerId);
      const sv = skillSummary('saque', r.skills.saque) as { total: number; main: number; errors: number };
      const rc = skillSummary('recepcion', r.skills.recepcion) as { total: number; perfect: number | null; positive: number | null; errors: number };
      const at = skillSummary('ataque', r.skills.ataque) as { total: number; main: number; errors: number; efficiency: number | null };
      const bl = skillSummary('bloqueo', r.skills.bloqueo) as { main: number; touches: number };
      const df = skillSummary('defensa', r.skills.defensa) as { main: number };
      return [
        p ? `#${p.number} ${p.name}` : 'Sin jugadora',
        r.points,
        r.errors,
        sv.total || '-',
        sv.total ? sv.main : '-',
        sv.total ? sv.errors : '-',
        rc.total || '-',
        show(rc.perfect, '%'),
        show(rc.positive, '%'),
        rc.total ? rc.errors : '-',
        at.total || '-',
        at.total ? at.main : '-',
        at.total ? at.errors : '-',
        show(at.efficiency, '%'),
        bl.main || '-',
        bl.touches || '-',
        df.main || '-',
      ];
    }),
    columnStyles: { 0: { halign: 'left', cellWidth: 52 }, 1: { fontStyle: 'bold' } },
  });

  // Por rotación y por set, uno al lado del otro
  y = lastY() + 10;
  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    y = 20;
  }
  const half = (W - 2 * M - 8) / 2;
  heading('Por rotación', y);
  autoTable(doc, {
    ...tableStyle,
    startY: y + 3,
    margin: { left: M, right: W - M - half },
    head: [['Rotación', 'Ganados', 'Perdidos', 'Side-out', 'Break']],
    body: rotations.map((r) => [
      `R${r.rotation}${h.weakest?.rotation === r.rotation ? ' (a trabajar)' : ''}`,
      r.won,
      r.lost,
      `${show(percent(r.sideOut, r.receiving), ' %')} (${r.sideOut}/${r.receiving})`,
      `${show(percent(r.breaks, r.serving), ' %')} (${r.breaks}/${r.serving})`,
    ]),
  });
  const afterRotations = lastY();

  heading('Por set', y, M + half + 8);
  autoTable(doc, {
    ...tableStyle,
    startY: y + 3,
    margin: { left: M + half + 8, right: M },
    head: [['Set', 'Marcador', 'Side-out', 'Break', 'Más puntos']],
    body: state.sets.map((s) => {
      const setRows = playerStats(stats, s.number);
      const hs = highlights(setRows, rotationStats(state, s.number));
      return [
        s.number,
        `${s.us}-${s.them}`,
        show(percent(hs.sideOut.won, hs.sideOut.of), ' %'),
        show(percent(hs.breaks.won, hs.breaks.of), ' %'),
        hs.topScorer ? `${find(hs.topScorer.playerId)?.name ?? '-'} (${hs.topScorer.points})` : '-',
      ];
    }),
  });
  y = Math.max(afterRotations, lastY()) + 8;

  // Glosario corto
  const notes = [
    'Side-out: puntos ganados cuando saca el rival. Break: puntos ganados con nuestro saque.',
    'Recepción: # perfectas, Pos positivas (perfectas + buenas). Ataque Ef: (puntos - errores - bloqueados) / ataques.',
  ];
  if (y > doc.internal.pageSize.getHeight() - 20) {
    doc.addPage();
    y = 20;
  }
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  notes.forEach((n, i) => doc.text(n, M, y + i * 4.5));

  // Pie de página
  const pages = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Hecho con Voley Planner', M, H - 7);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 7, { align: 'right' });
  }

  doc.save(`estadisticas-${slugify(match.opponent || 'partido')}-${match.date}.pdf`);
}
