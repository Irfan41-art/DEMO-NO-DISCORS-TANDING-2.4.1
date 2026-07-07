/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MatchState, MatchHistoryEntry } from '../types';
import { calculateCornerScores, getStoredHistory, saveStoredHistory } from '../utils/storage';
import { FileText, Play, Pause, RotateCcw, Save, Upload, Download, Trash2, ArrowRight, Settings, Users, AlertCircle, Calendar, Maximize2, Minimize2, RefreshCw, Loader2 } from 'lucide-react';
import { playClickSound, playGongSound, playSuccessSound } from '../utils/audio';
import { useJuriStatuses } from '../hooks/useJuriStatuses';

interface SekretarisPanelProps {
  matchState: MatchState;
  toggleTimer: () => void;
  resetTimer: () => void;
  setBabak: (babak: number) => void;
  resetMatchState: (customState?: Partial<MatchState>) => void;
  updateSettings: (settings: Partial<MatchState['settings']>) => void;
  updateAthletes: (merah: Partial<MatchState['merah']['atlit']>, biru: Partial<MatchState['biru']['atlit']>) => void;
  onBackToLanding?: () => void;
  forceSync: () => void;
}

export const SekretarisPanel: React.FC<SekretarisPanelProps> = ({
  matchState,
  toggleTimer,
  resetTimer,
  setBabak,
  resetMatchState,
  updateSettings,
  updateAthletes,
  onBackToLanding,
  forceSync,
}) => {
  const [activeTab, setActiveTab] = useState<'SETUP' | 'KONTROL'>('SETUP');
  const juriStatuses = useJuriStatuses();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    playClickSound();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error enabling fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  };
  
  // Local state for setup inputs
  const [inpEventName, setInpEventName] = useState(matchState.settings.eventName);
  const [inpPartai, setInpPartai] = useState(matchState.settings.partai);
  const [inpBabakSeksi, setInpBabakSeksi] = useState(matchState.settings.babakSeksi);
  const [inpKelasNomor, setInpKelasNomor] = useState(matchState.settings.kelasNomor);
  const [inpGender, setInpGender] = useState(matchState.settings.gender);
  const [inpDurasi, setInpDurasi] = useState(matchState.settings.durasiBabak);

  const [inpMerahNama, setInpMerahNama] = useState(matchState.merah.atlit.nama);
  const [inpMerahKontingen, setInpMerahKontingen] = useState(matchState.merah.atlit.kontingen);
  const [inpBiruNama, setInpBiruNama] = useState(matchState.biru.atlit.nama);
  const [inpBiruKontingen, setInpBiruKontingen] = useState(matchState.biru.atlit.kontingen);

  // Logo loading base64 state
  const [logoLeft, setLogoLeft] = useState(matchState.settings.logoLeft);
  const [logoRight, setLogoRight] = useState(matchState.settings.logoRight);
  const [logoCentral, setLogoCentral] = useState(matchState.settings.logoCentral || 'IPSI');

  // Confirmation popups
  const [showNextBabakPopup, setShowNextBabakPopup] = useState(false);
  const [pendingNextBabak, setPendingNextBabak] = useState<number | null>(null);

  const [panelToast, setPanelToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [resetConfirmArmed, setResetConfirmArmed] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setPanelToast({ message, type });
    // Safe progressive timeout
    setTimeout(() => {
      setPanelToast(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  // History state loaded from localstorage
  const [matchHistory, setMatchHistory] = useState<MatchHistoryEntry[]>(() => getStoredHistory());

  interface ImportedMatchDetail {
    partai: string;
    babakSeksi: string;
    kelasNomor: string;
    gender: 'PUTRA' | 'PUTRI';
    merahNama: string;
    merahKontingen: string;
    biruNama: string;
    biruKontingen: string;
    durasi: number;
  }

  // States for Word (.docx) & PDF athlete data importer
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importedFields, setImportedFields] = useState<{
    eventName: string;
    matches: ImportedMatchDetail[];
    rawText: string;
  } | null>(null);

  const [isImportingDoc, setIsImportingDoc] = useState(false);

  // Interface for CSV Match List Import
  interface ImportedMatch {
    id: string;
    partai: string;
    kelasNomor: string;
    babakSeksi: string;
    gender: 'PUTRA' | 'PUTRI';
    merahNama: string;
    merahKontingen: string;
    biruNama: string;
    biruKontingen: string;
    durasi: number;
  }

  // States for CSV Match List Import
  const [importedMatches, setImportedMatches] = useState<ImportedMatch[]>(() => {
    try {
      const saved = localStorage.getItem('silat_imported_matches');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [importTab, setImportTab] = useState<'CSV' | 'DOC'>('CSV');
  const [showCSVHelper, setShowCSVHelper] = useState(false);
  const [csvPasteText, setCsvPasteText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);

  const saveImportedMatches = (matches: ImportedMatch[]) => {
    setImportedMatches(matches);
    try {
      localStorage.setItem('silat_imported_matches', JSON.stringify(matches));
    } catch (e) {
      console.error(e);
    }
  };

  const parseCSVMatches = (text: string): ImportedMatch[] => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) return [];

    // Detect delimiter
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';')) {
      delimiter = ';';
    } else if (firstLine.includes('\t')) {
      delimiter = '\t';
    }

    // Parse header
    const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    
    // Find index of headers dynamically
    const idxPartai = headers.findIndex(h => h.includes('partai') || h.includes('match') || h.includes('no'));
    const idxKelas = headers.findIndex(h => h.includes('kelas') || h.includes('nomor') || h.includes('class') || h.includes('kategori'));
    const idxBabak = headers.findIndex(h => h.includes('babak') || h.includes('round') || h.includes('fase') || h.includes('tahap'));
    const idxGender = headers.findIndex(h => h.includes('gender') || h.includes('sex') || h.includes('jenis kelamin'));
    const idxMerahNama = headers.findIndex(h => h.includes('nama merah') || h.includes('merah nama') || (h.includes('merah') && h.includes('nama')) || h.includes('red corner') || h.includes('red_name'));
    const idxMerahKontingen = headers.findIndex(h => h.includes('kontingen merah') || h.includes('merah kontingen') || (h.includes('merah') && h.includes('kontingen')) || h.includes('red_team') || h.includes('asal merah'));
    const idxBiruNama = headers.findIndex(h => h.includes('nama biru') || h.includes('biru nama') || (h.includes('biru') && h.includes('nama')) || h.includes('blue corner') || h.includes('blue_name'));
    const idxBiruKontingen = headers.findIndex(h => h.includes('kontingen biru') || h.includes('biru kontingen') || (h.includes('biru') && h.includes('kontingen')) || h.includes('blue_team') || h.includes('asal biru'));
    const idxDurasi = headers.findIndex(h => h.includes('durasi') || h.includes('duration') || h.includes('waktu'));

    const matches: ImportedMatch[] = [];

    for (let i = 1; i < lines.length; i++) {
      let cols: string[] = [];
      const line = lines[i];
      
      // Basic CSV splitter that handles quotes around commas
      if (line.includes('"')) {
        let inQuotes = false;
        let currentField = '';
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
          const char = line[charIndex];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            cols.push(currentField);
            currentField = '';
          } else {
            currentField += char;
          }
        }
        cols.push(currentField);
      } else {
        cols = line.split(delimiter);
      }

      // Skip lines with too few columns
      if (cols.length < 2) continue;

      const partai = idxPartai !== -1 && cols[idxPartai] ? cols[idxPartai].trim().replace(/"/g, '') : `${i}`;
      const kelasNomor = idxKelas !== -1 && cols[idxKelas] ? cols[idxKelas].trim().replace(/"/g, '') : 'Kelas C';
      
      let babakRaw = idxBabak !== -1 && cols[idxBabak] ? cols[idxBabak].trim().replace(/"/g, '') : 'Penyisihan';
      let babakSeksi = 'Penyisihan';
      if (babakRaw.toLowerCase().includes('final') && !babakRaw.toLowerCase().includes('semi') && !babakRaw.toLowerCase().includes('perempat')) {
        babakSeksi = 'Final';
      } else if (babakRaw.toLowerCase().includes('semi')) {
        babakSeksi = 'Semifinal';
      } else if (babakRaw.toLowerCase().includes('perempat')) {
        babakSeksi = 'Perempatfinal';
      }

      let genderRaw = idxGender !== -1 && cols[idxGender] ? cols[idxGender].trim().replace(/"/g, '') : 'PUTRA';
      let gender: 'PUTRA' | 'PUTRI' = 'PUTRA';
      if (genderRaw.toUpperCase().includes('PUTRI') || genderRaw.toUpperCase().includes('FEMALE') || genderRaw.toUpperCase().includes('WOMAN')) {
        gender = 'PUTRI';
      }

      const getVal = (idx: number, fallbackColNum: number, defaultVal: string = '') => {
        if (idx !== -1 && cols[idx] !== undefined) {
          return cols[idx].trim().replace(/^"|"$/g, '');
        }
        if (cols[fallbackColNum] !== undefined) {
          return cols[fallbackColNum].trim().replace(/^"|"$/g, '');
        }
        return defaultVal;
      };

      const merahNama = getVal(idxMerahNama, 4, 'Pesilat Merah').toUpperCase();
      const merahKontingen = getVal(idxMerahKontingen, 5, '').toUpperCase();
      const biruNama = getVal(idxBiruNama, 6, 'Pesilat Biru').toUpperCase();
      const biruKontingen = getVal(idxBiruKontingen, 7, '').toUpperCase();
      
      const durasiStr = getVal(idxDurasi, 8, '120');
      let durasi = parseInt(durasiStr);
      if (isNaN(durasi)) durasi = 120;

      matches.push({
        id: `match_${partai}_${Date.now()}_${i}`,
        partai,
        kelasNomor,
        babakSeksi,
        gender,
        merahNama,
        merahKontingen,
        biruNama,
        biruKontingen,
        durasi
      });
    }

    return matches;
  };

  const handleImportCSVMatches = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension !== 'csv' && fileExtension !== 'txt') {
        alert('Format berkas tidak didukung. Harap unggah berkas .csv atau .txt.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const text = evt.target?.result as string;
          if (!text || !text.trim()) {
            alert('Berkas kosong atau tidak valid.');
            return;
          }

          const parsed = parseCSVMatches(text);
          if (parsed.length === 0) {
            alert('Gagal mendeteksi data pertandingan. Pastikan data memiliki baris data dan format header yang tepat.');
            return;
          }

          const updated = [...importedMatches, ...parsed];
          const uniqueMatches: ImportedMatch[] = [];
          const seenPartai = new Set();
          updated.forEach(m => {
            if (!seenPartai.has(m.partai)) {
              seenPartai.add(m.partai);
              uniqueMatches.push(m);
            }
          });

          uniqueMatches.sort((a, b) => {
            const numA = parseInt(a.partai);
            const numB = parseInt(b.partai);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a.partai.localeCompare(b.partai);
          });

          saveImportedMatches(uniqueMatches);
          playSuccessSound();
          alert(`Sukses mengimpor ${parsed.length} jadwal pertandingan dari file CSV secara masal!`);
        } catch (err: any) {
          console.error(err);
          alert('Gagal memproses berkas CSV: ' + (err.message || err));
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }
  };

  const handleImportCSVPaste = () => {
    playClickSound();
    if (!csvPasteText.trim()) {
      alert('Teks kosong. Sila tempel data CSV atau teks tabel Excel terlebih dahulu.');
      return;
    }

    try {
      const parsed = parseCSVMatches(csvPasteText);
      if (parsed.length === 0) {
        alert('Gagal mendeteksi data pertandingan. Pastikan data memiliki baris data dan format header yang tepat.');
        return;
      }

      const updated = [...importedMatches, ...parsed];
      const uniqueMatches: ImportedMatch[] = [];
      const seenPartai = new Set();
      updated.forEach(m => {
        if (!seenPartai.has(m.partai)) {
          seenPartai.add(m.partai);
          uniqueMatches.push(m);
        }
      });

      uniqueMatches.sort((a, b) => {
        const numA = parseInt(a.partai);
        const numB = parseInt(b.partai);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a.partai.localeCompare(b.partai);
      });

      saveImportedMatches(uniqueMatches);
      setCsvPasteText('');
      setShowPasteArea(false);
      playSuccessSound();
      alert(`Sukses mengimpor ${parsed.length} jadwal pertandingan dari teks secara masal!`);
    } catch (err: any) {
      console.error(err);
      alert('Gagal memproses data teks: ' + (err.message || err));
    }
  };

  const handleLoadImportedMatch = (match: ImportedMatch) => {
    playClickSound();
    
    setInpPartai(match.partai);
    setInpBabakSeksi(match.babakSeksi);
    setInpKelasNomor(match.kelasNomor);
    setInpGender(match.gender);
    setInpMerahNama(match.merahNama);
    setInpMerahKontingen(match.merahKontingen);
    setInpBiruNama(match.biruNama);
    setInpBiruKontingen(match.biruKontingen);
    setInpDurasi(match.durasi);
    
    updateSettings({
      partai: match.partai,
      babakSeksi: match.babakSeksi,
      kelasNomor: match.kelasNomor,
      gender: match.gender,
      durasiBabak: match.durasi,
      logoCentral: logoCentral,
    });
    updateAthletes(
      { nama: match.merahNama, kontingen: match.merahKontingen },
      { nama: match.biruNama, kontingen: match.biruKontingen }
    );
    
    playSuccessSound();
  };

  const handleDownloadTemplateCSV = () => {
    playClickSound();
    const headers = 'Partai,Kelas,Babak,Gender,Nama Merah,Kontingen Merah,Nama Biru,Kontingen Biru,Durasi\n';
    const row1 = '1,Kelas B Putra Remaja,Penyisihan,PUTRA,HANIFAN YUDANI,JAWA BARAT,IQBAL CANDRA,KALIMANTAN TIMUR,120\n';
    const row2 = '2,Kelas C Putri Dewasa,Semifinal,PUTRI,SAFIRA DWI,JAWA TENGAH,SUCI WULANDARI,DKI JAKARTA,120\n';
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + row1 + row2);
    
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', 'Template_Impor_Pesilat.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isMatchCompleted = (partai: string) => {
    return matchHistory.some(h => `${h.settings.partai}`.trim() === `${partai}`.trim());
  };

  // Parse text function from .docx or .pdf
  const parseDocumentText = (text: string) => {
    const matches: ImportedMatchDetail[] = [];
    let eventName = '';
    
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    
    // Extract event name
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const lower = lines[i].toLowerCase();
      if (lower.includes('event') || lower.includes('kejuaraan') || lower.includes('ipsi') || lower.includes('cup') || lower.includes('championship')) {
        const m = lines[i].match(/[:=](.+)$/);
        eventName = m ? m[1].trim() : lines[i];
        break;
      }
    }
    if (!eventName) eventName = 'KEJUARAAN PENCAK SILAT';

    // Parse lines to detect matches (vs)
    let currentPartaiNum = 1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      
      if (lower.includes('vs')) {
        const parts = line.split(/vs/i);
        if (parts.length === 2) {
          const left = parts[0].trim();
          const right = parts[1].trim();
          
          let merahNama = left;
          let merahKontingen = '';
          let biruNama = right;
          let biruKontingen = '';
          
          const leftBracket = left.match(/^([^(]+)(?:\(([^)]+)\))?$/);
          const rightBracket = right.match(/^([^(]+)(?:\(([^)]+)\))?$/);
          
          if (leftBracket) {
            merahNama = leftBracket[1].trim();
            if (leftBracket[2]) merahKontingen = leftBracket[2].trim();
          }
          if (rightBracket) {
            biruNama = rightBracket[1].trim();
            if (rightBracket[2]) biruKontingen = rightBracket[2].trim();
          }
          
          let partai = String(currentPartaiNum++);
          let kelasNomor = 'KELAS C';
          let babakSeksi = 'Penyisihan';
          let gender: 'PUTRA' | 'PUTRI' = 'PUTRA';
          let durasi = 120;
          
          // Peek surrounding lines for metadata
          for (let j = Math.max(0, i - 4); j < i; j++) {
            const metaLine = lines[j].toLowerCase();
            if (metaLine.includes('partai')) {
              const numM = lines[j].match(/\d+/);
              if (numM) partai = numM[0];
            }
            if (metaLine.includes('kelas') || metaLine.includes('kategori')) {
              const km = lines[j].match(/[:=](.+)$/);
              kelasNomor = km ? km[1].trim() : lines[j];
            }
            if (metaLine.includes('putri') || metaLine.includes('putra')) {
              gender = metaLine.includes('putri') ? 'PUTRI' : 'PUTRA';
            }
            if (metaLine.includes('final')) {
              if (metaLine.includes('semi')) babakSeksi = 'Semifinal';
              else if (metaLine.includes('perempat')) babakSeksi = 'Perempatfinal';
              else babakSeksi = 'Final';
            }
          }
          
          if (line.toUpperCase().includes('PUTRI') || line.toLowerCase().includes('putri') || line.toUpperCase().includes('PUTRI')) {
            gender = 'PUTRI';
          }
          
          matches.push({
            partai,
            babakSeksi,
            kelasNomor,
            gender,
            merahNama,
            merahKontingen: merahKontingen || 'KONTINGEN MERAH',
            biruNama,
            biruKontingen: biruKontingen || 'KONTINGEN BIRU',
            durasi,
          });
        }
      }
    }

    if (matches.length === 0) {
      matches.push({
        partai: '1',
        babakSeksi: 'Penyisihan',
        kelasNomor: 'KELAS TANDING',
        gender: 'PUTRA',
        merahNama: 'PESILAT MERAH',
        merahKontingen: 'KONTINGEN MERAH',
        biruNama: 'PESILAT BIRU',
        biruKontingen: 'KONTINGEN BIRU',
        durasi: 120,
      });
    }

    return {
      eventName,
      matches,
      rawText: text,
    };
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentDurationLabel = (sec: number) => {
    if (sec === 60) return '01.00 MENIT';
    if (sec === 120) return '02.00 MENIT';
    if (sec === 180) return '03.00 MENIT';
    return `${Math.floor(sec / 60)}.00 MENIT`;
  };

  // Turn image select into base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'LEFT' | 'RIGHT' | 'CENTRAL') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (side === 'LEFT') {
          setLogoLeft(base64String);
          updateSettings({ logoLeft: base64String });
        } else if (side === 'RIGHT') {
          setLogoRight(base64String);
          updateSettings({ logoRight: base64String });
        } else {
          setLogoCentral(base64String);
          updateSettings({ logoCentral: base64String });
        }
        playSuccessSound();
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply inputs and save
  const handleSaveSetup = () => {
    playClickSound();
    updateSettings({
      eventName: inpEventName,
      partai: inpPartai,
      babakSeksi: inpBabakSeksi,
      kelasNomor: inpKelasNomor,
      gender: inpGender,
      durasiBabak: inpDurasi,
      logoCentral: logoCentral,
    });
    updateAthletes(
      { nama: inpMerahNama, kontingen: inpMerahKontingen },
      { nama: inpBiruNama, kontingen: inpBiruKontingen }
    );
    playSuccessSound();
    alert('Pengaturan Berhasil Disimpan!');
  };

  // Reset all uploaded match schedule data and active athlete inputs
  const handleResetSecretariatData = () => {
    playClickSound();
    if (!resetConfirmArmed) {
      setResetConfirmArmed(true);
      showToast('Tekan sekali lagi untuk menghapus & reset semua data jadwal!', 'info');
      // Auto disarm after 5 seconds
      setTimeout(() => setResetConfirmArmed(false), 5000);
      return;
    }

    setInpMerahNama('');
    setInpMerahKontingen('');
    setInpBiruNama('');
    setInpBiruKontingen('');
    saveImportedMatches([]);
    setImportedFields(null);
    
    updateAthletes(
      { nama: '', kontingen: '' },
      { nama: '', kontingen: '' }
    );
    
    setResetConfirmArmed(false);
    playSuccessSound();
    showToast('Semua data berhasil di-reset dan antrian jadwal dikosongkan!', 'success');
  };

  // Lock and go to control panel
  const handleStartMatch = () => {
    handleSaveSetup();
    setActiveTab('KONTROL');
  };

  // When timer runs down, check for rounds advancing
  React.useEffect(() => {
    if (matchState.waktuTersisa === 0 && !matchState.timerRunning && !matchState.matchEnded && activeTab === 'KONTROL') {
      if (matchState.babakAktif < 3) {
        setPendingNextBabak(matchState.babakAktif + 1);
        setShowNextBabakPopup(true);
      }
    }
  }, [matchState.waktuTersisa, matchState.timerRunning, matchState.babakAktif, activeTab]);

  const handleNextBabakConfirm = (yes: boolean) => {
    playClickSound();
    setShowNextBabakPopup(false);
    if (yes && pendingNextBabak) {
      setBabak(pendingNextBabak);
    }
    setPendingNextBabak(null);
  };

  // Record active match into historical spreadsheet
  const handleSaveToHistory = () => {
    playClickSound();
    const mScores = calculateCornerScores(matchState, 'MERAH');
    const bScores = calculateCornerScores(matchState, 'BIRU');

    let winner: MatchHistoryEntry['winner'] = 'MERAH';
    if (matchState.merah.disqualified) {
      winner = 'DISK_BIRU'; // Opponent wins on disk
    } else if (matchState.biru.disqualified) {
      winner = 'DISK_MERAH';
    } else {
      winner = mScores.totalScore > bScores.totalScore ? 'MERAH' : 'BIRU';
    }

    const entry: MatchHistoryEntry = {
      id: `history_${Date.now()}`,
      settings: matchState.settings,
      merah: {
        nama: matchState.merah.atlit.nama,
        kontingen: matchState.merah.atlit.kontingen,
      },
      biru: {
        nama: matchState.biru.atlit.nama,
        kontingen: matchState.biru.atlit.kontingen,
      },
      merahTotal: mScores.totalScore,
      biruTotal: bScores.totalScore,
      winner,
      date: new Date().toLocaleString('id-ID'),
      merahScoresByBabak: mScores.hitsByBabak,
      biruScoresByBabak: bScores.hitsByBabak,
      details: {
        merahJatuhanCount: matchState.merah.jatuhanScore / 3,
        biruJatuhanCount: matchState.biru.jatuhanScore / 3,
        merahPenalties: Object.entries(matchState.merah.penalties)
          .filter(([_, v]) => v)
          .map(([k]) => k.toUpperCase()),
        biruPenalties: Object.entries(matchState.biru.penalties)
          .filter(([_, v]) => v)
          .map(([k]) => k.toUpperCase()),
        verifiedHits: matchState.verifiedHits,
      }
    };

    const updated = [entry, ...matchHistory];
    setMatchHistory(updated);
    saveStoredHistory(updated);
    playSuccessSound();
    alert('Hasil pertandingan berhasil diarsipkan ke sejarah sekretaris!');
  };

  const handleClearHistory = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus seluruh riwayat pertandingan?')) {
      playClickSound();
      setMatchHistory([]);
      saveStoredHistory([]);
    }
  };

  // EXPORT ARCHIVE TO CSV
  const handleExportCSV = () => {
    playClickSound();
    if (matchHistory.length === 0) {
      alert('Sejarah kosong, tidak ada data untuk diekspor.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Tanggal/Waktu,Nama Event,Partai,Babak,Seksi/Kelas,Gender,Nama Merah,Kontingen Merah,Skor Merah,Nama Biru,Kontingen Biru,Skor Biru,Pemenang,Keterangan Penalti Merah,Keterangan Penalti Biru\n';

    matchHistory.forEach((h) => {
      const row = [
        `"${h.date}"`,
        `"${h.settings.eventName}"`,
        `"${h.settings.partai}"`,
        `"${h.settings.babakSeksi}"`,
        `"${h.settings.kelasNomor}"`,
        `"${h.settings.gender}"`,
        `"${h.merah?.nama || 'N/A'}"`,
        `"${h.merah?.kontingen || 'N/A'}"`,
        h.merahTotal,
        `"${h.biru?.nama || 'N/A'}"`,
        `"${h.biru?.kontingen || 'N/A'}"`,
        h.biruTotal,
        `"${h.winner}"`,
        `"${h.details.merahPenalties.join(';')}"`,
        `"${h.details.biruPenalties.join(';')}"`,
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Pencak_Silat_Match_History.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // BULK MATCH IMPORT - Changed to handle Word (.docx) and PDF as requested
  const handleImportDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension !== 'docx' && fileExtension !== 'pdf') {
        alert('Hanya mendukung berkas berformat Word (.docx) atau PDF (.pdf).');
        return;
      }

      setIsImportingDoc(true);

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          let extractedText = '';

          if (fileExtension === 'docx') {
            // Check if mammoth library is loaded in window
            if (!(window as any).mammoth) {
              alert('Pustaka Mammoth.js gagal dimuat. Periksa koneksi internet Anda atau muat ulang halaman.');
              setIsImportingDoc(false);
              return;
            }
            const result = await (window as any).mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            extractedText = result.value;
          } else if (fileExtension === 'pdf') {
            // Check if pdfjsLib is loaded in window
            if (!(window as any).pdfjsLib) {
              alert('Pustaka PDF.js gagal dimuat. Periksa koneksi internet Anda atau muat ulang halaman.');
              setIsImportingDoc(false);
              return;
            }

            const pdfjsLib = (window as any).pdfjsLib;
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
            const pdf = await loadingTask.promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\n';
            }
            extractedText = fullText;
          }

          if (!extractedText.trim()) {
            alert('Berkas yang diunggah kosong atau tidak memiliki teks yang terbaca.');
            setIsImportingDoc(false);
            return;
          }

          // Parse the extracted text using server-side Gemini route, fallback to local parsing on rejection
          let parsed: any = null;
          try {
            const apiRes = await fetch('/api/parse-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: extractedText })
            });
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              if (apiData.success && apiData.data) {
                parsed = apiData.data;
                parsed.rawText = extractedText; // preserve raw text for comparison preview
                console.log('[DEBUG] AI successfully parsed match document:', parsed);
              }
            }
          } catch (apiErr) {
            console.warn('[WARN] Server AI parser failed, utilizing client-side parser fallback.', apiErr);
          }

          if (!parsed) {
            parsed = parseDocumentText(extractedText);
          }

          setImportedFields(parsed);
          setShowImportPreview(true);
          playSuccessSound();
        } catch (err: any) {
          console.error(err);
          alert('Gagal memproses berkas: ' + (err.message || err));
        } finally {
          setIsImportingDoc(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleUpdateMatchField = (index: number, fieldName: keyof ImportedMatchDetail, value: any) => {
    if (!importedFields) return;
    const updatedMatches = [...importedFields.matches];
    updatedMatches[index] = {
      ...updatedMatches[index],
      [fieldName]: value
    };
    setImportedFields({
      ...importedFields,
      matches: updatedMatches
    });
  };

  const handleSelectImportedMatch = (match: ImportedMatchDetail) => {
    if (!importedFields) return;
    const eventNameUpper = importedFields.eventName.toUpperCase();
    setInpEventName(eventNameUpper);
    setInpPartai(match.partai);
    setInpBabakSeksi(match.babakSeksi);
    setInpKelasNomor(match.kelasNomor.toUpperCase());
    setInpGender(match.gender);
    setInpMerahNama(match.merahNama.toUpperCase());
    setInpMerahKontingen(match.merahKontingen.toUpperCase());
    setInpBiruNama(match.biruNama.toUpperCase());
    setInpBiruKontingen(match.biruKontingen.toUpperCase());
    setInpDurasi(match.durasi);

    updateSettings({
      eventName: eventNameUpper,
      partai: match.partai,
      babakSeksi: match.babakSeksi,
      kelasNomor: match.kelasNomor.toUpperCase(),
      gender: match.gender,
      durasiBabak: match.durasi,
      logoCentral: logoCentral,
    });
    updateAthletes(
      { nama: match.merahNama.toUpperCase(), kontingen: match.merahKontingen.toUpperCase() },
      { nama: match.biruNama.toUpperCase(), kontingen: match.biruKontingen.toUpperCase() }
    );
    
    setShowImportPreview(false);
    playSuccessSound();
    alert(`Data Partai Ke-${match.partai} (${match.merahNama.toUpperCase()} VS ${match.biruNama.toUpperCase()}) berhasil diterapkan ke arena!`);
  };

  const confirmApplyImported = () => {
    if (!importedFields || importedFields.matches.length === 0) {
      setShowImportPreview(false);
      return;
    }
    
    // Map details to scheduler queue format
    const newMatches: ImportedMatch[] = importedFields.matches.map((m, idx) => ({
      id: 'doc_' + Date.now() + '_' + idx + '_' + Math.random().toString(36).substr(2, 4),
      partai: m.partai,
      kelasNomor: m.kelasNomor.toUpperCase(),
      babakSeksi: m.babakSeksi,
      gender: m.gender,
      merahNama: m.merahNama.toUpperCase(),
      merahKontingen: m.merahKontingen.toUpperCase(),
      biruNama: m.biruNama.toUpperCase(),
      biruKontingen: m.biruKontingen.toUpperCase(),
      durasi: m.durasi
    }));

    // Update global Event Name
    const eventNameUpper = importedFields.eventName.toUpperCase();
    setInpEventName(eventNameUpper);
    updateSettings({
      eventName: eventNameUpper
    });

    // Populate the imported matches queue in Sekretaris Panel
    const updatedQueue = [...importedMatches, ...newMatches];
    saveImportedMatches(updatedQueue);

    // Load first match as active automatically
    const firstMatch = newMatches.sort((a, b) => (parseInt(a.partai) || 0) - (parseInt(b.partai) || 0))[0];
    if (firstMatch) {
      setInpPartai(firstMatch.partai);
      setInpBabakSeksi(firstMatch.babakSeksi);
      setInpKelasNomor(firstMatch.kelasNomor);
      setInpGender(firstMatch.gender);
      setInpMerahNama(firstMatch.merahNama);
      setInpMerahKontingen(firstMatch.merahKontingen);
      setInpBiruNama(firstMatch.biruNama);
      setInpBiruKontingen(firstMatch.biruKontingen);
      setInpDurasi(firstMatch.durasi);
      
      updateSettings({
        eventName: eventNameUpper,
        partai: firstMatch.partai,
        babakSeksi: firstMatch.babakSeksi,
        kelasNomor: firstMatch.kelasNomor,
        gender: firstMatch.gender,
        durasiBabak: firstMatch.durasi,
        logoCentral: logoCentral,
      });
      updateAthletes(
        { nama: firstMatch.merahNama, kontingen: firstMatch.merahKontingen },
        { nama: firstMatch.biruNama, kontingen: firstMatch.biruKontingen }
      );
    }

    setShowImportPreview(false);
    playSuccessSound();
    showToast(`Berhasil mengimpor ${newMatches.length} pertandingan! Partai ${firstMatch?.partai || 1} diaktifkan.`, 'success');
  };

  const handleLoadNextMatch = () => {
    playClickSound();
    if (importedMatches.length === 0) {
      showToast('Antrian jadwal kosong. Unggah/Impor jadwal pertandingan terlebih dahulu!', 'error');
      return;
    }

    // Sort imported matches sequentially
    const sorted = [...importedMatches].sort((a, b) => {
      const numA = parseInt(a.partai) || 0;
      const numB = parseInt(b.partai) || 0;
      return numA - numB;
    });

    // Find index of current active match in the sorted queue
    let nextMatch: ImportedMatch | undefined = undefined;
    const cleanInpPartai = String(inpPartai || '').trim();
    const currentIndex = sorted.findIndex(m => String(m.partai || '').trim() === cleanInpPartai);
    
    if (currentIndex !== -1 && currentIndex + 1 < sorted.length) {
      nextMatch = sorted[currentIndex + 1];
    } else {
      // Fallback: search for first match with a larger number
      const currentPartaiInt = parseInt(cleanInpPartai) || 0;
      nextMatch = sorted.find(m => (parseInt(m.partai) || 0) > currentPartaiInt);
    }

    if (nextMatch) {
      handleLoadImportedMatch(nextMatch);
      showToast(`Aktif: Partai Ke-${nextMatch.partai} (${nextMatch.merahNama} vs ${nextMatch.biruNama})`, 'success');
    } else {
      showToast('Semua pertandingan telah selesai! Tidak ditemukan partai selanjutnya.', 'info');
    }
  };

  return (
    <div className="w-full flex flex-col h-screen select-none bg-[#03060f] text-slate-100 p-2 md:p-4 overflow-hidden relative font-sans">
      
      {/* Toast Notification Banner */}
      {panelToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] animate-bounce pointer-events-none">
          <div className={`px-5 py-3 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs font-black uppercase tracking-wider backdrop-blur-md ${
            panelToast.type === 'success' 
              ? 'bg-emerald-950/95 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' 
              : panelToast.type === 'error'
              ? 'bg-red-955/95 text-red-400 border-red-500/30 shadow-red-500/10'
              : 'bg-amber-955/95 text-amber-400 border-amber-500/30 shadow-amber-500/10'
          }`}>
            <span className="w-2.5 h-2.5 rounded-full bg-current animate-ping shrink-0" />
            <span>{panelToast.message}</span>
          </div>
        </div>
      )}
      
      {/* HEADER BAR */}
      <header className="flex justify-between items-center bg-[#0a0f1d] border border-blue-955/40 px-5 py-3 rounded-2xl shrink-0 mb-3 z-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playClickSound();
              if (onBackToLanding) onBackToLanding();
            }}
            className="px-4 py-1.5 bg-[#12192c] hover:bg-[#1e2945] text-xs font-black rounded-xl border border-blue-955/35 cursor-pointer shadow-md transition-all uppercase tracking-wide text-slate-400 hover:text-slate-100 flex items-center gap-1.5 active:scale-95"
          >
            ← BERANDA
          </button>
          <div>
            <h1 className="text-sm font-black text-amber-500 font-mono tracking-widest uppercase">
              PANEL SEKRETARIS PERTANDINGAN
            </h1>
            <p className="text-[10px] text-slate-500 font-bold leading-none uppercase tracking-wide mt-0.5">
              Inisialisasi Data, Kontrol Kronometer Babak, & Arsip Pertandingan
            </p>
          </div>
        </div>

        {/* TAB TOGGLES & FULLSCREEN CONTROL */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playClickSound();
              forceSync();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a152d] hover:bg-[#11244e] text-[10px] font-black text-emerald-400 hover:text-emerald-300 rounded-xl border border-emerald-950/40 cursor-pointer shadow-md transition-all active:scale-95 select-none relative overflow-hidden group"
            title="SINKRONISASIKAN ULANG KONEKSI JURI & DEWAN"
          >
            <RefreshCw className="w-3.5 h-3.5 transition-transform duration-700 group-hover:rotate-180 text-emerald-400" />
            <span>SINKRONKAN KONEKSI</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#12192c] hover:bg-[#1e2945] text-[10px] font-black text-amber-400 hover:text-amber-300 rounded-xl border border-blue-955/35 cursor-pointer shadow-md transition-all active:scale-95 select-none"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? 'LAYAR NORMAL' : 'LAYAR PENUH'}
          </button>

          <div className="flex bg-[#02050c]/80 border border-blue-955/35 rounded-xl p-1 shrink-0 shadow-inner">
            <button
              onClick={() => { playClickSound(); setActiveTab('SETUP'); }}
              className={`px-4 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all ${
                activeTab === 'SETUP' ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. PENGATURAN MATCH
            </button>
            <button
              onClick={() => { playClickSound(); setActiveTab('KONTROL'); }}
              className={`px-4 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                activeTab === 'KONTROL' ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-3 h-3 fill-current" />
              2. PANEL KONTROL
            </button>
          </div>
        </div>
      </header>

      {/* RENDER BASED ON TAB */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'SETUP' ? (
          
          /* SETUP & INITIALIZATION VIEW */
          <div className="grid grid-cols-12 gap-4">
            
            {/* GENERAL MATCH SETTINGS CARD */}
            <div className="col-span-12 lg:col-span-5 bg-[#070d1a]/80 border-2 border-blue-950/40 rounded-3xl p-4 space-y-4 shadow-lg">
              <h2 className="text-xs font-extrabold text-amber-500 tracking-wider flex items-center gap-2 border-b border-blue-955/40 pb-2 uppercase font-mono">
                <Settings className="w-4 h-4 text-amber-500" /> Detail Kejuaraan & Partai
              </h2>

              {/* Event Name */}
              <div>
                <label className="text-[9px] text-[#475569] uppercase font-mono block mb-1 font-bold">NAMA EVENT KEJUARAAN</label>
                <input
                  type="text"
                  value={inpEventName}
                  onChange={(e) => setInpEventName(e.target.value.toUpperCase())}
                  className="w-full bg-[#02050c]/90 border border-blue-955/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 uppercase focus:border-amber-500 focus:shadow-neon outline-none transition-all shadow-inner font-mono"
                />
              </div>

              {/* Grid 2 Column */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-[#475569] uppercase font-mono block mb-1 font-bold">PARTAI KE</label>
                  <input
                    type="text"
                    value={inpPartai}
                    onChange={(e) => setInpPartai(e.target.value)}
                    className="w-full bg-[#02050c]/90 border border-blue-955/40 rounded-xl px-3 py-2 text-xs font-black text-slate-100 focus:border-amber-500 focus:shadow-neon outline-none transition-all shadow-inner font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-[#475569] uppercase font-mono block mb-1 font-bold">TAHAPAN BABAK</label>
                  <select
                    value={inpBabakSeksi}
                    onChange={(e) => setInpBabakSeksi(e.target.value)}
                    className="w-full bg-[#02050c]/90 border border-blue-955/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:border-amber-500 outline-none transition-all shadow-inner uppercase font-mono"
                  >
                    <option value="Penyisihan">PENYISIHAN</option>
                    <option value="Perempatfinal">PEREMPAT FINAL</option>
                    <option value="Semifinal">SEMI FINAL</option>
                    <option value="Final">FINAL</option>
                  </select>
                </div>
              </div>

              {/* Kelas & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-[#475569] uppercase font-mono block mb-1 font-bold">KELAS / NOMOR</label>
                  <input
                    type="text"
                    value={inpKelasNomor}
                    onChange={(e) => setInpKelasNomor(e.target.value)}
                    className="w-full bg-[#02050c]/90 border border-blue-955/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:border-amber-500 focus:shadow-neon outline-none transition-all shadow-inner uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-[#475569] uppercase font-mono block mb-1 font-bold">GENDER (PUTRA / PUTRI)</label>
                  <div className="grid grid-cols-2 gap-2 h-[34px]">
                    <button
                      onClick={() => setInpGender('PUTRA')}
                      className={`text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        inpGender === 'PUTRA' ? 'bg-gradient-to-r from-blue-650 to-blue-500 text-white shadow-md shadow-blue-500/10' : 'bg-[#02050c] text-slate-400 hover:bg-[#12192c] border border-blue-955/30'
                      }`}
                    >
                      PUTRA
                    </button>
                    <button
                      onClick={() => setInpGender('PUTRI')}
                      className={`text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                        inpGender === 'PUTRI' ? 'bg-gradient-to-r from-pink-650 to-pink-500 text-white shadow-md shadow-pink-500/10' : 'bg-[#02050c] text-slate-400 hover:bg-[#12192c] border border-pink-955/20'
                      }`}
                    >
                      PUTRI
                    </button>
                  </div>
                </div>
              </div>

              {/* Durasi Babak */}
              <div>
                <label className="text-[9px] text-[#475569] uppercase font-mono block mb-1 font-bold">DURASI SETIAP BABAK</label>
                <select
                  value={inpDurasi}
                  onChange={(e) => setInpDurasi(parseInt(e.target.value))}
                  className="w-full bg-[#02050c]/90 border border-blue-955/40 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 focus:border-amber-500 outline-none transition-all shadow-inner font-mono"
                >
                  <option value={60}>01.00 MENIT</option>
                  <option value={120}>02.00 MENIT (Standard)</option>
                  <option value={180}>03.00 MENIT</option>
                </select>
              </div>

              {/* Logo uploads */}
              <div className="grid grid-cols-2 gap-3 border-t border-blue-955/40 pt-3 text-xs">
                <div>
                  <label className="text-[9px] text-slate-500 block mb-1 font-mono uppercase font-bold">LOGO SISI KIRI</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      id="logo-left-ul"
                      onChange={(e) => handleLogoUpload(e, 'LEFT')}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-left-ul"
                      className="flex-1 text-center py-1.5 bg-[#02050c] hover:bg-[#12192c] border border-blue-955/30 rounded-xl text-[10px] font-bold cursor-pointer hover:border-amber-500/40 truncate text-slate-300 transition-all font-mono"
                    >
                      {logoLeft ? '✔ LEFT OK' : 'Cari Gambar'}
                    </label>
                    {logoLeft && (
                      <button
                        onClick={() => { setLogoLeft(''); updateSettings({ logoLeft: '' }); }}
                        className="px-2 py-1 bg-red-955/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs"
                        title="Clear left logo"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-[9px] text-slate-500 block mb-1 font-mono uppercase font-bold">LOGO SISI KANAN</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      id="logo-right-ul"
                      onChange={(e) => handleLogoUpload(e, 'RIGHT')}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-right-ul"
                      className="flex-1 text-center py-1.5 bg-[#02050c] hover:bg-[#12192c] border border-blue-955/30 rounded-xl text-[10px] font-bold cursor-pointer hover:border-amber-500/40 truncate text-slate-300 transition-all font-mono"
                    >
                      {logoRight ? '✔ RIGHT OK' : 'Cari Gambar'}
                    </label>
                    {logoRight && (
                      <button
                        onClick={() => { setLogoRight(''); updateSettings({ logoRight: '' }); }}
                        className="px-2 py-1 bg-red-955/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs"
                        title="Clear right logo"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Logo Tengah Upload & Opsi Pemilihan */}
              <div className="border-t border-blue-955/40 pt-3 space-y-2">
                <label className="text-[9px] text-slate-400 font-mono uppercase font-bold block">LOGO TENGAH (DI ATAS TIMER MONITOR)</label>
                
                {/* 3 Choice Toggles: IPSI, PERSILAT, CUSTOM */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoCentral('IPSI');
                      updateSettings({ logoCentral: 'IPSI' });
                      playClickSound();
                    }}
                    className={`py-1 px-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                      logoCentral === 'IPSI'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-[#02050c] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    PRESET IPSI
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setLogoCentral('PERSILAT');
                      updateSettings({ logoCentral: 'PERSILAT' });
                      playClickSound();
                    }}
                    className={`py-1 px-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                      logoCentral === 'PERSILAT'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-[#02050c] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    PERSILAT
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (logoCentral === 'IPSI' || logoCentral === 'PERSILAT') {
                        setLogoCentral('');
                        updateSettings({ logoCentral: '' });
                      }
                      playClickSound();
                    }}
                    className={`py-1 px-1.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer ${
                      logoCentral !== 'IPSI' && logoCentral !== 'PERSILAT'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                        : 'bg-[#02050c] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    KUSTOM
                  </button>
                </div>

                {/* If logoCentral is not preset (it's either custom base64 or empty) */}
                {logoCentral !== 'IPSI' && logoCentral !== 'PERSILAT' && (
                  <div className="flex items-center gap-1.5 bg-[#02050c]/80 border border-blue-955/30 p-2 rounded-xl animate-fade-in">
                    <input
                      type="file"
                      accept="image/*"
                      id="logo-central-ul"
                      onChange={(e) => handleLogoUpload(e, 'CENTRAL')}
                      className="hidden"
                    />
                    <label
                      htmlFor="logo-central-ul"
                      className="flex-1 text-center py-1.5 bg-[#0a101f] hover:bg-[#121a2e] border border-blue-955/35 rounded-lg text-[10px] font-bold cursor-pointer hover:border-amber-500/40 truncate text-slate-300 transition-all font-mono"
                    >
                      {logoCentral && logoCentral !== 'IPSI' && logoCentral !== 'PERSILAT' ? '✔ KUSTOM OK' : 'Cari Logo Baru'}
                    </label>
                    {logoCentral && logoCentral !== 'IPSI' && logoCentral !== 'PERSILAT' && (
                      <button
                        onClick={() => {
                          setLogoCentral('IPSI');
                          updateSettings({ logoCentral: 'IPSI' });
                          playClickSound();
                        }}
                        className="px-2 py-1 bg-red-955/20 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs"
                        title="Hapus Logo Kustom & Reset ke IPSI"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* Micro preview indicator */}
                <div className="flex items-center gap-2 bg-[#02050c]/40 p-1.5 rounded-xl border border-blue-955/20">
                  <div className="w-8 h-8 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-center shrink-0">
                    {logoCentral === 'IPSI' ? (
                      <div className="w-6 h-6 rounded bg-emerald-950 flex items-center justify-center text-[7px] text-emerald-400 font-extrabold pb-0.5 leading-none">IPSI</div>
                    ) : logoCentral === 'PERSILAT' ? (
                      <div className="w-6 h-6 rounded bg-amber-950 flex items-center justify-center text-[6px] text-amber-400 font-extrabold pb-0.5 leading-none">PSL</div>
                    ) : logoCentral ? (
                      <img src={logoCentral} className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="text-[10px] text-slate-600 font-bold">空</div>
                    )}
                  </div>
                  <div className="text-[8.5px] text-slate-400 font-mono leading-tight">
                    <span className="block font-bold">Status Preview Monitor:</span>
                    <span className="text-amber-500 font-extrabold">
                      {logoCentral === 'IPSI' ? 'Logo IPSI (Default)' : logoCentral === 'PERSILAT' ? 'Logo PERSILAT' : logoCentral ? 'Logo Kustom (Aktif)' : 'Bawaan Batal'}
                    </span>
                  </div>
                </div>

                {/* Pertandingan Selanjutnya Button */}
                <button
                  type="button"
                  onClick={handleLoadNextMatch}
                  className="w-full mt-3 flex justify-center items-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-black text-[11px] font-mono tracking-widest uppercase hover:from-indigo-500 hover:to-indigo-600 border border-indigo-500/30 transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] active:scale-[0.98] cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4 text-indigo-200 animate-pulse" />
                  Pertandingan Selanjutnya
                  {(() => {
                    const sorted = [...importedMatches].sort((a, b) => (parseInt(a.partai) || 0) - (parseInt(b.partai) || 0));
                    const currentIndex = sorted.findIndex(m => m.partai === inpPartai);
                    let nextP: string | null = null;
                    if (currentIndex !== -1 && currentIndex + 1 < sorted.length) {
                      nextP = sorted[currentIndex + 1].partai;
                    } else {
                      const currentPartaiInt = parseInt(inpPartai) || 0;
                      const found = sorted.find(m => (parseInt(m.partai) || 0) > currentPartaiInt);
                      if (found) nextP = found.partai;
                    }
                    return nextP ? (
                      <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[9px] ml-1.5 animate-bounce">
                        PARTAI {nextP}
                      </span>
                    ) : null;
                  })()}
                </button>
              </div>

            </div>

            {/* ATHLETE DATA SETTINGS CARD */}
            <div className="col-span-12 lg:col-span-4 bg-[#070d1a]/80 border-2 border-blue-950/40 rounded-3xl p-4 space-y-4 shadow-lg">
              <h2 className="text-xs font-extrabold text-amber-500 tracking-wider flex items-center gap-2 border-b border-blue-955/40 pb-2 uppercase font-mono">
                <Users className="w-4 h-4 text-amber-500" /> Data Atlit Pertarungan
              </h2>

              {/* MERAH Athlete Corner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1c0b0f] to-[#2c0f14] border border-red-955/30 space-y-2.5">
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-[9px] bg-red-650 text-white font-black uppercase font-mono shadow">SUDUT MERAH</span>
                
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[8px] text-red-300 block mb-0.5 font-mono font-bold uppercase tracking-wider">NAMA ATLET</label>
                    <input
                      type="text"
                      value={inpMerahNama}
                      onChange={(e) => setInpMerahNama(e.target.value.toUpperCase())}
                      className="w-full bg-[#02050c]/90 border border-red-955/40 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-bold focus:border-red-500 outline-none transition-all font-mono"
                      placeholder="KETIK NAMA ATLET..."
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-red-300 block mb-0.5 font-mono font-bold uppercase tracking-wider">KONTINGEN / DAERAH</label>
                    <input
                      type="text"
                      value={inpMerahKontingen}
                      onChange={(e) => setInpMerahKontingen(e.target.value.toUpperCase())}
                      className="w-full bg-[#02050c]/90 border border-red-955/40 rounded-xl px-3 py-1.5 text-xs text-white uppercase focus:border-red-500 outline-none transition-all font-mono"
                      placeholder="KETIK KONTINGEN..."
                    />
                  </div>
                </div>
              </div>

              {/* BIRU Athlete Corner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#071329] to-[#0f1d3a] border border-blue-955/30 space-y-2.5">
                <span className="inline-block px-2.5 py-0.5 rounded-lg text-[9px] bg-blue-650 text-white font-black uppercase font-mono shadow">SUDUT BIRU</span>
                
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="text-[8px] text-blue-300 block mb-0.5 font-mono font-bold uppercase tracking-wider">NAMA ATLET</label>
                    <input
                      type="text"
                      value={inpBiruNama}
                      onChange={(e) => setInpBiruNama(e.target.value.toUpperCase())}
                      className="w-full bg-[#02050c]/90 border border-blue-955/40 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-bold focus:border-blue-500 outline-none transition-all font-mono"
                      placeholder="KETIK NAMA ATLET..."
                    />
                  </div>
                  <div>
                    <label className="text-[8px] text-blue-300 block mb-0.5 font-mono font-bold uppercase tracking-wider">KONTINGEN / DAERAH</label>
                    <input
                      type="text"
                      value={inpBiruKontingen}
                      onChange={(e) => setInpBiruKontingen(e.target.value.toUpperCase())}
                      className="w-full bg-[#02050c]/90 border border-blue-955/40 rounded-xl px-3 py-1.5 text-xs text-white uppercase focus:border-blue-500 outline-none transition-all font-mono"
                      placeholder="KETIK KONTINGEN..."
                    />
                  </div>
                </div>
              </div>

              {/* SAVE & RESET BUTTONS */}
              <div className="pt-2 select-none grid grid-cols-2 gap-2">
                <button
                  id="btn-save-setup-match"
                  type="button"
                  onClick={handleSaveSetup}
                  className="flex justify-center items-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-550 border border-blue-500 text-white font-black text-xs uppercase shadow-md shadow-blue-500/10 transition-all cursor-pointer active:scale-95"
                >
                  <Save className="w-4 h-4" /> Simpan Pengaturan
                </button>
                <button
                  id="btn-reset-setup-match"
                  type="button"
                  onClick={handleResetSecretariatData}
                  className={`flex justify-center items-center gap-2 py-2.5 rounded-xl text-white font-black text-xs uppercase transition-all cursor-pointer active:scale-95 border ${
                    resetConfirmArmed 
                      ? 'bg-amber-600 hover:bg-amber-500 border-amber-500 shadow-lg shadow-amber-500/20 animate-pulse' 
                      : 'bg-red-650 hover:bg-red-500 border-red-500 shadow-md shadow-red-500/10'
                  }`}
                  title="Klik dua kali dengan cepat untuk menghapus semua data jadwal pertandingan terimpor dan data atlet"
                >
                  <Trash2 className="w-4 h-4" />
                  {resetConfirmArmed ? 'YAKIN HAPUS SEMUA?' : 'RESET/HAPUS DATA'}
                </button>
              </div>

            </div>

            {/* INTEGRATIONS, HISTORY & BULK IMPORT */}
            <div className="col-span-12 lg:col-span-3 space-y-3">
              
              {/* TOURNAMENT IMPORT CENTER CARD */}
              <div className="bg-[#070d1a]/85 border-2 border-blue-950/40 rounded-3xl p-4 space-y-3 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-700"></div>
                
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest leading-none font-mono flex items-center gap-2 mb-1">
                  <Upload className="w-4 h-4 text-emerald-400" /> PUSAT IMPOR DATA ATLET
                </h3>
                <p className="text-[9px] text-slate-400 leading-relaxed font-bold">
                  Pilih metode untuk mengimpor data peserta ke dalam sistem secara massal atau tunggal.
                </p>

                {/* Tab select buttons */}
                <div className="grid grid-cols-2 gap-1 bg-[#02050c]/80 border border-blue-955/35 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { playClickSound(); setImportTab('CSV'); }}
                    className={`py-1.5 text-[8.5px] font-black rounded-lg cursor-pointer transition-all uppercase tracking-wider ${
                      importTab === 'CSV' 
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Masal (CSV/Excel)
                  </button>
                  <button
                    type="button"
                    onClick={() => { playClickSound(); setImportTab('DOC'); }}
                    className={`py-1.5 text-[8.5px] font-black rounded-lg cursor-pointer transition-all uppercase tracking-wider ${
                      importTab === 'DOC' 
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tunggal (Word/PDF)
                  </button>
                </div>

                {importTab === 'CSV' ? (
                  /* CSV & EXCEL BULK IMPORTER LAYOUT */
                  <div className="space-y-2.5 pt-1 text-xs">
                    <p className="text-[9px] text-slate-400 font-bold leading-normal">
                      Unggah berkas <code className="text-amber-400 font-bold">.csv</code> atau salin-tempel baris data dari spreadsheet Excel untuk mengimpor seluruh partai secara masal.
                    </p>

                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept=".csv,.txt"
                        id="bulk-csv-importer"
                        onChange={handleImportCSVMatches}
                        className="hidden"
                      />
                      <label
                        htmlFor="bulk-csv-importer"
                        className="flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-xl bg-[#02050c] text-emerald-400 hover:text-white border border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer text-[9.5px] font-black font-mono transition-all hover:border-emerald-500/50 hover:shadow-neon"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-400" /> UNGGAH BERKAS CSV
                      </label>
                      <button
                        type="button"
                        onClick={() => { playClickSound(); setShowPasteArea(!showPasteArea); }}
                        className={`px-3 py-2 rounded-xl text-[9.5px] font-bold font-mono transition-all cursor-pointer ${
                          showPasteArea 
                            ? 'bg-amber-500 text-slate-950 font-black border border-amber-400' 
                            : 'bg-[#02050c] text-slate-300 border border-slate-800 hover:bg-slate-900'
                        }`}
                        title="Salin-tempel langsung dari Excel"
                      >
                        ✍️ PASTE
                      </button>
                    </div>

                    {showPasteArea && (
                      <div className="space-y-1.5 bg-[#02050c]/80 border border-blue-955/25 p-2 rounded-xl animate-fade-in text-[10px]">
                        <span className="text-[8px] font-black text-slate-400 font-mono block">TEMPEL SEL DARI EXCEL DI SINI:</span>
                        <textarea
                          value={csvPasteText}
                          onChange={(e) => setCsvPasteText(e.target.value)}
                          placeholder="Partai	Kelas	Babak	Gender	Nama Merah	Kontingen Merah	Nama Biru	Kontingen Biru	Durasi&#10;1	Kelas C	Penyisihan	PUTRA	DANAR	JABAR	GALANG	BALI	120&#10;2	Kelas D	Semifinal	PUTRI	SAFIRA	JATENG	RANI	BALI	120"
                          rows={4}
                          className="w-full bg-[#050b16] border border-blue-955/30 rounded-lg p-2 text-[9px] font-mono text-slate-100 outline-none focus:border-amber-500 focus:shadow-neon"
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={handleImportCSVPaste}
                            className="flex-1 py-1.5 bg-[#10b981] hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-[9px] transition-all cursor-pointer uppercase tracking-wider"
                          >
                            Proses Tempel Teks
                          </button>
                          <button
                            type="button"
                            onClick={() => { playClickSound(); setShowPasteArea(false); }}
                            className="px-2 py-1.5 bg-red-955/15 hover:bg-red-500 hover:text-white rounded-lg text-red-500 text-[9px] cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold bg-[#02050c]/30 rounded-lg p-1.5 border border-blue-955/10">
                      <span>Perlu contoh pengisian?</span>
                      <button
                        type="button"
                        onClick={handleDownloadTemplateCSV}
                        className="text-amber-400 underline cursor-pointer hover:text-amber-300 font-black"
                      >
                        Salin Template CSV
                      </button>
                    </div>
                  </div>
                ) : (
                  /* WORD / PDF INDUCTION LAYOUT (RETAIN EXISTING) */
                  <div className="space-y-2.5 pt-1 animate-fade-in text-xs">
                    <p className="text-[9px] text-slate-400 font-bold leading-normal">
                      Unggah berkas Word (<code className="text-amber-400">.docx</code>) atau berkas dokumen <code className="text-amber-400 font-bold">.pdf</code> berisi data pesilat dan rincian partai tunggal.
                    </p>

                    {isImportingDoc ? (
                      <div className="flex flex-col items-center justify-center p-3.5 py-5 rounded-2xl bg-[#02050c]/90 border border-amber-500/30 space-y-2.5 animate-pulse">
                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                        <span className="text-[9px] font-black tracking-widest text-amber-400 uppercase font-mono text-center">SEDANG MENGANALISIS DOKUMEN DENGAN AI CERDAS...</span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept=".docx,.pdf"
                          id="bulk-doc-importer"
                          onChange={handleImportDocument}
                          className="hidden"
                        />
                        <label
                          htmlFor="bulk-doc-importer"
                          className="flex-1 flex justify-center items-center gap-1.5 py-2.5 rounded-xl bg-[#02050c] text-emerald-400 hover:text-white border border-emerald-500/20 hover:bg-emerald-500/10 cursor-pointer text-[9.5px] font-black font-mono transition-all hover:border-emerald-500/50 hover:shadow-neon"
                        >
                          <Upload className="w-3.5 h-3.5 text-emerald-400" /> UNGGAH WORD / PDF
                        </label>
                      </div>
                    )}
                    <div className="text-[7.5px] text-slate-500 leading-normal font-bold">
                      Sistem akan memindai teks, mencocokkan field otomatis menggunakan AI, dan menampilkan verifikasi data sebelum diterapkan.
                    </div>
                  </div>
                )}
              </div>

              {/* NEXT STEP PROCEED BUTTON */}
              <button
                id="btn-start-match-panel"
                onClick={handleStartMatch}
                className="w-full flex justify-center items-center gap-2 py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/10 hover:shadow-neon transition-all duration-200 cursor-pointer active:scale-95"
              >
                MASUK PANEL KONTROL <ArrowRight className="w-4 h-4 stroke-[3px]" />
              </button>

            </div>

            {/* BOTTOM SECTION: MATCH QUEUE & ARCHIVE SIDE-BY-SIDE */}
            <div className="col-span-12 grid grid-cols-12 gap-4">
              
              {/* ANTRIAN JADWAL TANDING TERIMPOR CARD */}
              <div className="col-span-12 lg:col-span-6 bg-[#070d1a]/60 border-2 border-blue-955/45 rounded-3xl p-4 shadow-lg mb-4">
                <div className="flex justify-between items-center border-b border-blue-955/40 pb-3 mb-3">
                  <h2 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 leading-none font-mono">
                    <Users className="w-4 h-4 text-emerald-400" /> Antrian Jadwal Partai Terimpor ({importedMatches.length})
                  </h2>
                  
                  {importedMatches.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm('Apakah Anda yakin ingin menghapus seluruh daftar antrian pertandingan?')) {
                          playClickSound();
                          saveImportedMatches([]);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-650/10 text-red-500 border border-red-500/20 hover:bg-red-655 hover:text-white text-[10px] font-black rounded-xl cursor-pointer transition-all font-mono uppercase"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Bersihkan Jadwal
                    </button>
                  )}
                </div>

                {importedMatches.length === 0 ? (
                  <div className="py-6 px-4 text-center space-y-3 bg-[#02050c]/50 rounded-2xl border border-blue-955/15">
                    <div className="text-xs text-slate-500 font-bold font-mono">
                      Belum ada daftar antrian pertandingan yang diimpor.
                    </div>
                    <p className="text-[10px] text-slate-400 max-w-md mx-auto leading-relaxed">
                      Gunakan panel <strong>IMPOR DATA MASAL (CSV / EXCEL)</strong> di sisi kanan atas untuk mengunggah jadwal pertandingan secara massal, agar sekretaris bisa bekerja lebih cepat tanpa input manual satu per satu.
                    </p>
                    <button
                      onClick={handleDownloadTemplateCSV}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/20 text-[9px] font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wider font-mono"
                    >
                      <Download className="w-3 -mt-0.5" /> Salin / Download Contoh CSV
                    </button>
                  </div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
                    {importedMatches.map((item, idx) => {
                      const completed = isMatchCompleted(item.partai);
                      const isActive = matchState.settings.partai === item.partai;
                      return (
                        <div 
                          key={item.id} 
                          className={`grid grid-cols-12 gap-1 px-4 py-2 bg-[#02050c]/90 rounded-xl border items-center hover:border-amber-500/30 transition-all shadow-inner ${
                            isActive 
                              ? 'border-amber-500/70 bg-amber-500/5 [box-shadow:0_0_10px_rgba(245,158,11,0.05)]' 
                              : completed 
                                ? 'border-emerald-500/20 opacity-80' 
                                : 'border-blue-955/20'
                          }`}
                        >
                          <div className="col-span-1 text-slate-500 font-bold text-[9px]">#{idx + 1}</div>
                          
                          <div className="col-span-2 flex items-center gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono leading-none ${
                              isActive 
                                ? 'bg-amber-500 text-slate-950 font-black' 
                                : completed 
                                  ? 'bg-emerald-500/10 text-emerald-400 font-bold' 
                                  : 'bg-[#0a0f1d] text-slate-400 font-bold'
                            }`}>
                              PTY {item.partai}
                            </span>
                          </div>

                          <div className="col-span-3 truncate text-slate-300 font-bold">
                            <span className="text-amber-500/80 mr-1">[{item.gender === 'PUTRA' ? 'PA' : 'PI'}]</span>
                            <span className="uppercase">{item.kelasNomor}</span>
                            <span className="block text-[8px] text-slate-500 font-semibold uppercase">{item.babakSeksi}</span>
                          </div>

                          <div className="col-span-4 flex justify-between items-center border-x border-[#0f172a] px-3">
                            <div className="text-right truncate max-w-[85px] shrink-0">
                              <span className="text-red-400 font-extrabold block truncate leading-tight uppercase">{item.merahNama}</span>
                              <span className="text-slate-500 text-[8px] block truncate leading-none font-bold">{item.merahKontingen}</span>
                            </div>
                            <span className="text-slate-600 text-[8px] font-black mx-1 shrink-0">VS</span>
                            <div className="text-left truncate max-w-[85px] shrink-0">
                              <span className="text-blue-400 font-extrabold block truncate leading-tight uppercase">{item.biruNama}</span>
                              <span className="text-slate-500 text-[8px] block truncate leading-none font-bold">{item.biruKontingen}</span>
                            </div>
                          </div>

                          <div className="col-span-2 text-right flex justify-end gap-1.5 items-center">
                            {completed ? (
                              <span className="text-[8px] text-emerald-400 font-bold tracking-wider mr-1 uppercase flex items-center gap-0.5">
                                ✔ SELESAI
                              </span>
                            ) : (
                              <button
                                onClick={() => handleLoadImportedMatch(item)}
                                className={`px-2.5 py-1 text-[8.5px] font-black rounded-lg cursor-pointer flex items-center gap-0.5 transition-all active:scale-95 border uppercase ${
                                  isActive 
                                    ? 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950 font-black' 
                                    : 'bg-[#0a0f1d] hover:bg-[#121a2e] border-blue-955/35 text-amber-500'
                                }`}
                                title="Tandingkan partai ini sekarang"
                              >
                                {isActive ? 'JALAN' : 'MUAT'}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                playClickSound();
                                const filtered = importedMatches.filter((m) => m.id !== item.id);
                                saveImportedMatches(filtered);
                              }}
                              className="p-1 bg-red-955/10 hover:bg-red-655 hover:text-white rounded text-red-500 border border-red-500/10 cursor-pointer"
                              title="Hapus"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SEJARAH ARSIP PERTANDINGAN CARD (col-span-12 lg:col-span-6) */}
              <div className="col-span-12 lg:col-span-6 bg-[#070d1a]/60 border-2 border-blue-955/45 rounded-3xl p-4 shadow-lg mb-4">
                <div className="flex justify-between items-center border-b border-blue-955/40 pb-3 mb-3">
                  <h2 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5 leading-none font-mono">
                    <Calendar className="w-4 h-4 text-amber-500" /> Sejarah Arsip Pertandingan ({matchHistory.length})
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white text-[10px] font-black rounded-xl cursor-pointer transition-all font-mono uppercase"
                    >
                      <Download className="w-3.5 h-3.5" /> Ekspor Sejarah (CSV)
                    </button>
                    <button
                      onClick={handleClearHistory}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-650/10 text-red-500 border border-red-500/20 hover:bg-red-655 hover:text-white text-[10px] font-black rounded-xl cursor-pointer transition-all font-mono uppercase"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Histori
                    </button>
                  </div>
                </div>

                {matchHistory.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 font-bold font-mono">
                    Belum ada rekaman pertandingan tersimpan dalam sesi ini. Klik simpan di panel kontrol setelah match selesai.
                  </div>
                ) : (
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
                    {matchHistory.map((h) => (
                      <div key={h.id} className="grid grid-cols-12 gap-1 px-4 py-2 bg-[#02050c]/90 rounded-xl border border-blue-955/20 items-center hover:border-blue-500/30 transition-all shadow-inner">
                        <div className="col-span-2 text-slate-500 text-[8px] font-bold">{h.date}</div>
                        <div className="col-span-1.5 text-amber-500 font-extrabold font-mono">PTY {h.settings.partai}</div>
                        <div className="col-span-2 text-slate-300 truncate font-extrabold uppercase">{h.settings.kelasNomor}</div>
                        <div className="col-span-3.5 flex justify-between items-center border-x border-[#0f172a] px-3">
                          <span className="text-red-400 font-black truncate max-w-[70px] text-right text-[9px]">{h.merah?.nama || 'N/A'}</span>
                          <strong className="text-red-400 mx-1 font-black">{h.merahTotal}</strong>
                          <span className="text-slate-650 text-[8px] font-black">vs</span>
                          <strong className="text-blue-400 mx-1 font-black">{h.biruTotal}</strong>
                          <span className="text-blue-400 font-black truncate max-w-[70px] text-[9px]">{h.biru?.nama || 'N/A'}</span>
                        </div>
                        <div className="col-span-1.5 text-center text-emerald-400 font-black uppercase truncate text-[8px]">
                          Pemenang: {h.winner === 'MERAH' ? 'MERAH' : h.winner === 'BIRU' ? 'BIRU' : 'DISK'}
                        </div>
                        <div className="col-span-1.5 text-right text-[8px] text-[#475569] leading-none font-bold">
                          Sync: {h.details.verifiedHits.length}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        ) : (
          
          /* ACTIVE MATCH KONTROL PANEL PANEL */
          <div className="grid grid-cols-12 gap-4 h-full">
               {/* LARGE STOPWATCH TICKER */}
            <div className="col-span-12 lg:col-span-4 bg-[#070d1a]/85 border-2 border-blue-955/40 rounded-3xl p-4 flex flex-col justify-between items-center text-center shadow-lg relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-[#22c55e]/30"></div>
              
              <div className="w-full">
                <span className="text-[10px] text-amber-500 font-extrabold tracking-widest uppercase block mb-1 font-mono">KRONOMETER PERTANDINGAN</span>
                <span className="text-xs text-slate-400 block font-mono uppercase">{matchState.settings.eventName}</span>
                <span className="text-xs text-slate-200 font-black block mt-1 uppercase font-mono tracking-wide">PARTAI {matchState.settings.partai} | {matchState.settings.kelasNomor}</span>
              </div>

              {/* Core time rendering */}
              <div className="my-6">
                <div className="text-6xl md:text-7xl font-black font-mono tracking-widest text-[#00f2fe]/90 [text-shadow:0_0_15px_rgba(0,242,254,0.3)] leading-none">
                  {formatTime(matchState.waktuTersisa)}
                </div>
                <span className="text-[10px] text-slate-500 tracking-wider font-extrabold font-mono block mt-2 uppercase">Durasi Babak Aktif: {currentDurationLabel(matchState.settings.durasiBabak)}</span>
              </div>

              {/* Buttons panel */}
              <div className="w-full flex gap-3 select-none">
                {/* PLAY / PAUSE */}
                <button
                  id="btn-timer-toggle"
                  onClick={toggleTimer}
                  disabled={matchState.waktuTersisa === 0 || matchState.matchEnded}
                  className={`flex-1 flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl font-black text-xs uppercase cursor-pointer transition-all ${
                    matchState.timerRunning
                      ? 'bg-amber-600 text-white hover:bg-amber-500 shadow-md shadow-amber-500/10'
                      : 'bg-[#10b981] text-slate-950 hover:bg-[#059669] hover:text-white shadow-lg shadow-emerald-500/15'
                  } disabled:opacity-40 active:scale-95`}
                >
                  {matchState.timerRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current text-white" /> PAUSE DIRI
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current text-slate-950" /> INDUK PLAY
                    </>
                  )}
                </button>

                {/* RESET TIMER */}
                <button
                  id="btn-timer-reset"
                  onClick={resetTimer}
                  className="px-4 py-3 bg-[#11192e] hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-blue-955/35 cursor-pointer transition-all active:scale-95"
                  title="Reset Chronometer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* ACTIVE ROUND / BABAK SELECTION SWITCH */}
            <div className="col-span-12 lg:col-span-5 bg-[#070d1a]/85 border-2 border-blue-955/40 rounded-3xl p-5 flex flex-col justify-between shadow-lg">
              
              <div>
                <span className="text-[10px] text-amber-500 font-extrabold tracking-widest uppercase block mb-1 font-mono">PENGENDALI BABAK AKTIF</span>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                  Tekan tab di bawah untuk memaksakan ronde aktif berjalan. Penggantian ronde akan mereset timer ke durasi awal secara otomatis.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 my-4">
                {[1, 2, 3].map((b) => (
                  <button
                    key={b}
                    id={`btn-babak-activate-${b}`}
                    onClick={() => setBabak(b)}
                    className={`py-5 border-2 rounded-2xl font-black text-xl flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-95 ${
                      matchState.babakAktif === b
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/20'
                        : 'bg-[#02050c] border-[#10192e] hover:bg-[#12192c] text-slate-400'
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase leading-none ${matchState.babakAktif === b ? 'text-slate-950' : 'text-slate-500'}`}>BABAK</span>
                    <span className="text-2xl font-black mt-1.5 leading-none">{b}</span>
                  </button>
                ))}
              </div>

              <div className="bg-[#02050c]/90 border border-blue-955/35 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-slate-400 leading-tight">
                <span className="font-bold">Sistem Babak Aktif:</span>
                <span className="text-slate-100 font-black text-[10px] uppercase font-mono tracking-wide">BABAK 1, 2, DAN 3 MASAL</span>
              </div>

              {/* STATUS AKTIVITAS JURI */}
              <div className="bg-[#02050c]/90 border border-blue-955/35 rounded-xl p-3 flex items-center justify-between text-xs font-mono text-slate-400 leading-tight mt-2">
                <span className="font-bold">Koneksi Panel Juri:</span>
                <div className="flex gap-2.5">
                  {([1, 2, 3] as const).map((jId) => {
                    const isOnline = juriStatuses[jId];
                    return (
                      <span
                        key={jId}
                        className={`text-[9px] font-black px-2 py-0.5 rounded tracking-wide uppercase transition-all ${
                          isOnline 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 animate-pulse' 
                            : 'bg-slate-950 text-slate-500 border border-slate-900'
                        }`}
                      >
                        J{jId}: {isOnline ? 'ONLINE' : 'LOGOUT'}
                      </span>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* ATHLETES DATA & RESULTS MANAGEMENT CARD */}
            <div className="col-span-12 lg:col-span-3 bg-[#070d1a]/85 border-2 border-blue-955/40 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
              
              <div>
                <span className="text-[10px] text-amber-500 font-extrabold tracking-widest uppercase block mb-1 font-mono">PENGENDALI HASIL AKHIR</span>
                <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase mt-0.5">
                  Pantau skor akhir dari dewan juri. Jika babak 3 selesai, simpan pertandingan ke sejarah arsip.
                </p>
              </div>

              {/* Quick glance athlets status */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-gradient-to-r from-red-950/40 to-red-900/10 p-2.5 rounded-xl border border-red-500/15 text-red-400 font-mono">
                  <span className="truncate max-w-[100px] font-black uppercase">{matchState.merah.atlit.nama}</span>
                  <strong className="font-black text-sm">{calculateCornerScores(matchState, 'MERAH').totalScore} Pts</strong>
                </div>
                <div className="flex justify-between items-center bg-gradient-to-r from-blue-950/40 to-blue-900/10 p-2.5 rounded-xl border border-blue-500/15 text-blue-400 font-mono">
                  <span className="truncate max-w-[100px] font-black uppercase">{matchState.biru.atlit.nama}</span>
                  <strong className="font-black text-sm">{calculateCornerScores(matchState, 'BIRU').totalScore} Pts</strong>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  id="btn-save-match-result"
                  onClick={handleSaveToHistory}
                  className="w-full py-3 bg-[#10b981] hover:bg-[#059669] text-slate-950 hover:text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-500/10 active:scale-95"
                >
                  SIMPAN MATCH KE SEJARAH
                </button>

                <button
                  onClick={() => {
                    playClickSound();
                    resetMatchState({ settings: matchState.settings, merah: { ...matchState.merah, jatuhanScore: 0, penaltyScore: 0, disqualified: false, penalties: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false } }, biru: { ...matchState.biru, jatuhanScore: 0, penaltyScore: 0, disqualified: false, penalties: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false } }, babakAktif: 1, juriPressHistory: [], verifiedHits: [] });
                    alert('Pertandingan Berhasil di-Reset (Data atlit luar terjaga!)');
                  }}
                  className="w-full py-2.5 bg-[#12192c] hover:bg-[#1e2945] text-red-400 font-black text-[10px] rounded-xl uppercase border border-red-955/30 cursor-pointer transition-all active:scale-95"
                >
                  RESET MATCH SEKARANG
                </button>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* POP-UP: NOTIFIKASI SEKRETARIS UNTUK ADVANCE ROUND */}
      {showNextBabakPopup && (
        <div className="absolute inset-0 z-50 bg-[#03060f]/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0a0f1d] border-2 border-amber-500 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
            <div className="inline-flex p-3 bg-amber-500/15 text-amber-500 rounded-full mb-3 shadow">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none font-mono">
              KONFIRMASI PENGGANTIAN ROUND
            </h3>

            <p className="text-xs text-slate-300 my-4 leading-relaxed font-bold">
              Waktu babak yang berjalan saat ini telah habis. Apakah Anda bersedia meningkatkan pertandingan ke <strong className="text-amber-500 font-extrabold font-mono">BABAK {pendingNextBabak}</strong> sekarang?
            </p>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={() => handleNextBabakConfirm(true)}
                className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-wider cursor-pointer transition-all active:scale-95"
              >
                YA (Ganti Babak)
              </button>
              <button
                onClick={() => handleNextBabakConfirm(false)}
                className="py-3 bg-[#11192e] hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl uppercase cursor-pointer transition-all active:scale-95 border border-blue-955/30"
              >
                TIDAK (Jeda Dulu)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: PRATINJAU & VERIFIKASI DATA IMPORT WORD/PDF */}
      {showImportPreview && importedFields && (
        <div className="absolute inset-0 z-50 bg-[#03060f]/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-6xl bg-[#0a0f1d] border-2 border-emerald-500 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-4 my-8">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
            
            <div className="flex justify-between items-center border-b border-blue-955/40 pb-3">
              <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest leading-none font-mono flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400 animate-bounce" /> VERIFIKASI JADWAL PERTANDINGAN DOKUMEN
              </h3>
              <button 
                onClick={() => setShowImportPreview(false)}
                className="text-slate-400 hover:text-white transition-all text-xs font-bold leading-none font-mono"
              >
                [ TUTUP ]
              </button>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
              Berikut adalah daftar partai pertandingan yang berhasil diekstrak dari dokumen. Anda dapat mengoreksi data secara langsung pada baris tabel di bawah, lalu klik tombol hijau <strong className="text-emerald-400">"GUNAKAN"</strong> pada salah satu partai untuk mentransfer data atlet tersebut ke layar tanding utama.
            </p>

            {/* Nama Event Row */}
            <div className="bg-[#050b16] p-3 rounded-xl border border-blue-955/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex-1">
                <label className="text-[9px] text-[#10b981] block mb-1 font-mono font-bold uppercase tracking-wider">Nama Event / Kejuaraan Global</label>
                <input
                  type="text"
                  value={importedFields.eventName}
                  onChange={(e) => setImportedFields({ ...importedFields, eventName: e.target.value })}
                  className="w-full bg-[#02050c]/90 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-bold focus:border-emerald-500 outline-none transition-all font-mono"
                  placeholder="NAMA EVENT KEJUARAAN"
                />
              </div>
              <div className="text-[10px] text-slate-400 font-mono text-right font-bold bg-[#02050c] px-3 py-2 rounded-xl border border-blue-955/20 min-w-[200px]">
                PARTAI TERDETEKSI: <span className="text-emerald-400 text-xs font-black">{importedFields.matches.length} Pertandingan</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
              
              {/* Table list of matches */}
              <div className="lg:col-span-3 flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-400 font-mono tracking-widest uppercase">DAFTAR PARTAI PERTANDINGAN (BERURUTAN):</span>
                
                <div className="overflow-x-auto rounded-2xl border border-blue-955/40 bg-[#050b16] max-h-[420px] shadow-lg">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-[#0b1328] border-b border-blue-955/30 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                        <th className="p-3 w-16 text-center">Partai</th>
                        <th className="p-3 w-40">Kelas Tanding / Nomor</th>
                        <th className="p-3 w-32">Babak / Fase</th>
                        <th className="p-3 w-24">Gender</th>
                        <th className="p-3 bg-red-950/20 text-red-300 w-[240px]">Sudut Merah (Nama / Kontingen)</th>
                        <th className="p-3 bg-blue-950/20 text-blue-300 w-[240px]">Sudut Biru (Nama / Kontingen)</th>
                        <th className="p-3 w-20 text-center">Durasi (s)</th>
                        <th className="p-3 text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-955/20 text-xs text-slate-200">
                      {[...importedFields.matches]
                        .sort((a, b) => (parseInt(a.partai) || 0) - (parseInt(b.partai) || 0))
                        .map((match, idx) => {
                          const originalIndex = importedFields.matches.findIndex(m => m === match);
                          return (
                            <tr key={idx} className="hover:bg-blue-950/10 transition-all font-mono">
                              {/* Partai */}
                              <td className="p-2">
                                <input 
                                  type="text" 
                                  value={match.partai} 
                                  onChange={(e) => handleUpdateMatchField(originalIndex, 'partai', e.target.value)}
                                  className="w-full text-center bg-[#02050c] text-white border border-blue-955/40 rounded-xl px-2 py-1 text-xs font-bold font-mono focus:border-emerald-500"
                                />
                              </td>
                              {/* Kelas */}
                              <td className="p-2">
                                <input 
                                  type="text" 
                                  value={match.kelasNomor} 
                                  onChange={(e) => handleUpdateMatchField(originalIndex, 'kelasNomor', e.target.value)}
                                  className="w-full bg-[#02050c] text-white border border-blue-955/40 rounded-xl px-2.5 py-1 text-xs font-mono uppercase focus:border-emerald-500"
                                />
                              </td>
                              {/* Babak */}
                              <td className="p-2">
                                <select 
                                  value={match.babakSeksi} 
                                  onChange={(e) => handleUpdateMatchField(originalIndex, 'babakSeksi', e.target.value)}
                                  className="w-full bg-[#02050c] text-white border border-blue-955/40 rounded-xl px-2 py-1 text-xs font-mono cursor-pointer focus:border-emerald-500"
                                >
                                  <option value="Penyisihan">Penyisihan</option>
                                  <option value="Perempatfinal">Perempatfinal</option>
                                  <option value="Semifinal">Semifinal</option>
                                  <option value="Final">Final</option>
                                </select>
                              </td>
                              {/* Gender */}
                              <td className="p-2">
                                <select 
                                  value={match.gender} 
                                  onChange={(e) => handleUpdateMatchField(originalIndex, 'gender', e.target.value as 'PUTRA' | 'PUTRI')}
                                  className="w-full bg-[#02050c] text-white border border-blue-955/40 rounded-xl px-2 py-1 text-xs font-mono cursor-pointer focus:border-emerald-500"
                                >
                                  <option value="PUTRA">PUTRA</option>
                                  <option value="PUTRI">PUTRI</option>
                                </select>
                              </td>
                              {/* Merah */}
                              <td className="p-2 bg-red-950/5 space-y-1">
                                <input 
                                  type="text" 
                                  placeholder="Nama Atlet Merah"
                                  value={match.merahNama} 
                                  onChange={(e) => handleUpdateMatchField(originalIndex, 'merahNama', e.target.value)}
                                  className="w-full bg-[#02050c]/90 text-red-200 border border-red-500/20 focus:border-red-500 rounded-xl px-2.5 py-1 text-xs uppercase font-bold"
                                />
                                <input 
                                  type="text" 
                                  placeholder="Kontingen Merah"
                                  value={match.merahKontingen} 
                                  onChange={(e) => handleUpdateMatchField(originalIndex, 'merahKontingen', e.target.value)}
                                  className="w-full bg-[#02050c]/90 text-red-300/80 border border-red-500/10 focus:border-red-500 rounded-xl px-2.5 py-0.5 text-[10px]"
                                />
                              </td>
                              {/* Biru */}
                              <td className="p-2 bg-blue-950/5 space-y-1">
                                <input 
                                  type="text" 
                                  placeholder="Nama Atlet Biru"
                                  value={match.biruNama} 
                                  onChange={(e) => handleUpdateMatchField(originalIndex, 'biruNama', e.target.value)}
                                  className="w-full bg-[#02050c]/90 text-blue-200 border border-blue-500/20 focus:border-blue-500 rounded-xl px-2.5 py-1 text-xs uppercase font-bold"
                                />
                                <input 
                                  type="text" 
                                  placeholder="Kontingen Biru"
                                  value={match.biruKontingen} 
                                  onChange={(e) => handleUpdateMatchField(originalIndex, 'biruKontingen', e.target.value)}
                                  className="w-full bg-[#02050c]/90 text-blue-300/80 border border-blue-500/10 focus:border-blue-500 rounded-xl px-2.5 py-0.5 text-[10px]"
                                />
                              </td>
                              {/* Durasi */}
                              <td className="p-2">
                                <input 
                                  type="number" 
                                  value={match.durasi} 
                                  onChange={(e) => handleUpdateMatchField(originalIndex, 'durasi', parseInt(e.target.value) || 120)}
                                  className="w-full text-center bg-[#02050c] text-white border border-blue-955/40 rounded-xl px-2 py-1 text-xs font-mono"
                                />
                              </td>
                              {/* Aksi */}
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => handleSelectImportedMatch(match)}
                                  className="w-full py-1.5 uppercase font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl shadow cursor-pointer transition-all active:scale-95 duration-100 font-mono text-[10px] tracking-wider"
                                >
                                  GUNAKAN
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Extracted text preview block */}
              <div className="lg:col-span-1 flex flex-col h-full bg-[#02050c] border border-blue-955/35 rounded-2xl p-3 space-y-2 max-h-[465px]">
                <span className="text-[9px] font-black text-slate-400 font-mono tracking-widest uppercase">HASIL EKSTRAKSI TEKS:</span>
                <div className="flex-1 overflow-y-auto text-[10px] text-slate-300 font-mono leading-relaxed bg-[#050b16] p-2.5 rounded-xl whitespace-pre-wrap select-all border border-blue-955/20 max-h-[300px]">
                  {importedFields.rawText || '(Teks tidak terdeteksi)'}
                </div>
                <div className="p-2 border border-yellow-500/10 bg-yellow-500/5 rounded-xl text-[8px] text-yellow-400 leading-normal font-bold">
                  <strong>Catatan Cerdas:</strong> Sistem mengidentifikasi partai silat berdasarkan baris berisikan kata kunci tanding / "vs" dan tanda kurung kontingen. Anda bebas mengedit isian sbelum mentransfer!
                </div>
              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 mt-2 border-t border-blue-955/30 pt-4">
              <button
                onClick={() => setShowImportPreview(false)}
                className="py-3 bg-[#11192e] hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl uppercase tracking-wider cursor-pointer transition-all active:scale-95 border border-blue-955/30"
              >
                TUTUP PRATINJAU
              </button>
              <button
                onClick={confirmApplyImported}
                className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl uppercase tracking-widest cursor-pointer transition-all active:scale-95 flex justify-center items-center gap-1.5"
                title="Impor semua jadwal pertandingan di atas sekaligus ke dalam Panel Sekretaris"
              >
                TERAPKAN SEMUA PARTAI
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
