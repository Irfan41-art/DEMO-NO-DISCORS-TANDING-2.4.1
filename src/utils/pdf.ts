import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatchState, PastMatch } from '../types';
import { calculateFinalScore, getSavedMatchState } from '../appState';

const isPastMatch = (m: any): m is PastMatch => {
  return m && 'skorAkhirMerah' in m;
};

export function downloadMatchPDF(match: MatchState | PastMatch) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [210, 330], // Indonesian Legal / F4 (21 cm x 33 cm)
  }) as any;

  const eventTitle = match.eventName || "KEJUARAAN PENCAK SILAT";
  const matchTimestamp = isPastMatch(match) ? match.timestamp : Date.now();
  const formattedDate = new Date(matchTimestamp).toLocaleString('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  // Score and winner resolution
  const scoreMerah = isPastMatch(match) ? match.skorAkhirMerah : calculateFinalScore('MERAH', match as MatchState);
  const scoreBiru = isPastMatch(match) ? match.skorAkhirBiru : calculateFinalScore('BIRU', match as MatchState);

  const getWinner = (): 'MERAH' | 'BIRU' | 'SAMA' => {
    if (isPastMatch(match)) {
      if (match.pemenang === 'MERAH' || match.pemenang === 'DISK_MERAH') return 'MERAH';
      if (match.pemenang === 'BIRU' || match.pemenang === 'DISK_BIRU') return 'BIRU';
      return 'SAMA';
    }
    const state = match as MatchState;
    if (state.diskualifikasi === 'MERAH') return 'BIRU';
    if (state.diskualifikasi === 'BIRU') return 'MERAH';
    if (scoreMerah > scoreBiru) return 'MERAH';
    if (scoreBiru > scoreMerah) return 'BIRU';
    return 'SAMA';
  };

  const winner = getWinner();

  // --- PDF HEADER DESIGN ---
  const activeState = getSavedMatchState();
  const logoKiri = match.logoKiri || activeState.logoKiri;
  const logoKanan = match.logoKanan || activeState.logoKanan;

  const drawLogo = (logoData: string | undefined, x: number, y: number, w: number, h: number) => {
    if (!logoData || typeof logoData !== 'string') return;
    try {
      let format = 'PNG';
      if (logoData.includes('image/jpeg') || logoData.includes('image/jpg')) {
        format = 'JPEG';
      } else if (logoData.includes('image/webp')) {
        format = 'WEBP';
      }
      doc.addImage(logoData, format, x, y, w, h);
    } catch (e) {
      console.warn("Could not render logo in PDF", e);
    }
  };

  drawLogo(logoKiri, 15, 10, 16, 16);
  drawLogo(logoKanan, 179, 10, 16, 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(22, 10, 42); // Elegant Deep Dark Purple/Navy
  doc.text("LAPORAN HASIL PERTANDINGAN", 105, 17, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text(eventTitle.toUpperCase(), 105, 22.5, { align: 'center' });

  const tempat = match.tempatPelaksanaan || activeState.tempatPelaksanaan || '';
  const waktu = match.waktuPelaksanaan || activeState.waktuPelaksanaan || '';

  let lineY = 25.5;
  if (tempat || waktu) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    let subStr = "";
    if (tempat && waktu) {
      subStr = `${tempat}  |  ${waktu}`;
    } else {
      subStr = tempat || waktu || "";
    }
    doc.text(subStr.toUpperCase(), 105, 26.5, { align: 'center' });
    lineY = 29;
  } else {
    lineY = 25.5;
  }

  // Draw elegant double boundary line
  doc.setDrawColor(128, 90, 213); // Purple border
  doc.setLineWidth(0.7);
  doc.line(15, lineY, 195, lineY);
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(15, lineY + 1.5, 195, lineY + 1.5);

  // --- MATCH INFORMATION SECTION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);

  // Match meta cards grid
  const metaY = lineY + 5;
  doc.text("PARTAI", 15, metaY);
  doc.text("KELAS", 15, metaY + 5);
  doc.text("GENDER", 15, metaY + 10);
  doc.text("TAHAPAN", 15, metaY + 15);
  doc.text("KATEGORI USIA", 15, metaY + 20);

  doc.text(`:  ${match.partai || '-'}`, 48, metaY);
  doc.text(`:  ${match.kelas || '-'}`, 48, metaY + 5);
  doc.text(`:  ${match.gender || 'PUTRA'}`, 48, metaY + 10);
  doc.text(`:  ${match.tahapPertandingan || 'PENYISIHAN'}`, 48, metaY + 15);
  doc.text(`:  ${match.kategoriUsia || 'REMAJA'}`, 48, metaY + 20);
  
  doc.text(`WAKTU CETAK    :  ${formattedDate}`, 110, metaY);
  
  // Winner calculation and banner
  let pemenangText = "DRAW / SERI";
  let winnerColor = [100, 116, 139]; // Slate gray for draw
  if (winner === 'MERAH') {
    pemenangText = `KEMENANGAN: SUDUT MERAH (${match.atlitMerah.nama})`;
    winnerColor = [185, 28, 28]; // Red
  } else if (winner === 'BIRU') {
    pemenangText = `KEMENANGAN: SUDUT BIRU (${match.atlitBiru.nama})`;
    winnerColor = [29, 78, 216]; // Blue
  }

  // Draw winner status banner
  doc.setFillColor(winnerColor[0], winnerColor[1], winnerColor[2]);
  doc.rect(110, metaY + 5, 85, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(pemenangText.toUpperCase(), 112, metaY + 11);

  // --- SECTION 1: RINGKASAN SKOR ATLET ---
  doc.setTextColor(22, 10, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("I. RINGKASAN HASIL AKHIR PERTANDINGAN", 15, metaY + 27);

  autoTable(doc, {
    startY: metaY + 30,
    theme: 'grid',
    head: [['SUDUT / PARADIGMA', 'NAMA ATLIT / PESILAT', 'KONTINGEN DAERAH', 'SKOR AKHIR']],
    body: [
      [
        { content: 'BIRU', styles: { textColor: [29, 78, 216], fontStyle: 'bold' } },
        match.atlitBiru.nama,
        match.atlitBiru.kontingen,
        { content: String(scoreBiru), styles: { fontStyle: 'bold', halign: 'center' } }
      ],
      [
        { content: 'MERAH', styles: { textColor: [185, 28, 28], fontStyle: 'bold' } },
        match.atlitMerah.nama,
        match.atlitMerah.kontingen,
        { content: String(scoreMerah), styles: { fontStyle: 'bold', halign: 'center' } }
      ]
    ],
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    styles: {
      fontSize: 9.5,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 45 },
      3: { cellWidth: 30 }
    }
  });

  // --- SECTION 2: STATISTIK AKSI DAN PELANGGARAN ---
  const statsStartY = doc.lastAutoTable.finalY + 10;
  doc.setTextColor(22, 10, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("II. STATISTIK AKSI TEKNIS & SANKSI HUKUMAN", 15, statsStartY);

  // Calculate detailed stats safely with fallback
  const getStat = (corner: 'MERAH' | 'BIRU', key: 'PUNCH' | 'KICK' | 'JATUHAN') => {
    if (!match.validatedScores) return 0;
    return match.validatedScores.filter(s => s.sudut === corner && s.jenis === key).length;
  };

  const getJatuhanPoints = (corner: 'MERAH' | 'BIRU') => {
    if (!match.validatedScores) return 0;
    return match.validatedScores
      .filter(s => s.sudut === corner && s.jenis === 'JATUHAN')
      .reduce((sum, s) => sum + s.points, 0);
  };

  const pMerah = getStat('MERAH', 'PUNCH');
  const pBiru = getStat('BIRU', 'PUNCH');
  const kMerah = getStat('MERAH', 'KICK');
  const kBiru = getStat('BIRU', 'KICK');
  
  const jmPoints = getJatuhanPoints('MERAH');
  const jbPoints = getJatuhanPoints('BIRU');

  const getPenaltiesTotal = (corner: 'MERAH' | 'BIRU') => {
    const p = corner === 'MERAH' ? match.penaltiesMerah : match.penaltiesBiru;
    let dewanPts = 0;
    if (p) {
      if (p.teguran1) dewanPts += 1;
      if (p.teguran2) dewanPts += 2;
      if (p.peringatan1) dewanPts += 5;
      if (p.peringatan2) dewanPts += 10;
    }
    const acc = corner === 'MERAH' ? (match.accumulatedPenaltyMerah || 0) : (match.accumulatedPenaltyBiru || 0);
    return dewanPts + acc;
  };

  const hMerah = getPenaltiesTotal('MERAH');
  const hBiru = getPenaltiesTotal('BIRU');

  autoTable(doc, {
    startY: statsStartY + 3,
    theme: 'grid',
    head: [['PARAMETER REKAP AKSI PESILAT', 'SUDUT BIRU (SKOR)', 'SUDUT MERAH (SKOR)']],
    body: [
      ['Jumlah Pukulan Masuk (PUNCH)', `${pBiru} aksi (+${pBiru} Poin)`, `${pMerah} aksi (+${pMerah} Poin)`],
      ['Jumlah Tendangan Masuk (KICK)', `${kBiru} aksi (+${kBiru * 2} Poin)`, `${kMerah} aksi (+${kMerah * 2} Poin)`],
      ['Nilai Teknik Jatuhan (JATUHAN)', `${jbPoints} Poin`, `${jmPoints} Poin`],
      ['Total Poin Sanksi / Hukuman (PENALTY)', `-${hBiru} Poin`, `-${hMerah} Poin`],
      [
        { content: 'SKOR AKHIR PERTANDINGAN', styles: { fontStyle: 'bold' } },
        { content: `${scoreBiru} Poin`, styles: { fontStyle: 'bold', textColor: [29, 78, 216] } },
        { content: `${scoreMerah} Poin`, styles: { fontStyle: 'bold', textColor: [185, 28, 28] } }
      ]
    ],
    headStyles: {
      fillColor: [124, 58, 237], // Purple banner
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    didParseCell: (data: any) => {
      if (data.column.index === 1) {
        if (data.section === 'head') {
          data.cell.styles.fillColor = [29, 78, 216]; // Biru
          data.cell.styles.textColor = [255, 255, 255];
        } else if (data.section === 'body') {
          data.cell.styles.fillColor = [239, 246, 255]; // Light blue shading
        }
      } else if (data.column.index === 2) {
        if (data.section === 'head') {
          data.cell.styles.fillColor = [185, 28, 28]; // Merah
          data.cell.styles.textColor = [255, 255, 255];
        } else if (data.section === 'body') {
          data.cell.styles.fillColor = [254, 242, 242]; // Light red shading
        }
      }
    }
  });

  // --- SECTION 3: REKAP NILAI JURI TIAP BABAK ---
  const juriStartY = doc.lastAutoTable.finalY + 10;
  doc.setTextColor(22, 10, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("III. RENCANA DETAIL PENILAIAN JURI TIAP BABAK", 15, juriStartY);

  const getMaxRounds = (kategoriUsia?: string, babakAktif?: number): number => {
    const norm = (kategoriUsia || '').toUpperCase().trim();
    const isTwoRounds = [
      "PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER 2", "MASTER A", "MASTER B"
    ].includes(norm);
    const normalMax = isTwoRounds ? 2 : 3;
    const currentBabak = babakAktif !== undefined ? babakAktif : (match && 'babakAktif' in match ? (match as any).babakAktif : 1);
    return Math.max(normalMax, currentBabak);
  };

  const formatJuriScoresForPDF = (jId: number, corner: 'MERAH' | 'BIRU', babak: number) => {
    if (!match.rawScores) return "-";
    const juriClicks = match.rawScores
      .filter(s => s.juriId === jId && s.sudut === corner && s.babak === babak)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (juriClicks.length === 0) return "-";

    return juriClicks.map(s => {
      const val = s.jenis === 'PUNCH' ? 1 : 2;
      return s.validated ? `${val}` : `~${val}~`;
    }).join(', ');
  };

  const formatDewanScoresForPDF = (corner: 'MERAH' | 'BIRU', babak: number) => {
    if (!match.validatedScores) return "-";
    const dewanScores = match.validatedScores
      .filter(v => v.sudut === corner && v.babak === babak && v.jenis === 'JATUHAN');
    if (dewanScores.length === 0) return "-";
    return dewanScores.map(v => v.points > 0 ? `+${v.points}` : `${v.points}`).join(', ');
  };

  const getPenaltiesForRoundInPDF = (corner: 'MERAH' | 'BIRU', babak: number) => {
    let p: any = undefined;
    if (isPastMatch(match)) {
      const history = corner === 'MERAH' ? (match as any).historyPenaltiesMerah : (match as any).historyPenaltiesBiru;
      if (history && history[babak]) {
        p = history[babak];
      }
    } else {
      const mState = match as MatchState;
      if (mState.babakAktif === babak) {
        p = corner === 'MERAH' ? mState.penaltiesMerah : mState.penaltiesBiru;
      } else {
        const history = corner === 'MERAH' ? mState.historyPenaltiesMerah : mState.historyPenaltiesBiru;
        if (history && history[babak]) {
          p = history[babak];
        }
      }
    }
    return p;
  };

  const checkPeringatanFirstTimeInPDF = (corner: 'MERAH' | 'BIRU', babak: number, key: 'peringatan1' | 'peringatan2') => {
    const p = getPenaltiesForRoundInPDF(corner, babak);
    if (!p || !p[key]) return false;
    for (let prev = 1; prev < babak; prev++) {
      const prevPen = getPenaltiesForRoundInPDF(corner, prev);
      if (prevPen && prevPen[key]) {
        return false;
      }
    }
    return true;
  };

  const formatTotalPointsForPDF = (corner: 'MERAH' | 'BIRU', babak: number) => {
    if (!match.validatedScores) return "0";
    const totalPoints = match.validatedScores
      .filter(v => v.sudut === corner && v.babak === babak)
      .reduce((acc, curr) => acc + curr.points, 0);

    const p = getPenaltiesForRoundInPDF(corner, babak);

    let roundPenaltyDeduction = 0;
    if (p) {
      if (p.teguran1) roundPenaltyDeduction += 1;
      if (p.teguran2) roundPenaltyDeduction += 2;
      if (checkPeringatanFirstTimeInPDF(corner, babak, 'peringatan1')) roundPenaltyDeduction += 5;
      if (checkPeringatanFirstTimeInPDF(corner, babak, 'peringatan2')) roundPenaltyDeduction += 10;
    }

    return `${totalPoints - roundPenaltyDeduction}`;
  };

  const formatHukumanForPDF = (corner: 'MERAH' | 'BIRU', babak: number) => {
    const p = getPenaltiesForRoundInPDF(corner, babak);

    if (!p) return "-";
    const items: string[] = [];
    if (p.binaan1) items.push('B1');
    if (p.binaan2) items.push('B2');
    if (p.teguran1) items.push('-1');
    if (p.teguran2) items.push('-2');
    if (checkPeringatanFirstTimeInPDF(corner, babak, 'peringatan1')) items.push('-5');
    if (checkPeringatanFirstTimeInPDF(corner, babak, 'peringatan2')) items.push('-10');
    
    return items.length === 0 ? "-" : items.join(', ');
  };

  const maxRounds = getMaxRounds(match.kategoriUsia, match && 'babakAktif' in match ? (match as any).babakAktif : undefined);

  const bodyMerah = Array.from({ length: maxRounds }, (_, i) => i + 1).map((b) => {
    return [
      `Babak ${b}`,
      formatJuriScoresForPDF(1, 'MERAH', b),
      formatJuriScoresForPDF(2, 'MERAH', b),
      formatJuriScoresForPDF(3, 'MERAH', b),
      formatDewanScoresForPDF('MERAH', b),
      formatHukumanForPDF('MERAH', b),
      formatTotalPointsForPDF('MERAH', b)
    ];
  });

  const bodyBiru = Array.from({ length: maxRounds }, (_, i) => i + 1).map((b) => {
    return [
      `Babak ${b}`,
      formatJuriScoresForPDF(1, 'BIRU', b),
      formatJuriScoresForPDF(2, 'BIRU', b),
      formatJuriScoresForPDF(3, 'BIRU', b),
      formatDewanScoresForPDF('BIRU', b),
      formatHukumanForPDF('BIRU', b),
      formatTotalPointsForPDF('BIRU', b)
    ];
  });

  const didParseCellHandler = (data: any) => {
    if (data.column.index >= 1 && data.column.index <= 3 && data.section === 'body') {
      const texts = data.cell.text;
      if (texts && texts.length > 0) {
        let hasTilde = false;
        const allParsedLines: any[][] = [];
        
        for (let i = 0; i < texts.length; i++) {
          const rawText = texts[i];
          if (rawText && rawText.includes('~')) {
            hasTilde = true;
            const parts = rawText.split(', ');
            const parsedParts = parts.map((p: string) => {
              const trimmed = p.trim();
              const isInvalid = trimmed.startsWith('~') && trimmed.endsWith('~');
              const clean = isInvalid ? trimmed.slice(1, -1) : trimmed;
              return { clean, isInvalid };
            });
            allParsedLines.push(parsedParts);
            
            // Replace with clean comma-separated values
            const cleanText = parsedParts.map((p: any) => p.clean).join(', ');
            data.cell.text[i] = cleanText;
          } else {
            const parts = rawText ? rawText.split(', ') : [];
            const parsedParts = parts.map((p: string) => ({ clean: p.trim(), isInvalid: false }));
            allParsedLines.push(parsedParts);
          }
        }
        
        if (hasTilde) {
          data.cell.rawParsedParts = allParsedLines;
        }
      }
    }
  };

  const didDrawCellHandler = (data: any) => {
    if (data.column.index >= 1 && data.column.index <= 3 && data.section === 'body') {
      const allParsedLines = data.cell.rawParsedParts;
      if (allParsedLines && allParsedLines.length > 0) {
        const fontSizeInPt = data.cell.styles.fontSize || 8.5;
        const fontSizeInMm = fontSizeInPt * 0.352778;
        doc.setFontSize(fontSizeInPt);
        
        const fontFamily = data.cell.styles.font || 'helvetica';
        const fontStyle = data.cell.styles.fontStyle || 'normal';
        doc.setFont(fontFamily, fontStyle);
        
        const totalLines = allParsedLines.length;
        const fontHeightInMm = fontSizeInMm;
        const lineHeightMultiplier = data.cell.styles.lineHeight || 1.15;
        const lineHeightInMm = fontHeightInMm * lineHeightMultiplier;
        
        // Under valign: 'middle', the entire text block is perfectly vertically centered
        const textBlockCenterY = data.cell.y + (data.cell.height / 2);
        const firstLineCenterY = textBlockCenterY - ((totalLines - 1) * lineHeightInMm) / 2;
        
        for (let lineIndex = 0; lineIndex < totalLines; lineIndex++) {
          const lineParts = allParsedLines[lineIndex];
          if (!lineParts || lineParts.length === 0) continue;
          
          const cleanText = data.cell.text[lineIndex] || "";
          const totalTextWidth = doc.getTextWidth(cleanText);
          const startX = data.cell.x + (data.cell.width - totalTextWidth) / 2;
          
          // Center of the current line
          const strikeY = firstLineCenterY + (lineIndex * lineHeightInMm);
          
          for (let partIdx = 0; partIdx < lineParts.length; partIdx++) {
            const part = lineParts[partIdx];
            if (part && part.isInvalid) {
              // Exact prefix text up to but not including this part
              let currentPrefix = "";
              if (partIdx > 0) {
                const prevParts = lineParts.slice(0, partIdx).map((p: any) => p.clean).join(', ');
                currentPrefix = prevParts + ", ";
              }
              
              const partText = part.clean;
              const prefixWidth = doc.getTextWidth(currentPrefix);
              const partWidth = doc.getTextWidth(partText);
              
              const x1 = startX + prefixWidth;
              const x2 = x1 + partWidth;
              
              // Draw flat line exactly in the middle of this invalid value
              doc.setDrawColor(185, 28, 28); // Vibrant Red for high-visibility invalid indicators
              doc.setLineWidth(0.42); // Bold and crisp line weight
              doc.line(x1, strikeY, x2, strikeY);
            }
          }
        }
      }
    }
  };

  // Sudut Biru score table
  doc.setFontSize(9);
  doc.setTextColor(29, 78, 216); // Blue Section Header
  doc.text("LOG NILAI MASUK - SUDUT BIRU (BLUE CORNER)", 15, juriStartY + 5);

  autoTable(doc, {
    startY: juriStartY + 7,
    theme: 'grid',
    head: [['BABAK', 'NILAI J1', 'NILAI J2', 'NILAI J3', 'NILAI DEWAN (+3)', 'HUKUMAN', 'TOTAL NILAI']],
    body: bodyBiru,
    didParseCell: didParseCellHandler,
    didDrawCell: didDrawCellHandler,
    headStyles: {
      fillColor: [29, 78, 216],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 20 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 25 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
    }
  });

  // Sudut Merah score table
  const merahJuriStartY = doc.lastAutoTable.finalY + 6;
  doc.setFontSize(9);
  doc.setTextColor(185, 28, 28); // Red Section Header
  doc.text("LOG NILAI MASUK - SUDUT MERAH (RED CORNER)", 15, merahJuriStartY + 3);

  autoTable(doc, {
    startY: merahJuriStartY + 5,
    theme: 'grid',
    head: [['BABAK', 'NILAI J1', 'NILAI J2', 'NILAI J3', 'NILAI DEWAN (+3)', 'HUKUMAN', 'TOTAL NILAI']],
    body: bodyMerah,
    didParseCell: didParseCellHandler,
    didDrawCell: didDrawCellHandler,
    headStyles: {
      fillColor: [185, 28, 28],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      halign: 'center',
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 20 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 30 },
      3: { halign: 'center', cellWidth: 30 },
      4: { halign: 'center', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 25 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 15 },
    }
  });

  // --- SECTION 4: STATISTIK PERTANDINGAN (DIAGRAM BATANG PER-BABAK) ---
  let statsY = doc.lastAutoTable.finalY + 11;
  // If height of section (60mm) and spacing (10mm) doesn't fit on this page, push to next page
  if (statsY + 68 > 320) {
    doc.addPage();
    statsY = 25;
  }

  doc.setTextColor(22, 10, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("IV. STATISTIK PERTANDINGAN (DIAGRAM BATANG PER-BABAK)", 15, statsY);

  const roundsList = Array.from({ length: maxRounds }, (_, i) => i + 1);
  
  const getRoundStats = (corner: 'BIRU' | 'MERAH', b: number) => {
    const pCount = match.validatedScores?.filter(v => v.sudut === corner && v.babak === b && v.jenis === 'PUNCH').length || 0;
    const pPts = pCount * 1;
    const kCount = match.validatedScores?.filter(v => v.sudut === corner && v.babak === b && v.jenis === 'KICK').length || 0;
    const kPts = kCount * 2;
    const jCount = match.validatedScores?.filter(v => v.sudut === corner && v.babak === b && v.jenis === 'JATUHAN').length || 0;
    const jPts = jCount * 3;
    
    const p = getPenaltiesForRoundInPDF(corner, b);
    let hpPts = 0;
    if (p) {
      if (p.teguran1) hpPts += 1;
      if (p.teguran2) hpPts += 2;
      if (checkPeringatanFirstTimeInPDF(corner, b, 'peringatan1')) hpPts += 5;
      if (checkPeringatanFirstTimeInPDF(corner, b, 'peringatan2')) hpPts += 10;
    }
    return { p: pPts, k: kPts, j: jPts, h: hpPts };
  };

  const bStats = roundsList.map(b => getRoundStats('BIRU', b));
  const mStats = roundsList.map(b => getRoundStats('MERAH', b));

  // Determine the max value for scaling heights
  let maxBarVal = 5; // default minimum
  bStats.forEach(s => {
    maxBarVal = Math.max(maxBarVal, s.p, s.k, s.j, s.h);
  });
  mStats.forEach(s => {
    maxBarVal = Math.max(maxBarVal, s.p, s.k, s.j, s.h);
  });

  const drawCornerPanel = (corner: 'BIRU' | 'MERAH', xStart: number, yStart: number) => {
    const athleteName = corner === 'BIRU' ? match.atlitBiru.nama : match.atlitMerah.nama;
    
    // Draw background card
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.roundedRect(xStart, yStart + 3, 85, 48, 2, 2, 'FD');

    // Draw solid corner banner
    if (corner === 'BIRU') {
      doc.setFillColor(29, 78, 216); // Biru
    } else {
      doc.setFillColor(185, 28, 28); // Merah
    }
    doc.roundedRect(xStart, yStart + 3, 85, 4.5, 2, 2, 'F');
    // Clean upper borders by drawing a rectangle over bottom parts
    doc.rect(xStart, yStart + 5.5, 85, 2, 'F');

    // Corner title text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`GRAFIK SUDUT ${corner} - ${athleteName.toUpperCase()}`, xStart + 4, yStart + 6.5);

    // Draw baseline
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.35);
    doc.line(xStart + 10, yStart + 40, xStart + 80, yStart + 40);

    // Draw horizontal guidelines and labels for scale (0%, 50%, 100%)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184); // slate-400

    // 0 point
    doc.text("0", xStart + 5, yStart + 40.5, { align: 'left' });

    // 50% point
    const halfY = yStart + 40 - 13;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.25);
    doc.line(xStart + 10, halfY, xStart + 80, halfY);
    doc.text(String(Math.round(maxBarVal / 2)), xStart + 5, halfY + 1.0, { align: 'left' });

    // 100% point
    const maxBarY = yStart + 40 - 26;
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.25);
    doc.line(xStart + 10, maxBarY, xStart + 80, maxBarY);
    doc.text(String(maxBarVal), xStart + 5, maxBarY + 1.0, { align: 'left' });

    // Draw the bars
    const roundWidth = 70 / maxRounds;
    const currentStats = corner === 'BIRU' ? bStats : mStats;

    for (let idx = 0; idx < maxRounds; idx++) {
      const b = idx + 1;
      const s = currentStats[idx];
      const groupStartX = xStart + 10 + idx * roundWidth + (roundWidth - 14) / 2;

      // Parameters for 4 bars
      const barData = [
        { val: s.p, color: [79, 70, 229] }, // Pukulan: Indigo
        { val: s.k, color: [13, 148, 136] }, // Tendangan: Teal
        { val: s.j, color: [16, 185, 129] }, // Jatuhan: Emerald
        { val: s.h, color: [225, 29, 72] }  // Hukuman: Rose
      ];

      barData.forEach((bar, bIdx) => {
        const barX = groupStartX + bIdx * 3.5;
        const barHeight = (bar.val / maxBarVal) * 26;

        if (bar.val > 0) {
          doc.setFillColor(bar.color[0], bar.color[1], bar.color[2]);
          doc.rect(barX, yStart + 40 - barHeight, 2.5, barHeight, 'F');

          // Draw small number on top
          doc.setFontSize(5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(String(bar.val), barX + 1.25, yStart + 40 - barHeight - 0.8, { align: 'center' });
        }
      });

      // Label below axis for round
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`BABAK ${b}`, xStart + 10 + (idx + 0.5) * roundWidth, yStart + 45, { align: 'center' });
    }
  };

  // Draw Blue Panel on left, Red Panel on right
  drawCornerPanel('BIRU', 15, statsY + 4);
  drawCornerPanel('MERAH', 110, statsY + 4);

  // Draw Legend row centered
  const legendY = statsY + 57;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  const lexX = [18, 62, 106, 150];

  // Indigo
  doc.setFillColor(79, 70, 229);
  doc.rect(lexX[0], legendY - 2, 3, 3, 'F');
  doc.text("Pukulan (1 Poin)", lexX[0] + 4.5, legendY + 0.5);

  // Teal
  doc.setFillColor(13, 148, 136);
  doc.rect(lexX[1], legendY - 2, 3, 3, 'F');
  doc.text("Tendangan (2 Poin)", lexX[1] + 4.5, legendY + 0.5);

  // Emerald
  doc.setFillColor(16, 185, 129);
  doc.rect(lexX[2], legendY - 2, 3, 3, 'F');
  doc.text("Jatuhan (3 Poin)", lexX[2] + 4.5, legendY + 0.5);

  // Rose
  doc.setFillColor(225, 29, 72);
  doc.rect(lexX[3], legendY - 2, 3, 3, 'F');
  doc.text("Sanksi / Hukuman (-)", lexX[3] + 4.5, legendY + 0.5);

  // --- FOOTER SIGNATURES ---
  let sigY = statsY + 68;
  if (sigY + 40 > 310) {
    doc.addPage();
    sigY = 25;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);

  doc.text("................................., ....................", 130, sigY);
  doc.text("Ketua Pertandingan,", 130, sigY + 6);
  doc.text("........................................................", 130, sigY + 28);

  // Subtle system info at absolute bottom of page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text("Sistem Digital Pencak Silat - Dewan & Sekretaris Hasil Pertandingan.", 15, 320);

  // Save the PDF
  const filename = `Partai-${match.partai || 'XX'}_${match.atlitMerah.nama.replace(/\s+/g, '-')}_vs_${match.atlitBiru.nama.replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}

// Helper to build dynamic bracket rounds for arbitrary number of athletes (even/odd)
export function getDynamicBracketRounds(athletes: any[]) {
  if (!athletes || athletes.length === 0) {
    return [];
  }

  // Filter out completely empty or invalid entries initially, or keep all
  let currentLayer = athletes.map((ath, idx) => ({
    nama: (ath?.nama || "").trim().toUpperCase(),
    kontingen: (ath?.kontingen || "").trim().toUpperCase(),
    originalIndex: idx,
    isPlaceHolder: false,
    fromPartai: null as number | null
  }));

  const rounds: { roundName: string; matches: any[] }[] = [];
  let currentPartaiId = 1;

  const M = currentLayer.length;
  if (M <= 1) {
    return [];
  }

  // Find smallest N = 2^k such that N >= M
  let N = 2;
  while (N < M) {
    N *= 2;
  }

  // Construct the very first round (Round 0) with power-of-2 balancing:
  // D = M - N/2 matches of Athlete vs Athlete
  // S = N - M matches of Athlete vs BYE
  const D = M - N / 2;
  const S = N - M;
  const K = N / 2; // Total match slots in Round 0

  // 1. Generate the balanced BYE placement priority order
  const listA: number[] = [];
  const listB: number[] = [];
  if (K === 1) {
    listA.push(0);
  } else {
    const half = K / 2;
    let leftA = 0;
    let rightA = half - 1;
    while (leftA <= rightA) {
      listA.push(leftA);
      if (leftA !== rightA) {
        listA.push(rightA);
      }
      leftA++;
      rightA--;
    }

    let leftB = half;
    let rightB = K - 1;
    while (leftB <= rightB) {
      listB.push(leftB);
      if (leftB !== rightB) {
        listB.push(rightB);
      }
      leftB++;
      rightB--;
    }
  }

  const byeOrder: number[] = [];
  const maxLen = Math.max(listA.length, listB.length);
  for (let idx = 0; idx < maxLen; idx++) {
    if (idx < listA.length) {
      byeOrder.push(listA[idx]);
    }
    if (idx < listB.length) {
      byeOrder.push(listB[idx]);
    }
  }

  // Slice the first S slots in the priority order to be the designated BYE slots
  const byeSlots = new Set(byeOrder.slice(0, S));

  const matches: any[] = [];
  const nextLayer: any[] = [];
  let athleteIndex = 0;

  // 2. Distribute the M athletes into the K slots following the BYE designations
  for (let i = 0; i < K; i++) {
    const ptyId = currentPartaiId++;
    if (byeSlots.has(i)) {
      // BYE slot: 1 Athlete vs BYE
      const athlete = currentLayer[athleteIndex++];
      matches.push({
        partaiId: ptyId,
        red: {
          nama: athlete ? (athlete.nama || (athlete.fromPartai ? `PEMENANG PTY ${athlete.fromPartai}` : "")) : "",
          kontingen: athlete ? (athlete.kontingen || "") : "",
          fromPartai: athlete ? athlete.fromPartai : null
        },
        blue: {
          nama: "BYE",
          kontingen: "SUDUT KOSONG",
          isBye: true
        }
      });
    } else {
      // Active slot: Athlete vs Athlete
      const red = currentLayer[athleteIndex++];
      const blue = currentLayer[athleteIndex++];
      matches.push({
        partaiId: ptyId,
        red: {
          nama: red ? (red.nama || (red.fromPartai ? `PEMENANG PTY ${red.fromPartai}` : "")) : "",
          kontingen: red ? (red.kontingen || "") : "",
          fromPartai: red ? red.fromPartai : null
        },
        blue: {
          nama: blue ? (blue.nama || (blue.fromPartai ? `PEMENANG PTY ${blue.fromPartai}` : "")) : "",
          kontingen: blue ? (blue.kontingen || "") : "",
          fromPartai: blue ? blue.fromPartai : null
        }
      });
    }

    nextLayer.push({
      nama: "",
      kontingen: "",
      isPlaceHolder: true,
      fromPartai: ptyId
    });
  }

  // Stage name for Round 0
  let stageName = "";
  if (K === 1) {
    stageName = "FINAL";
  } else if (K === 2) {
    stageName = "SEMIFINAL";
  } else if (K === 4) {
    stageName = "PEREMPAT FINAL";
  } else if (K === 8) {
    stageName = "16 BESAR (PENYISIHAN)";
  } else if (K === 16) {
    stageName = "32 BESAR (PENYISIHAN)";
  } else {
    stageName = `${K * 2} BESAR (PENYISIHAN)`;
  }

  rounds.push({
    roundName: stageName,
    matches: matches
  });

  // Now, currentLayer is nextLayer of size N / 2 (always a power of 2)
  currentLayer = nextLayer;

  // Since subsequent layers are perfect powers of 2, there will be absolutely NO BYEs in them.
  while (currentLayer.length > 1) {
    const loopNextLayer: any[] = [];
    const loopMatches: any[] = [];
    const L = currentLayer.length;
    const numPairs = L / 2; // guaranteed to be even with no remainder

    let loopStageName = "";
    if (numPairs === 1) {
      loopStageName = "FINAL";
    } else if (numPairs === 2) {
      loopStageName = "SEMIFINAL";
    } else if (numPairs === 4) {
      loopStageName = "PEREMPAT FINAL";
    } else if (numPairs === 8) {
      loopStageName = "16 BESAR (PENYISIHAN)";
    } else if (numPairs === 16) {
      loopStageName = "32 BESAR (PENYISIHAN)";
    } else {
      loopStageName = `${numPairs * 2} BESAR (PENYISIHAN)`;
    }

    for (let i = 0; i < numPairs; i++) {
      const red = currentLayer[2 * i];
      const blue = currentLayer[2 * i + 1];
      const ptyId = currentPartaiId++;

      loopMatches.push({
        partaiId: ptyId,
        red: {
          nama: red.nama || (red.fromPartai ? `PEMENANG PTY ${red.fromPartai}` : ""),
          kontingen: red.kontingen || "",
          fromPartai: red.fromPartai
        },
        blue: {
          nama: blue.nama || (blue.fromPartai ? `PEMENANG PTY ${blue.fromPartai}` : ""),
          kontingen: blue.kontingen || "",
          fromPartai: blue.fromPartai
        }
      });

      loopNextLayer.push({
        nama: "",
        kontingen: "",
        isPlaceHolder: true,
        fromPartai: ptyId
      });
    }

    rounds.push({
      roundName: loopStageName,
      matches: loopMatches
    });

    currentLayer = loopNextLayer;
  }

  // Propagate BYE winners to subsequent rounds so they show up in their actual slots
  for (let r = 0; r < rounds.length - 1; r++) {
    const currentRound = rounds[r];
    const nextRound = rounds[r + 1];

    currentRound.matches.forEach((parentMatch: any) => {
      let winnerName = "";
      let winnerKontingen = "";
      let hasByeWinner = false;

      const isRedBye = !parentMatch.red.nama || parentMatch.red.nama === "BYE" || parentMatch.red.isBye;
      const isBlueBye = !parentMatch.blue.nama || parentMatch.blue.nama === "BYE" || parentMatch.blue.isBye;

      if (isRedBye && !isBlueBye && parentMatch.blue.nama && !parentMatch.blue.nama.startsWith("PEMENANG PTY")) {
        winnerName = parentMatch.blue.nama;
        winnerKontingen = parentMatch.blue.kontingen;
        hasByeWinner = true;
      } else if (!isRedBye && isBlueBye && parentMatch.red.nama && !parentMatch.red.nama.startsWith("PEMENANG PTY")) {
        winnerName = parentMatch.red.nama;
        winnerKontingen = parentMatch.red.kontingen;
        hasByeWinner = true;
      }

      if (hasByeWinner) {
        nextRound.matches.forEach((childMatch: any) => {
          if (childMatch.red.fromPartai === parentMatch.partaiId) {
            childMatch.red.nama = winnerName;
            childMatch.red.kontingen = winnerKontingen;
          }
          if (childMatch.blue.fromPartai === parentMatch.partaiId) {
            childMatch.blue.nama = winnerName;
            childMatch.blue.kontingen = winnerKontingen;
          }
        });

        // Clear name and kontingen of the winner in the BYE round match to avoid double display on the same line
        if (isRedBye && !isBlueBye) {
          parentMatch.blue.nama = "";
          parentMatch.blue.kontingen = "";
        } else if (!isRedBye && isBlueBye) {
          parentMatch.red.nama = "";
          parentMatch.red.kontingen = "";
        }
      }
    });
  }

  return rounds;
}

function getStageLevel(roundName: string): number {
  const name = roundName.toUpperCase().trim();
  if (name.includes("FINAL") && !name.includes("PEREMPAT") && !name.includes("SEMI")) return 4;
  if (name.includes("SEMIFINAL") || name.includes("SEMI FINAL")) return 3;
  if (name.includes("PEREMPAT") || name.includes("QUARTER")) return 2;
  return 1; // Default/PENYISIHAN
}

function getGlobalMatchMap(allAthletes: any[]) {
  const map = new Map<string, number>(); // key: `${kelas}|${usia}|${gender}|${roundName}|${localPartaiId}` -> globalPartaiId
  
  // Group athletes by class
  const groups: Record<string, any[]> = {};
  allAthletes.forEach(a => {
    const key = `${a.kelasTanding}|${a.kategoriUsia}|${a.gender}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  // Sort group keys by total registered athletes descending
  const sortedGroupKeys = Object.keys(groups).sort((keyA, keyB) => {
    return groups[keyB].length - groups[keyA].length;
  });

  interface MatchRecord {
    groupKey: string;
    roundName: string;
    stageLevel: number;
    localPartaiId: number;
  }

  const allMatchRecords: MatchRecord[] = [];

  sortedGroupKeys.forEach(groupKey => {
    const athList = groups[groupKey];
    const rounds = getDynamicBracketRounds(athList);
    
    // To resolve BYE matches correctly:
    const resolvedMatches = new Map<number, any>();

    const getActualParticipant = (side: any): any => {
      if (!side) return { isBye: true, nama: "BYE" };
      if (side.isBye || side.nama === "BYE") {
        return { isBye: true, nama: "BYE" };
      }
      if (side.fromPartai) {
        const prev = resolvedMatches.get(side.fromPartai);
        if (prev) {
          if (prev.isByeMatch) {
            return prev.winner;
          } else {
            return {
              type: 'placeholder',
              fromPartai: side.fromPartai
            };
          }
        }
      }
      return {
        type: 'athlete',
        nama: side.nama || "",
        kontingen: side.kontingen || ""
      };
    };

    const allRawMatches: any[] = [];
    rounds.forEach((roundObj: any) => {
      roundObj.matches.forEach((m: any) => {
        allRawMatches.push({
          roundName: roundObj.roundName,
          match: m
        });
      });
    });

    // Resolve BYEs
    allRawMatches.forEach(item => {
      const m = item.match;
      const actualRed = getActualParticipant(m.red);
      const actualBlue = getActualParticipant(m.blue);

      const isByeMatch = !!(actualRed.isBye || actualBlue.isBye);
      let winner = null;
      if (isByeMatch) {
        winner = actualRed.isBye ? actualBlue : actualRed;
      }

      resolvedMatches.set(m.partaiId, {
        originalPartaiId: m.partaiId,
        actualRed,
        actualBlue,
        isByeMatch,
        winner
      });
    });

    // Collect real matches
    allRawMatches.forEach(item => {
      const m = item.match;
      const resolved = resolvedMatches.get(m.partaiId);
      const isByeMatch = resolved ? resolved.isByeMatch : false;

      if (!isByeMatch) {
        allMatchRecords.push({
          groupKey,
          roundName: item.roundName,
          stageLevel: getStageLevel(item.roundName),
          localPartaiId: m.partaiId
        });
      }
    });
  });

  let globalCounter = 1;

  // Iterate through stage levels from 1 to 4 (Penyisihan -> Final)
  for (let currentLevel = 1; currentLevel <= 4; currentLevel++) {
    const levelMatches = allMatchRecords.filter(m => m.stageLevel === currentLevel);
    if (levelMatches.length === 0) continue;

    // Group these level matches by groupKey
    const matchesByClass: Record<string, MatchRecord[]> = {};
    sortedGroupKeys.forEach(key => {
      matchesByClass[key] = levelMatches.filter(m => m.groupKey === key);
    });

    // Keep rotating through the sortedGroupKeys
    let hasMatchesLeft = true;
    const classIndices: Record<string, number> = {};
    sortedGroupKeys.forEach(key => {
      classIndices[key] = 0;
    });

    while (hasMatchesLeft) {
      hasMatchesLeft = false;

      for (const key of sortedGroupKeys) {
        const list = matchesByClass[key];
        const currentIndex = classIndices[key];
        if (currentIndex < list.length) {
          hasMatchesLeft = true;
          const takeCount = Math.min(2, list.length - currentIndex);
          for (let i = 0; i < takeCount; i++) {
            const record = list[currentIndex + i];
            const mapKey = `${record.groupKey}|${record.roundName}|${record.localPartaiId}`;
            map.set(mapKey, globalCounter++);
          }
          classIndices[key] = currentIndex + takeCount;
        }
      }
    }
  }

  return map;
}

export function getResolvedBracketRoundsForPDF(athletes: any[], allAthletes: any[], kelas?: string, gender?: string, usia?: string) {
  const rounds = getDynamicBracketRounds(athletes);
  if (!kelas || !gender || !usia) return rounds;
  
  let matchHistory: any[] = [];
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('silat_match_history') : null;
    if (saved) {
      matchHistory = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not read silat_match_history inside pdf.ts", e);
  }

  const globalMatchMap = getGlobalMatchMap(allAthletes);

  // Walk through rounds from 0 to last to resolve winners from matchHistory
  for (let r = 0; r < rounds.length; r++) {
    const round = rounds[r];
    round.matches.forEach((match: any) => {
      // Find the global match ID for this match
      let matchGlobalId: number | undefined;
      for (const [key, val] of globalMatchMap.entries()) {
        if (key.startsWith(`${kelas}|${usia}|${gender}|`) && key.endsWith(`|${match.partaiId}`)) {
          matchGlobalId = val;
          break;
        }
      }
      if (matchGlobalId !== undefined) {
        const h = matchHistory.find(item => String(item.partai) === String(matchGlobalId));
        if (h && h.pemenang) {
          const isRedWin = h.pemenang === 'MERAH' || h.pemenang === 'DISK_MERAH';
          match.winnerId = isRedWin ? 'red' : 'blue';
        }
      }

      const resolveSide = (side: any) => {
        if (side && side.fromPartai) {
          let globalId: number | undefined;
          for (const [key, val] of globalMatchMap.entries()) {
            if (key.startsWith(`${kelas}|${usia}|${gender}|`) && key.endsWith(`|${side.fromPartai}`)) {
              globalId = val;
              break;
            }
          }
          if (globalId !== undefined) {
            const h = matchHistory.find(item => String(item.partai) === String(globalId));
            if (h && h.pemenang) {
              const isRedWin = h.pemenang === 'MERAH' || h.pemenang === 'DISK_MERAH';
              const winner = isRedWin ? h.atlitMerah : h.atlitBiru;
              side.nama = winner.nama || "";
              side.kontingen = winner.kontingen || "";
              side.isWinnerOfPrev = true;
            }
          }
        }
      };

      resolveSide(match.red);
      resolveSide(match.blue);
    });
  }
  return rounds;
}

// Truncates text so that it fits exactly within a specified width in millimeters in the PDF, avoiding overflow or clipping.
function truncateTextToWidth(doc: any, text: string, maxMm: number, fontSize: number, fontStyle: string = "normal"): string {
  if (!text) return "";
  doc.setFont('helvetica', fontStyle);
  doc.setFontSize(fontSize);
  
  // Calculate current width in mm using scaleFactor
  const scaleFactor = doc.internal.scaleFactor || 2.834645;
  let widthMm = (doc.getStringUnitWidth(text) * fontSize) / scaleFactor;
  
  if (widthMm <= maxMm) {
    return text;
  }
  
  let truncated = text;
  while (truncated.length > 0 && widthMm > maxMm - 2) {
    truncated = truncated.slice(0, -1);
    const checkText = truncated + "...";
    widthMm = (doc.getStringUnitWidth(checkText) * fontSize) / scaleFactor;
  }
  return truncated.length > 0 ? truncated + "..." : "";
}

// Generates an elegant landscape bracket PDF with dynamic visual tournament tree lines
export function downloadTournamentBracketPDF(
  eventName: string,
  athletes: any[],
  bracketTitle: string = "BAGAN PERTANDINGAN",
  kelas?: string,
  gender?: string,
  golongan?: string,
  isDualSided?: boolean,
  existingDoc?: any
) {
  const rawN = athletes.length;
  // Snap capacity only to determine optimal page sizes, margins, backgrounds, and fonts
  let N = 8;
  if (rawN > 32) N = 64;
  else if (rawN > 16) N = 32;
  else if (rawN > 8) N = 16;

  // Dynamically set page size based on number of slots to keep high resolution and comfortable spacing
  const activeState = getSavedMatchState();
  const tempat = activeState.tempatPelaksanaan || '';
  const waktu = activeState.waktuPelaksanaan || '';
  const hasPlaceTime = !!(tempat || waktu);

  let format = 'a4';
  let pageWidth = 297;
  let pageHeight = 210;
  let colWidth = 52;
  let boxHeight = 11;
  let boxGap = 6;
  let topMargin = hasPlaceTime ? 43 : 40;
  let startColX = 15;

  if (N === 16) {
    format = 'a4';
    pageWidth = 297;
    pageHeight = 210;
    colWidth = 43;
    boxHeight = 8.5;
    boxGap = 4;
    topMargin = hasPlaceTime ? 43 : 40;
    startColX = 12;
  } else if (N === 32) {
    format = 'a3';
    pageWidth = 420;
    pageHeight = 297;
    colWidth = 42;
    boxHeight = 7.5;
    boxGap = 3.5;
    topMargin = hasPlaceTime ? 51 : 48;
    startColX = 15;
  } else if (N === 64) {
    format = 'a2';
    pageWidth = 594;
    pageHeight = 420;
    colWidth = 40;
    boxHeight = 6.5;
    boxGap = 2.5;
    topMargin = hasPlaceTime ? 61 : 58;
    startColX = 20;
  }

  // Adjust column width and margins dynamically for dual-sided layout to completely avoid column overlaps
  if (isDualSided) {
    if (N <= 8) {
      colWidth = 38;
      startColX = 15;
    } else if (N === 16) {
      colWidth = 32;
      startColX = 12;
    } else if (N === 32) {
      colWidth = 34;
      startColX = 15;
    } else if (N === 64) {
      colWidth = 36;
      startColX = 20;
    }
  }

  if (existingDoc) {
    existingDoc.addPage(format, 'landscape');
  }
  const doc = existingDoc || new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: format,
  }) as any;

  // Header: Event Name is primary title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(N <= 16 ? 14 : (N === 32 ? 18 : 24));
  doc.setTextColor(22, 10, 42); // Purple-black accent

  const titleY = hasPlaceTime 
    ? (N <= 16 ? 10.5 : (N === 32 ? 12 : 16)) 
    : (N <= 16 ? 12 : (N === 32 ? 14 : 18));
  doc.text(eventName.toUpperCase(), pageWidth / 2, titleY, { align: 'center' });

  // Place & Time Row (directly under Event Name)
  if (hasPlaceTime) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(N <= 16 ? 8.5 : (N === 32 ? 10.5 : 14));
    doc.setTextColor(90, 90, 100);
    let placeTimeStr = "";
    if (tempat && waktu) {
      placeTimeStr = `${tempat}   |   ${waktu}`;
    } else {
      placeTimeStr = tempat || waktu || "";
    }
    const placeTimeY = N <= 16 ? 15.0 : (N === 32 ? 17.5 : 23.0);
    doc.text(placeTimeStr.toUpperCase(), pageWidth / 2, placeTimeY, { align: 'center' });
  }

  // Subtitle: Kelas, Gender, Golongan
  doc.setFontSize(N <= 16 ? 9.5 : (N === 32 ? 12 : 16));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70, 70, 80);
  
  const kelasStr = kelas ? kelas.toUpperCase() : "-";
  const genderStr = gender ? gender.toUpperCase() : "-";
  const golonganStr = golongan ? golongan.toUpperCase() : "-";
  const metaSubtitle = `KELAS: ${kelasStr}   |   GENDER: ${genderStr}   |   GOLONGAN: ${golonganStr}`;
  
  const subtitleY = hasPlaceTime
    ? (N <= 16 ? 19.5 : (N === 32 ? 23.0 : 30.5))
    : (N <= 16 ? 18 : (N === 32 ? 21 : 28));
  doc.text(metaSubtitle, pageWidth / 2, subtitleY, { align: 'center' });

  // Border horizontal divider line below metadata
  doc.setDrawColor(128, 90, 213); // Elegant Purple Accent
  doc.setLineWidth(N <= 16 ? 0.7 : (N === 32 ? 1.0 : 1.5));
  
  const lineY = hasPlaceTime
    ? (N <= 16 ? 24.5 : (N === 32 ? 29.5 : 37.5))
    : (N <= 16 ? 23 : (N === 32 ? 28 : 35));
  doc.line(15, lineY, pageWidth - 15, lineY);

  // Build rounds list dynamically, clean up PEMENANG PTY text
  let allAthletes: any[] = [];
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('silat_registered_athletes') : null;
    if (saved) {
      allAthletes = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not read silat_registered_athletes inside pdf.ts", e);
  }
  if (!allAthletes || allAthletes.length === 0) {
    allAthletes = athletes;
  }

  const rawRounds = getResolvedBracketRoundsForPDF(athletes, allAthletes, kelas, gender, golongan);
  const rounds = rawRounds.map(round => {
    return {
      ...round,
      matches: round.matches.map(m => {
        return {
          ...m,
          winnerId: m.winnerId,
          red: {
            ...m.red,
            nama: (m.red.nama || "").startsWith("PEMENANG PTY") ? "" : m.red.nama
          },
          blue: {
            ...m.blue,
            nama: (m.blue.nama || "").startsWith("PEMENANG PTY") ? "" : m.blue.nama
          }
        };
      })
    };
  });

  const totalRounds = rounds.length;
  if (totalRounds === 0) {
    return doc;
  }
  const totalCols = totalRounds + 1;

  // Coordinates helper for columns
  const endColX = pageWidth - startColX - colWidth - (N <= 16 ? 10 : 15); // leave some space for winner block and trophy
  const colSpacing = (endColX - startColX) / totalRounds;

  // Calculate dynamic math-centers for all matches in each round
  const matchCenters: number[][] = [];
  const availableHeight = pageHeight - topMargin - (N <= 16 ? 22 : (N === 32 ? 25 : 32));
  
  // Round 0 centers
  matchCenters.push([]);
  const mCount0 = rounds[0].matches.length;
  const r0Spacing = availableHeight / mCount0;
  for (let m = 0; m < mCount0; m++) {
    matchCenters[0].push(topMargin + (m + 0.5) * r0Spacing + 1);
  }

  // Round r centers recursively based on parent connectors
  for (let r = 1; r < totalRounds; r++) {
    matchCenters.push([]);
    const mCount = rounds[r].matches.length;
    for (let m = 0; m < mCount; m++) {
      const idx1 = 2 * m;
      const idx2 = 2 * m + 1;
      const y1 = (matchCenters[r - 1] && matchCenters[r - 1][idx1] !== undefined)
        ? matchCenters[r - 1][idx1]
        : (topMargin + (m + 0.5) * r0Spacing * Math.pow(1.5, r));

      if (matchCenters[r - 1] && idx2 < matchCenters[r - 1].length) {
        const y2 = matchCenters[r - 1][idx2] !== undefined ? matchCenters[r - 1][idx2] : y1;
        matchCenters[r].push((y1 + y2) / 2);
      } else {
        matchCenters[r].push(y1);
      }
    }
  }

  // 1. Draw Columns Header Labels at the top of tree
  if (!isDualSided) {
    for (let c = 0; c < totalCols; c++) {
      const colX = startColX + c * colSpacing;
      const stage = c === totalCols - 1 ? 'CHAMPION' : rounds[c].roundName;

      // Elegant soft gray rounded badge instead of heavy dark solid rectangles
      doc.setFillColor(241, 245, 249); // slate 100
      doc.roundedRect(colX, topMargin - (N <= 16 ? 11 : 13), colWidth, N <= 16 ? 5 : 7, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(N <= 16 ? 6.5 : (N === 32 ? 7.5 : 9));
      doc.setTextColor(51, 65, 85); // Slate 700 text
      doc.text(stage, colX + colWidth / 2, topMargin - (N <= 16 ? 7.5 : 8.5), { align: 'center' });
    }
  }

  if (isDualSided) {
    // Symmetrical Dual Sided layout
    const totalCols = 2 * totalRounds - 1;
    const endColX = pageWidth - startColX;
    const colSpacing = (endColX - startColX - colWidth) / (totalCols - 1 || 1);

    const leftMatchCenters: number[][] = [];
    const rightMatchCenters: number[][] = [];
    const availableHeight = pageHeight - topMargin - (N <= 16 ? 22 : (N === 32 ? 25 : 32));

    const mCount0 = Math.ceil(rounds[0].matches.length / 2);
    const r0Spacing = availableHeight / mCount0;

    leftMatchCenters.push([]);
    rightMatchCenters.push([]);
    for (let m = 0; m < mCount0; m++) {
      const centerY = topMargin + (m + 0.5) * r0Spacing + 1;
      leftMatchCenters[0].push(centerY);
      rightMatchCenters[0].push(centerY);
    }

    for (let r = 1; r < totalRounds - 1; r++) {
      leftMatchCenters.push([]);
      rightMatchCenters.push([]);
      const mCount = Math.ceil(rounds[r].matches.length / 2);
      for (let m = 0; m < mCount; m++) {
        const idx1 = 2 * m;
        const idx2 = 2 * m + 1;
        
        const l_y1 = (leftMatchCenters[r - 1] && leftMatchCenters[r - 1][idx1] !== undefined)
          ? leftMatchCenters[r - 1][idx1]
          : (topMargin + (m + 0.5) * r0Spacing * Math.pow(1.5, r));
        const l_y2 = (leftMatchCenters[r - 1] && leftMatchCenters[r - 1][idx2] !== undefined)
          ? leftMatchCenters[r - 1][idx2]
          : l_y1;
        leftMatchCenters[r].push((l_y1 + l_y2) / 2);

        const r_y1 = (rightMatchCenters[r - 1] && rightMatchCenters[r - 1][idx1] !== undefined)
          ? rightMatchCenters[r - 1][idx1]
          : (topMargin + (m + 0.5) * r0Spacing * Math.pow(1.5, r));
        const r_y2 = (rightMatchCenters[r - 1] && rightMatchCenters[r - 1][idx2] !== undefined)
          ? rightMatchCenters[r - 1][idx2]
          : r_y1;
        rightMatchCenters[r].push((r_y1 + r_y2) / 2);
      }
    }

    // Column Headers
    for (let c = 0; c < totalCols; c++) {
      const colX = startColX + c * colSpacing;
      let stageName = "";
      
      if (c < totalRounds - 1) {
        stageName = rounds[c].roundName;
      } else if (c === totalRounds - 1) {
        stageName = rounds[totalRounds - 1].roundName;
      } else {
        const rIdx = (totalCols - 1) - c;
        stageName = rounds[rIdx].roundName;
      }

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(colX, topMargin - (N <= 16 ? 11 : 13), colWidth, N <= 16 ? 5 : 7, 1, 1, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(N <= 16 ? 6.5 : (N === 32 ? 7.5 : 9));
      doc.setTextColor(51, 65, 85);
      doc.text(stageName, colX + colWidth / 2, topMargin - (N <= 16 ? 7.5 : 8.5), { align: 'center' });
    }

    const d = Math.min(N <= 8 ? 8 : (N === 16 ? 6 : (N === 32 ? 4.5 : 3.5)), r0Spacing * 0.3);

    // Define typography sizes
    const nameFontSize = N <= 8 ? 9.5 : (N === 16 ? 8.5 : (N === 32 ? 7.5 : 6.5));
    const kontingenFontSize = N <= 8 ? 7.5 : (N === 16 ? 6.5 : (N === 32 ? 5.5 : 4.5));

    for (let r = 0; r < totalRounds - 1; r++) {
      const round = rounds[r];
      const mTotal = round.matches.length;
      const mHalf = Math.ceil(mTotal / 2);

      const leftColX = startColX + r * colSpacing;
      const rightColX = startColX + (totalCols - 1 - r) * colSpacing;

      // Left Matches
      for (let m = 0; m < mHalf; m++) {
        const matchObj = round.matches[m];
        const centerY = leftMatchCenters[r][m];
        
        let y_upper = centerY - d;
        let y_lower = centerY + d;
        if (r > 0) {
          if (leftMatchCenters[r - 1][2 * m] !== undefined) y_upper = leftMatchCenters[r - 1][2 * m];
          if (leftMatchCenters[r - 1][2 * m + 1] !== undefined) y_lower = leftMatchCenters[r - 1][2 * m + 1];
        }

        const rName = matchObj.red.nama;
        const isRBye = matchObj.red.isBye || rName === "BYE";
        const bName = matchObj.blue.nama;
        const isBBye = matchObj.blue.isBye || bName === "BYE";

        let drawY_Red = y_upper;
        let drawY_Blue = y_lower;
        if (isRBye && !isBBye) {
          drawY_Blue = centerY;
        } else if (!isRBye && isBBye) {
          drawY_Red = centerY;
        }

        // Draw Left Box Lines
        if (!isRBye) {
          doc.setDrawColor(128, 90, 213);
          doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
          doc.line(leftColX, drawY_Red, leftColX + colWidth, drawY_Red);
          if (matchObj.red.nama) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(nameFontSize);
            doc.setTextColor(30, 41, 59);
            const dispName = truncateTextToWidth(doc, matchObj.red.nama, colWidth - 2, nameFontSize, 'bold');
            doc.text(dispName, leftColX + 1.5, drawY_Red - 0.8);
            if (matchObj.red.kontingen) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(kontingenFontSize);
              doc.setTextColor(100, 116, 139);
              const dispKontingen = truncateTextToWidth(doc, matchObj.red.kontingen, colWidth - 2, kontingenFontSize, 'normal');
              doc.text(dispKontingen, leftColX + 1.5, drawY_Red + (N <= 16 ? 2.2 : 1.8));
            }
          }
        }
        if (!isBBye) {
          doc.setDrawColor(128, 90, 213);
          doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
          doc.line(leftColX, drawY_Blue, leftColX + colWidth, drawY_Blue);
          if (matchObj.blue.nama) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(nameFontSize);
            doc.setTextColor(30, 41, 59);
            const dispName = truncateTextToWidth(doc, matchObj.blue.nama, colWidth - 2, nameFontSize, 'bold');
            doc.text(dispName, leftColX + 1.5, drawY_Blue - 0.8);
            if (matchObj.blue.kontingen) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(kontingenFontSize);
              doc.setTextColor(100, 116, 139);
              const dispKontingen = truncateTextToWidth(doc, matchObj.blue.kontingen, colWidth - 2, kontingenFontSize, 'normal');
              doc.text(dispKontingen, leftColX + 1.5, drawY_Blue + (N <= 16 ? 2.2 : 1.8));
            }
          }
        }
        if (!isRBye && !isBBye) {
          doc.setDrawColor(128, 90, 213);
          doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
          doc.line(leftColX + colWidth, drawY_Red, leftColX + colWidth, drawY_Blue);
        }

        // Left Wing Connector: only span the gap between columns, do not cross into player boxes
        if (r < totalRounds - 2) {
          doc.line(leftColX + colWidth, centerY, leftColX + colSpacing, centerY);
        } else {
          // Left Semifinal to Center Final Upper
          const finalColX = startColX + (totalRounds - 1) * colSpacing;
          const finalCenterY = leftMatchCenters[totalRounds - 2]?.[0] || (pageHeight / 2 + 10);
          const final_yRed = finalCenterY - d;
          const midX = (leftColX + colWidth + finalColX) / 2;

          doc.setDrawColor(128, 90, 213);
          doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
          doc.line(leftColX + colWidth, centerY, midX, centerY);
          doc.line(midX, centerY, midX, final_yRed);
          doc.line(midX, final_yRed, finalColX, final_yRed);
        }
      }

      // Right Matches
      for (let m = mHalf; m < mTotal; m++) {
        const matchObj = round.matches[m];
        const mIdx = m - mHalf;
        const centerY = rightMatchCenters[r][mIdx];

        let y_upper = centerY - d;
        let y_lower = centerY + d;
        if (r > 0) {
          if (rightMatchCenters[r - 1][2 * mIdx] !== undefined) y_upper = rightMatchCenters[r - 1][2 * mIdx];
          if (rightMatchCenters[r - 1][2 * mIdx + 1] !== undefined) y_lower = rightMatchCenters[r - 1][2 * mIdx + 1];
        }

        const rName = matchObj.red.nama;
        const isRBye = matchObj.red.isBye || rName === "BYE";
        const bName = matchObj.blue.nama;
        const isBBye = matchObj.blue.isBye || bName === "BYE";

        let drawY_Red = y_upper;
        let drawY_Blue = y_lower;
        if (isRBye && !isBBye) {
          drawY_Blue = centerY;
        } else if (!isRBye && isBBye) {
          drawY_Red = centerY;
        }

        // Draw Right Box Lines
        if (!isRBye) {
          doc.setDrawColor(128, 90, 213);
          doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
          doc.line(rightColX, drawY_Red, rightColX + colWidth, drawY_Red);
          if (matchObj.red.nama) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(nameFontSize);
            doc.setTextColor(30, 41, 59);
            const dispName = truncateTextToWidth(doc, matchObj.red.nama, colWidth - 2, nameFontSize, 'bold');
            doc.text(dispName, rightColX + colWidth - 1.5, drawY_Red - 0.8, { align: 'right' });
            if (matchObj.red.kontingen) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(kontingenFontSize);
              doc.setTextColor(100, 116, 139);
              const dispKontingen = truncateTextToWidth(doc, matchObj.red.kontingen, colWidth - 2, kontingenFontSize, 'normal');
              doc.text(dispKontingen, rightColX + colWidth - 1.5, drawY_Red + (N <= 16 ? 2.2 : 1.8), { align: 'right' });
            }
          }
        }
        if (!isBBye) {
          doc.setDrawColor(128, 90, 213);
          doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
          doc.line(rightColX, drawY_Blue, rightColX + colWidth, drawY_Blue);
          if (matchObj.blue.nama) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(nameFontSize);
            doc.setTextColor(30, 41, 59);
            const dispName = truncateTextToWidth(doc, matchObj.blue.nama, colWidth - 2, nameFontSize, 'bold');
            doc.text(dispName, rightColX + colWidth - 1.5, drawY_Blue - 0.8, { align: 'right' });
            if (matchObj.blue.kontingen) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(kontingenFontSize);
              doc.setTextColor(100, 116, 139);
              const dispKontingen = truncateTextToWidth(doc, matchObj.blue.kontingen, colWidth - 2, kontingenFontSize, 'normal');
              doc.text(dispKontingen, rightColX + colWidth - 1.5, drawY_Blue + (N <= 16 ? 2.2 : 1.8), { align: 'right' });
            }
          }
        }
        if (!isRBye && !isBBye) {
          doc.setDrawColor(128, 90, 213);
          doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
          doc.line(rightColX, drawY_Red, rightColX, drawY_Blue);
        }

        // Right Wing Connector: only span the gap between columns, do not cross into player boxes
        if (r < totalRounds - 2) {
          doc.line(rightColX - colSpacing + colWidth, centerY, rightColX, centerY);
        } else {
          // Right Semifinal to Center Final Lower
          const finalColX = startColX + (totalRounds - 1) * colSpacing;
          const finalCenterY = leftMatchCenters[totalRounds - 2]?.[0] || (pageHeight / 2 + 10);
          const final_yBlue = finalCenterY + d;
          const midX = (rightColX + finalColX + colWidth) / 2;

          doc.setDrawColor(128, 90, 213);
          doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
          doc.line(rightColX, centerY, midX, centerY);
          doc.line(midX, centerY, midX, final_yBlue);
          doc.line(midX, final_yBlue, finalColX + colWidth, final_yBlue);
        }
      }
    }

    // DRAW ULTIMATE FINAL IN CENTER
    const finalColX = startColX + (totalRounds - 1) * colSpacing;
    const finalCenterY = leftMatchCenters[totalRounds - 2]?.[0] || (pageHeight / 2 + 10);
    const finalMatch = rounds[totalRounds - 1]?.matches[0];
    
    if (finalMatch) {
      const y_upper = finalCenterY - d;
      const y_lower = finalCenterY + d;

      // Draw Final Red Box line
      doc.setDrawColor(128, 90, 213);
      doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
      doc.line(finalColX, y_upper, finalColX + colWidth, y_upper);
      if (finalMatch.red.nama) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(nameFontSize);
        doc.setTextColor(30, 41, 59);
        const dispName = truncateTextToWidth(doc, finalMatch.red.nama, colWidth - 2, nameFontSize, 'bold');
        doc.text(dispName, finalColX + 1.5, y_upper - 0.8);
        if (finalMatch.red.kontingen) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(kontingenFontSize);
          doc.setTextColor(100, 116, 139);
          const dispKontingen = truncateTextToWidth(doc, finalMatch.red.kontingen, colWidth - 2, kontingenFontSize, 'normal');
          doc.text(dispKontingen, finalColX + 1.5, y_upper + (N <= 16 ? 2.2 : 1.8));
        }
      }

      // Draw Final Blue Box line
      doc.line(finalColX, y_lower, finalColX + colWidth, y_lower);
      if (finalMatch.blue.nama) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(nameFontSize);
        doc.setTextColor(30, 41, 59);
        const dispName = truncateTextToWidth(doc, finalMatch.blue.nama, colWidth - 2, nameFontSize, 'bold');
        doc.text(dispName, finalColX + 1.5, y_lower - 0.8);
        if (finalMatch.blue.kontingen) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(kontingenFontSize);
          doc.setTextColor(100, 116, 139);
          const dispKontingen = truncateTextToWidth(doc, finalMatch.blue.kontingen, colWidth - 2, kontingenFontSize, 'normal');
          doc.text(dispKontingen, finalColX + 1.5, y_lower + (N <= 16 ? 2.2 : 1.8));
        }
      }

      // Draw Final connector
      // doc.line(finalColX + colWidth, y_upper, finalColX + colWidth, y_lower);

      // Gold Trophy Header Above
      const trophyY = y_upper - (N <= 16 ? 12 : 16);
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(finalColX + colWidth / 2 - 8, trophyY - 1, 16, 6, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(N <= 16 ? 6 : 7);
      doc.setTextColor(217, 119, 6);
      doc.text("FINAL", finalColX + colWidth / 2, trophyY + 3.5, { align: 'center' });

      // Juara 1 Block Below
      let championName = "";
      let championKontingen = "";
      if (finalMatch.winnerId) {
        if (finalMatch.winnerId === finalMatch.red.id || finalMatch.winnerId === 'red') {
          championName = finalMatch.red.nama;
          championKontingen = finalMatch.red.kontingen;
        } else if (finalMatch.winnerId === finalMatch.blue.id || finalMatch.winnerId === 'blue') {
          championName = finalMatch.blue.nama;
          championKontingen = finalMatch.blue.kontingen;
        }
      }

      const champBoxY = y_lower + 6;
      doc.setFillColor(255, 251, 235);
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      doc.roundedRect(finalColX - 5, champBoxY, colWidth + 10, N <= 16 ? 14 : 18, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(N <= 16 ? 7 : 8);
      doc.setTextColor(180, 83, 9);
      doc.text("JUARA 1 (CHAMPION)", finalColX + colWidth / 2, champBoxY + 4, { align: 'center' });

      if (championName && championName !== "") {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(nameFontSize + 1.2);
        doc.setTextColor(15, 23, 42);
        const dispChampName = truncateTextToWidth(doc, championName, colWidth + 8, nameFontSize + 1.2, 'bold');
        doc.text(dispChampName, finalColX + colWidth / 2, champBoxY + (N <= 16 ? 8.5 : 10.5), { align: 'center' });

        if (championKontingen) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(kontingenFontSize + 0.8);
          doc.setTextColor(100, 116, 139);
          const dispChampKontingen = truncateTextToWidth(doc, championKontingen, colWidth + 8, kontingenFontSize + 0.8, 'normal');
          doc.text(dispChampKontingen, finalColX + colWidth / 2, champBoxY + (N <= 16 ? 12 : 15.0), { align: 'center' });
        }
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(nameFontSize);
        doc.setTextColor(148, 163, 184);
        doc.text("WAITING FOR WINNER", finalColX + colWidth / 2, champBoxY + 10, { align: 'center' });
      }
    }

    // Footer signature
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(N <= 16 ? 7.5 : (N === 32 ? 9 : 11));
    doc.setTextColor(150, 150, 150);
    doc.text(`Sistem scoring Digital Pencak Silat - DISCORS. Hari/Tanggal: ${new Date().toLocaleString('id-ID')}`, 15, pageHeight - (N <= 16 ? 10 : 12));

    if (!existingDoc) {
      doc.save(`Bagan_Pertandingan_${bracketTitle.replace(/\s+/g, '_')}.pdf`);
    }
    return doc;
  }

  // Calculate d for Round 0 vertical spacing multiplier
  const d = Math.min(N <= 8 ? 8 : (N === 16 ? 6 : (N === 32 ? 4.5 : 3.5)), r0Spacing * 0.3);

  // Define typography sizes
  const nameFontSize = N <= 8 ? 9.5 : (N === 16 ? 8.5 : (N === 32 ? 7.5 : 6.5));
  const kontingenFontSize = N <= 8 ? 7.5 : (N === 16 ? 6.5 : (N === 32 ? 5.5 : 4.5));

  // Set line styling
  doc.setDrawColor(128, 90, 213); // Elegant Purple-violet accent for tournament lines
  doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));

  // 2. Main Tree Drawing Loop
  for (let r = 0; r < totalRounds; r++) {
    const colX = startColX + r * colSpacing;
    const mCount = rounds[r].matches.length;

    for (let m = 0; m < mCount; m++) {
      const centerY = (matchCenters[r] && matchCenters[r][m] !== undefined) ? matchCenters[r][m] : (topMargin + (m + 0.5) * r0Spacing);
      
      // Determine exact upper and lower Y coordinates for this match
      let y_upper = centerY - d * Math.pow(1.2, r);
      let y_lower = centerY + d * Math.pow(1.2, r);
      if (r === 0) {
        y_upper = centerY - d;
        y_lower = centerY + d;
      } else {
        if (matchCenters[r - 1] && matchCenters[r - 1][2 * m] !== undefined) {
          y_upper = matchCenters[r - 1][2 * m];
        }
        if (matchCenters[r - 1] && matchCenters[r - 1][2 * m + 1] !== undefined) {
          y_lower = matchCenters[r - 1][2 * m + 1];
        }
      }

      const matchObj = rounds[r].matches[m];

      // Draw Player 1 (Red corner) upper horizontal line and labels
      const rName = matchObj.red.nama;
      const rKontingen = matchObj.red.kontingen;
      const isRBye = matchObj.red.isBye || rName === "BYE";
      const hasR = rName && rName !== "" && !rName.startsWith("(SLOT KOSONG");

      // Draw Player 2 (Blue corner) lower horizontal line and labels
      const bName = matchObj.blue.nama;
      const bKontingen = matchObj.blue.kontingen;
      const isBBye = matchObj.blue.isBye || bName === "BYE";
      const hasB = bName && bName !== "" && !bName.startsWith("(SLOT KOSONG") && bName !== "BYE";

      let drawY_Red = y_upper;
      let drawY_Blue = y_lower;

      // Align active competitor to centerY if opponent has a BYE to maintain contiguous straight lines
      if (isRBye && !isBBye) {
        drawY_Blue = centerY;
      } else if (!isRBye && isBBye) {
        drawY_Red = centerY;
      }

      // Draw horizontal line for Upper competitor only if it is not a BYE
      if (!isRBye) {
        doc.setDrawColor(128, 90, 213);
        doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
        doc.line(colX, drawY_Red, colX + colWidth, drawY_Red);

        if (hasR) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(nameFontSize);
          doc.setTextColor(30, 41, 59); // deep slate-800
          const dispRName = truncateTextToWidth(doc, rName, colWidth - 2, nameFontSize, 'bold');
          doc.text(dispRName, colX + 1.5, drawY_Red - 0.8);

          if (rKontingen) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(kontingenFontSize);
            doc.setTextColor(100, 116, 139); // slate-500
            const dispKontingen = truncateTextToWidth(doc, rKontingen, colWidth - 2, kontingenFontSize, 'normal');
            doc.text(dispKontingen, colX + 1.5, drawY_Red + (N <= 16 ? 2.2 : 1.8));
          }
        }
      }

      // Draw horizontal line for Lower competitor only if it is not a BYE
      if (!isBBye) {
        doc.setDrawColor(128, 90, 213);
        doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
        doc.line(colX, drawY_Blue, colX + colWidth, drawY_Blue);

        if (hasB) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(nameFontSize);
          doc.setTextColor(30, 41, 59);
          const dispBName = truncateTextToWidth(doc, bName, colWidth - 2, nameFontSize, 'bold');
          doc.text(dispBName, colX + 1.5, drawY_Blue - 0.8);

          if (bKontingen) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(kontingenFontSize);
            doc.setTextColor(100, 116, 139);
            const dispKontingen = truncateTextToWidth(doc, bKontingen, colWidth - 2, kontingenFontSize, 'normal');
            doc.text(dispKontingen, colX + 1.5, drawY_Blue + (N <= 16 ? 2.2 : 1.8));
          }
        }
      }

      // Draw the vertical connector connecting Upper and Lower competitor lines on the right of this match
      // Only draw the vertical connector if NEITHER of the competitors is a BYE!
      if (!isRBye && !isBBye) {
        doc.setDrawColor(128, 90, 213);
        doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));
        doc.line(colX + colWidth, drawY_Red, colX + colWidth, drawY_Blue);
      }

      // If this is not the final match, draw the horizontal winner line extending straight to the next column's end
      if (r < totalRounds - 1) {
        doc.line(colX + colWidth, centerY, colX + colSpacing + colWidth, centerY);
      }
    }
  }

  // 3. Draw final round connection to Champion line
  const finalColX = startColX + (totalRounds - 1) * colSpacing;
  const finalRightX = finalColX + colWidth;
  const winnerColX = startColX + totalRounds * colSpacing;
  const finalCenterY = (matchCenters[totalRounds - 1] && matchCenters[totalRounds - 1][0] !== undefined)
    ? matchCenters[totalRounds - 1][0]
    : pageHeight / 2;

  const final_yRed = (matchCenters[totalRounds - 2] && matchCenters[totalRounds - 2][0] !== undefined)
    ? matchCenters[totalRounds - 2][0]
    : finalCenterY - d;

  const final_yBlue = (matchCenters[totalRounds - 2] && matchCenters[totalRounds - 2][1] !== undefined)
    ? matchCenters[totalRounds - 2][1]
    : finalCenterY + d;

  doc.setDrawColor(128, 90, 213);
  doc.setLineWidth(N <= 16 ? 0.35 : (N === 32 ? 0.25 : 0.2));

  // The final match vertical line connects the final Red and Blue branches
  doc.line(finalRightX, final_yRed, finalRightX, final_yBlue);

  // Horizontal Champion line continuing all the way to the end of the Champion column
  doc.setDrawColor(217, 119, 6); // Golden Amber
  doc.setLineWidth(N <= 16 ? 0.45 : 0.35);
  doc.line(finalRightX, finalCenterY, winnerColX + colWidth, finalCenterY);

  // Detect and fetch champion name
  const finalMatch = rounds[totalRounds - 1]?.matches[0];
  let championName = "";
  let championKontingen = "";
  if (finalMatch && finalMatch.winnerId) {
    if (finalMatch.winnerId === finalMatch.red.id || finalMatch.winnerId === 'red') {
      championName = finalMatch.red.nama;
      championKontingen = finalMatch.red.kontingen;
    } else if (finalMatch.winnerId === finalMatch.blue.id || finalMatch.winnerId === 'blue') {
      championName = finalMatch.blue.nama;
      championKontingen = finalMatch.blue.kontingen;
    }
  }

  // 4. Render Champion Block Detail text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(N <= 16 ? 7.5 : 9);
  doc.setTextColor(180, 83, 9); // Amber 700 text
  doc.text("JUARA 1 (CHAMPION)", winnerColX + 1.5, finalCenterY - 4.5);

  if (championName && championName !== "") {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(nameFontSize + 0.5);
    doc.setTextColor(15, 23, 42); // slate 900
    const dispChampName = truncateTextToWidth(doc, championName, colWidth - 2, nameFontSize + 0.5, 'bold');
    doc.text(dispChampName, winnerColX + 1.5, finalCenterY - 0.8);

    if (championKontingen) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(kontingenFontSize + 0.5);
      doc.setTextColor(100, 116, 139);
      const dispChampKontingen = truncateTextToWidth(doc, championKontingen, colWidth - 2, kontingenFontSize + 0.5, 'normal');
      doc.text(dispChampKontingen, winnerColX + 1.5, finalCenterY + (N <= 16 ? 2.5 : 2.0));
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(nameFontSize);
    doc.setTextColor(148, 163, 184); // slate 400
    doc.text("PEMENANG", winnerColX + 1.5, finalCenterY - 0.8);
  }

  // Footer visual signature
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(N <= 16 ? 7.5 : (N === 32 ? 9 : 11));
  doc.setTextColor(150, 150, 150);
  doc.text(`Sistem scoring Digital Pencak Silat - DISCORS. Hari/Tanggal: ${new Date().toLocaleString('id-ID')}`, 15, pageHeight - (N <= 16 ? 10 : 12));

  if (!existingDoc) {
    doc.save(`Bagan_Pertandingan_${bracketTitle.replace(/\s+/g, '_')}.pdf`);
  }
  return doc;
}

export function downloadAllTournamentBracketsPDF(
  eventName: string,
  allAthletes: any[],
  uniqueClasses: { kelas: string; usia: string; gender: 'PUTRA' | 'PUTRI' }[],
  isDualSided?: boolean
) {
  if (uniqueClasses.length === 0) return;

  let doc: any = null;

  uniqueClasses.forEach((classObj) => {
    const classAthletes = allAthletes.filter(a =>
      a.kelasTanding === classObj.kelas &&
      a.kategoriUsia === classObj.usia &&
      a.gender === classObj.gender
    );

    if (classAthletes.length === 0) return;

    doc = downloadTournamentBracketPDF(
      eventName,
      classAthletes,
      "BAGAN PERTANDINGAN DIGITAL",
      classObj.kelas,
      classObj.gender,
      classObj.usia,
      isDualSided,
      doc
    );
  });

  if (doc) {
    doc.save(`Semua_Bagan_Pertandingan_${eventName.replace(/\s+/g, '_')}.pdf`);
  }
}

// Generates an elegant publication-grade Schedule PDF with auto-painted corner styling
export function downloadMatchSchedulePDF(eventName: string, scheduleRows: any[], logoKiri?: string, logoKanan?: string, gelanggangName?: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [215.9, 355.6], // Legal Portrait (215.9 mm x 355.6 mm)
  }) as any;

  let matchHistory: any[] = [];
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('silat_match_history') : null;
    if (saved) {
      matchHistory = JSON.parse(saved);
    }
  } catch (e) {
    console.warn("Could not read silat_match_history inside pdf.ts", e);
  }

  // --- 1. MODERN KOP SURAT HEADER (Clean logo placements, centered title, and elegant double underline) ---
  const headerX = 22.5; // Margin Left: 2.25 cm (22.5 mm)
  const headerY = 12.5; // Margin Top: 1.25 cm (12.5 mm)
  const headerW = 170.9; // Margin Right: 2.25 cm => 215.9 - 22.5 - 22.5 = 170.9 mm
  const headerCenterX = 107.95; // 22.5 + (170.9 / 2) = 107.95 mm

  // A. DRAW LEFT LOGO (IPSI OR CUSTOM)
  const drawLeftLogo = () => {
    // Red circular outline
    doc.setFillColor(239, 68, 68); // Soft Red
    doc.circle(32.5, 18.0, 6.5, 'F');
    // White inner circle
    doc.setFillColor(255, 255, 255);
    doc.circle(32.5, 18.0, 5.3, 'F');
    // Inner green shield/polygon
    doc.setFillColor(34, 197, 94); // Green
    doc.triangle(32.5, 14.0, 29.5, 19.5, 35.5, 19.5, 'F');
    doc.rect(29.5, 19.5, 6, 2.5, 'F');
    // "IPSI" text underneath
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("IPSI", 32.5, 28.0, { align: 'center' });
  };

  const drawLogoFormatted = (logoData: string | undefined, fallbackFn: () => void, x: number, y: number, w: number, h: number) => {
    if (!logoData || logoData.trim() === '') {
      fallbackFn();
      return;
    }
    try {
      let format = 'PNG';
      if (logoData.includes('image/jpeg') || logoData.includes('image/jpg')) {
        format = 'JPEG';
      } else if (logoData.includes('image/webp')) {
        format = 'WEBP';
      }
      doc.addImage(logoData, format, x, y, w, h);
    } catch (err) {
      console.warn("Failed to render custom logo inside schedule PDF, falling back to vector outline:", err);
      fallbackFn();
    }
  };

  drawLogoFormatted(logoKiri, drawLeftLogo, 23.5, 10.5, 16, 16);

  // B. DRAW CENTERED OFFICIAL HEADER TEXT
  const activeState = getSavedMatchState();
  const tempat = activeState.tempatPelaksanaan || '';
  const waktu = activeState.waktuPelaksanaan || '';
  const hasPlaceTime = !!(tempat || waktu);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  
  const titleY = hasPlaceTime ? 15.0 : 16.5;
  doc.text("JADWAL PERTANDINGAN", headerCenterX, titleY, { align: 'center' });

  doc.setFontSize(11);
  const eventY = hasPlaceTime ? 20.0 : 21.5;
  doc.text(eventName.toUpperCase(), headerCenterX, eventY, { align: 'center' });

  if (hasPlaceTime) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    let placeTimeStr = "";
    if (tempat && waktu) {
      placeTimeStr = `${tempat}   |   ${waktu}`;
    } else {
      placeTimeStr = tempat || waktu || "";
    }
    doc.text(placeTimeStr.toUpperCase(), headerCenterX, 24.5, { align: 'center' });
  }

  // C. DRAW RIGHT LOGO (DISCORS OR CUSTOM)
  const drawRightLogo = () => {
    doc.setFillColor(79, 70, 229); // Violet
    doc.circle(183.4, 18.0, 6.5, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(183.4, 18.0, 5.3, 'F');
    doc.setFillColor(245, 158, 11); // Gold center
    doc.rect(180.4, 16.5, 6, 4.0, 'F');
    // "DISCORS" text underneath
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text("DISCORS", 183.4, 28.0, { align: 'center' });
  };

  drawLogoFormatted(logoKanan, drawRightLogo, 172.4, 10.5, 16, 16);

  // D. CLASSIC KOP SURAT DOUBLE UNDERLINE (PROPORTIONAL TIMING-ADAPTED)
  const lineYPrimary = hasPlaceTime ? 29.5 : 29.5;
  const lineYSecondary = lineYPrimary + 1.2;

  // Thick primary line
  doc.setDrawColor(15, 23, 42); // slate-900 (deep color)
  doc.setLineWidth(0.8);
  doc.line(22.5, lineYPrimary, 193.4, lineYPrimary);
  // Thin secondary line
  doc.setLineWidth(0.25);
  doc.line(22.5, lineYSecondary, 193.4, lineYSecondary);


  // --- 2. THREE SUBHEADER METADATA BOXES ---
  const current = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const idMonth = months[current.getMonth()] || "Juni";
  const dateStr = `${days[current.getDay()]}, ${current.getDate()} ${idMonth} ${current.getFullYear()}`;

  const boxY = lineYSecondary + 4.5;
  const boxHeight = 8;
  const textYOffset = 5.2;

  // Box 1 (Left - Date details)
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.45);
  doc.setFillColor(255, 255, 255);
  doc.rect(22.5, boxY, 50, boxHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(dateStr.toUpperCase(), 47.5, boxY + textYOffset, { align: 'center' });

  // Box 2 (Middle - Arena Gelanggang / Greenish Soft Cyan)
  doc.setFillColor(224, 242, 254); // Light Cyan
  doc.rect(74.5, boxY, 70, boxHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text((gelanggangName || "GELANGGANG I").toUpperCase(), 109.5, boxY + textYOffset, { align: 'center' });

  // Box 3 (Right - Session duration)
  doc.setFillColor(255, 255, 255);
  doc.rect(146.5, boxY, 46.9, boxHeight, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("09.00 - SELESAI", 170, boxY + textYOffset, { align: 'center' });


  // --- 3. PREPARE THE TABLE DATA WITH FULL LABELS (UN-ABBREVIATED) ---
  const tableData = scheduleRows.map((row, index) => {
    const noStr = `${index + 1}.`;
    const pStr = String(row['Partai'] || row.partai || index + 1);
    
    // Class letter and gender acronym (e.g. B / PA or C / PI)
    const kelasLetter = String(row['Kelas'] || row.kelas || '-').toUpperCase();
    const genderStr = String(row['Gender'] || row.gender || 'PUTRA');
    const genderCode = (genderStr.toUpperCase() === 'PUTRI' || genderStr.toUpperCase() === 'PI') ? 'PI' : 'PA';
    
    // Get full word for Kategori Usia without abbreviation
    let usiaStr = String(row['Kategori Usia'] || row['Usia'] || row.kategoriUsia || 'REMAJA').toUpperCase();
    if (usiaStr === 'REM') usiaStr = 'REMAJA';
    else if (usiaStr === 'DWS') usiaStr = 'DEWASA';
    else if (usiaStr === 'UDB' || usiaStr === 'USIA DINI B') usiaStr = 'USIA DINI B';
    else if (usiaStr === 'UDA' || usiaStr === 'USIA DINI A') usiaStr = 'USIA DINI A';
    else if (usiaStr === 'PRA' || usiaStr === 'PRA REM') usiaStr = 'PRA REMAJA';

    // Get full word for Tahap Pertandingan without abbreviation
    let tahapStr = String(row['Tahap Pertandingan'] || row['Tahapan'] || row.tahapPertandingan || 'PENYISIHAN').toUpperCase();
    if (tahapStr === 'PENY') tahapStr = 'PENYISIHAN';
    else if (tahapStr === 'SEMIFINAL' || tahapStr === 'SF') tahapStr = 'SEMIFINAL';
    else if (tahapStr === 'PEREMPAT' || tahapStr === 'PEREMPAT FINAL') tahapStr = 'PEREMPAT FINAL';
    else if (tahapStr === 'FINAL' || tahapStr === 'F') tahapStr = 'FINAL';
    
    // Structure of KELAS column cell (e.g., Line 1: 'B / PA', Line 2: '(REMAJA - SEMIFINAL)')
    const kelasFormatted = `${kelasLetter} / ${genderCode}\n(${usiaStr} - ${tahapStr})`;

    // Red corner data formatted exactly like PON XX
    let namaMerah = String(row['Nama Pesilat Merah'] || row.namaPesilatMerah || row.atlitMerah?.nama || '-').toUpperCase();
    if (namaMerah === "SUDUT KOSONG") namaMerah = "";
    let kontMerah = String(row['Kontingen Merah'] || row.kontingenMerah || row.atlitMerah?.kontingen || '').toUpperCase();
    if (kontMerah === "SUDUT KOSONG") kontMerah = "";
    const altMerah = (namaMerah || kontMerah) ? (kontMerah ? `${namaMerah}\n${kontMerah}` : namaMerah) : "-";

    // Blue corner data formatted exactly like PON XX
    let namaBiru = String(row['Nama Pesilat Biru'] || row.namaPesilatBiru || row.atlitBiru?.nama || '-').toUpperCase();
    if (namaBiru === "SUDUT KOSONG") namaBiru = "";
    let kontBiru = String(row['Kontingen Biru'] || row.kontingenBiru || row.atlitBiru?.kontingen || '').toUpperCase();
    if (kontBiru === "SUDUT KOSONG") kontBiru = "";
    const altBiru = (namaBiru || kontBiru) ? (kontBiru ? `${namaBiru}\n${kontBiru}` : namaBiru) : "-";

    return [
      noStr,
      pStr,
      kelasFormatted,
      altBiru,
      altMerah,
      "" // Empty Remark with a clean split outline column style
    ];
  });

  // Call autoTable with customized styles matching the official table image
  autoTable(doc, {
    startY: boxY + boxHeight + 4.5,
    head: [['NO', 'PARTAI', 'KELAS', 'BIRU', 'MERAH', 'SKOR']],
    body: tableData,
    theme: 'grid',
    margin: { top: 22.5, left: 22.5, right: 22.5, bottom: 50.0 }, // Bottom margin: 5 cm (50.0 mm)
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      valign: 'middle',
      halign: 'center',
      lineColor: [203, 213, 225], // Slim, modern, elegant slate vertical borders
      lineWidth: 0.2,
      textColor: [15, 23, 42], // Slate 900
      font: 'helvetica',
    },
    headStyles: {
      fontStyle: 'bold',
      fontSize: 9.5,
      lineColor: [203, 213, 225], // Header slate vertical lines
      lineWidth: 0.2,
      cellPadding: 4,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 14, halign: 'center' }, // NO
      1: { fontStyle: 'bold', cellWidth: 22, halign: 'center', fontSize: 10.5 }, // PARTAI
      2: { cellWidth: 33, halign: 'center', fontSize: 8, fontStyle: 'bold' }, // KELAS
      3: { cellWidth: 39, halign: 'center', fontStyle: 'bold' }, // BIRU (Accentured dynamically)
      4: { cellWidth: 39, halign: 'center', fontStyle: 'bold' }, // MERAH (Accentured dynamically)
      5: { cellWidth: 23.9, halign: 'center' }, // SKOR
    },
    didParseCell: (data: any) => {
      if (data.section === 'head') {
        if (data.column.index === 3) {
          // BLUE CORNER Header Style
          data.cell.styles.fillColor = [29, 78, 216]; // Modern blue
          data.cell.styles.textColor = [255, 255, 255];
        } else if (data.column.index === 4) {
          // RED CORNER Header Style
          data.cell.styles.fillColor = [220, 38, 38]; // Modern red
          data.cell.styles.textColor = [255, 255, 255];
        } else {
          // Common Header Style (Purple, Accent 4, darker 25% - [84, 36, 120] for elegant presentation)
          data.cell.styles.fillColor = [84, 36, 120]; 
          data.cell.styles.textColor = [255, 255, 255];
        }
      } else if (data.section === 'body') {
        const isAlternate = data.row.index % 2 === 1;
        if (data.column.index === 3) {
          // Soft blue background tint with beautiful blue typography for Blue Corner
          data.cell.styles.fillColor = isAlternate ? [239, 246, 255] : [248, 250, 252];
          data.cell.styles.textColor = [29, 78, 216];
        } else if (data.column.index === 4) {
          // Soft red background tint with beautiful red typography for Red Corner
          data.cell.styles.fillColor = isAlternate ? [254, 242, 242] : [255, 244, 244];
          data.cell.styles.textColor = [185, 28, 28];
        } else {
          // Soft Slate row alternating
          if (isAlternate) {
            data.cell.styles.fillColor = [248, 250, 252]; // Slate-50
          }
        }
      }
    },
    didDrawCell: (data: any) => {
      // Draw horizontal line at the bottom of each cell in SOLID BLACK
      doc.setDrawColor(0, 0, 0); // Pure Black
      doc.setLineWidth(0.35);
      doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);

      // Draw horizontal line at the top of the header cells to close the table top border elegantly in black
      if (data.row.index === 0 && data.section === 'head') {
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
      }

      // Draw custom Score / Victory Status inside the SKOR column (column index 5)
      if (data.section === 'body' && data.column.index === 5) {
        const rowObj = scheduleRows[data.row.index];
        if (rowObj) {
          const pStr = String(rowObj['Partai'] || rowObj.partai || (data.row.index + 1));
          const h = matchHistory.find(item => String(item.partai) === String(pStr));
          if (h && h.pemenang) {
            const winnerCorner = h.pemenang;
            const isBlueWin = (winnerCorner === 'BIRU' || winnerCorner === 'DISK_BIRU');
            
            // Determine victory status
            let status = 'ANGKA';
            if (h.victoryType) {
              if (h.victoryType === 'UNDUR_DIRI' || h.victoryType === 'UD') status = 'UD';
              else if (h.victoryType === 'DISKUALIFIKASI') status = 'DISK';
              else status = h.victoryType;
            } else if (h.wmpWon) {
              status = 'WMP';
            } else if (winnerCorner.startsWith('DISK_') || h.diskualifikasi) {
              status = 'DISK';
            }

            const cellX = data.cell.x;
            const cellY = data.cell.y;
            const cellWidth = data.cell.width;
            const cellHeight = data.cell.height;

            if (status === 'ANGKA') {
              // Standard Point-based Score: e.g. "12 - 9"
              const textBlue = String(h.skorAkhirBiru ?? 0);
              const separator = " - ";
              const textRed = String(h.skorAkhirMerah ?? 0);

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(9.5);
              
              const wBlue = doc.getTextWidth(textBlue);
              const wSep = doc.getTextWidth(separator);
              const wRed = doc.getTextWidth(textRed);
              const totalWidth = wBlue + wSep + wRed;

              const startX = cellX + (cellWidth - totalWidth) / 2;
              const textY = cellY + (cellHeight / 2) + 1.1;

              // Draw Blue score in blue
              doc.setTextColor(29, 78, 216);
              doc.text(textBlue, startX, textY);

              // Draw separator in black
              doc.setTextColor(0, 0, 0);
              doc.text(separator, startX + wBlue, textY);

              // Draw Red score in red
              doc.setTextColor(185, 28, 28);
              doc.text(textRed, startX + wBlue + wSep, textY);
            } else {
              // Victory type text: TEKNIK, MUTLAK, WMP, UD, DISK
              let label = status;
              if (status === 'UNDUR_DIRI') label = 'UD';
              if (status === 'DISKUALIFIKASI') label = 'DISK';

              doc.setFont('helvetica', 'bold');
              doc.setFontSize(8.5);

              const wText = doc.getTextWidth(label);
              const startX = cellX + (cellWidth - wText) / 2;
              const textY = cellY + (cellHeight / 2) + 1.1;

              // Color font based on winner's corner (Blue or Red)
              if (isBlueWin) {
                doc.setTextColor(29, 78, 216); // Modern Blue
              } else {
                doc.setTextColor(185, 28, 28); // Modern Red
              }

              doc.text(label, startX, textY);
            }
          }
        }
      }

      // Draw horizontal line through defeated competitor (strikethrough)
      if (data.section === 'body') {
        const rowObj = scheduleRows[data.row.index];
        if (rowObj) {
          const pStr = String(rowObj['Partai'] || rowObj.partai || (data.row.index + 1));
          const h = matchHistory.find(item => String(item.partai) === String(pStr));
          if (h && h.pemenang) {
            const winnerCorner = h.pemenang;
            const isBlueLoser = (winnerCorner === 'MERAH' || winnerCorner === 'DISK_MERAH');
            const isRedLoser = (winnerCorner === 'BIRU' || winnerCorner === 'DISK_BIRU');

            if ((data.column.index === 3 && isBlueLoser) || (data.column.index === 4 && isRedLoser)) {
              // Draw a strike line across each text line
              doc.setDrawColor(0, 0, 0); // Pure Black
              doc.setLineWidth(0.65); // Bolder appearance
              const textLines = data.cell.text || [];
              if (textLines.length > 0) {
                const cellHeight = data.cell.height;
                const totalLines = textLines.length;
                const textPos = data.cell.textPos;
                const fontSize = data.cell.styles.fontSize || 7.5;
                const scaleFactor = doc.internal.scaleFactor || 2.83464;
                const fontHeightInMm = fontSize / scaleFactor;
                const lineHeight = data.cell.styles.lineHeight || 1.15;
                
                textLines.forEach((line: string, lineIdx: number) => {
                  if (line && line.trim() !== "" && line.trim() !== "-") {
                    const spacing = (fontSize * lineHeight) / scaleFactor;
                    const textY = data.cell.y + (cellHeight - (totalLines - 1) * spacing) / 2 + lineIdx * spacing;
                    const textWidth = doc.getTextWidth(line);
                    const cellWidth = data.cell.width;
                    
                    // Center the line relative to the cell
                    const startX = data.cell.x + (cellWidth - textWidth) / 2;
                    const endX = startX + textWidth;
                    
                    doc.line(startX, textY, endX, textY);
                  }
                });
              }
            }
          }
        }
      }
    },
  });

  // Footer / Authority Line & Official Signature Blocks (Placed cleanly within the bottom 50 mm margin)
  const totalPages = doc.internal.getNumberOfPages();
  doc.setPage(totalPages);

  const sigY = 312; // Beautifully aligned inside the bottom 50mm margin (which spans 305.6 - 355.6 mm)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);

  // Left Signee (Ketua Pelaksana)
  doc.text("Mengetahui,", 45, sigY, { align: 'center' });
  doc.text("Ketua Pelaksana", 45, sigY + 4, { align: 'center' });
  doc.line(25, sigY + 24, 65, sigY + 24); // Signature line
  doc.text("( _____________________ )", 45, sigY + 28, { align: 'center' });

  // Right Signee (Sekretaris Pertandingan)
  const rightSignX = 165;
  doc.text("Panitia Pelaksana,", rightSignX, sigY, { align: 'center' });
  doc.text("Sekretaris Pertandingan", rightSignX, sigY + 4, { align: 'center' });
  doc.line(145, sigY + 24, 185, sigY + 24); // Signature line
  doc.text("( _____________________ )", rightSignX, sigY + 28, { align: 'center' });

  // Print automated system credit text at the very bottom
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(`Dicetak otomatis menggunakan Sistem Digital Scoring Pencak Silat - DISCORS pada ${new Date().toLocaleString('id-ID')}`, 22.5, 348);

  doc.save(`Jadwal_Pertandingan_${eventName.replace(/\s+/g, '_')}.pdf`);
}

