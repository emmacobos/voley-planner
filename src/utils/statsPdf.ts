import { outcome } from '../domain/matches';
import { formatDate } from '../domain/sessions';
import { highlights, percent, playerStats, replay, rotationStats, setFinished, setsResult, skillSummary } from '../domain/stats';
import { playerCards, pointSources, previousWithStats, setMoments, suggestExercise, trends, workItems } from '../domain/report';
import type { Exercise, Match, Player } from '../domain/types';
import { positionLabel } from '../domain/types';
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
export async function downloadStatsPdf(
  match: Match,
  players: Player[],
  context: { matches: Match[]; exercises: Exercise[] } = { matches: [], exercises: [] },
): Promise<void> {
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

  // ---------------------------------------------------------------------
  // Informe del partido: análisis y qué trabajar
  doc.addPage();
  const H0 = doc.internal.pageSize.getHeight();
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 18, 'F');
  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`INFORME DEL PARTIDO  ·  vs ${match.opponent || 'rival sin nombre'}`, M, 12);
  y = 28;
  /** Pasa a otra hoja si lo que sigue no entra. */
  const room = (needed: number) => {
    if (y + needed > H0 - 14) {
      doc.addPage();
      y = 20;
    }
  };

  // Conclusiones del cuerpo técnico (lo primero que conviene leer)
  const conclusions = match.conclusions?.trim();
  if (conclusions) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(conclusions, W - 2 * M - 8) as string[];
    heading('Conclusiones del cuerpo técnico', y);
    doc.setDrawColor(...LINE);
    doc.setFillColor(...CARD);
    doc.roundedRect(M, y + 3, W - 2 * M, lines.length * 4.8 + 6, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(lines, M + 4, y + 9);
    y += lines.length * 4.8 + 18;
  }

  // De dónde salieron los puntos
  const src = pointSources(stats);
  heading('De dónde salieron los puntos', y);
  y += 4;
  const bar = (title: string, parts: [string, number, [number, number, number]][]) => {
    const total = parts.reduce((a, p) => a + p[1], 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`${title} (${total})`, M, y + 4);
    y += 6;
    let x = M;
    const width = W - 2 * M;
    for (const [, value, color] of parts) {
      if (!value || !total) continue;
      const w = (value / total) * width;
      doc.setFillColor(...color);
      doc.rect(x, y, w, 7, 'F');
      if (w > 8) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(String(value), x + w / 2, y + 4.8, { align: 'center' });
      }
      x += w;
    }
    y += 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    let lx = M;
    for (const [label, value, color] of parts) {
      if (!value) continue;
      const text = `${label} ${value}`;
      doc.setFillColor(...color);
      doc.rect(lx, y - 2.6, 3, 3, 'F');
      doc.setTextColor(...INK);
      doc.text(text, lx + 4.5, y);
      lx += doc.getTextWidth(text) + 10;
    }
    y += 5;
  };
  bar('Nuestros puntos', [
    ['Ataque', src.ours.ataque, [28, 25, 21]],
    ['Saque', src.ours.saque, [138, 106, 47]],
    ['Bloqueo', src.ours.bloqueo, [85, 97, 58]],
    ['Errores del rival', src.ours.rivalError, [181, 169, 143]],
  ]);
  bar('Puntos del rival', [
    ['Puntos del rival', src.theirs.rival, [122, 20, 36]],
    ['Nos bloquearon', src.theirs.blocked, [160, 82, 95]],
    ['Aces del rival', src.theirs.aces, [196, 106, 118]],
    ['Errores de ataque', src.theirs.attackErrors, [180, 35, 24]],
    ['Errores de saque', src.theirs.serveErrors, [221, 107, 77]],
    ['Errores de bloqueo', src.theirs.blockErrors, [236, 154, 124]],
  ]);
  const share = percent(src.theirs.ownErrors, src.theirs.total);
  if (share !== null) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...(share >= 30 ? ([138, 83, 0] as [number, number, number]) : GREEN));
    doc.text(`${share} % de los puntos del rival fueron errores nuestros de saque, ataque o bloqueo (${src.theirs.ownErrors} de ${src.theirs.total}).`, M, y + 1);
    y += 9;
  }

  // Para trabajar
  const work = workItems(stats, players, bestOf);
  room(30);
  heading('Para trabajar en los entrenamientos', y);
  autoTable(doc, {
    ...tableStyle,
    startY: y + 3,
    styles: { ...tableStyle.styles, halign: 'left', fontSize: 9, cellPadding: 2 },
    head: [['#', 'Qué', 'Por qué', 'Ejercicio sugerido']],
    body: work.length
      ? work.map((w, i) => {
          const s = suggestExercise(w, context.exercises);
          return [i + 1, w.title, w.why, s ? `${s.exercise.name}${s.kind === 'biblioteca' ? ' (biblioteca)' : ''}` : '-'];
        })
      : [['-', 'Nada flojo que se destaque', 'Los números del partido no muestran un punto débil claro.', '-']],
    columnStyles: { 0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' }, 1: { cellWidth: 52, fontStyle: 'bold' }, 3: { cellWidth: 62 } },
  });
  y = lastY() + 10;

  // Momentos del partido
  room(30);
  heading('Momentos del partido', y);
  const run = (r: { length: number; from: string; to: string; rotation: number } | null) =>
    r ? `${r.length} seguidos (de ${r.from} a ${r.to}, R${r.rotation})` : '-';
  autoTable(doc, {
    ...tableStyle,
    startY: y + 3,
    head: [['Set', 'Marcador', 'Mejor racha', 'Peor racha', 'Final del set']],
    body: setMoments(stats, bestOf).map((m) => [
      m.number,
      `${m.us}-${m.them}`,
      run(m.bestRun),
      run(m.worstRun),
      m.closing.played ? `${m.closing.won} de ${m.closing.played} (desde ${m.closing.from})` : '-',
    ]),
  });
  y = lastY() + 10;

  // Ficha de cada jugadora
  room(30);
  heading('Ficha de cada jugadora', y);
  autoTable(doc, {
    ...tableStyle,
    startY: y + 3,
    styles: { ...tableStyle.styles, halign: 'left', fontSize: 8.5, cellPadding: 1.8, valign: 'top' },
    head: [['Jugadora', 'Balance', 'Sus números (el equipo)', 'Lo mejor', 'A trabajar']],
    body: playerCards(stats, players).map((c) => {
      const p = find(c.playerId);
      return [
        `${p ? `#${p.number} ${p.name}` : 'Jugadora'}\n${p ? positionLabel(p.position) : ''}`,
        `${c.balance > 0 ? '+' : ''}${c.balance}\n${c.points} pts · ${c.errors} err`,
        c.metrics.map((m) => `${m.label} ${m.measure}: ${m.value} % (${show(m.team, ' %')})`).join('\n'),
        c.strengths.join('\n') || '-',
        c.weaknesses.join('\n') || '-',
      ];
    }),
    columnStyles: { 0: { cellWidth: 44, fontStyle: 'bold' }, 1: { cellWidth: 24, halign: 'center' }, 2: { cellWidth: 62 } },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      if (data.column.index === 3) data.cell.styles.textColor = GREEN;
      if (data.column.index === 4) data.cell.styles.textColor = WINE;
    },
  });
  y = lastY() + 10;

  // Comparado con los partidos anteriores
  const previous = previousWithStats(context.matches, match);
  room(28);
  heading('Comparado con los partidos anteriores', y);
  if (previous.length) {
    autoTable(doc, {
      ...tableStyle,
      startY: y + 3,
      margin: { left: M, right: W / 2 },
      head: [['Indicador', 'Este partido', `Promedio (${previous.length} anteriores)`, 'Diferencia']],
      body: trends(match, previous).map((t) => {
        const diff = t.value !== null && t.average !== null ? t.value - t.average : null;
        const verdict = diff === null || diff === 0 ? '' : diff > 0 === t.higherIsBetter ? ' mejor' : ' peor';
        return [t.label, show(t.value, t.suffix), show(t.average, t.suffix), diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff}${verdict}`];
      }),
      columnStyles: { 0: { halign: 'left' } },
    });
    y = lastY() + 10;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text('No hay partidos anteriores de este plantel con estadísticas para comparar.', M, y + 7);
    y += 15;
  }

  // Pie de página
  const pages = doc.getNumberOfPages();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Hecho con Voley Planner', M, H - 7);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 7, { align: 'right' });
  }

  doc.save(`estadisticas-${slugify(match.opponent || 'partido')}-${match.date}.pdf`);
}
