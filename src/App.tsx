import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Download, 
  User, 
  Award, 
  Clock, 
  Monitor as MonitorIcon, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Trash2, 
  Volume2, 
  ArrowLeft, 
  Maximize2,
  Minimize2,
  ListFilter,
  Users,
  Layers,
  FileSpreadsheet,
  AlertOctagon,
  RefreshCw,
  Sparkles,
  Settings,
  Lock,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  GitFork,
  Calendar,
  Trophy,
  Plus,
  BarChart3,
  Shuffle
} from 'lucide-react';

function uuid() {
  return Math.random().toString(36).substring(2, 9);
}
import { MatchState, PastMatch, ValidatedScore, ScoreEntry, CustomIcons } from './types';
import { 
  getSavedMatchState, 
  saveMatchState, 
  getMatchHistory, 
  saveMatchHistory, 
  clearMatchHistory, 
  calculateFinalScore, 
  processRawScore,
  runWmpCheck,
  getDeviceId,
  generateActivationKey,
  verifyActivationKey,
  isOutsideSandbox
} from './appState';
import { 
  playClickSound, 
  playPointSound, 
  playWarningSound, 
  playBuzzer, 
  startBuzzer,
  stopBuzzer,
  initAudio 
} from './sound';
import { 
  exportHistoryToExcel, 
  downloadExcelTemplate, 
  downloadJadwalExcelTemplate,
  downloadBaganExcelTemplate,
  exportBaganToExcel,
  parseExcelImport 
} from './utils/excel';
import { downloadMatchPDF, downloadTournamentBracketPDF, downloadMatchSchedulePDF, getDynamicBracketRounds } from './utils/pdf';
import RegistrasiDataPanel from './components/RegistrasiDataPanel';
import { 
  SiluetSilatStance, 
  SiluetSilatKick,
  SiluetBackgroundCenter,
  Binaan1Icon,
  Binaan2Icon,
  Teguran1Icon,
  Teguran2Icon,
  Peringatan1Icon,
  Peringatan2Icon,
  DisqualificationIcon,
  JatuhanIcon,
  PunchIcon,
  KickIcon
} from './components/SilatIcons';

const localStorage = (() => {
  let isAvailable = false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    isAvailable = true;
  } catch (e) {
    isAvailable = false;
  }

  const memoryStorage: Record<string, string> = {};

  return {
    getItem(key: string): string | null {
      if (isAvailable) {
        try {
          return window.localStorage.getItem(key);
        } catch {}
      }
      return memoryStorage[key] !== undefined ? memoryStorage[key] : null;
    },
    setItem(key: string, value: string): void {
      if (isAvailable) {
        try {
          window.localStorage.setItem(key, value);
          return;
        } catch {}
      }
      memoryStorage[key] = String(value);
    },
    removeItem(key: string): void {
      if (isAvailable) {
        try {
          window.localStorage.removeItem(key);
          return;
        } catch {}
      }
      delete memoryStorage[key];
    },
    clear(): void {
      if (isAvailable) {
        try {
          window.localStorage.clear();
          return;
        } catch {}
      }
      for (const key in memoryStorage) {
        delete memoryStorage[key];
      }
    }
  };
})();

// Keyboard shortcut listener hook to integrate high professional feel for sekretaris
function useKeyPress(targetKey: string, action: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Avoid firing if user is inside form inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'SELECT') {
        return;
      }
      if (event.code === targetKey || event.key === targetKey) {
        event.preventDefault();
        action();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [targetKey, action]);
}

// Client-side image compressor helper to prevent LocalStorage QuotaExceeded and SSE network choke
function compressImage(base64Str: string, maxDim = 160): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}

export default function App() {
  const [role, setRole] = useState<'LANDING' | 'DEWAN' | 'JURI_SELECT' | 'JURI_PANEL' | 'SEKRETARIS' | 'MONITOR' | 'REGISTRASI_DATA'>('LANDING');
  const [selectedJuriId, setSelectedJuriId] = useState<1 | 2 | 3>(1);
  const [matchState, setMatchState] = useState<MatchState>(getSavedMatchState());

  // Scoring superiority calculations for Monitor screen neon borders & golden light tracing animations
  const scoreBiru = calculateFinalScore('BIRU', matchState);
  const scoreMerah = calculateFinalScore('MERAH', matchState);
  const biruUnggul = scoreBiru > scoreMerah;
  const merahUnggul = scoreMerah > scoreBiru;
  const [history, setHistory] = useState<PastMatch[]>(getMatchHistory());
  const [rotated, setRotated] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [dqConfirmCorner, setDqConfirmCorner] = useState<'BIRU' | 'MERAH' | null>(null);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showVerifikasiResultPopup, setShowVerifikasiResultPopup] = useState(false);
  const [verifikasiPopupData, setVerifikasiPopupData] = useState<{
    jenis: 'JATUHAN' | 'PELANGGARAN';
    result: 'MERAH' | 'BIRU' | 'TIDAK_SAH' | null;
  } | null>(null);
  const [peekRoundEnd, setPeekRoundEnd] = useState<boolean>(false);
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [dewanClosedMatchEndPopUp, setDewanClosedMatchEndPopUp] = useState<boolean>(false);
  const [showDewanStopMatchModal, setShowDewanStopMatchModal] = useState<boolean>(false);
  const [selectedWinnerCorner, setSelectedWinnerCorner] = useState<'BIRU' | 'MERAH' | null>(null);
  const [deleteConfirmSudut, setDeleteConfirmSudut] = useState<'BIRU' | 'MERAH' | null>(null);
  const [activeBluePunch, setActiveBluePunch] = useState<boolean>(false);
  const [activeBlueKick, setActiveBlueKick] = useState<boolean>(false);
  const [activeRedPunch, setActiveRedPunch] = useState<boolean>(false);
  const [activeRedKick, setActiveRedKick] = useState<boolean>(false);
  const [showMonitorNextMatchBanner, setShowMonitorNextMatchBanner] = useState<boolean>(false);
  const [showMonitorRoundFinishedBanner, setShowMonitorRoundFinishedBanner] = useState<boolean>(false);
  const [finishedRoundNumber, setFinishedRoundNumber] = useState<number | null>(null);
  const [showNextMatchesPopup, setShowNextMatchesPopup] = useState<boolean>(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [showStatsBanner, setShowStatsBanner] = useState<boolean>(false);
  const [activeStatsCorner, setActiveStatsCorner] = useState<'BIRU' | 'MERAH'>('BIRU');
  const [showGenerateBaganPopup, setShowGenerateBaganPopup] = useState<boolean>(false);
  const [showGenerateJadwalPopup, setShowGenerateJadwalPopup] = useState<boolean>(false);
  const [selectedGelanggang, setSelectedGelanggang] = useState<string>(() => localStorage.getItem('silat_selected_gelanggang') || 'GELANGGANG I');
  const [showGelanggangDropdown, setShowGelanggangDropdown] = useState<boolean>(false);
  const [baganAthletes, setBaganAthletes] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('silat_bagan_athletes');
      return saved ? JSON.parse(saved) : [
        { nama: "ADI WIJAYA", kontingen: "JAWA TENGAH" },
        { nama: "RIZKY PUTRA", kontingen: "JAWA TIMUR" },
        { nama: "NURUL INDAH", kontingen: "SULAWESI SELATAN" },
        { nama: "SITI AMINAH", kontingen: "BANTEN" },
        { nama: "DEWANTO", kontingen: "DKI JAKARTA" },
        { nama: "FARHAN RAZAK", kontingen: "JAWA BARAT" },
        { nama: "HERI KUSUMA", kontingen: "BALI" },
        { nama: "AKBAR MAULANA", kontingen: "DI YOGYAKARTA" }
      ];
    } catch {
      return [
        { nama: "ADI WIJAYA", kontingen: "JAWA TENGAH" },
        { nama: "RIZKY PUTRA", kontingen: "JAWA TIMUR" },
        { nama: "NURUL INDAH", kontingen: "SULAWESI SELATAN" },
        { nama: "SITI AMINAH", kontingen: "BANTEN" },
        { nama: "DEWANTO", kontingen: "DKI JAKARTA" },
        { nama: "FARHAN RAZAK", kontingen: "JAWA BARAT" },
        { nama: "HERI KUSUMA", kontingen: "BALI" },
        { nama: "AKBAR MAULANA", kontingen: "DI YOGYAKARTA" }
      ];
    }
  });

  const [baganKelas, setBaganKelas] = useState<string>(() => localStorage.getItem('silat_bagan_kelas') || 'A');
  const [baganGender, setBaganGender] = useState<string>(() => localStorage.getItem('silat_bagan_gender') || 'PUTRA');
  const [baganUsia, setBaganUsia] = useState<string>(() => localStorage.getItem('silat_bagan_usia') || 'REMAJA');
  const [baganStartingStage, setBaganStartingStage] = useState<string>(() => localStorage.getItem('silat_bagan_starting_stage') || 'PENYISIHAN');

  const [jadwalLines, setJadwalLines] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('silat_jadwal_lines');
      return saved ? JSON.parse(saved) : [
        {
          partai: "1",
          kelas: "A",
          gender: "PUTRA",
          kategoriUsia: "REMAJA",
          tahapPertandingan: "PENYISIHAN",
          atlitMerah: { nama: "ANDI SANTOSO", kontingen: "JAWA TENGAH" },
          atlitBiru: { nama: "BUDI PRASETYO", kontingen: "DKI JAKARTA" }
        },
        {
          partai: "2",
          kelas: "B",
          gender: "PUTRI",
          kategoriUsia: "REMAJA",
          tahapPertandingan: "PENYISIHAN",
          atlitMerah: { nama: "SITI NUR HALIZA", kontingen: "JAWA BARAT" },
          atlitBiru: { nama: "DIAN UTAMI", kontingen: "JAWA TIMUR" }
        },
        {
          partai: "3",
          kelas: "C",
          gender: "PUTRA",
          kategoriUsia: "DEWASA",
          tahapPertandingan: "SEMIFINAL",
          atlitMerah: { nama: "EKO WAHYUDI", kontingen: "BALI" },
          atlitBiru: { nama: "FAJAR NUGRAHA", kontingen: "DI YOGYAKARTA" }
        },
        {
          partai: "4",
          kelas: "A",
          gender: "PUTRA",
          kategoriUsia: "DEWASA",
          tahapPertandingan: "FINAL",
          atlitMerah: { nama: "GUNTUR PERMANA", kontingen: "BANTEN" },
          atlitBiru: { nama: "HERI SUSANTO", kontingen: "SUMATERA UTARA" }
        }
      ];
    } catch {
      return [];
    }
  });

  const handleBaganFileUpload = async (file: File) => {
    try {
      const data = await parseExcelImport(file);
      if (data && data.length > 0) {
        const matchedList = data.map((row: any) => {
          const nama = row['Nama'] || row['Nama Pesilat'] || row['Nama Atlit'] || row['Pesilat'] || row['atlit'] || Object.values(row)[0] || "";
          const kontingen = row['Kontingen'] || row['Asal'] || row['Daerah'] || row['Asal Kontingen'] || Object.values(row)[1] || "";
          if (!nama || String(nama).trim() === "") return null;
          return { nama: String(nama).toUpperCase(), kontingen: String(kontingen).toUpperCase() };
        }).filter(Boolean) as { nama: string; kontingen: string }[];

        const L = matchedList.length;
        if (L < 2) {
          // Guarantee a minimum of 2 slots
          const paddedList = [...matchedList];
          while (paddedList.length < 2) {
            paddedList.push({ nama: "", kontingen: "" });
          }
          setBaganAthletes(paddedList);
          localStorage.setItem('silat_bagan_athletes', JSON.stringify(paddedList));
          showToast(`Berhasil mengimpor ${L} atlit ke bagan!`, 'success');
        } else {
          setBaganAthletes(matchedList);
          localStorage.setItem('silat_bagan_athletes', JSON.stringify(matchedList));
          showToast(`Berhasil mengimpor ${L} atlit ke bagan!`, 'success');
        }
      }
    } catch (err) {
      showToast('Gagal memproses file excel bagan.', 'warning');
    }
  };

  const handleJadwalFileUpload = async (file: File) => {
    try {
      const data = await parseExcelImport(file);
      if (data && data.length > 0) {
        const parsed = data.map((row: any, i: number) => {
          let rPartai = String(row['Partai'] || row['partai'] || i + 1);
          let rKelas = String(row['Kelas'] || row['kelas'] || 'A');
          let rGender = String(row['Gender'] || row['gender'] || 'PUTRA').toUpperCase();
          let rUsia = String(row['Kategori Usia'] || row['Usia'] || row['kategoriUsia'] || 'REMAJA').toUpperCase();
          let rTahap = String(row['Tahap Pertandingan'] || row['Tahapan'] || row['tahap'] || 'PENYISIHAN').toUpperCase();
          
          let nmM = String(row['Nama Pesilat Merah'] || row['Nama Atlit Merah'] || row['atlitMerahNama'] || row['Nama'] || '-').toUpperCase();
          let ktM = String(row['Kontingen Merah'] || row['Asal Merah'] || row['kontingenMerah'] || row['Kontingen'] || 'DAERAH').toUpperCase();
          
          let nmB = String(row['Nama Pesilat Biru'] || row['Nama Atlit Biru'] || row['atlitBiruNama'] || row['Nama_2'] || '-').toUpperCase();
          let ktB = String(row['Kontingen Biru'] || row['Asal Biru'] || row['kontingenBiru'] || row['Kontingen_2'] || 'DAERAH').toUpperCase();

          return {
            partai: rPartai,
            kelas: rKelas,
            gender: rGender,
            kategoriUsia: rUsia,
            tahapPertandingan: rTahap,
            atlitMerah: { nama: nmM, kontingen: ktM },
            atlitBiru: { nama: nmB, kontingen: ktB }
          };
        });
        setJadwalLines(parsed);
        localStorage.setItem('silat_jadwal_lines', JSON.stringify(parsed));
        showToast(`Sukses memuat ${parsed.length} jadwal pertandingan dari Excel!`, 'success');
      }
    } catch (err) {
      showToast('Gagal memproses file excel jadwal.', 'warning');
    }
  };

  // License and simulated lock states
  const [isSimulatedLocked, setIsSimulatedLocked] = useState<boolean>(() => localStorage.getItem('silat_simulated_lock') === 'true');
  const [activationKeyInput, setActivationKeyInput] = useState<string>('');
  const [isAppLicensed, setIsAppLicensed] = useState<boolean>(() => {
    const saved = localStorage.getItem('silat_activation_key') || '';
    return verifyActivationKey(getDeviceId(), saved);
  });
  const [activationError, setActivationError] = useState<string | null>(null);
  const [showActivationSuccess, setShowActivationSuccess] = useState<boolean>(false);
  const [genDeviceIdInput, setGenDeviceIdInput] = useState<string>('');
  const [showAdminGen, setShowAdminGen] = useState<boolean>(false);
  const [serverDeviceId, setServerDeviceId] = useState<string>(() => getDeviceId());
  const [showLicenseStatusPopup, setShowLicenseStatusPopup] = useState<boolean>(false);

  useEffect(() => {
    // Check local server license status on mount
    fetch('/api/license/status')
      .then(res => res.json())
      .then(data => {
        if (data.deviceId) {
          setServerDeviceId(data.deviceId);
          setIsAppLicensed(data.isLicensed);
        }
      })
      .catch(err => console.warn('Could not contact server for license status:', err));
  }, []);

  // Aggressive SVG & Image assets preloading to ensure instant render without flicker when entering Dewan/Monitor panel
  useEffect(() => {
    const assetsToPreload = [
      // Standard roots
      "/binaan1.svg",
      "/binaan2.svg",
      "/teguran1.svg",
      "/teguran2.svg",
      "/peringatan1.svg",
      "/peringatan2.svg",
      "/punch.svg",
      "/kick.svg",
      "/pesilatkiri.svg",
      "/pesilatkanan.svg",
      "/pesilat1.png",
      "/pesilat2.png",
      "/temadiscors.png",
      // /assets/ routes
      "/assets/binaan1.svg",
      "/assets/binaan2.svg",
      "/assets/teguran1.svg",
      "/assets/teguran2.svg",
      "/assets/peringatan1.svg",
      "/assets/peringatan2.svg",
      "/assets/punch.svg",
      "/assets/kick.svg",
      "/assets/pesilat1.png",
      "/assets/pesilat2.png",
      "/assets/pesilatkiri.svg",
      "/assets/pesilatkanan.svg",
      "/assets/temadiscors.png"
    ].map(url => url.includes('?') ? url : `${url}?v=15`);

    // Dynamic customIcons from state
    if (matchState.customIcons) {
      Object.keys(matchState.customIcons).forEach((key) => {
        const url = matchState.customIcons?.[key as any];
        if (url && typeof url === "string") {
          assetsToPreload.push(url);
          // Preload clean URL without timestamp hash as well to ensure perfect caching
          const idx = url.indexOf('?');
          if (idx !== -1) {
            assetsToPreload.push(url.substring(0, idx));
          }
        }
      });
    }

    // Dynamic logos
    if (matchState.logoKiri && typeof matchState.logoKiri === "string") {
      assetsToPreload.push(matchState.logoKiri);
      const idx = matchState.logoKiri.indexOf('?');
      if (idx !== -1) assetsToPreload.push(matchState.logoKiri.substring(0, idx));
    }
    if (matchState.logoKanan && typeof matchState.logoKanan === "string") {
      assetsToPreload.push(matchState.logoKanan);
      const idx = matchState.logoKanan.indexOf('?');
      if (idx !== -1) assetsToPreload.push(matchState.logoKanan.substring(0, idx));
    }

    // Unique URL collection
    const uniqueAssets = Array.from(new Set(assetsToPreload));

    // Force preloading via DOM Image instantiation
    uniqueAssets.forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, [matchState.customIcons, matchState.logoKiri, matchState.logoKanan]);

  useEffect(() => {
    if (!matchState.showRoundEndPopUp) {
      setPeekRoundEnd(false);
    }
  }, [matchState.showRoundEndPopUp]);

  useEffect(() => {
    if (matchState.showMatchEndPopUp || matchState.diskualifikasi) {
      setDewanClosedMatchEndPopUp(false);
    }
  }, [matchState.showMatchEndPopUp, matchState.diskualifikasi]);

  const RenderIconOrCustom = ({ 
    iconKey, 
    DefaultIcon, 
    className = "w-8 h-8 mb-1" 
  }: { 
    iconKey: keyof CustomIcons; 
    DefaultIcon: React.FC<React.SVGProps<SVGSVGElement>>; 
    className?: string;
  }) => {
    const customSrc = matchState.customIcons?.[iconKey];
    if (customSrc) {
      const classes = className.split(' ');
      const sizeClasses = classes.filter(c => c.startsWith('w-') || c.startsWith('h-')).join(' ');
      const otherClasses = classes.filter(c => !c.startsWith('w-') && !c.startsWith('h-')).join(' ');
      return (
        <div className={`flex items-center justify-center overflow-hidden shrink-0 ${sizeClasses} ${otherClasses}`}>
          <img 
            src={customSrc} 
            className="w-full h-full object-contain max-w-full max-h-full pointer-events-none" 
            alt={iconKey} 
            referrerPolicy="no-referrer" 
          />
        </div>
      );
    }
    return <DefaultIcon className={className} />;
  };

  const renderGridLogNilaiMasuk = (corner: 'MERAH' | 'BIRU') => {
    const isMerah = corner === 'MERAH';
    return (
      <div className="w-full mt-4 bg-black/45 border border-purple-900/30 rounded-xl p-3 shadow-inner overflow-x-auto">
        <span className={`text-[10px] font-mono block font-black mb-2 uppercase tracking-wide ${isMerah ? 'text-red-400 text-right' : 'text-blue-400'}`}>
          LOG NILAI MASUK ({corner}):
        </span>
        <div className="min-w-[480px]">
          <table className="w-full text-[10px] font-mono text-slate-350">
            <thead>
              <tr className="border-b border-purple-950/60 pb-1 text-purple-300">
                <th className="pb-1.5 pt-0.5 text-left font-extrabold uppercase w-[10%]">Babak</th>
                <th className="pb-1.5 pt-0.5 text-center font-extrabold uppercase w-[15%]">NILAI J1</th>
                <th className="pb-1.5 pt-0.5 text-center font-extrabold uppercase w-[15%]">NILAI J2</th>
                <th className="pb-1.5 pt-0.5 text-center font-extrabold uppercase w-[15%]">NILAI J3</th>
                <th className="pb-1.5 pt-0.5 text-center font-extrabold uppercase w-[18%]">NILAI DEWAN (+3)</th>
                <th className="pb-1.5 pt-0.5 text-center font-extrabold uppercase w-[17%]">HUKUMAN</th>
                <th className="pb-1.5 pt-0.5 text-center font-extrabold uppercase w-[10%]">TOTAL NILAI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-950/35">
              {[1, 2, 3].map((b) => {
                const getJuriScores = (jId: 1 | 2 | 3) => {
                  const juriClicks = (matchState.rawScores || [])
                    .filter(s => s.juriId === jId && s.sudut === corner && s.babak === b)
                    .sort((a, b) => a.timestamp - b.timestamp);

                  if (juriClicks.length === 0) {
                    return <span className="text-slate-705 font-mono">-</span>;
                  }

                  return (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {juriClicks.map((s, idx) => {
                        const val = s.jenis === 'PUNCH' ? 1 : 2;
                        const isSah = !!s.validated;
                        return (
                          <span key={s.id} className="inline-flex items-center">
                            {isSah ? (
                              <span className={`font-black text-[10px] font-mono px-1 rounded ${isMerah ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                {val}
                              </span>
                            ) : (
                              <span className="line-through text-slate-600 font-mono text-[10px]" title="Tidak Sah">
                                {val}
                              </span>
                            )}
                            {idx < juriClicks.length - 1 && <span className="text-purple-950/70 text-[8px] ml-0.5 font-sans">,</span>}
                          </span>
                        );
                      })}
                    </div>
                  );
                };

                const dewanScores = (matchState.validatedScores || [])
                  .filter(v => v.sudut === corner && v.babak === b && v.jenis === 'JATUHAN');

                const getPenaltiesForRound = (roundNumber: number) => {
                  if (roundNumber === matchState.babakAktif) {
                    return corner === 'MERAH' ? matchState.penaltiesMerah : matchState.penaltiesBiru;
                  }
                  return corner === 'MERAH' ? matchState.historyPenaltiesMerah?.[roundNumber] : matchState.historyPenaltiesBiru?.[roundNumber];
                };

                const checkPeringatanFirstTime = (roundNumber: number, key: 'peringatan1' | 'peringatan2') => {
                  const p = getPenaltiesForRound(roundNumber);
                  if (!p || !p[key]) return false;
                  for (let prev = 1; prev < roundNumber; prev++) {
                    const prevPen = getPenaltiesForRound(prev);
                    if (prevPen && prevPen[key]) {
                      return false;
                    }
                  }
                  return true;
                };

                const penalties = getPenaltiesForRound(b);


                const getPenaltyDisplayStrings = (p: any): string[] => {
                  if (!p) return [];
                  const items: string[] = [];
                  if (p.binaan1) items.push('B1');
                  if (p.binaan2) items.push('B2');
                  if (p.teguran1) items.push('-1');
                  if (p.teguran2) items.push('-2');
                  if (checkPeringatanFirstTime(b, 'peringatan1')) items.push('-5');
                  if (checkPeringatanFirstTime(b, 'peringatan2')) items.push('-10');
                  return items;
                };

                const penaltyStrings = getPenaltyDisplayStrings(penalties);

                let roundPenaltyDeduction = 0;
                if (penalties) {
                  if (penalties.teguran1) roundPenaltyDeduction += 1;
                  if (penalties.teguran2) roundPenaltyDeduction += 2;
                  if (checkPeringatanFirstTime(b, 'peringatan1')) roundPenaltyDeduction += 5;
                  if (checkPeringatanFirstTime(b, 'peringatan2')) roundPenaltyDeduction += 10;
                }

                const totalPoints = (matchState.validatedScores || [])
                  .filter(v => v.sudut === corner && v.babak === b)
                  .reduce((acc, curr) => acc + curr.points, 0);

                const finalTotalPoints = totalPoints - roundPenaltyDeduction;

                return (
                  <tr key={b} className="hover:bg-purple-950/10 transition-colors">
                    <td className="py-2 text-left font-bold text-slate-350">Babak {b}</td>
                    <td className="py-2 text-center">{getJuriScores(1)}</td>
                    <td className="py-2 text-center">{getJuriScores(2)}</td>
                    <td className="py-2 text-center">{getJuriScores(3)}</td>
                    <td className="py-2 text-center">
                      {dewanScores.length === 0 ? (
                        <span className="text-slate-705">-</span>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {dewanScores.map((v) => {
                            const isPositive = v.points > 0;
                            return (
                              <span key={v.id} className={`font-black text-[10px] px-1 rounded font-mono ${isPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-600/20 text-amber-300'}`}>
                                {isPositive ? `+${v.points}` : v.points}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      {penaltyStrings.length === 0 ? (
                        <span className="text-slate-705">-</span>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {penaltyStrings.map((pStr, idx) => {
                            let badgeClass = "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
                            if (pStr === '-1' || pStr === '-2') {
                              badgeClass = "bg-orange-500/20 text-orange-300 border border-orange-500/30";
                            } else if (pStr === '-5' || pStr === '-10') {
                              badgeClass = "bg-red-500/25 text-red-300 border border-red-500/30";
                            }

                            // Visual representation fitting official IPSI regulations perfectly:
                            let formattedDisplay: React.ReactNode = pStr;
                            if (pStr === 'B1') {
                              formattedDisplay = <span className="select-none">B1</span>;
                            } else if (pStr === 'B2') {
                              formattedDisplay = <span className="select-none">B2</span>;
                            } else if (pStr === '-1') {
                              formattedDisplay = <span className="select-none font-black">-1</span>;
                            } else if (pStr === '-2') {
                              formattedDisplay = <span className="select-none font-black">-2</span>;
                            }

                            return (
                              <span key={idx} className={`font-black text-[10px] px-1.5 py-0.5 rounded font-mono inline-flex items-center justify-center min-w-[20px] h-[18px] shadow-sm ${badgeClass}`}>
                                {formattedDisplay}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-center text-amber-400 font-black text-[11px] font-mono">{finalTotalPoints}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getMaxRounds = (kategoriUsia?: string, babakAktif?: number): number => {
    const norm = (kategoriUsia || '').toUpperCase().trim();
    const isTwoRounds = [
      "PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER 2", "MASTER A", "MASTER B"
    ].includes(norm);
    const normalMax = isTwoRounds ? 2 : 3;
    const currentBabak = babakAktif !== undefined ? babakAktif : (matchState ? matchState.babakAktif : 1);
    return Math.max(normalMax, currentBabak);
  };

  // High quality local states to back input fields preventing typing lag / cursor jumping
  const [localEventName, setLocalEventName] = useState(matchState.eventName);
  const [localTempatPelaksanaan, setLocalTempatPelaksanaan] = useState(matchState.tempatPelaksanaan || '');
  const [localWaktuPelaksanaan, setLocalWaktuPelaksanaan] = useState(matchState.waktuPelaksanaan || '');
  const [localPartai, setLocalPartai] = useState(matchState.partai);
  const [localKelas, setLocalKelas] = useState(matchState.kelas);
  const [localAtlitBiruNama, setLocalAtlitBiruNama] = useState(matchState.atlitBiru.nama);
  const [localAtlitBiruKontingen, setLocalAtlitBiruKontingen] = useState(matchState.atlitBiru.kontingen);
  const [localAtlitMerahNama, setLocalAtlitMerahNama] = useState(matchState.atlitMerah.nama);
  const [localAtlitMerahKontingen, setLocalAtlitMerahKontingen] = useState(matchState.atlitMerah.kontingen);
  const [localLogoKiri, setLocalLogoKiri] = useState(matchState.logoKiri || '');
  const [localLogoKanan, setLocalLogoKanan] = useState(matchState.logoKanan || '');

  useEffect(() => {
    if (document.activeElement?.id !== 'input-eventName') setLocalEventName(matchState.eventName);
    if (document.activeElement?.id !== 'input-tempatPelaksanaan') setLocalTempatPelaksanaan(matchState.tempatPelaksanaan || '');
    if (document.activeElement?.id !== 'input-waktuPelaksanaan') setLocalWaktuPelaksanaan(matchState.waktuPelaksanaan || '');
    if (document.activeElement?.id !== 'input-partai') setLocalPartai(matchState.partai);
    if (document.activeElement?.id !== 'input-kelas') setLocalKelas(matchState.kelas);
    if (document.activeElement?.id !== 'input-atlitBiruNama') setLocalAtlitBiruNama(matchState.atlitBiru.nama);
    if (document.activeElement?.id !== 'input-atlitBiruKontingen') setLocalAtlitBiruKontingen(matchState.atlitBiru.kontingen);
    if (document.activeElement?.id !== 'input-atlitMerahNama') setLocalAtlitMerahNama(matchState.atlitMerah.nama);
    if (document.activeElement?.id !== 'input-atlitMerahKontingen') setLocalAtlitMerahKontingen(matchState.atlitMerah.kontingen);
    if (document.activeElement?.id !== 'input-logoKiri') setLocalLogoKiri(matchState.logoKiri || '');
    if (document.activeElement?.id !== 'input-logoKanan') setLocalLogoKanan(matchState.logoKanan || '');
  }, [matchState]);

  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleActivateApp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = activationKeyInput.trim().toUpperCase();
    
    fetch('/api/license/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activationKey: cleanKey })
    })
    .then(async res => {
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('silat_activation_key', cleanKey);
        localStorage.setItem('silat_simulated_lock', 'false');
        setIsSimulatedLocked(false);
        setIsAppLicensed(true);
        setActivationError(null);
        setActivationKeyInput('');
        setShowActivationSuccess(true);
        if (soundEnabled) playPointSound();
        showToast('Sistem Berhasil Diaktifkan! Proteksi Dibuka.', 'success');
      } else {
        throw new Error(data.error || 'Aktivasi gagal.');
      }
    })
    .catch(err => {
      // Local offline fallback in case the server is temporarily unreachable
      const correctKey = generateActivationKey(serverDeviceId);
      if (cleanKey === correctKey) {
        localStorage.setItem('silat_activation_key', cleanKey);
        localStorage.setItem('silat_simulated_lock', 'false');
        setIsSimulatedLocked(false);
        setIsAppLicensed(true);
        setActivationError(null);
        setActivationKeyInput('');
        setShowActivationSuccess(true);
        if (soundEnabled) playPointSound();
        showToast('Aktivasi Lokal Sukses (Offline)! Proteksi Dibuka.', 'success');
      } else {
        setActivationError('Kunci Aktivasi tidak valid! Silakan periksa kembali.');
        if (soundEnabled) playWarningSound();
        showToast('Kunci Aktivasi Salah!', 'warning');
      }
    });
  };

  const toggleSimulatedLock = () => {
    const nextVal = !isSimulatedLocked;
    localStorage.setItem('silat_simulated_lock', String(nextVal));
    setIsSimulatedLocked(nextVal);
    if (soundEnabled) playClickSound();
    showToast(nextVal ? 'Simulasi Layar Pengunci Diaktifkan!' : 'Simulasi Layar Pengunci Dinonaktifkan!', nextVal ? 'warning' : 'success');
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const docEl = document.documentElement as any;
      const requestM = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
      if (requestM) {
        requestM.call(docEl).catch((err: any) => {
          console.error(`Error attempting to enable fullscreen: ${err?.message}`);
        });
      }
    } else {
      const doc = document as any;
      const exitM = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exitM) {
        exitM.call(doc);
      }
    }
  };

  // Keepalive heartbeat effect so that other devices know which Juri panels are active/in use
  useEffect(() => {
    if (role === 'JURI_PANEL' && selectedJuriId) {
      const sendHeartbeat = () => {
        fetch('/api/juri/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ juriId: selectedJuriId }),
        }).catch((err) => console.debug("Heartbeat error:", err));
      };

      // Send heartbeat immediately on mounting the panel
      sendHeartbeat();

      // Send heartbeat every 3 seconds
      const intervalId = setInterval(sendHeartbeat, 3000);
      return () => clearInterval(intervalId);
    }
  }, [role, selectedJuriId]);

  // Sync animation triggers on Validated Score additions
  const [glowMerah, setGlowMerah] = useState(false);
  const [glowBiru, setGlowBiru] = useState(false);
  
  // Track previous validated scores to trigger flashes only on NEW scores
  const lastValidatedLengthRef = useRef(matchState.validatedScores.length);

  // States for Juri cell flashing
  const [flashCells, setFlashCells] = useState<Record<string, boolean>>({});
  const flashedRawIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Sync/Clean up IDs that are no longer present in rawScores on resets
    const currentRawIds = new Set((matchState.rawScores || []).map(s => s.id));
    flashedRawIdsRef.current.forEach(id => {
      if (!currentRawIds.has(id)) {
        flashedRawIdsRef.current.delete(id);
      }
    });

    const validatedRaws = (matchState.rawScores || []).filter(s => s.validated);
    const cellsToFlash: Record<string, boolean> = {};

    validatedRaws.forEach(r => {
      if (!flashedRawIdsRef.current.has(r.id)) {
        flashedRawIdsRef.current.add(r.id);
        if (r.jenis === 'PUNCH' || r.jenis === 'KICK') {
          const key = `${r.juriId}-${r.sudut}-${r.jenis}`;
          cellsToFlash[key] = true;
        }
      }
    });

    if (Object.keys(cellsToFlash).length > 0) {
      setFlashCells(prev => ({ ...prev, ...cellsToFlash }));
      setTimeout(() => {
        setFlashCells(prev => {
          const updated = { ...prev };
          Object.keys(cellsToFlash).forEach(key => {
            delete updated[key];
          });
          return updated;
        });
      }, 1500);
    }
  }, [matchState.rawScores]);

  // Broadcast code for instant synchronization across tabs and network
  useEffect(() => {
    const channel = new BroadcastChannel('silat_scoring_sync');
    
    const handleIncomingState = (incomingState: MatchState) => {
      if (!incomingState) {
        return;
      }
      // Guard against stale/older server states due to network/SSE latency
      if (incomingState.version !== undefined && matchStateRef.current.version !== undefined) {
        if (incomingState.version < matchStateRef.current.version) {
          // Ignore older state to prevent flickering or reverting local actions
          return;
        }
        if (incomingState.version === matchStateRef.current.version) {
          // No-op for the same state we already computed locally
          return;
        }
      }

      // Sound indicator on new points in active juri or monitor tabs - REMOVED sound playback as requested to prevent match distraction, but keeping visual glow
      if (incomingState.validatedScores.length > lastValidatedLengthRef.current) {
        const lastNewScore = incomingState.validatedScores[incomingState.validatedScores.length - 1];
        if (lastNewScore && (lastNewScore.jenis === 'PUNCH' || lastNewScore.jenis === 'KICK')) {
          if (lastNewScore.sudut === 'MERAH') {
            setGlowMerah(true);
            setTimeout(() => setGlowMerah(false), 1500);
          } else {
            setGlowBiru(true);
            setTimeout(() => setGlowBiru(false), 1500);
          }
        }
      }
      
      // Sync sounds for verifikasi status transitions
      const prevVerif = matchStateRef.current.verifikasi;
      const nextVerif = incomingState.verifikasi;
      if (nextVerif && prevVerif && nextVerif.status !== prevVerif.status) {
        if (soundEnabled) {
          if (nextVerif.status === 'PENDING') {
            playWarningSound();
          } else if (nextVerif.status === 'RESOLVED') {
            playBuzzer();
          }
        }
      }

      // Sync buzzer sound on round-end transition driven by server-side timer
      const prevTimer = matchStateRef.current.timerBerjalan;
      const nextTimer = incomingState.timerBerjalan;
      if (prevTimer && !nextTimer && incomingState.sisaWaktu === 0) {
        if (soundEnabled) playBuzzer();
      }

      // Sync buzzer sound on starting/resuming a new round (timer transitions from inactive to active and sisaWaktu is full)
      if (!prevTimer && nextTimer && incomingState.sisaWaktu === incomingState.durasiBabak) {
        if (soundEnabled) playBuzzer();
      }

      lastValidatedLengthRef.current = incomingState.validatedScores.length;

      // Unify state updates to prevent network latency and base64 upload lags from jittering the timer
      let finalState = { ...incomingState };

      // Preserve customIcons so they are not wiped from Juri click actions or state updates without customIcons
      if (finalState.customIcons === undefined && matchStateRef.current.customIcons !== undefined) {
        finalState.customIcons = matchStateRef.current.customIcons;
      }

      if (incomingState.timerBerjalan && matchStateRef.current.timerBerjalan) {
        const diff = Math.abs(incomingState.sisaWaktu - matchStateRef.current.sisaWaktu);
        // If the difference is within 1.5 seconds, rely on the high-precision client device timer!
        if (diff <= 1.5) {
          finalState.sisaWaktu = matchStateRef.current.sisaWaktu;
        }
      }

      setMatchState(finalState);
    };

    channel.onmessage = (event) => {
      if (event.data.type === 'UPDATE_STATE') {
        handleIncomingState(event.data.state as MatchState);
      } else if (event.data.type === 'UPDATE_HISTORY') {
        setHistory(event.data.history);
      }
    };

    // Server-Sent Events setup for cross-device sync
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'UPDATE_STATE') {
            handleIncomingState(data.state as MatchState);
          } else if (data.type === 'UPDATE_HISTORY') {
            setHistory(data.history);
          } else if (data.type === 'LICENSE_UPDATE') {
            setIsAppLicensed(data.isLicensed);
            if (data.deviceId) {
              setServerDeviceId(data.deviceId);
            }
          }
        } catch (e) {
          console.debug("SSE Parse Error", e);
        }
      };
    } catch (e) {
      console.warn("EventSource is not supported or server is offline", e);
    }

    return () => {
      channel.close();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [soundEnabled]);

  // Synchronize localStorage and active state to local variables on save
  const updateMatchState = (updated: MatchState) => {
    // If the Partai (match number) has changed compared to current state, reset bypass & trigger flags!
    if (updated.partai !== matchState.partai) {
      updated = {
        ...updated,
        wmpTriggered: false,
        wmpBypassed: false,
        wmpBypassedScoreDiff: 0,
        wmpWon: false,
        wmpBabak1Occurred: false
      };
    }

    // Run WMP Check to automatically pause on score differences of 30/20 in babak 2 or 3
    const updatedWithCheck = runWmpCheck(updated);

    const babak = updatedWithCheck.babakAktif || 1;
    const historyMerah = { ...(updatedWithCheck.historyPenaltiesMerah || {}) };
    historyMerah[babak] = { ...updatedWithCheck.penaltiesMerah };

    const historyBiru = { ...(updatedWithCheck.historyPenaltiesBiru || {}) };
    historyBiru[babak] = { ...updatedWithCheck.penaltiesBiru };

    const updatedWithVersion = { 
      ...updatedWithCheck, 
      historyPenaltiesMerah: historyMerah,
      historyPenaltiesBiru: historyBiru,
      version: Date.now() 
    };
    matchStateRef.current = updatedWithVersion;
    setMatchState(updatedWithVersion);
    saveMatchState(updatedWithVersion);
  };

  useKeyPress(' ', () => {
    if (matchState.statusPertandingan === 'BERJALAN') {
      toggleTimer();
    }
  });

  // Shift key shortcut for BELL / HORN on PC (Secretary panel)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }
      if (e.key === 'Shift') {
        if (e.repeat) return;
        if (soundEnabled && role === 'SEKRETARIS') {
          e.preventDefault();
          startBuzzer();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        if (soundEnabled && role === 'SEKRETARIS') {
          e.preventDefault();
          stopBuzzer();
        }
      }
    };

    const handleBlur = () => {
      if (soundEnabled && role === 'SEKRETARIS') {
        stopBuzzer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [soundEnabled, role]);

  // Sound triggering helper
  const triggerClick = () => {
    if (soundEnabled && role !== 'SEKRETARIS') playClickSound();
  };

  const matchStateRef = useRef<MatchState>(matchState);
  useEffect(() => {
    matchStateRef.current = matchState;
  }, [matchState]);

  // Synchronize schedules to matchState so they are shared across devices / Monitor role
  useEffect(() => {
    if (role === 'SEKRETARIS') {
      const excelDataStr = localStorage.getItem('silat_excel_matches');
      let excelMatches: any[] = [];
      if (excelDataStr) {
        try {
          excelMatches = JSON.parse(excelDataStr);
        } catch {}
      }

      const shouldUpdate = 
        JSON.stringify(matchState.silat_jadwal_lines || []) !== JSON.stringify(jadwalLines || []) ||
        JSON.stringify(matchState.silat_excel_matches || []) !== JSON.stringify(excelMatches);

      if (shouldUpdate) {
        const timerObj = setTimeout(() => {
          updateMatchState({
            ...matchState,
            silat_jadwal_lines: jadwalLines,
            silat_excel_matches: excelMatches
          });
        }, 300);
        return () => clearTimeout(timerObj);
      }
    }
  }, [role, jadwalLines, matchState.partai]);

  // Local high-precision countdown timer connected to device system clock
  useEffect(() => {
    if (!matchState.timerBerjalan) return;

    const deviceStartTime = Date.now();
    const initialSisaWaktu = matchState.sisaWaktu;

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - deviceStartTime) / 1000);
      const calculatedSisa = Math.max(0, initialSisaWaktu - elapsedSeconds);

      if (calculatedSisa !== matchStateRef.current.sisaWaktu) {
        if (calculatedSisa === 0) {
          if (soundEnabled) playBuzzer();
          if (role === 'SEKRETARIS') {
            const currentRound = matchStateRef.current.babakAktif;
            const maxRounds = getMaxRounds(matchStateRef.current.kategoriUsia);
            
            // First broadcast timer stopped state immediately
            const stopped: MatchState = {
              ...matchStateRef.current,
              sisaWaktu: 0,
              timerBerjalan: false,
            };
            updateMatchState(stopped);

            // Delay the round-end popup by 1800ms to allow buzzer to finish playing
            setTimeout(() => {
              if (matchStateRef.current.sisaWaktu === 0 && !matchStateRef.current.timerBerjalan && !matchStateRef.current.showRoundEndPopUp) {
                const updated: MatchState = {
                  ...matchStateRef.current,
                  showRoundEndPopUp: true,
                  showMatchEndPopUp: currentRound === maxRounds,
                };
                if (currentRound === maxRounds) {
                  updated.statusPertandingan = "SELESAI";
                  updated.pemenang = determineWinner(updated);
                }
                updateMatchState(updated);
              }
            }, 1800);
          } else {
            // Stop the clock locally immediately
            setMatchState((prev) => {
              if (!prev.timerBerjalan) return prev;
              return {
                ...prev,
                sisaWaktu: 0,
                timerBerjalan: false,
              };
            });

            // Postpone showing round end pop up locally
            setTimeout(() => {
              setMatchState((prev) => {
                if (prev.sisaWaktu === 0 && !prev.timerBerjalan && !prev.showRoundEndPopUp) {
                  const currentRound = prev.babakAktif;
                  const maxRounds = getMaxRounds(prev.kategoriUsia);
                  const updatedPopup = {
                    ...prev,
                    showRoundEndPopUp: true,
                    showMatchEndPopUp: currentRound === maxRounds,
                  };
                  if (currentRound === maxRounds) {
                    updatedPopup.statusPertandingan = "SELESAI";
                    updatedPopup.pemenang = determineWinner(updatedPopup);
                  }
                  return updatedPopup;
                }
                return prev;
              });
            }, 1800);
          }
        } else {
          setMatchState((prev) => {
            if (!prev.timerBerjalan || prev.sisaWaktu !== matchStateRef.current.sisaWaktu) {
              // Keep local state in sync if timer paused/reset
              return prev;
            }

            // Run WMP delayed check for Babak 1
            const calculatedSisaNow = Math.max(0, initialSisaWaktu - Math.floor((Date.now() - deviceStartTime) / 1000));
            const elapsed = prev.durasiBabak - calculatedSisaNow;

            const kUsia = (prev.kategoriUsia || '').toUpperCase().trim();
            const isPraRemaja = kUsia === 'PRA REMAJA' || kUsia === 'PRA-REMAJA';
            const isRemajaDewasa = kUsia === 'REMAJA' || kUsia === 'DEWASA';
            let threshold = isPraRemaja ? 20 : 30;
            const scoreB = calculateFinalScore('BIRU', prev);
            const scoreR = calculateFinalScore('MERAH', prev);
            const diff = Math.abs(scoreB - scoreR);

            const isBabak1WmpActive = prev.wmpBabak1Occurred && elapsed >= 60 && diff >= threshold;
            if (prev.babakAktif === 2 && isBabak1WmpActive && !prev.wmpTriggered && !prev.wmpWon && !prev.wmpBypassed) {
              setTimeout(() => {
                const winner = prev.wmpPemenang || (scoreB > scoreR ? 'BIRU' : 'MERAH');
                updateMatchState({
                  ...matchStateRef.current,
                  timerBerjalan: false,
                  wmpTriggered: true,
                  wmpPemenang: winner,
                  wmpBypassed: false
                });
              }, 10);

              return {
                ...prev,
                sisaWaktu: calculatedSisaNow,
                timerBerjalan: false,
                wmpTriggered: true,
                wmpPemenang: prev.wmpPemenang || (scoreB > scoreR ? 'BIRU' : 'MERAH')
              };
            }

            return {
              ...prev,
              sisaWaktu: calculatedSisaNow,
            };
          });
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [matchState.timerBerjalan, matchState.babakAktif, role, soundEnabled]);

  // Auto-close VAR result display after 3 seconds on MONITOR
  useEffect(() => {
    if (role === 'MONITOR' && matchState.varChecking && matchState.varChecking.status === 'RESULT') {
      const timer = setTimeout(() => {
        updateMatchState({
          ...matchState,
          varChecking: {
            status: 'IDLE',
            sudut: null,
            result: null
          }
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [role, matchState.varChecking?.status, matchState.varChecking?.result]);

  // Track displayed verifikasi ID using a ref to avoid repeating on re-renders/SSE updates
  const lastDisplayedVerifikasiIdRef = useRef<string | null>(null);
  const verifikasiTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (role === 'MONITOR') {
      const currentStatus = matchState.verifikasi.status;
      const currentId = matchState.verifikasi.id;

      if (currentStatus === 'RESOLVED' && currentId) {
        // Only trigger the popup if we haven't displayed this specific resolved verifikasi ID yet
        if (lastDisplayedVerifikasiIdRef.current !== currentId) {
          lastDisplayedVerifikasiIdRef.current = currentId;

          setVerifikasiPopupData({
            jenis: matchState.verifikasi.jenis,
            result: matchState.verifikasi.result,
          });
          setShowVerifikasiResultPopup(true);

          if (verifikasiTimeoutRef.current) {
            clearTimeout(verifikasiTimeoutRef.current);
          }

          verifikasiTimeoutRef.current = setTimeout(() => {
            setShowVerifikasiResultPopup(false);
            setVerifikasiPopupData(null);
            verifikasiTimeoutRef.current = null;
          }, 3000);
        }
      } else if (currentStatus !== 'RESOLVED') {
        setShowVerifikasiResultPopup(false);
        setVerifikasiPopupData(null);
        if (verifikasiTimeoutRef.current) {
          clearTimeout(verifikasiTimeoutRef.current);
          verifikasiTimeoutRef.current = null;
        }
        if (!currentId) {
          lastDisplayedVerifikasiIdRef.current = null;
        }
      }
    }
  }, [role, matchState.verifikasi.status, matchState.verifikasi.id, matchState.verifikasi.jenis, matchState.verifikasi.result]);

  useEffect(() => {
    return () => {
      if (verifikasiTimeoutRef.current) {
        clearTimeout(verifikasiTimeoutRef.current);
      }
    };
  }, []);

  const lastWmpTriggeredRef = useRef<boolean>(false);
  useEffect(() => {
    if (matchState.wmpTriggered && !lastWmpTriggeredRef.current) {
      if (soundEnabled) {
        playBuzzer(); // Play Horn sound automatically
      }
    }
    lastWmpTriggeredRef.current = !!matchState.wmpTriggered;
  }, [matchState.wmpTriggered, soundEnabled]);

  // Web Audio Context activation physically on user gesture
  const selectRoleAndTriggerAudio = (destRole: typeof role) => {
    initAudio();
    triggerClick();
    setRole(destRole);
  };

  const registerJuriClick = (sudut: 'MERAH' | 'BIRU', jenis: 'PUNCH' | 'KICK') => {
    triggerClick();

    // Trigger visual neon glow effect
    if (sudut === 'BIRU') {
      if (jenis === 'PUNCH') {
        setActiveBluePunch(true);
        setTimeout(() => setActiveBluePunch(false), 200);
      } else {
        setActiveBlueKick(true);
        setTimeout(() => setActiveBlueKick(false), 200);
      }
    } else {
      if (jenis === 'PUNCH') {
        setActiveRedPunch(true);
        setActiveRedPunch(true); // Redundant precaution
        setTimeout(() => setActiveRedPunch(false), 200);
      } else {
        setActiveRedKick(true);
        setTimeout(() => setActiveRedKick(false), 200);
      }
    }

    // 1. Optimistic Local State Update for instantaneous visual response
    const timestamp = Date.now();
    const tempId = 'temp-' + timestamp + '-' + Math.random().toString(36).substr(2, 9);
    const newRaw: any = {
      id: tempId,
      juriId: Number(selectedJuriId),
      sudut,
      jenis,
      timestamp,
      babak: matchState.babakAktif,
      validated: false,
      validatedGroupId: undefined,
    };

    setMatchState(prev => {
      return {
        ...prev,
        version: timestamp, // Optimistic version increase
        rawScores: [...(prev.rawScores || []), newRaw]
      };
    });

    fetch('/api/click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        juriId: selectedJuriId,
        sudut,
        jenis,
        babak: matchState.babakAktif,
      }),
    })
    .catch((err) => {
      console.error("Error registering Juri click:", err);
    });
  };

  const deleteLastJuriClick = (sudut: 'MERAH' | 'BIRU') => {
    triggerClick();

    // Optimistic local state update for instantaneous delete response
    setMatchState(prev => {
      const list = [...(prev.rawScores || [])];
      const jNum = Number(selectedJuriId);
      const bNum = Number(prev.babakAktif);
      const lastIdx = list
        .map((s, idx) => ({ s, idx }))
        .filter(x => x.s.juriId === jNum && x.s.sudut === sudut && x.s.babak === bNum)
        .sort((a, b) => b.s.timestamp - a.s.timestamp)[0]?.idx;

      if (lastIdx !== undefined) {
        list.splice(lastIdx, 1);
      }
      return {
        ...prev,
        version: Date.now(),
        rawScores: list
      };
    });

    fetch('/api/delete-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        juriId: selectedJuriId,
        sudut,
        babak: matchState.babakAktif,
      }),
    })
    .catch((err) => {
      console.error("Error deleting last Juri click:", err);
    });
  };

  // Countdown timer effect is handled entirely on the server-side to guarantee consistency across multi-devices, tabs, and clients without racing conditions.
  useEffect(() => {
    // Client-side timer intervals are disabled. The Server-Sent Events (SSE) automatically sync server ticks.
  }, [matchState.timerBerjalan]);

  const toggleTimer = () => {
    triggerClick();
    const nextState = !matchState.timerBerjalan;
    
    // Automatically play the horn sound ONLY if a brand new round is starting (timer goes true and sisaWaktu is full)
    if (nextState && matchState.sisaWaktu === matchState.durasiBabak) {
      if (soundEnabled) playBuzzer();
    }

    updateMatchState({
      ...matchState,
      statusPertandingan: 'BERJALAN', // Auto-unlock the board if they start the timer
      timerBerjalan: nextState,
      showRoundEndPopUp: false
    });
  };

  const resetTimer = () => {
    triggerClick();
    updateMatchState({
      ...matchState,
      timerBerjalan: false,
      sisaWaktu: matchState.durasiBabak,
      showRoundEndPopUp: false,
      showMatchEndPopUp: false
    });
  };

  const getNextMatchInfo = () => {
    let nextPartai = "1";
    if (matchState.partai) {
      const matches = matchState.partai.match(/\d+/);
      if (matches) {
        const num = parseInt(matches[0], 10);
        nextPartai = matchState.partai.replace(matches[0], (num + 1).toString());
      } else {
        nextPartai = (parseInt(matchState.partai, 10) || 0) + 1 + "";
      }
    }

    const normalizePartai = (p: any): string => {
      if (p === undefined || p === null) return '';
      const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
      const matched = str.match(/\d+/);
      if (matched) {
        return parseInt(matched[0], 10).toString();
      }
      return str;
    };

    const targetNorm = normalizePartai(nextPartai);

    // 1. First, try reading from silat_jadwal_lines (Secretary's match parameters schedule list)
    let jadwalLinesLocal: any[] | null = null;
    if (matchState.silat_jadwal_lines && Array.isArray(matchState.silat_jadwal_lines)) {
      jadwalLinesLocal = matchState.silat_jadwal_lines;
    } else {
      const jadwalDataStr = localStorage.getItem('silat_jadwal_lines');
      if (jadwalDataStr) {
        try {
          const parsed = JSON.parse(jadwalDataStr);
          if (Array.isArray(parsed)) {
            jadwalLinesLocal = parsed;
          }
        } catch (err) {
          console.error("Error parsing silat_jadwal_lines in getNextMatchInfo:", err);
        }
      }
    }

    if (jadwalLinesLocal && Array.isArray(jadwalLinesLocal)) {
      const matchRow = jadwalLinesLocal.find((rowAny: any) => normalizePartai(rowAny?.partai) === targetNorm);
      if (matchRow) {
        return {
          partai: matchRow.partai || nextPartai,
          merah: {
            nama: (matchRow.atlitMerah?.nama || 'Pesilat Merah').toString().toUpperCase(),
            kontingen: (matchRow.atlitMerah?.kontingen || '-').toString().toUpperCase()
          },
          biru: {
            nama: (matchRow.atlitBiru?.nama || 'Pesilat Biru').toString().toUpperCase(),
            kontingen: (matchRow.atlitBiru?.kontingen || '-').toString().toUpperCase()
          },
          kelas: (matchRow.kelas || '-').toString().toUpperCase(),
          gender: (matchRow.gender || '-').toString().toUpperCase(),
          kategoriUsia: (matchRow.kategoriUsia || '-').toString().toUpperCase(),
          tahapPertandingan: (matchRow.tahapPertandingan || '-').toString().toUpperCase()
        };
      }
    }

    // 2. Next, fallback to silat_excel_matches
    let excelMatchesLocal: any[] | null = null;
    if (matchState.silat_excel_matches && Array.isArray(matchState.silat_excel_matches)) {
      excelMatchesLocal = matchState.silat_excel_matches;
    } else {
      const excelDataStr = localStorage.getItem('silat_excel_matches');
      if (excelDataStr) {
        try {
          const parsed = JSON.parse(excelDataStr);
          if (Array.isArray(parsed)) {
            excelMatchesLocal = parsed;
          }
        } catch (err) {
          console.error("Error parsing silat_excel_matches in getNextMatchInfo:", err);
        }
      }
    }

    if (excelMatchesLocal && Array.isArray(excelMatchesLocal)) {
      const matchRow = excelMatchesLocal.find((rowAny: any) => normalizePartai(rowAny['Partai']) === targetNorm);
      if (matchRow) {
        return {
          partai: matchRow['Partai'] || nextPartai,
          merah: {
            nama: (matchRow['Nama Pesilat Merah'] || 'Pesilat Merah').toString().toUpperCase(),
            kontingen: (matchRow['Kontingen Merah'] || '-').toString().toUpperCase()
          },
          biru: {
            nama: (matchRow['Nama Pesilat Biru'] || 'Pesilat Biru').toString().toUpperCase(),
            kontingen: (matchRow['Kontingen Biru'] || '-').toString().toUpperCase()
          },
          kelas: (matchRow['Kelas'] || '-').toString().toUpperCase(),
          gender: (matchRow['Gender'] || '-').toString().toUpperCase(),
          kategoriUsia: (matchRow['Kategori Usia'] || '-').toString().toUpperCase(),
          tahapPertandingan: (matchRow['Tahap Pertandingan'] || '-').toString().toUpperCase()
        };
      }
    }
    return null;
  };

  // 1. Manages the "BABAK SELESAI" (Round Finished) banner and immediate upcoming match banner for Babak 1 and 2
  useEffect(() => {
    if (role === 'MONITOR') {
      const isMatchEnd = matchState.showMatchEndPopUp || !!matchState.diskualifikasi;
      
      if (matchState.showRoundEndPopUp) {
        setFinishedRoundNumber(matchState.babakAktif);
        setShowMonitorRoundFinishedBanner(true);
        setShowMonitorNextMatchBanner(false);

        if (!isMatchEnd) {
          // Regular Babak (1, 2)
          const finishedTimer = setTimeout(() => {
            setShowMonitorRoundFinishedBanner(false);
            setShowMonitorNextMatchBanner(true);

            const upcomingTimer = setTimeout(() => {
              setShowMonitorNextMatchBanner(false);
            }, 5000);

            return () => clearTimeout(upcomingTimer);
          }, 3000);

          return () => {
            clearTimeout(finishedTimer);
            setShowMonitorRoundFinishedBanner(false);
            setShowMonitorNextMatchBanner(false);
          };
        } else {
          // Babak 3 / Babak Tambahan / Match End
          const finishedTimer = setTimeout(() => {
            setShowMonitorRoundFinishedBanner(false);
          }, 3000);

          return () => {
            clearTimeout(finishedTimer);
            setShowMonitorRoundFinishedBanner(false);
          };
        }
      } else {
        setShowMonitorRoundFinishedBanner(false);
        setShowMonitorNextMatchBanner(false);
      }
    }
  }, [matchState.showRoundEndPopUp, matchState.babakAktif, matchState.showMatchEndPopUp, matchState.diskualifikasi, role]);

  // 2. For match end (Babak 3/Tambahan): when winner is announced ("umumkanPemenang" is clicked), 
  // wait 5 seconds for the announcement animation, then present the "UPCOMING MATCH" banner
  useEffect(() => {
    if (role === 'MONITOR') {
      const isMatchEnd = matchState.showMatchEndPopUp || !!matchState.diskualifikasi;
      if (isMatchEnd && matchState.umumkanPemenang) {
        setShowMonitorRoundFinishedBanner(false);
        const delayTimer = setTimeout(() => {
          setShowMonitorNextMatchBanner(true);
          const showTimer = setTimeout(() => {
            setShowMonitorNextMatchBanner(false);
          }, 5000);
          return () => clearTimeout(showTimer);
        }, 5000);

        return () => {
          clearTimeout(delayTimer);
          setShowMonitorNextMatchBanner(false);
        };
      }
    }
  }, [matchState.umumkanPemenang, matchState.showMatchEndPopUp, matchState.diskualifikasi, role]);

  // Helper calculation to find winner
  function determineWinner(state: MatchState): 'MERAH' | 'BIRU' | null {
    if (state.victoryType && state.pemenang) return state.pemenang;
    if (state.wmpWon && state.wmpPemenang) return state.wmpPemenang;
    if (state.diskualifikasi === 'MERAH') return 'BIRU';
    if (state.diskualifikasi === 'BIRU') return 'MERAH';
    
    const merahTotal = calculateFinalScore('MERAH', state);
    const biruTotal = calculateFinalScore('BIRU', state);
    
    // a) KETIKA JUMLAH POIN/NILAI LEBIH DARI YANG LAIN
    if (merahTotal > biruTotal) return 'MERAH';
    if (biruTotal > merahTotal) return 'BIRU';

    // b) BILA TERJADI HASIL NILAI YANG SAMA (DRAW/SERI)
    // Helper to calculate total penalty points
    const getPenaltyPoints = (corner: 'MERAH' | 'BIRU', sState: MatchState): number => {
      const penalties = corner === 'MERAH' ? sState.penaltiesMerah : sState.penaltiesBiru;
      let points = 0;
      if (penalties) {
        if (penalties.teguran1) points += 1;
        if (penalties.teguran2) points += 2;
        if (penalties.peringatan1) points += 5;
        if (penalties.peringatan2) points += 10;
      }
      const accumulated = corner === 'MERAH' ? (sState.accumulatedPenaltyMerah || 0) : (sState.accumulatedPenaltyBiru || 0);
      return points + accumulated;
    };

    // Helper to calculate number of penalties (including binaan)
    const getPenaltyCount = (corner: 'MERAH' | 'BIRU', sState: MatchState): number => {
      const penalties = corner === 'MERAH' ? sState.penaltiesMerah : sState.penaltiesBiru;
      let count = 0;
      if (penalties) {
        if (penalties.binaan1) count += 1;
        if (penalties.binaan2) count += 1;
        if (penalties.teguran1) count += 1;
        if (penalties.teguran2) count += 1;
        if (penalties.peringatan1) count += 1;
        if (penalties.peringatan2) count += 1;
      }
      return count;
    };

    // Helper to count technical achievement scores of 3, 2, 1
    const getTechnicalScores = (corner: 'MERAH' | 'BIRU', sState: MatchState) => {
      let count3 = 0; // JATUHAN
      let count2 = 0; // KICK
      let count1 = 0; // PUNCH
      if (sState.validatedScores) {
        sState.validatedScores.forEach((s) => {
          if (s.sudut === corner) {
            if (s.jenis === 'JATUHAN') {
              count3++;
            } else if (s.jenis === 'KICK') {
              count2++;
            } else if (s.jenis === 'PUNCH') {
              count1++;
            }
          }
        });
      }
      return { count3, count2, count1 };
    };

    // (1) SUDUT YANG MENDAPAT JUMLAH HUKUMAN TERENDAH
    const penPointsMerah = getPenaltyPoints('MERAH', state);
    const penPointsBiru = getPenaltyPoints('BIRU', state);
    
    if (penPointsMerah < penPointsBiru) return 'MERAH';
    if (penPointsBiru < penPointsMerah) return 'BIRU';

    const penCountMerah = getPenaltyCount('MERAH', state);
    const penCountBiru = getPenaltyCount('BIRU', state);
    if (penCountMerah < penCountBiru) return 'MERAH';
    if (penCountBiru < penCountMerah) return 'BIRU';

    // (2) BILA HASILNYA MASIH SAMA, MAKA PEMENANG DATA PRESTASI TEKNIK TERTINGGI (3, 2, 1)
    const techMerah = getTechnicalScores('MERAH', state);
    const techBiru = getTechnicalScores('BIRU', state);

    if (techMerah.count3 !== techBiru.count3) {
      return techMerah.count3 > techBiru.count3 ? 'MERAH' : 'BIRU';
    }
    if (techMerah.count2 !== techBiru.count2) {
      return techMerah.count2 > techBiru.count2 ? 'MERAH' : 'BIRU';
    }
    if (techMerah.count1 !== techBiru.count1) {
      return techMerah.count1 > techBiru.count1 ? 'MERAH' : 'BIRU';
    }

    // (3) BILA HASILNYA MASIH SAMA, MAKA PERTANDINGAN DITAMBAH 1 (SATU) BABAK LAGI (will remain null representing draw/seri)
    return null;
  }

  // Helper to convert text to Titlecase (Capitalised Letter at the Start of Each Word)
  function toTitleCase(str: string | undefined | null): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // Helper to determine victory reason precisely
  function getWinningReason(state: MatchState): string {
    if (state.victoryType === 'WMP' || state.wmpWon) {
      return "Kemenangan : Wasit Menghentikan Pertandingan (WMP)";
    }
    if (state.victoryType === 'TEKNIK') {
      return "KEMENANGAN TEKNIK";
    }
    if (state.victoryType === 'MUTLAK') {
      return "KEMENANGAN MUTLAK";
    }
    if (state.victoryType === 'UNDUR_DIRI') {
      return "KEMENANGAN UNDUR DIRI";
    }
    if (state.diskualifikasi) {
      return "MENANG DISKUALIFIKASI";
    }
    
    const merahTotal = calculateFinalScore('MERAH', state);
    const biruTotal = calculateFinalScore('BIRU', state);
    
    if (merahTotal !== biruTotal) {
      return "Kemenangan ANGKA";
    }

    // Tie-break evaluation when scores are equal
    const getPenaltyPoints = (corner: 'MERAH' | 'BIRU', sState: MatchState): number => {
      const penalties = corner === 'MERAH' ? sState.penaltiesMerah : sState.penaltiesBiru;
      let points = 0;
      if (penalties) {
        if (penalties.teguran1) points += 1;
        if (penalties.teguran2) points += 2;
        if (penalties.peringatan1) points += 5;
        if (penalties.peringatan2) points += 10;
      }
      const accumulated = corner === 'MERAH' ? (sState.accumulatedPenaltyMerah || 0) : (sState.accumulatedPenaltyBiru || 0);
      return points + accumulated;
    };

    const getPenaltyCount = (corner: 'MERAH' | 'BIRU', sState: MatchState): number => {
      const penalties = corner === 'MERAH' ? sState.penaltiesMerah : sState.penaltiesBiru;
      let count = 0;
      if (penalties) {
        if (penalties.binaan1) count += 1;
        if (penalties.binaan2) count += 1;
        if (penalties.teguran1) count += 1;
        if (penalties.teguran2) count += 1;
        if (penalties.peringatan1) count += 1;
        if (penalties.peringatan2) count += 1;
      }
      return count;
    };

    const getTechnicalScores = (corner: 'MERAH' | 'BIRU', sState: MatchState) => {
      let count3 = 0; // JATUHAN
      let count2 = 0; // KICK
      let count1 = 0; // PUNCH
      if (sState.validatedScores) {
        sState.validatedScores.forEach((s) => {
          if (s.sudut === corner) {
            if (s.jenis === 'JATUHAN') {
              count3++;
            } else if (s.jenis === 'KICK') {
              count2++;
            } else if (s.jenis === 'PUNCH') {
              count1++;
            }
          }
        });
      }
      return { count3, count2, count1 };
    };

    const penPointsMerah = getPenaltyPoints('MERAH', state);
    const penPointsBiru = getPenaltyPoints('BIRU', state);
    
    if (penPointsMerah !== penPointsBiru) {
      return "Kemenangan ANGKA";
    }

    const penCountMerah = getPenaltyCount('MERAH', state);
    const penCountBiru = getPenaltyCount('BIRU', state);
    if (penCountMerah !== penCountBiru) {
      return "Kemenangan ANGKA";
    }

    const techMerah = getTechnicalScores('MERAH', state);
    const techBiru = getTechnicalScores('BIRU', state);

    if (techMerah.count3 !== techBiru.count3) {
      return "Kemenangan ANGKA";
    }
    if (techMerah.count2 !== techBiru.count2) {
      return "Kemenangan ANGKA";
    }
    if (techMerah.count1 !== techBiru.count1) {
      return "Kemenangan ANGKA";
    }

    return "DRAW / SERI KALKULASI";
  }

  const isCurrentlyLocked = isSimulatedLocked || (isOutsideSandbox() && !isAppLicensed);

  if (isCurrentlyLocked) {
    return (
      <div id="silat-app-locked" className="min-h-screen bg-[#05000a] text-white font-sans flex flex-col justify-center items-center p-4 relative overflow-hidden">
        {/* Subtle decorative grid/glow rings */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,28,135,0.15),transparent_65%)] pointer-events-none"></div>
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-purple-900/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
        
        {/* Toast Notification for Locked Screen */}
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-55">
            <div className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 ${
              toast.type === 'success' 
                ? 'bg-green-950/90 border-green-550 text-green-400' 
                : toast.type === 'warning'
                ? 'bg-red-950/90 border-red-500 text-red-400'
                : 'bg-indigo-950/90 border-indigo-500 text-indigo-400'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, type: "spring" }}
          className="w-full max-w-lg bg-gradient-to-b from-[#120722]/95 to-[#090114]/98 border-2 border-purple-500/35 rounded-3xl p-6 md:p-8 shadow-[0_0_60px_rgba(168,85,247,0.15)] relative z-10 space-y-6"
        >
          {/* Neon Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 animate-pulse"></div>
          
          <div className="text-center space-y-3">
            <div className="flex flex-col items-center select-none pt-2 pb-1">
              <img
                id="brand-logo-discors-license"
                src="/assets/temadiscors.png?v=15"
                alt="DISCORS - Digital Scoring Pencak Silat"
                className="h-32 object-contain filter drop-shadow-[0_4px_12px_rgba(168,85,247,0.25)] hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="w-10 h-10 rounded-full bg-[#120722]/90 border border-purple-500/40 flex items-center justify-center -mt-5 shadow-[0_0_15px_rgba(168,85,247,0.3)] relative z-10 animate-bounce">
                <Lock className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black tracking-tight font-display text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-purple-300">
                SISTEM SKORING TERKUNCI
              </h2>
              <p className="text-[10px] md:text-xs text-purple-400 font-mono font-bold tracking-widest uppercase">
                HUBUNGI PENGEMBANG APLIKASI
              </p>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              Aplikasi ini dideteksi berjalan di luar developer sandbox aman. Proteksi lisensi otomatis telah membatasi seluruh fungsionalitas sistem.
            </p>
          </div>

          <div className="space-y-4 pt-1">
            {/* Device ID Display Box */}
            <div className="bg-[#0e041a] border border-purple-950 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-purple-400 font-semibold uppercase tracking-wider">Device ID Perangkat Anda</span>
                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase font-mono bg-purple-950/45 text-purple-300 border border-purple-500/20">
                  Hardware Signature
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-1 font-mono text-center text-sm font-extrabold text-amber-300 select-all tracking-wider">
                  {serverDeviceId}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(serverDeviceId);
                    showToast('Device ID berhasil disalin ke clipboard!', 'success');
                  }}
                  className="p-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 border border-purple-500/20 text-purple-300 hover:text-white transition-all active:scale-95"
                  title="Salin Device ID"
                >
                  <Upload className="w-4 h-4 rotate-90" />
                </button>
              </div>
            </div>

            {/* Simulated Banner if simulation is active */}
            {isSimulatedLocked && (
              <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3 text-center space-y-0.5">
                <span className="text-[10px] font-extrabold text-amber-200 uppercase tracking-widest block">⚠️ MODE SIMULASI UJI LISENSI</span>
                <p className="text-[9.5px] text-amber-300/80 leading-normal">
                  Fungsionalitas simulasi penguncian aktif untuk verifikasi operasional. Salin Activation Key dari Panel Sekretaris untuk membuka.
                </p>
              </div>
            )}

            {/* Error Message */}
            {activationError && (
              <div className="bg-red-950/20 border border-red-500/30 text-red-300 px-3 py-2.5 rounded-xl text-xs font-mono text-center flex items-center justify-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{activationError}</span>
              </div>
            )}

            {/* Form Input */}
            <form onSubmit={handleActivateApp} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-purple-400 font-semibold uppercase tracking-wider block">Kunci Aktivasi (Activation Key)</label>
                <input
                  type="text"
                  value={activationKeyInput}
                  onChange={(e) => setActivationKeyInput(e.target.value)}
                  className="w-full text-center bg-[#0a0315] hover:bg-[#120722] focus:bg-[#120722] border-2 border-purple-950 focus:border-purple-500 rounded-xl font-mono py-3 outline-none text-amber-400 font-extrabold tracking-widest placeholder-purple-950/45 focus:ring-1 focus:ring-purple-500 uppercase text-sm"
                  placeholder="ACT-XXXX-XXXX-XX"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('silat_simulated_lock', 'false');
                    setIsSimulatedLocked(false);
                    showToast('Simulasi dilewati.', 'info');
                  }}
                  className="py-3 px-4 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer"
                >
                  Batal / Lewati
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-purple-950/40 border border-purple-500/30 transition-all hover:border-purple-500/60 active:scale-[0.97] cursor-pointer"
                >
                  Aktifkan Perangkat
                </button>
              </div>
            </form>
          </div>

          <div className="border-t border-purple-500/10 pt-4 text-center">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">
              Pencak Silat Digital Scoring System v2.0
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="silat-app" className={`relative overflow-hidden transition-all duration-300 ${isLightMode ? 'light bg-[#23c7d1] text-slate-900' : 'bg-[#05000a] text-white'} font-sans ${rotated ? 'origin-center rotate-90 scale-95 md:rotate-0 md:scale-100' : ''} ${role !== 'LANDING' ? 'h-screen max-h-screen flex flex-col' : 'min-h-screen'}`}>
      
      {isLightMode && (
        <style>{`
          #silat-app.light {
            background-color: #23c7d1 !important;
            background: #23c7d1 !important;
            color: #0f172a !important;
          }
          
          /* Background overrides for dark containers to crisp templates */
          #silat-app.light .bg-\\[\\#05000a\\],
          #silat-app.light .bg-\\[\\#0c041d\\],
          #silat-app.light .bg-\\[\\#05000a\\]\\/92,
          #silat-app.light .bg-\\[\\#0e031a\\]\\/95,
          #silat-app.light .bg-\\[\\#18092a\\],
          #silat-app.light .bg-\\[\\#18092a\\]\\/80,
          #silat-app.light .bg-\\[\\#18092a\\]\\/90,
          #silat-app.light .bg-\\[\\#1a0c2c\\],
          #silat-app.light .bg-\\[\\#120822\\]\\/80,
          #silat-app.light .bg-\\[\\#0f041d\\]\\/90,
          #silat-app.light .bg-\\[\\#110524\\],
          #silat-app.light .bg-\\[\\#0d041c\\],
          #silat-app.light .bg-\\[\\#0d041c\\]\\/60,
          #silat-app.light .bg-\\[\\#0a0210\\]\\/95,
          #silat-app.light .bg-\\[\\#0a0210\\],
          #silat-app.light .bg-\\[\\#140624\\]\\/90,
          #silat-app.light .bg-\\[\\#160b29\\],
          #silat-app.light .bg-\\[\\#1c0d35\\],
          #silat-app.light .bg-\\[\\#090114\\],
          #silat-app.light .bg-\\[\\#120521\\],
          #silat-app.light .bg-purple-950,
          #silat-app.light .bg-purple-950\\/10,
          #silat-app.light .bg-purple-950\\/40,
          #silat-app.light .bg-purple-950\\/60,
          #silat-app.light .bg-purple-950\\/80,
          #silat-app.light .bg-purple-900\\/10,
          #silat-app.light .bg-purple-900\\/20,
          #silat-app.light .bg-purple-900\\/30,
          #silat-app.light .bg-purple-900\\/45,
          #silat-app.light .bg-purple-900\\/40,
          #silat-app.light .bg-purple-900\\/50,
          #silat-app.light .bg-purple-900\\/60,
          #silat-app.light .bg-purple-900\\/85,
          #silat-app.light .bg-purple-900\\/80,
          #silat-app.light .bg-violet-950\\/20,
          #silat-app.light .bg-violet-900\\/30,
          #silat-app.light .bg-slate-900,
          #silat-app.light .bg-slate-900\\/30,
          #silat-app.light .bg-slate-950,
          #silat-app.light .from-blue-900\\/80,
          #silat-app.light .from-red-900\\/80,
          #silat-app.light .from-brand-purple\\/40,
          #silat-app.light .to-black\\/60,
          #silat-app.light .from-blue-950\\/40,
          #silat-app.light .to-blue-900\\/10,
          #silat-app.light .from-red-950\\/40,
          #silat-app.light .to-red-900\\/10,
          #silat-app.light .bg-black\\/50,
          #silat-app.light .bg-black\\/40,
          #silat-app.light .bg-black\\/80,
          #silat-app.light .bg-blue-950\\/20,
          #silat-app.light .bg-red-950\\/20,
          #silat-app.light .bg-blue-900\\/10,
          #silat-app.light .bg-red-900\\/10,
          #silat-app.light .bg-\\[\\#1f093a\\]\\/90,
          #silat-app.light .bg-\\[\\#060b24\\],
          #silat-app.light .bg-\\[\\#060b24\\]\\/90,
          #silat-app.light .bg-\\[\\#020410\\],
          #silat-app.light .bg-\\[\\#020410\\]\\/90,
          #silat-app.light .bg-\\[\\#240606\\],
          #silat-app.light .bg-\\[\\#240606\\]\\/90,
          #silat-app.light .bg-\\[\\#100202\\],
          #silat-app.light .bg-\\[\\#100202\\]\\/90,
          #silat-app.light .bg-\\[\\#05000a\\],
          #silat-app.light .bg-\\[\\#0e041dd0\\],
          #silat-app.light .bg-\\[\\#1c0f30\\]\\/60,
          #silat-app.light .bg-\\[\\#160a2acc\\],
          #silat-app.light .bg-\\[\\|160b2d\\],
          #silat-app.light .bg-\\[\\#160b2d\\]\\/50,
          #silat-app.light .bg-\\[\\#25104d\\],
          #silat-app.light .bg-\\[\\#0b0416\\]\\/30,
          #silat-app.light .bg-\\[\\#0a0315\\],
          #silat-app.light .bg-\\[\\#120822\\],
          #silat-app.light .bg-\\[\\#0a0515\\],
          #silat-app.light .bg-\\[\\#0f111d\\],
          #silat-app.light .border-purple-950,
          #silat-app.light .border-purple-950\\/50,
          #silat-app.light .border-purple-900\\/30,
          #silat-app.light .border-purple-500\\/40,
          #silat-app.light .border-purple-500\\/30,
          #silat-app.light .border-purple-500\\/60,
          #silat-app.light .border-blue-900,
          #silat-app.light .border-blue-950,
          #silat-app.light .border-red-900,
          #silat-app.light .border-red-950,
          #silat-app.light .bg-indigo-950\\/40 {
            background-color: #ffffff !important;
            background-image: none !important;
            background: #ffffff !important;
            color: #0f172a !important;
            border-color: rgba(203, 213, 225, 0.7) !important;
          }

          /* Keep standard fullscreen screen wrapper or page wrapper as clean cyan background under light mode */
          #silat-app.light .bg-\\[\\#0c041d\\] {
            background-color: #23c7d1 !important;
            background: #23c7d1 !important;
          }

          /* Inactive empty penalty slots indicators */
          #silat-app.light .bg-\\[\\#0f0720\\]\\/45,
          #silat-app.light .bg-\\[\\#200707\\]\\/45 {
            background-color: #f1f5f9 !important;
            background: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
            color: #94a3b8 !important;
          }

          /* Lock/Modal Blur Background */
          #silat-app.light .bg-\\[\\#05000a\\]\\/92,
          #silat-app.light .bg-\\[\\#05000a\\]\\/95,
          #silat-app.light .bg-\\[\\#05000a\\]\\/90 {
            background-color: rgba(255, 255, 255, 0.95) !important;
            backdrop-filter: blur(16px) !important;
          }

          /* Secondary subtle bg colors for list items metadata */
          #silat-app.light .bg-slate-900\\/20,
          #silat-app.light .bg-slate-900\\/40,
          #silat-app.light .bg-slate-800\\/40,
          #silat-app.light .bg-gray-900\\/40,
          #silat-app.light .bg-\\[\\#080210\\],
          #silat-app.light .bg-\\[\\#0c0316\\] {
            background-color: #f8fafc !important;
            background: #f8fafc !important;
          }

          /* Header subheaders */
          #silat-app.light header {
            background-color: #ffffff !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }

          /* Text color overrides to dark colors */
          #silat-app.light .text-white,
          #silat-app.light .text-slate-50,
          #silat-app.light .text-slate-100 {
            color: #0f172a !important;
          }
          #silat-app.light .text-slate-200,
          #silat-app.light .text-slate-300 {
            color: #1e293b !important;
          }
          #silat-app.light .text-slate-400,
          #silat-app.light .text-gray-400,
          #silat-app.light .text-purple-300,
          #silat-app.light .text-pink-300,
          #silat-app.light .text-violet-300 {
            color: #475569 !important;
          }
          
          /* Make Red & Blue team colors highly readable on white grids */
          #silat-app.light .text-blue-300,
          #silat-app.light .text-blue-400 {
            color: #1d4ed8 !important;
          }
          #silat-app.light .text-red-300,
          #silat-app.light .text-red-450,
          #silat-app.light .text-red-400 {
            color: #b91c1c !important;
          }

          /* Specialized labels & details */
          #silat-app.light .text-purple-200,
          #silat-app.light .text-purple-400 {
            color: #7c3aed !important;
          }
          #silat-app.light .text-amber-400 {
            color: #d97706 !important;
          }
          #silat-app.light .text-zinc-400 {
            color: #52525b !important;
          }

          /* Form / inputs styling */
          #silat-app.light input,
          #silat-app.light select,
          #silat-app.light textarea {
            background-color: #ffffff !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
          }

          #silat-app.light input::placeholder {
            color: #94a3b8 !important;
          }

          /* Border color overrides */
          #silat-app.light .border-purple-900\\/40,
          #silat-app.light .border-purple-950,
          #silat-app.light .border-purple-950\\/35,
          #silat-app.light .border-purple-950\\/70,
          #silat-app.light .border-purple-950\\/80,
          #silat-app.light .border-purple-900\\/20,
          #silat-app.light .border-purple-900\\/30,
          #silat-app.light .border-purple-500\\/10,
          #silat-app.light .border-purple-500\\/15,
          #silat-app.light .border-purple-500\\/20,
          #silat-app.light .border-purple-500\\/30,
          #silat-app.light .border-purple-500\\/40,
          #silat-app.light .border-purple-500\\/60,
          #silat-app.light .border-purple-800\\/30,
          #silat-app.light .border-violet-500\\/30,
          #silat-app.light .border-pink-500\\/30,
          #silat-app.light .border-amber-500\\/30,
          #silat-app.light .border-slate-800,
          #silat-app.light .border-slate-900 {
            border-color: rgba(203, 213, 225, 0.7) !important;
          }

          /* Keep radiant red/blue buttons intact helper styling */
          #silat-app.light .from-red-900\\/50 {
            background-image: linear-gradient(to right, rgba(239, 68, 68, 0.15), rgba(248, 250, 252, 0.95), rgba(59, 130, 246, 0.15)) !important;
          }

          /* Highlight titles */
          #silat-app.light .h2,
          #silat-app.light h2,
          #silat-app.light .h3,
          #silat-app.light h3 {
            color: #0f172a !important;
          }

          /* Buttons which are purple action items */
          #silat-app.light button.bg-purple-950\\/60 {
            background-color: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
            color: #475569 !important;
          }

          #silat-app.light button.bg-purple-950\\/40 {
            background-color: #f1f5f9 !important;
            border-color: #cbd5e1 !important;
            color: #475569 !important;
          }

          /* Hover states for buttons in light mode */
          #silat-app.light button:hover {
            filter: brightness(0.95);
          }

          /* Dropdowns */
          #silat-app.light select {
            background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>") !important;
            background-position: right 0.5rem center !important;
            background-repeat: no-repeat !important;
            background-size: 1.2em !important;
            padding-right: 2rem !important;
            appearance: none !important;
          }
        `}</style>
      )}
      
      {/* Exquisite Martial Arts Background Accent Elements */}
      <div className={`absolute inset-0 z-0 transition-colors duration-300 ${isLightMode ? 'bg-[#23c7d1]' : 'bg-[#05000a]'}`} />
      
      {/* Background Vector Art Accent */}
      <div className={`absolute inset-0 pointer-events-none flex justify-center items-center z-0 transition-opacity duration-300 ${isLightMode ? 'opacity-5' : 'opacity-10'}`}>
        <SiluetBackgroundCenter className="w-[800px] h-[800px]" />
      </div>

      {/* Embedded Silat Warriors Silhouettes for premium thematic design */}
      <div className={`absolute bottom-10 left-6 select-none pointer-events-none z-0 transition-all duration-300 ${isLightMode ? 'opacity-[0.08]' : 'opacity-[0.04]'}`}>
        <SiluetSilatStance className={`w-64 h-64 transition-colors duration-300 ${isLightMode ? 'text-purple-600' : 'text-[#a78bfa]'}`} />
      </div>
      <div className={`absolute top-10 right-10 select-none pointer-events-none z-0 transition-all duration-300 ${isLightMode ? 'opacity-[0.08]' : 'opacity-[0.04]'}`}>
        <SiluetSilatKick className={`w-72 h-72 transition-colors duration-300 ${isLightMode ? 'text-purple-600' : 'text-[#a78bfa]'}`} />
      </div>

      {/* Main Core Content Controller */}
      <div className={`relative z-10 flex flex-col ${role !== 'LANDING' ? 'h-full min-h-0 flex-1 overflow-hidden' : 'min-h-screen'}`}>
        
        {/* ROLE switcher top subheader for easy interactive usage */}
        <AnimatePresence>
          {role !== 'LANDING' && !isFullscreen && (
            <motion.header
              key="app-header"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="px-4 py-3 bg-[#0f041d]/90 border-b border-purple-950/70 flex items-center justify-between landscape:py-1.5 landscape:px-3 overflow-hidden shrink-0"
            >
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => selectRoleAndTriggerAudio('LANDING')}
                  className="p-1 px-3 bg-purple-950/40 hover:bg-purple-900/40 rounded-lg text-xs flex items-center gap-1.5 transition-all text-purple-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  MENU
                </button>
                <div className="h-4 w-[1px] bg-purple-900/50" />
                <div className="text-xs font-semibold tracking-wider text-purple-300 uppercase font-mono">
                  {role === 'JURI_PANEL' ? `JURI ${selectedJuriId}` : role === 'JURI_SELECT' ? 'PEMILIHAN JURI' : role}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400 font-mono hidden md:inline">{matchState.eventName}</span>
                
                {/* Elegant Light/Dark Mode toggle inside sub-pages header */}
                <button
                  type="button"
                  onClick={() => {
                    triggerClick();
                    setIsLightMode(!isLightMode);
                  }}
                  className={`p-1.5 rounded-lg transition-colors duration-300 cursor-pointer ${isLightMode ? 'bg-purple-100 text-purple-600 hover:bg-purple-200' : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50'}`}
                  title={isLightMode ? "Ganti ke Mode Gelap" : "Ganti ke Mode Terang"}
                >
                  {isLightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)} 
                  className={`p-1.5 rounded-lg transition-colors ${soundEnabled ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-900 text-slate-500'}`}
                  title="Aktifkan Suara"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </motion.header>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* LANDING PAGE VIEW */}
          {role === 'LANDING' && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className={`flex-1 flex flex-col justify-center items-center px-4 md:px-8 w-full relative transition-all duration-300 ${
                isFullscreen 
                  ? 'h-screen max-h-screen py-3 sm:py-4 md:py-6 lg:py-8 xl:py-12 overflow-hidden min-h-0 max-w-7xl xl:max-w-[1450px] mx-auto justify-around' 
                  : 'py-8 max-w-5xl mx-auto'
              }`}
            >
              {/* Elegant Modern Control Group (Theme Toggle & Fullscreen Toggle) - Top Right Corner */}
              <div className="absolute top-0 right-4 lg:right-0 z-50 flex items-center gap-3 bg-transparent p-1.5 rounded-xl">
                {/* Fullscreen Button */}
                <button
                  type="button"
                  onClick={() => {
                    triggerClick();
                    toggleFullscreen();
                  }}
                  className={`p-1.5 px-3 rounded-lg border text-[10px] font-mono tracking-widest font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 duration-300 ${
                    isLightMode
                      ? 'bg-purple-100/80 border-purple-300/40 hover:bg-purple-200 text-purple-700'
                      : 'bg-[#18092a]/80 border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-white'
                  }`}
                  title={isFullscreen ? 'Layar Biasa' : 'Layar Penuh'}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'LAYAR BIASA' : 'LAYAR PENUH'}</span>
                </button>

                <div className="h-4 w-[1px] bg-purple-500/20" />

                {/* Theme Switcher Toggle */}
                <span className={`text-[10px] font-extrabold tracking-widest uppercase font-mono transition-colors duration-300 ${isLightMode ? 'text-slate-600' : 'text-purple-300'}`}>
                  {isLightMode ? 'TERANG' : 'GELAP'}
                </span>
                <button
                  type="button"
                  id="theme-toggle-btn"
                  onClick={() => {
                    triggerClick();
                    setIsLightMode(!isLightMode);
                  }}
                  className={`relative w-14 h-7 rounded-full p-0.5 transition-all duration-300 cursor-pointer focus:outline-none flex items-center ${
                    isLightMode 
                      ? 'bg-purple-600 justify-end shadow-[0_0_12px_rgba(147,51,234,0.4)]' 
                      : 'bg-[#18092a]/80 justify-start border border-purple-500/30'
                  }`}
                  aria-label="Toggle Theme Mode"
                >
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`w-5.5 h-5.5 rounded-full flex items-center justify-center transition-colors duration-300 ${
                      isLightMode ? 'bg-white text-purple-600' : 'bg-purple-500 text-white'
                    }`}
                  >
                    {isLightMode ? (
                      <Sun className="w-3.5 h-3.5" />
                    ) : (
                      <Moon className="w-3.5 h-3.5" />
                    )}
                  </motion.div>
                </button>
              </div>

              <div className={`text-center space-y-0 transition-all duration-300 ${isFullscreen ? 'mb-1 mt-1 md:mb-3 xl:mb-5' : 'mb-10 mt-6'}`}>
                <div className={`flex justify-center select-none pt-2 pb-0 transition-all duration-300 ${
                  isFullscreen ? '-mb-1 sm:-mb-2 md:-mb-3 xl:-mb-4' : '-mb-4 sm:-mb-6 md:-mb-8'
                }`}>
                  <img
                    id="brand-logo-discors-landing"
                    src="/logodiscorsgrid.svg"
                    alt="DISCORS - Digital Scoring Pencak Silat"
                    className={`object-contain filter drop-shadow-[0_4px_12px_rgba(168,85,247,0.25)] hover:scale-105 transition-all duration-300 ${
                      isFullscreen ? 'h-24 sm:h-32 md:h-40 lg:h-48 xl:h-64 2xl:h-72' : 'h-44 sm:h-56 md:h-64 lg:h-72'
                    }`}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h1 className={`font-black tracking-tight font-sans transition-all duration-300 ${
                  isFullscreen ? 'text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl' : 'text-4xl md:text-6xl'
                } ${
                  isLightMode ? 'text-slate-900' : 'text-white'
                }`}>
                  PENCAK <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-purple-400 to-violet-400">SILAT</span>
                </h1>
                <div className={`mx-auto transition-all duration-300 ${
                  isFullscreen ? 'max-w-3xl xl:max-w-5xl pt-1' : 'max-w-2xl pt-2'
                }`}>
                  <p className={`font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-purple-400 to-violet-400 leading-normal whitespace-nowrap ${
                    isFullscreen ? 'text-[11px] sm:text-xs md:text-sm xl:text-base 2xl:text-lg' : 'text-[11px] sm:text-xs md:text-sm lg:text-base xl:text-lg'
                  }`}>
                    PLATFORM DIGITAL SKORING PENCAK SILAT KATEGORI TANDING
                  </p>
                  <p className={`font-light leading-relaxed mt-1 ${
                    isFullscreen ? 'text-[10px] sm:text-xs xl:text-sm 2xl:text-base' : 'text-xs md:text-sm'
                  } ${
                    isLightMode ? 'text-slate-650' : 'text-gray-400'
                  }`}>
                    DENGAN SINKRONISASI INSTAN MULTI LAYAR SECARA ONLINE MAUPUN OFFLINE
                  </p>
                </div>
              </div>

              {/* Premium Role Choice Selection Grids */}
              <div className={`grid w-full px-2 transition-all duration-300 ${
                isFullscreen 
                  ? 'grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 lg:gap-6 xl:gap-8' 
                  : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
              }`}>
                
                {/* SEKRETARIS */}
                <button 
                  onClick={() => selectRoleAndTriggerAudio('SEKRETARIS')}
                  className={`group relative flex flex-col items-center justify-center transition-all duration-300 active:scale-95 text-center overflow-hidden h-full ${
                    isFullscreen 
                      ? 'p-2 rounded-2xl border' 
                      : 'p-3 rounded-2xl border'
                  } ${
                    isLightMode 
                      ? 'bg-white border-slate-200/80 hover:border-pink-500/50 shadow-md hover:shadow-lg' 
                      : 'bg-gradient-to-b from-[#18092a]/90 to-[#0e031a]/95 border-purple-900/40 hover:border-pink-500/70 shadow-xl'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <img 
                    id="img-grid-sekretaris"
                    src="/sekretaris.png" 
                    alt="SEKRETARIS" 
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain rounded-xl max-h-56 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </button>

                {/* DEWAN */}
                <button 
                  onClick={() => selectRoleAndTriggerAudio('DEWAN')}
                  className={`group relative flex flex-col items-center justify-center transition-all duration-300 active:scale-95 text-center overflow-hidden h-full ${
                    isFullscreen 
                      ? 'p-2 rounded-2xl border' 
                      : 'p-3 rounded-2xl border'
                  } ${
                    isLightMode 
                      ? 'bg-white border-slate-200/80 hover:border-purple-500/50 shadow-md hover:shadow-lg' 
                      : 'bg-gradient-to-b from-[#18092a]/90 to-[#0e031a]/95 border-purple-900/40 hover:border-purple-500/70 shadow-xl'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <img 
                    id="img-grid-dewan"
                    src="/dewan.png" 
                    alt="DEWAN" 
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain rounded-xl max-h-56 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </button>

                {/* JURI */}
                <button 
                  onClick={() => selectRoleAndTriggerAudio('JURI_SELECT')}
                  className={`group relative flex flex-col items-center justify-center transition-all duration-300 active:scale-95 text-center overflow-hidden h-full ${
                    isFullscreen 
                      ? 'p-2 rounded-2xl border' 
                      : 'p-3 rounded-2xl border'
                  } ${
                    isLightMode 
                      ? 'bg-white border-slate-200/80 hover:border-violet-500/50 shadow-md hover:shadow-lg' 
                      : 'bg-gradient-to-b from-[#18092a]/90 to-[#0e031a]/95 border-purple-900/40 hover:border-violet-500/70 shadow-xl'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <img 
                    id="img-grid-juri"
                    src="/juri.png" 
                    alt="JURI" 
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain rounded-xl max-h-56 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </button>

                {/* MONITOR */}
                <button 
                  onClick={() => selectRoleAndTriggerAudio('MONITOR')}
                  className={`group relative flex flex-col items-center justify-center transition-all duration-300 active:scale-95 text-center overflow-hidden h-full ${
                    isFullscreen 
                      ? 'p-2 rounded-2xl border' 
                      : 'p-3 rounded-2xl border'
                  } ${
                    isLightMode 
                      ? 'bg-white border-slate-200/80 hover:border-amber-500/50 shadow-md hover:shadow-lg' 
                      : 'bg-gradient-to-b from-[#18092a]/90 to-[#0e031a]/95 border-purple-900/40 hover:border-amber-500/70 shadow-xl'
                  }`}
                >
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <img 
                    id="img-grid-monitor"
                    src="/monitor.png" 
                    alt="MONITOR" 
                    referrerPolicy="no-referrer"
                    className="w-full h-auto object-contain rounded-xl max-h-56 transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </button>

              </div>

              {/* Quick tips about offline multi tab synchronization */}
              <div className={`text-center border transition-all duration-300 ${
                isFullscreen 
                  ? 'max-w-2xl xl:max-w-4xl mt-4 sm:mt-5 p-3 sm:p-4 xl:p-6 rounded-xl xl:rounded-2xl space-y-1 xl:space-y-2' 
                  : 'max-w-2xl mt-12 p-5 rounded-xl space-y-2'
              } ${
                isLightMode 
                  ? 'bg-purple-100/50 border-purple-200/60 text-slate-800' 
                  : 'bg-[#120822]/80 border border-purple-950/80 text-white'
              }`}>
                <h4 className={`font-semibold uppercase tracking-wider transition-colors ${
                  isFullscreen ? 'text-xs tracking-wider xl:text-sm' : 'text-xs text-purple-300'
                } ${
                  isLightMode ? 'text-purple-700' : 'text-purple-300'
                }`}>💡 Tips Penyiapan Multi-Layar offline</h4>
                <p className={`transition-colors ${
                  isFullscreen ? 'text-xs leading-relaxed max-w-xl mx-auto xl:max-w-3xl xl:text-sm xl:leading-relaxed' : 'text-xs leading-relaxed'
                } ${
                  isLightMode ? 'text-slate-650' : 'text-gray-400'
                }`}>
                  Aplikasi ini mendukung sinkronisasi data instan tanpa internet! Buka aplikasi ini di <strong>beberapa tab browser baru (atau layar monitor kedua)</strong> di komputer yang sama. Atur satu tab menjadi <strong>Sekretaris</strong> untuk mengontrol, tab lainnya menjadi <strong>Sekretaris</strong> untuk mengontrol, tab lainnya menjadi <strong>Juri 1, 2, 3</strong>, <strong>Dewan</strong>, dan <strong>Monitor</strong>. Data akan tersinkron otomatis dalam milidetik!
                </p>
              </div>

              {/* Developed by : IRFAN, S.Pd. */}
              <footer className={`text-center text-slate-500 text-xs font-medium tracking-wider font-mono transition-all duration-300 ${
                isFullscreen ? 'mt-2 mb-1 text-[10px] xl:text-xs' : 'mt-12'
              }`}>
                Developed by : <span className={`font-bold transition-all duration-300 ${isLightMode ? 'text-purple-600' : 'text-purple-400'}`}>IRFAN, S.Pd.</span>
              </footer>
            </motion.div>
          )}

          {/* DEWAN SCREEN VIEW */}
          {role === 'DEWAN' && (
            <motion.div
              key="dewan"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className={`flex-1 flex flex-col w-full relative transition-all duration-300 ${
                isFullscreen 
                  ? 'p-2 md:p-3 max-w-full h-screen max-h-screen space-y-2 overflow-hidden bg-[#0c041d]' 
                  : 'p-4 max-w-7xl mx-auto space-y-4'
              }`}
            >
            {/* LOCK COVER SCREEN */}
            {matchState.statusPertandingan !== 'BERJALAN' && (
              <div className="absolute inset-0 bg-[#05000a]/92 backdrop-blur-md z-40 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-purple-500/10">
                <div className="w-16 h-16 bg-purple-950/40 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20 shadow-lg">
                  <Lock className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase font-display">PANEL DEWAN TERKUNCI</h3>
                <p className="text-sm text-slate-300 mt-2 max-w-md font-sans">
                  Pertandingan belum dimulai or telah dibatalkan. Silakan minta <strong className="text-purple-400">Sekretaris</strong> untuk mengaktifkan status <strong className="text-amber-400">"Mulai Pertandingan"</strong> agar panel dapat digunakan sesuai fungsi.
                </p>
              </div>
            )}

            {/* Header info bar */}
            <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 bg-gradient-to-r from-blue-900/50 via-[#15002c] to-red-900/50 border border-purple-500/40 rounded-xl shadow-2xl relative z-10 items-center transition-all ${
              isFullscreen ? 'p-6 md:p-8 bg-[#1f093a]/90' : 'p-4 border-b border-purple-500/30 shadow-lg'
            }`}>
              <div className="flex flex-col justify-center md:col-span-6 min-w-0">
                <span className="text-[10px] tracking-widest text-purple-300 uppercase font-black">Event Kejuaraan</span>
                <span className={`font-black italic truncate leading-tight text-white ${isFullscreen ? 'text-2xl md:text-3xl' : 'text-xl'}`}>{matchState.eventName || "PIALA PENCAK SILAT NUSANTARA"}</span>
                <span className={`font-mono ${isFullscreen ? 'text-xs text-purple-200 mt-1' : 'text-[10px] text-slate-400'}`}>
                  Partai {matchState.partai} • Kelas {matchState.kelas} ({matchState.gender}) • {matchState.kategoriUsia || "REMAJA"} • {matchState.tahapPertandingan || "PENYISIHAN"}
                </span>
              </div>
              <div className="text-center md:text-right flex flex-col justify-center md:col-span-3 min-w-0">
                <span className="text-[10px] tracking-widest text-purple-300 uppercase font-bold">Kategori Pertandingan</span>
                <div className={`font-black uppercase truncate leading-tight text-white ${isFullscreen ? 'text-lg md:text-xl lg:text-2xl mt-0.5' : 'text-lg'}`}>Tanding {matchState.gender} • {matchState.kelas}</div>
              </div>
              <div className="flex items-center justify-center md:justify-end md:col-span-3 gap-2">
                <button 
                  onClick={toggleFullscreen}
                  className="py-2.5 px-4 rounded-xl border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/80 hover:bg-purple-900/80 text-purple-300 font-mono uppercase text-[10px] font-extrabold tracking-widest text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'LAYAR BIASA' : 'LAYAR PENUH'}</span>
                </button>
              </div>
            </div>

            {/* Main panels: Left (Biru) - Middle Info - Right (Merah) */}
            <div className={`flex-1 grid grid-cols-1 lg:grid-cols-12 ${isFullscreen ? 'gap-2.5' : 'gap-4'} min-h-0`}>
                      {/* SUDUT BIRU CONTROLLER (Left Side) */}
              <div className={`lg:col-span-5 bg-gradient-to-bl from-blue-900/80 to-transparent rounded-xl border-r-4 border-blue-500 shadow-xl flex flex-col justify-between relative overflow-hidden h-full ${
                isFullscreen ? 'p-5' : 'p-5'
              }`}>
                <div className={`absolute top-2 left-4 font-black text-white/5 italic select-none pointer-events-none ${
                  isFullscreen ? 'text-[60px] md:text-[80px]' : 'text-[60px]'
                }`}>BIRU</div>
                <div className="relative flex flex-col justify-between h-full">
                  {isFullscreen ? (
                    <div className="flex flex-col justify-between h-full space-y-4">
                      {/* Athlete header info at Top */}
                      <div className="flex items-center justify-between border-b border-blue-500/30 pb-3">
                        <div>
                          <span className="bg-blue-600 text-white text-[11px] font-black px-2.5 py-1 rounded uppercase tracking-wider font-mono shadow-md">SUDUT BIRU</span>
                        </div>
                        <div className="flex items-baseline gap-2 max-w-[75%] min-w-0">
                          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight truncate">{matchState.atlitBiru.nama}</h2>
                          <span className="text-sm font-extrabold text-blue-300 tracking-wide font-mono uppercase whitespace-nowrap">({matchState.atlitBiru.kontingen})</span>
                        </div>
                      </div>

                      {/* HUGE ENLARGED POINT DISPLAY IN MIDDLE */}
                      <div className="flex-grow flex flex-col items-center justify-center py-2 relative">
                        <span className="text-9xl md:text-[140px] lg:text-[170px] xl:text-[200px] font-black font-mono text-blue-400 drop-shadow-[0_0_40px_rgba(59,130,246,0.95)] leading-none transition-all duration-300 transform select-none">
                          {calculateFinalScore('BIRU', matchState)}
                        </span>
                      </div>

                      {/* ACTION CONTROLLERS SYSTEM TO BOTTOM */}
                      <div className="space-y-2">
                        <span className="block text-[10px] text-blue-300 font-bold uppercase tracking-wider font-mono">Panel Kendali Hukuman & Nilai</span>
                        <div className="grid grid-cols-3 gap-2.5">
                          {/* Binaan 1 */}
                          <button 
                            onClick={() => {
                              triggerClick();
                              const nextPen = !matchState.penaltiesBiru.binaan1;
                              updateMatchState({
                                ...matchState,
                                penaltiesBiru: { ...matchState.penaltiesBiru, binaan1: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesBiru.binaan1 ? 'bg-yellow-500 border-yellow-300 text-black shadow-lg scale-105 font-bold' : 'bg-[#0f111d] border-blue-900 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="binaan1" DefaultIcon={Binaan1Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Binaan 1</span>
                          </button>

                          {/* Binaan 2 */}
                          <button 
                            onClick={() => {
                              triggerClick();
                              const nextPen = !matchState.penaltiesBiru.binaan2;
                              updateMatchState({
                                ...matchState,
                                penaltiesBiru: { ...matchState.penaltiesBiru, binaan2: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesBiru.binaan2 ? 'bg-yellow-500 border-yellow-300 text-black shadow-lg scale-105 font-bold' : 'bg-[#0f111d] border-blue-900 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="binaan2" DefaultIcon={Binaan2Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Binaan 2</span>
                          </button>

                          {/* Jatuhan +3 (No toggle, straight click adds 3) */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playPointSound();
                              const vScore: ValidatedScore = {
                                id: uuid(),
                                sudut: 'BIRU',
                                points: 3,
                                jenis: 'JATUHAN',
                                babak: matchState.babakAktif,
                                timestamp: Date.now(),
                              };
                              updateMatchState({
                                ...matchState,
                                validatedScores: [...matchState.validatedScores, vScore]
                              });
                            }}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-700 hover:bg-green-600 border border-green-500 text-white text-center transition-all shadow-lg active:scale-95 cursor-pointer font-black"
                          >
                            <RenderIconOrCustom iconKey="jatuhan" DefaultIcon={JatuhanIcon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Jatuhan +3</span>
                          </button>

                          {/* Teguran 1 */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const nextPen = !matchState.penaltiesBiru.teguran1;
                              updateMatchState({
                                ...matchState,
                                penaltiesBiru: { ...matchState.penaltiesBiru, teguran1: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesBiru.teguran1 ? 'bg-orange-500 border-orange-300 text-white shadow-lg font-bold' : 'bg-[#0f111d] border-blue-900/80 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="teguran1" DefaultIcon={Teguran1Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Teguran 1 (-1)</span>
                          </button>

                          {/* Teguran 2 */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const nextPen = !matchState.penaltiesBiru.teguran2;
                              updateMatchState({
                                ...matchState,
                                penaltiesBiru: { ...matchState.penaltiesBiru, teguran2: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesBiru.teguran2 ? 'bg-orange-500 border-orange-300 text-white shadow-lg font-bold' : 'bg-[#0f111d] border-blue-900/80 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="teguran2" DefaultIcon={Teguran2Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Teguran 2 (-2)</span>
                          </button>

                          {/* Jatuhan Batal */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const scores = [...matchState.validatedScores];
                              let deletedIndex = -1;
                              for (let i = scores.length - 1; i >= 0; i--) {
                                if (
                                  scores[i].sudut === 'BIRU' &&
                                  scores[i].jenis === 'JATUHAN' &&
                                  scores[i].babak === matchState.babakAktif
                                ) {
                                  deletedIndex = i;
                                  break;
                                }
                              }
                              if (deletedIndex !== -1) {
                                scores.splice(deletedIndex, 1);
                              }
                              updateMatchState({
                                ...matchState,
                                validatedScores: scores
                              });
                            }}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-950/80 hover:bg-amber-900/80 border border-amber-600/80 text-amber-200 text-center transition-all shadow-lg active:scale-95 cursor-pointer font-black"
                          >
                            <RenderIconOrCustom iconKey="jatuhanBatal" DefaultIcon={RotateCcw} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Jatuhan Batal</span>
                          </button>

                          {/* Peringatan 1 */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const nextPen = !matchState.penaltiesBiru.peringatan1;
                              updateMatchState({
                                ...matchState,
                                penaltiesBiru: { ...matchState.penaltiesBiru, peringatan1: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesBiru.peringatan1 ? 'bg-red-800 border-red-500 text-white shadow-lg' : 'bg-[#0f111d] border-blue-900/80 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="peringatan1" DefaultIcon={Peringatan1Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Peringatan 1 (-5)</span>
                          </button>

                          {/* Peringatan 2 */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const nextPen = !matchState.penaltiesBiru.peringatan2;
                              updateMatchState({
                                ...matchState,
                                penaltiesBiru: { ...matchState.penaltiesBiru, peringatan2: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesBiru.peringatan2 ? 'bg-red-800 border-red-500 text-white shadow-lg' : 'bg-[#0f111d] border-blue-900/80 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="peringatan2" DefaultIcon={Peringatan2Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Peringatan 2 (-10)</span>
                          </button>
                          
                          {/* Diskualifikasi */}
                          <button 
                            onClick={() => {
                              triggerClick();
                              setDqConfirmCorner('BIRU');
                            }}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-pink-900 border border-pink-500 text-white text-center transition-all active:scale-95 hover:bg-pink-800 cursor-pointer shadow-lg font-black"
                          >
                            <DisqualificationIcon className="w-8 h-8 mb-1 text-white animate-pulse" />
                            <span className="text-[11px] font-bold text-pink-100">Diskualifikasi</span>
                          </button>

                          {/* CEK VAR */}
                          <button 
                            onClick={() => {
                              triggerClick();
                              updateMatchState({
                                ...matchState,
                                varChecking: {
                                  status: 'CHECKING',
                                  sudut: 'BIRU',
                                  result: null
                                }
                              });
                            }}
                            className="col-span-3 py-3 w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 border border-blue-400/50 mt-1"
                          >
                            <MonitorIcon className="w-4 h-4 animate-pulse" />
                            <span>CEK VAR</span>
                          </button>
                        </div>
                      </div>

                      {/* LOG NILAI SYSTEM AT THE ABSOLUTE BOTTOM */}
                      {renderGridLogNilaiMasuk('BIRU')}
                    </div>
                  ) : (
                    <div>
                      <div className={`flex items-center justify-between border-b border-blue-900/30 pb-2 mb-4`}>
                        <span className="bg-blue-650 text-white text-xs font-black px-3 py-1 rounded uppercase tracking-widest font-mono">Sudut Biru</span>
                        <span className={`font-black font-mono text-blue-400 drop-shadow-[0_0_25px_rgba(59,130,246,0.95)] transition-all duration-300 transform hover:scale-105 text-7xl lg:text-9xl`}>
                          {calculateFinalScore('BIRU', matchState)}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <h2 className="font-bold truncate text-white uppercase text-2xl">{matchState.atlitBiru.nama}</h2>
                        <p className="text-blue-300/80 uppercase font-semibold text-sm">{matchState.atlitBiru.kontingen}</p>
                      </div>

                      {/* Penalty indicators 2D Silhouettes buttons. Click triggers instantly */}
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {/* Binaan 1 */}
                        <button 
                          onClick={() => {
                            triggerClick();
                            const nextPen = !matchState.penaltiesBiru.binaan1;
                            updateMatchState({
                              ...matchState,
                              penaltiesBiru: { ...matchState.penaltiesBiru, binaan1: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesBiru.binaan1 ? 'bg-yellow-500 border-yellow-300 text-black scale-105 font-bold' : 'bg-[#0f111d] border-blue-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="binaan1" DefaultIcon={Binaan1Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Binaan 1</span>
                        </button>

                        {/* Binaan 2 */}
                        <button 
                          onClick={() => {
                            triggerClick();
                            const nextPen = !matchState.penaltiesBiru.binaan2;
                            updateMatchState({
                              ...matchState,
                              penaltiesBiru: { ...matchState.penaltiesBiru, binaan2: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesBiru.binaan2 ? 'bg-yellow-500 border-yellow-300 text-black scale-105 font-bold' : 'bg-[#0f111d] border-blue-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="binaan2" DefaultIcon={Binaan2Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Binaan 2</span>
                        </button>

                        {/* Jatuhan +3 (No toggle, straight click adds 3) */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playPointSound();
                            const vScore: ValidatedScore = {
                              id: uuid(),
                              sudut: 'BIRU',
                              points: 3,
                              jenis: 'JATUHAN',
                              babak: matchState.babakAktif,
                              timestamp: Date.now(),
                            };
                            updateMatchState({
                              ...matchState,
                              validatedScores: [...matchState.validatedScores, vScore]
                            });
                          }}
                          className="flex flex-col items-center justify-center rounded-lg bg-green-700 hover:bg-green-600 border border-green-500 text-white text-center transition-all active:scale-95 p-2.5"
                        >
                          <RenderIconOrCustom iconKey="jatuhan" DefaultIcon={JatuhanIcon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Jatuhan +3</span>
                        </button>

                        {/* Teguran 1 */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const nextPen = !matchState.penaltiesBiru.teguran1;
                            updateMatchState({
                              ...matchState,
                              penaltiesBiru: { ...matchState.penaltiesBiru, teguran1: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesBiru.teguran1 ? 'bg-orange-500 border-orange-300 text-white scale-105 font-bold' : 'bg-[#0f111d] border-blue-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="teguran1" DefaultIcon={Teguran1Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Teguran 1 (-1)</span>
                        </button>

                        {/* Teguran 2 */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const nextPen = !matchState.penaltiesBiru.teguran2;
                            updateMatchState({
                              ...matchState,
                              penaltiesBiru: { ...matchState.penaltiesBiru, teguran2: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesBiru.teguran2 ? 'bg-orange-500 border-orange-300 text-white scale-105 font-bold' : 'bg-[#0f111d] border-blue-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="teguran2" DefaultIcon={Teguran2Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Teguran 2 (-2)</span>
                        </button>

                        {/* Jatuhan Batal */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const scores = [...matchState.validatedScores];
                            let deletedIndex = -1;
                            for (let i = scores.length - 1; i >= 0; i--) {
                              if (
                                scores[i].sudut === 'BIRU' &&
                                scores[i].jenis === 'JATUHAN' &&
                                scores[i].babak === matchState.babakAktif
                              ) {
                                deletedIndex = i;
                                break;
                              }
                            }
                            if (deletedIndex !== -1) {
                              scores.splice(deletedIndex, 1);
                            }
                            updateMatchState({
                              ...matchState,
                              validatedScores: scores
                            });
                          }}
                          className="flex flex-col items-center justify-center rounded-lg bg-amber-950/80 hover:bg-amber-900/80 border border-amber-600/80 text-amber-200 text-center transition-all p-2.5 active:scale-95 cursor-pointer font-bold"
                        >
                          <RenderIconOrCustom iconKey="jatuhanBatal" DefaultIcon={RotateCcw} className="w-5 h-5 mb-1 text-white" />
                          <span className="text-[10px] font-bold">Jatuhan Batal</span>
                        </button>

                        {/* Peringatan 1 */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const nextPen = !matchState.penaltiesBiru.peringatan1;
                            updateMatchState({
                              ...matchState,
                              penaltiesBiru: { ...matchState.penaltiesBiru, peringatan1: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesBiru.peringatan1 ? 'bg-red-800 border-red-500 text-white scale-105' : 'bg-[#0f111d] border-blue-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="peringatan1" DefaultIcon={Peringatan1Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Peringatan 1 (-5)</span>
                        </button>

                        {/* Peringatan 2 */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const nextPen = !matchState.penaltiesBiru.peringatan2;
                            updateMatchState({
                              ...matchState,
                              penaltiesBiru: { ...matchState.penaltiesBiru, peringatan2: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesBiru.peringatan2 ? 'bg-red-800 border-red-500 text-white scale-105' : 'bg-[#0f111d] border-blue-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="peringatan2" DefaultIcon={Peringatan2Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Peringatan 2 (-10)</span>
                        </button>
                        
                        {/* Diskualifikasi */}
                        <button 
                          onClick={() => {
                            triggerClick();
                            setDqConfirmCorner('BIRU');
                          }}
                          className="flex flex-col items-center justify-center rounded-lg bg-pink-900 border border-pink-500 text-white text-center transition-all active:scale-95 hover:bg-pink-800 p-2.5 cursor-pointer shadow-lg font-black"
                        >
                          <DisqualificationIcon className="w-5 h-5 mb-1.5 text-white animate-pulse" />
                          <span className="text-[10px] font-bold text-pink-100">Diskualifikasi</span>
                        </button>

                        {/* CEK VAR */}
                        <button 
                          onClick={() => {
                            triggerClick();
                            updateMatchState({
                              ...matchState,
                              varChecking: {
                                status: 'CHECKING',
                                sudut: 'BIRU',
                                result: null
                              }
                            });
                          }}
                          className="col-span-3 py-2.5 w-full rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-blue-400/50 mt-1"
                        >
                          <MonitorIcon className="w-3.5 h-3.5 animate-pulse" />
                          <span>CEK VAR</span>
                        </button>
                      </div>

                      {/* Score Log History brief of Sudut Biru */}
                      {renderGridLogNilaiMasuk('BIRU')}
                    </div>
                  )}
                </div>
              </div>

              {/* CENTER DISPLAY FOR DEWAN: INCOMING SCORES JURI 1, 2, 3 & VERIFICATION CONTROLLERS */}
              <div className={`lg:col-span-2 bg-[#120822] rounded-2xl border border-purple-900/30 flex flex-col justify-between ${
                isFullscreen ? 'p-2 space-y-2' : 'p-4 space-y-4'
              }`}>
                
                {/* BABAK AKTIF & TIMER DISPLAY */}
                <div className={`flex flex-col items-center bg-black/80 rounded-lg border border-purple-500/60 shadow-[0_0_20px_rgba(168,85,247,0.4)] justify-center text-center ${
                  isFullscreen ? 'py-2 px-3' : 'py-3 px-4'
                }`}>
                  <span className={`font-mono uppercase font-bold text-amber-400 tracking-wider ${isFullscreen ? 'text-[10px] mb-0.5' : 'text-xs mb-1'}`}>BABAK {matchState.babakAktif} - AKTIF</span>
                  <span className={`font-mono font-black tabular-nums leading-none text-white ${isFullscreen ? 'text-4xl md:text-5xl' : 'text-3xl md:text-4xl'}`}>
                    {Math.floor(matchState.sisaWaktu / 60).toString().padStart(2, '0')}:{(matchState.sisaWaktu % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Score Input display by Juri 1, 2, 3 */}
                <div className={isFullscreen ? 'space-y-1.5' : 'space-y-3'}>
                  <h4 className={`text-center font-semibold text-purple-300 border-b border-purple-900/40 uppercase tracking-wider ${
                    isFullscreen ? 'text-[10px] pb-0.5' : 'text-xs pb-1'
                  }`}>Monitor Juri</h4>
                  
                  {[1, 2, 3].map((jId) => {
                    const rawPunchesM = matchState.rawScores.filter(r => r.juriId === jId && r.sudut === 'MERAH' && r.jenis === 'PUNCH' && r.babak === matchState.babakAktif && r.validated).length;
                    const rawKicksM = matchState.rawScores.filter(r => r.juriId === jId && r.sudut === 'MERAH' && r.jenis === 'KICK' && r.babak === matchState.babakAktif && r.validated).length;
                    const rawPunchesB = matchState.rawScores.filter(r => r.juriId === jId && r.sudut === 'BIRU' && r.jenis === 'PUNCH' && r.babak === matchState.babakAktif && r.validated).length;
                    const rawKicksB = matchState.rawScores.filter(r => r.juriId === jId && r.sudut === 'BIRU' && r.jenis === 'KICK' && r.babak === matchState.babakAktif && r.validated).length;
                    
                    return (
                      <div key={jId} className={`bg-[#0a0515] border border-purple-950 rounded-lg text-center ${
                        isFullscreen ? 'p-1' : 'p-2 space-y-1'
                      }`}>
                        <span className="text-[10px] font-mono font-bold text-purple-400">JURI {jId}</span>
                        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                          {/* Biru Panel */}
                          <div className="text-blue-400 border-r border-purple-950/50 pr-2 text-right flex flex-col space-y-0.5">
                            <div>P: <span className="font-bold text-[11px]">{rawPunchesB}</span></div>
                            <div>K: <span className="font-bold text-[11px]">{rawKicksB}</span></div>
                          </div>
                          {/* Merah Panel */}
                          <div className="text-red-400 pl-2 text-left flex flex-col space-y-0.5">
                            <div><span className="font-bold text-[11px]">{rawPunchesM}</span> :P</div>
                            <div><span className="font-bold text-[11px]">{rawKicksM}</span> :K</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* TOMBOL "TEKNIK-MUTLAK-WMP-UD" */}
                <div className={`${isFullscreen ? 'my-1.5' : 'my-2'}`}>
                  <button
                    id="btn-teknik-mutlak-wmp-ud"
                    onClick={() => {
                      triggerClick();
                      setShowDewanStopMatchModal(true);
                    }}
                    className={`w-full font-sans font-black text-center flex items-center justify-center gap-1.5 transition-all active:scale-95 focus:outline-none cursor-pointer border rounded-lg bg-[#0BD3D3] hover:bg-[#0ac2c2] text-[#0f071f] font-extrabold shadow-[0_0_20px_rgba(11,211,211,0.25)] hover:shadow-[0_0_30px_rgba(11,211,211,0.4)] ${
                      isFullscreen 
                        ? 'py-6 md:py-10 text-xs md:text-sm uppercase tracking-wider border-2 border-[#15ecec]'
                        : 'py-2.5 px-3 text-xs border-[#0BD3D3]/40'
                    }`}
                  >
                    <span>TEKNIK-MUTLAK-WMP-UD</span>
                  </button>
                </div>

                {/* LOGO DISCORS GRID */}
                <div className="flex-1 min-h-0 flex items-center justify-center w-full py-2 transition-all duration-300">
                  <img
                    id="img-logo-discors-grid"
                    src="/logodiscorsgrid.svg"
                    alt="Logo Discors Grid"
                    referrerPolicy="no-referrer"
                    className={`object-contain max-w-full opacity-80 hover:opacity-100 transition-opacity duration-200 filter drop-shadow-[0_0_15px_rgba(11,211,211,0.25)] ${
                      isFullscreen 
                        ? 'h-32 sm:h-40 md:h-52 lg:h-64 xl:h-76' 
                        : 'h-24 md:h-28'
                    }`}
                  />
                </div>

                {/* VERIFIKASI COCKPIT (Trigger panel to request Juri vote) */}
                <div className={`${isFullscreen ? 'space-y-1' : 'space-y-2'}`}>
                  <span className="block text-[10px] text-center font-bold text-purple-400 tracking-wider uppercase font-mono">KENDALI VERIFIKASI</span>
                  
                  {matchState.verifikasi.status === 'PENDING' ? (
                    <div className={`bg-purple-950 border border-purple-500 rounded-lg text-center ${
                      isFullscreen ? 'p-1.5' : 'p-2.5 space-y-1'
                    }`}>
                      <span className="animate-pulse block text-[9px] font-mono text-yellow-300">MENUNGGU VOTE JURI...</span>
                      <span className="text-[10px] font-bold text-white uppercase">{matchState.verifikasi.jenis}</span>
                      
                      {/* Active votes tracker */}
                      <div className="py-1 text-[8px] space-y-0.5 text-slate-300 font-mono">
                        <div>Juri 1: {matchState.verifikasi.juriVotes[1] || '⏳'}</div>
                        <div>Juri 2: {matchState.verifikasi.juriVotes[2] || '⏳'}</div>
                        <div>Juri 3: {matchState.verifikasi.juriVotes[3] || '⏳'}</div>
                      </div>

                      {/* Resolve manually or automatic */}
                      <div className="flex gap-1 justify-center pt-1.5">
                        <button 
                          onClick={() => {
                            triggerClick();
                            // Cancel verifikasi completely
                            updateMatchState({
                              ...matchState,
                              verifikasi: { id: "", status: "IDLE", jenis: "JATUHAN", juriVotes: {}, result: null }
                            });
                          }}
                          className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-800 rounded text-[9px]"
                        >
                          Batal
                        </button>
                        <button 
                          onClick={() => {
                            if (soundEnabled) playPointSound();
                            
                            // Evaluate majority vote
                            const votes = Object.values(matchState.verifikasi.juriVotes) as ('MERAH' | 'BIRU' | 'TIDAK_SAH')[];
                            const counts = { MERAH: 0, BIRU: 0, TIDAK_SAH: 0 };
                            votes.forEach(v => {
                              if (v === 'MERAH') counts.MERAH++;
                              if (v === 'BIRU') counts.BIRU++;
                              if (v === 'TIDAK_SAH') counts.TIDAK_SAH++;
                            });
                            
                            let res: 'MERAH' | 'BIRU' | 'TIDAK_SAH' = 'TIDAK_SAH';
                            if (counts.MERAH >= 2) res = 'MERAH';
                            else if (counts.BIRU >= 2) res = 'BIRU';

                            // If it's Jatuhan and resolved to a corner, reward +3 points automatically!
                            let updatedValidated = [...matchState.validatedScores];
                            if (matchState.verifikasi.jenis === 'JATUHAN' && (res === 'MERAH' || res === 'BIRU')) {
                              updatedValidated.push({
                                id: uuid(),
                                sudut: res,
                                points: 3,
                                jenis: 'JATUHAN',
                                babak: matchState.babakAktif,
                                timestamp: Date.now()
                              });
                            }

                            updateMatchState({
                              ...matchState,
                              validatedScores: updatedValidated,
                              verifikasi: {
                                ...matchState.verifikasi,
                                status: 'RESOLVED',
                                result: res
                              }
                            });

                            // Display toast
                            showToast(`Verifikasi diselesaikan: ${res === 'TIDAK_SAH' ? 'TIDAK SAH' : 'SAH ' + res}`, "success");
                          }}
                          className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-[9px] font-bold"
                        >
                          Proses
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1.5 font-sans">
                      <button 
                        onClick={() => {
                          triggerClick();
                          updateMatchState({
                            ...matchState,
                            verifikasi: {
                              id: uuid(),
                              status: 'PENDING',
                              jenis: 'JATUHAN',
                              juriVotes: {},
                              result: null
                            }
                          });
                        }}
                        className={`bg-purple-950 hover:bg-purple-900 border border-purple-800 rounded-lg text-[10px] font-mono font-extrabold text-center block transition-all hover:scale-105 cursor-pointer hover:border-purple-500 ${
                          isFullscreen ? 'py-6 md:py-10 text-xs md:text-sm uppercase tracking-wider shadow-lg shadow-purple-950/55 border-2 border-purple-600' : 'py-1.5 px-2'
                        }`}
                      >
                        VERIFIKASI JATUHAN
                      </button>

                      <button 
                        onClick={() => {
                          triggerClick();
                          updateMatchState({
                            ...matchState,
                            verifikasi: {
                              id: uuid(),
                              status: 'PENDING',
                              jenis: 'PELANGGARAN',
                              juriVotes: {},
                              result: null
                            }
                          });
                        }}
                        className={`bg-purple-950 hover:bg-purple-900 border border-purple-800 rounded-lg text-[10px] font-mono font-extrabold text-center block transition-all hover:scale-105 cursor-pointer hover:border-purple-500 ${
                          isFullscreen ? 'py-6 md:py-10 text-xs md:text-sm uppercase tracking-wider shadow-lg shadow-purple-950/55 border-2 border-purple-600' : 'py-1.5 px-2'
                        }`}
                      >
                        VERIFIKASI PELANGGARAN
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SUDUT MERAH CONTROLLER (Right Side) */}
              <div className={`lg:col-span-5 bg-gradient-to-br from-red-900/80 to-transparent rounded-xl border-l-4 border-red-500 shadow-xl flex flex-col justify-between relative overflow-hidden h-full ${
                isFullscreen ? 'p-5' : 'p-5'
              }`}>
                <div className={`absolute top-2 right-4 font-black text-white/5 italic select-none pointer-events-none ${
                  isFullscreen ? 'text-[60px] md:text-[80px]' : 'text-[60px]'
                }`}>MERAH</div>
                <div className="relative flex flex-col justify-between h-full">
                  {isFullscreen ? (
                    <div className="flex flex-col justify-between h-full space-y-4">
                      {/* Athlete header info at Top */}
                      <div className="flex items-center justify-between border-b border-red-500/30 pb-3">
                        <div className="flex items-baseline gap-2 max-w-[75%] min-w-0">
                          <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight truncate">{matchState.atlitMerah.nama}</h2>
                          <span className="text-sm font-extrabold text-red-300 tracking-wide font-mono uppercase whitespace-nowrap">({matchState.atlitMerah.kontingen})</span>
                        </div>
                        <div>
                          <span className="bg-red-600 text-white text-[11px] font-black px-2.5 py-1 rounded uppercase tracking-wider font-mono shadow-md">SUDUT MERAH</span>
                        </div>
                      </div>

                      {/* HUGE ENLARGED POINT DISPLAY IN MIDDLE */}
                      <div className="flex-grow flex flex-col items-center justify-center py-2 relative">
                        <span className="text-9xl md:text-[140px] lg:text-[170px] xl:text-[200px] font-black font-mono text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.95)] leading-none transition-all duration-300 transform select-none">
                          {calculateFinalScore('MERAH', matchState)}
                        </span>
                      </div>

                      {/* ACTION CONTROLLERS SYSTEM TO BOTTOM */}
                      <div className="space-y-2">
                        <span className="block text-[10px] text-red-300 font-bold uppercase tracking-wider font-mono text-right">Panel Kendali Hukuman & Nilai</span>
                        <div className="grid grid-cols-3 gap-2.5">
                          {/* Jatuhan +3 (No toggle, straight click adds 3) */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playPointSound();
                              const vScore: ValidatedScore = {
                                id: uuid(),
                                sudut: 'MERAH',
                                points: 3,
                                jenis: 'JATUHAN',
                                babak: matchState.babakAktif,
                                timestamp: Date.now(),
                              };
                              updateMatchState({
                                ...matchState,
                                validatedScores: [...matchState.validatedScores, vScore]
                              });
                            }}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-700 hover:bg-green-600 border border-green-500 text-white text-center transition-all shadow-lg active:scale-95 cursor-pointer font-black"
                          >
                            <RenderIconOrCustom iconKey="jatuhan" DefaultIcon={JatuhanIcon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Jatuhan +3</span>
                          </button>

                          {/* Binaan 2 */}
                          <button 
                            onClick={() => {
                              triggerClick();
                              const nextPen = !matchState.penaltiesMerah.binaan2;
                              updateMatchState({
                                ...matchState,
                                penaltiesMerah: { ...matchState.penaltiesMerah, binaan2: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesMerah.binaan2 ? 'bg-yellow-500 border-yellow-300 text-black shadow-lg scale-105 font-bold' : 'bg-[#0f111d] border-red-900 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="binaan2" DefaultIcon={Binaan2Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Binaan 2</span>
                          </button>

                          {/* Binaan 1 */}
                          <button 
                            onClick={() => {
                              triggerClick();
                              const nextPen = !matchState.penaltiesMerah.binaan1;
                              updateMatchState({
                                ...matchState,
                                penaltiesMerah: { ...matchState.penaltiesMerah, binaan1: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesMerah.binaan1 ? 'bg-yellow-500 border-yellow-300 text-black shadow-lg scale-105 font-bold' : 'bg-[#0f111d] border-red-900 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="binaan1" DefaultIcon={Binaan1Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Binaan 1</span>
                          </button>

                          {/* Jatuhan Batal */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const scores = [...matchState.validatedScores];
                              let deletedIndex = -1;
                              for (let i = scores.length - 1; i >= 0; i--) {
                                if (
                                  scores[i].sudut === 'MERAH' &&
                                  scores[i].jenis === 'JATUHAN' &&
                                  scores[i].babak === matchState.babakAktif
                                ) {
                                  deletedIndex = i;
                                  break;
                                }
                              }
                              if (deletedIndex !== -1) {
                                scores.splice(deletedIndex, 1);
                              }
                              updateMatchState({
                                ...matchState,
                                validatedScores: scores
                              });
                            }}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-950/80 hover:bg-amber-900/80 border border-amber-600/80 text-amber-200 text-center transition-all shadow-lg active:scale-95 cursor-pointer font-black"
                          >
                            <RenderIconOrCustom iconKey="jatuhanBatal" DefaultIcon={RotateCcw} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Jatuhan Batal</span>
                          </button>

                          {/* Teguran 2 */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const nextPen = !matchState.penaltiesMerah.teguran2;
                              updateMatchState({
                                ...matchState,
                                penaltiesMerah: { ...matchState.penaltiesMerah, teguran2: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesMerah.teguran2 ? 'bg-orange-500 border-orange-300 text-white shadow-lg font-bold' : 'bg-[#0f111d] border-red-900/80 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="teguran2" DefaultIcon={Teguran2Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Teguran 2 (-2)</span>
                          </button>

                          {/* Teguran 1 */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const nextPen = !matchState.penaltiesMerah.teguran1;
                              updateMatchState({
                                ...matchState,
                                penaltiesMerah: { ...matchState.penaltiesMerah, teguran1: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesMerah.teguran1 ? 'bg-orange-500 border-orange-300 text-white shadow-lg font-bold' : 'bg-[#0f111d] border-red-900/80 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="teguran1" DefaultIcon={Teguran1Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Teguran 1 (-1)</span>
                          </button>

                          {/* Diskualifikasi */}
                          <button 
                            onClick={() => {
                              triggerClick();
                              setDqConfirmCorner('MERAH');
                            }}
                            className="flex flex-col items-center justify-center p-3 rounded-xl bg-pink-900 border border-pink-500 text-white text-center transition-all active:scale-95 hover:bg-pink-800 cursor-pointer shadow-lg font-black"
                          >
                            <DisqualificationIcon className="w-8 h-8 mb-1 text-white animate-pulse" />
                            <span className="text-[11px] font-bold text-pink-100">Diskualifikasi</span>
                          </button>

                          {/* Peringatan 2 */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const nextPen = !matchState.penaltiesMerah.peringatan2;
                              updateMatchState({
                                ...matchState,
                                penaltiesMerah: { ...matchState.penaltiesMerah, peringatan2: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesMerah.peringatan2 ? 'bg-red-800 border-red-500 text-white shadow-lg' : 'bg-[#0f111d] border-red-900/80 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="peringatan2" DefaultIcon={Peringatan2Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Peringatan 2 (-10)</span>
                          </button>

                          {/* Peringatan 1 */}
                          <button 
                            onClick={() => {
                              if (soundEnabled) playWarningSound();
                              const nextPen = !matchState.penaltiesMerah.peringatan1;
                              updateMatchState({
                                ...matchState,
                                penaltiesMerah: { ...matchState.penaltiesMerah, peringatan1: nextPen }
                              });
                            }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer active:scale-95 ${matchState.penaltiesMerah.peringatan1 ? 'bg-red-800 border-red-500 text-white shadow-lg' : 'bg-[#0f111d] border-red-900/80 text-slate-400 hover:bg-slate-900'}`}
                          >
                            <RenderIconOrCustom iconKey="peringatan1" DefaultIcon={Peringatan1Icon} className="w-8 h-8 mb-1" />
                            <span className="text-[11px] font-bold">Peringatan 1 (-5)</span>
                          </button>

                          {/* CEK VAR */}
                          <button 
                            onClick={() => {
                              triggerClick();
                              updateMatchState({
                                ...matchState,
                                varChecking: {
                                  status: 'CHECKING',
                                  sudut: 'MERAH',
                                  result: null
                                }
                              });
                            }}
                            className="col-span-3 py-3 w-full rounded-xl bg-red-600 hover:bg-red-550 text-white font-extrabold text-xs tracking-wider uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 border border-red-500/50 mt-1"
                          >
                            <MonitorIcon className="w-4 h-4 animate-pulse" />
                            <span>CEK VAR</span>
                          </button>
                        </div>
                      </div>

                      {/* LOG NILAI SYSTEM AT THE ABSOLUTE BOTTOM */}
                      {renderGridLogNilaiMasuk('MERAH')}
                    </div>
                  ) : (
                    <div>
                      <div className={`flex items-center justify-between border-b border-red-900/30 pb-2 mb-4`}>
                        <span className={`font-black font-mono text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.95)] transition-all duration-300 transform hover:scale-105 text-7xl lg:text-9xl`}>
                          {calculateFinalScore('MERAH', matchState)}
                        </span>
                        <span className="bg-red-650 text-white text-xs font-black px-3 py-1 rounded uppercase tracking-widest font-mono">Sudut Merah</span>
                      </div>
                      
                      <div className="mb-4">
                        <h2 className="font-bold truncate text-white uppercase text-2xl text-right">{matchState.atlitMerah.nama}</h2>
                        <p className="text-red-300/80 uppercase font-semibold text-right text-sm">{matchState.atlitMerah.kontingen}</p>
                      </div>

                      {/* Penalty indicators 2D Silhouettes buttons. Click triggers instantly */}
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {/* Jatuhan +3 */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playPointSound();
                            const vScore: ValidatedScore = {
                              id: uuid(),
                              sudut: 'MERAH',
                              points: 3,
                              jenis: 'JATUHAN',
                              babak: matchState.babakAktif,
                              timestamp: Date.now(),
                            };
                            updateMatchState({
                              ...matchState,
                              validatedScores: [...matchState.validatedScores, vScore]
                            });
                          }}
                          className="flex flex-col items-center justify-center rounded-lg bg-green-700 hover:bg-green-600 border border-green-500 text-white text-center transition-all active:scale-95 p-2.5"
                        >
                          <RenderIconOrCustom iconKey="jatuhan" DefaultIcon={JatuhanIcon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Jatuhan +3</span>
                        </button>

                        {/* Binaan 2 */}
                        <button 
                          onClick={() => {
                            triggerClick();
                            const nextPen = !matchState.penaltiesMerah.binaan2;
                            updateMatchState({
                              ...matchState,
                              penaltiesMerah: { ...matchState.penaltiesMerah, binaan2: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesMerah.binaan2 ? 'bg-yellow-500 border-yellow-300 text-black scale-105 font-bold' : 'bg-[#0f111d] border-red-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="binaan2" DefaultIcon={Binaan2Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Binaan 2</span>
                        </button>

                        {/* Binaan 1 */}
                        <button 
                          onClick={() => {
                            triggerClick();
                            const nextPen = !matchState.penaltiesMerah.binaan1;
                            updateMatchState({
                              ...matchState,
                              penaltiesMerah: { ...matchState.penaltiesMerah, binaan1: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesMerah.binaan1 ? 'bg-yellow-500 border-yellow-300 text-black scale-105 font-bold' : 'bg-[#0f111d] border-red-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="binaan1" DefaultIcon={Binaan1Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Binaan 1</span>
                        </button>

                        {/* Jatuhan Batal */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const scores = [...matchState.validatedScores];
                            let deletedIndex = -1;
                            for (let i = scores.length - 1; i >= 0; i--) {
                              if (
                                scores[i].sudut === 'MERAH' &&
                                scores[i].jenis === 'JATUHAN' &&
                                scores[i].babak === matchState.babakAktif
                              ) {
                                deletedIndex = i;
                                break;
                              }
                            }
                            if (deletedIndex !== -1) {
                              scores.splice(deletedIndex, 1);
                            }
                            updateMatchState({
                              ...matchState,
                              validatedScores: scores
                            });
                          }}
                          className="flex flex-col items-center justify-center rounded-lg bg-amber-950/80 hover:bg-amber-900/80 border border-amber-600/80 text-amber-200 text-center transition-all p-2.5 active:scale-95 cursor-pointer font-bold"
                        >
                          <RenderIconOrCustom iconKey="jatuhanBatal" DefaultIcon={RotateCcw} className="w-5 h-5 mb-1 text-white" />
                          <span className="text-[10px] font-bold">Jatuhan Batal</span>
                        </button>

                        {/* Teguran 2 */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const nextPen = !matchState.penaltiesMerah.teguran2;
                            updateMatchState({
                              ...matchState,
                              penaltiesMerah: { ...matchState.penaltiesMerah, teguran2: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesMerah.teguran2 ? 'bg-orange-500 border-orange-300 text-white scale-105 font-bold' : 'bg-[#0f111d] border-red-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="teguran2" DefaultIcon={Teguran2Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Teguran 2 (-2)</span>
                        </button>

                        {/* Teguran 1 */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const nextPen = !matchState.penaltiesMerah.teguran1;
                            updateMatchState({
                              ...matchState,
                              penaltiesMerah: { ...matchState.penaltiesMerah, teguran1: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesMerah.teguran1 ? 'bg-orange-500 border-orange-300 text-white scale-105 font-bold' : 'bg-[#0f111d] border-red-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="teguran1" DefaultIcon={Teguran1Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Teguran 1 (-1)</span>
                        </button>

                        {/* Diskualifikasi */}
                        <button 
                          onClick={() => {
                            triggerClick();
                            setDqConfirmCorner('MERAH');
                          }}
                          className="flex flex-col items-center justify-center rounded-lg bg-pink-900 border border-pink-500 text-white text-center transition-all active:scale-95 hover:bg-pink-800 p-2.5 cursor-pointer shadow-lg font-black"
                        >
                          <DisqualificationIcon className="w-5 h-5 mb-1.5 text-white animate-pulse" />
                          <span className="text-[10px] font-bold text-pink-100">Diskualifikasi</span>
                        </button>

                        {/* Peringatan 2 */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const nextPen = !matchState.penaltiesMerah.peringatan2;
                            updateMatchState({
                              ...matchState,
                              penaltiesMerah: { ...matchState.penaltiesMerah, peringatan2: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesMerah.peringatan2 ? 'bg-red-800 border-red-500 text-white scale-105' : 'bg-[#0f111d] border-red-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="peringatan2" DefaultIcon={Peringatan2Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Peringatan 2 (-10)</span>
                        </button>

                        {/* Peringatan 1 */}
                        <button 
                          onClick={() => {
                            if (soundEnabled) playWarningSound();
                            const nextPen = !matchState.penaltiesMerah.peringatan1;
                            updateMatchState({
                              ...matchState,
                              penaltiesMerah: { ...matchState.penaltiesMerah, peringatan1: nextPen }
                            });
                          }}
                          className={`flex flex-col items-center justify-center rounded-lg border text-center transition-all p-2.5 ${matchState.penaltiesMerah.peringatan1 ? 'bg-red-800 border-red-500 text-white scale-105' : 'bg-[#0f111d] border-red-950 text-slate-400 hover:bg-slate-900'}`}
                        >
                          <RenderIconOrCustom iconKey="peringatan1" DefaultIcon={Peringatan1Icon} className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">Peringatan 1 (-5)</span>
                        </button>

                        {/* CEK VAR */}
                        <button 
                          onClick={() => {
                            triggerClick();
                            updateMatchState({
                              ...matchState,
                              varChecking: {
                                status: 'CHECKING',
                                sudut: 'MERAH',
                                result: null
                              }
                            });
                          }}
                          className="col-span-3 py-2.5 w-full rounded-lg bg-red-600 hover:bg-red-500 text-white font-extrabold text-[10px] tracking-wider uppercase transition-all flex items-center justify-center gap-2 border border-red-400/50 mt-1"
                        >
                          <MonitorIcon className="w-3.5 h-3.5 animate-pulse" />
                          <span>CEK VAR</span>
                        </button>
                      </div>

                      {/* Score Log History brief of Sudut Merah */}
                      {renderGridLogNilaiMasuk('MERAH')}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* DISQUALIFICATION CONFIRMATION POPUP FOR DEWAN */}
            <AnimatePresence>
              {dqConfirmCorner !== null && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black/85 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-md w-full bg-[#130626]/95 border border-pink-500/55 p-8 rounded-2xl space-y-5 shadow-2xl"
                  >
                    <div className="w-14 h-14 bg-pink-950/45 text-pink-500 rounded-full flex items-center justify-center mx-auto border border-pink-500/30">
                      <AlertOctagon className="w-8 h-8 text-pink-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight uppercase">KONFIRMASI DISKUALIFIKASI</h3>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Apakah Anda yakin ingin mendiskualifikasi pesilat dari sudut{' '}
                        <span className={dqConfirmCorner === 'MERAH' ? 'text-red-400 font-black font-mono' : 'text-blue-400 font-black font-mono'}>
                          {dqConfirmCorner === 'MERAH' ? 'MERAH' : 'BIRU'}
                        </span>{' '}
                        (<span className="text-white font-extrabold">
                          {dqConfirmCorner === 'MERAH' ? matchState.atlitMerah.nama || 'Pesilat Merah' : matchState.atlitBiru.nama || 'Pesilat Biru'}
                        </span>)?
                      </p>
                      <p className="text-[10px] text-pink-400 font-extrabold mt-2.5 uppercase tracking-wider animate-pulse">
                        ⚠️ TINDAKAN INI AKAN LANGSUNG MENGHENTIKAN PERTANDINGAN & MEMENANGKAN LAWAN.
                      </p>
                    </div>

                    <div className="flex gap-4 justify-center pt-2">
                      <button
                        onClick={() => {
                          triggerClick();
                          setDqConfirmCorner(null);
                        }}
                        className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 border border-purple-950 hover:border-purple-900 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => {
                          if (soundEnabled) playBuzzer();
                          const disqualifiedCorner = dqConfirmCorner;
                          const winningCorner = disqualifiedCorner === 'MERAH' ? 'BIRU' : 'MERAH';
                          
                          updateMatchState({
                            ...matchState,
                            diskualifikasi: disqualifiedCorner,
                            pemenang: winningCorner,
                            showMatchEndPopUp: true,
                            timerBerjalan: false
                          });
                          setDqConfirmCorner(null);
                        }}
                        className="px-6 py-2.5 bg-gradient-to-r from-pink-700 to-red-650 hover:from-pink-600 hover:to-red-550 text-white text-xs font-black rounded-xl shadow-lg transition-all cursor-pointer active:scale-95 border border-pink-500 uppercase tracking-wider"
                      >
                        Ya, Diskualifikasi
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WINNER POPUP ANNOUNCEMENT FOR DEWAN */}
            <AnimatePresence>
              {(matchState.showMatchEndPopUp || matchState.diskualifikasi) && !dewanClosedMatchEndPopUp && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ef9] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-2xl w-full bg-[#160a2acc] border-2 border-purple-500 p-8 rounded-3xl space-y-6 shadow-2xl"
                  >
                    <Award className="w-20 h-20 text-yellow-500 mx-auto animate-bounce" />
                    <div>
                      <span className="text-[10px] text-purple-400 uppercase font-bold tracking-widest font-mono">PANEL DEWAN - KEPUTUSAN FINAL</span>
                      <h3 className="text-3xl font-black text-white tracking-tight uppercase mt-1">PERTANDINGAN TELAH SELESAI</h3>
                      {matchState.diskualifikasi && (
                        <span className="inline-block mt-2 bg-pink-950 text-pink-300 border border-pink-500/50 text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full font-mono animate-pulse">
                          Kemenangan Diskualifikasi (DQ)
                        </span>
                      )}
                    </div>

                    <div className={`p-5 rounded-2xl border transition-all duration-300 ${
                      determineWinner(matchState) === 'MERAH'
                        ? (isLightMode ? 'bg-red-50 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-red-950/80 border-red-500/50 shadow-[0_0_27px_rgba(239,68,68,0.3)]')
                        : determineWinner(matchState) === 'BIRU'
                        ? (isLightMode ? 'bg-blue-50 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-blue-950/80 border-blue-500/50 shadow-[0_0_27px_rgba(59,130,246,0.3)]')
                        : (isLightMode ? 'bg-white border-slate-200' : 'bg-[#0a0315] border-purple-950')
                    }`}>
                      {determineWinner(matchState) === 'MERAH' ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                            <span className="bg-red-600 text-white font-extrabold text-xs px-3 py-1 rounded font-mono uppercase tracking-widest shadow-sm">PEMENANG: SUDUT MERAH</span>
                            <span className={`font-bold text-xs px-3 py-1 rounded font-mono tracking-widest shadow-sm border ${isLightMode ? 'bg-red-100/85 text-red-700 border-red-200' : 'bg-red-500/20 text-red-200 border-red-500/30'}`}>
                              {getWinningReason(matchState)}
                            </span>
                          </div>
                          <h4 className={`text-4xl font-black mt-3 uppercase ${isLightMode ? 'text-red-900' : 'text-white'}`}>{matchState.atlitMerah.nama}</h4>
                          <p className={`text-sm font-bold mt-1 uppercase ${isLightMode ? 'text-red-600' : 'text-red-400'}`}>{matchState.atlitMerah.kontingen}</p>
                        </div>
                      ) : determineWinner(matchState) === 'BIRU' ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                            <span className="bg-blue-600 text-white font-extrabold text-xs px-3 py-1 rounded font-mono uppercase tracking-widest shadow-sm">PEMENANG: SUDUT BIRU</span>
                            <span className={`font-bold text-xs px-3 py-1 rounded font-mono tracking-widest shadow-sm border ${isLightMode ? 'bg-blue-100/85 text-blue-700 border-blue-200' : 'bg-blue-500/20 text-blue-200 border-blue-500/30'}`}>
                              {getWinningReason(matchState)}
                            </span>
                          </div>
                          <h4 className={`text-4xl font-black mt-3 uppercase ${isLightMode ? 'text-blue-900' : 'text-white'}`}>{matchState.atlitBiru.nama}</h4>
                          <p className={`text-sm font-bold mt-1 uppercase ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`}>{matchState.atlitBiru.kontingen}</p>
                        </div>
                      ) : (
                        <h4 className={`text-2xl font-black ${isLightMode ? 'text-slate-800' : 'text-white'}`}>DRAW / SERI (POIN AKHIR SAMA)</h4>
                      )}
                    </div>

                    <div className="space-y-4 pt-2">
                      <button
                        onClick={() => {
                          triggerClick();
                          setDewanClosedMatchEndPopUp(true);
                        }}
                        className="w-full py-4 bg-gradient-to-r from-purple-700 via-pink-700 to-amber-600 hover:from-purple-600 hover:to-amber-500 text-white font-extrabold rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer border border-purple-500/50"
                      >
                        Tutup
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CEK VAR POPUP DECISION MODAL FOR DEWAN */}
            <AnimatePresence>
              {matchState.varChecking && matchState.varChecking.status === 'CHECKING' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ed2] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-md w-full bg-[#110524] border border-purple-500/50 p-8 rounded-2xl space-y-6 shadow-2xl"
                  >
                    <div className="w-16 h-16 bg-purple-950/60 text-purple-400 rounded-full flex items-center justify-center mx-auto border border-purple-500/20 shadow-lg animate-bounce">
                      <MonitorIcon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight">VERIFIKASI VAR AKTIF</h3>
                      <p className={`text-sm font-extrabold uppercase mt-1 font-mono ${matchState.varChecking.sudut === 'BIRU' ? 'text-blue-400' : 'text-red-400'}`}>
                        SUDUT {matchState.varChecking.sudut}
                      </p>
                      <p className="text-slate-300 text-xs mt-3">Silakan tinjau rekaman video (VAR). Tentukan keputusan keabsahan hasil VAR dari sudut ini:</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        onClick={() => {
                          triggerClick();
                          updateMatchState({
                            ...matchState,
                            varChecking: {
                              ...matchState.varChecking!,
                              status: 'RESULT',
                              result: 'SAH'
                            }
                          });
                        }}
                        className="py-3 px-4 bg-green-700 hover:bg-green-600 active:bg-green-750 text-white font-extrabold rounded-xl text-sm uppercase shadow-md transition-all active:scale-95 cursor-pointer border border-green-500/40"
                      >
                        SAH
                      </button>
                      <button
                        onClick={() => {
                          triggerClick();
                          updateMatchState({
                            ...matchState,
                            varChecking: {
                              ...matchState.varChecking!,
                              status: 'RESULT',
                              result: 'TIDAK_SAH'
                            }
                          });
                        }}
                        className="py-3 px-4 bg-red-650 hover:bg-red-550 active:bg-red-700 text-white font-extrabold rounded-xl text-sm uppercase shadow-md transition-all active:scale-95 cursor-pointer border border-red-500/40"
                      >
                        TIDAK SAH
                      </button>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          triggerClick();
                          updateMatchState({
                            ...matchState,
                            varChecking: {
                              status: 'IDLE',
                              sudut: null,
                              result: null
                            }
                          });
                        }}
                        className="text-xs text-slate-400 hover:text-white transition-colors uppercase font-semibold cursor-pointer underline"
                      >
                        Batal / Tutup
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* POPUP DEWAN STOP MATCH FOR TEKNIK-MUTLAK-WMP-UD */}
            <AnimatePresence>
              {showDewanStopMatchModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-lg w-full bg-[#140827]/95 border-2 border-amber-500/60 p-8 rounded-3xl space-y-6 shadow-[0_0_40px_rgba(245,158,11,0.25)]"
                  >
                    <div className="w-14 h-14 bg-amber-950/45 text-amber-500 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
                      <AlertOctagon className="w-8 h-8 text-amber-500 animate-pulse" />
                    </div>
                    
                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight uppercase">PENGHENTIAN PERTANDINGAN DEWAN</h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Pilih Sudut Pemenang dan Kategori Kemenangan di bawah ini untuk menghentikan pertandingan saat ini.
                      </p>
                    </div>

                    {/* Step 1: Select Corner */}
                    <div className="space-y-2">
                      <span className="block text-[10px] uppercase font-bold text-purple-400 tracking-wider font-mono">1. Pilih Sudut Pemenang</span>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Sudut Biru */}
                        <button
                          onClick={() => {
                            triggerClick();
                            setSelectedWinnerCorner('BIRU');
                          }}
                          className={`py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs border transition-all duration-200 cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-1 ${
                            selectedWinnerCorner === 'BIRU'
                              ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-102 font-black'
                              : 'bg-blue-950/20 border-blue-950/50 text-blue-400 hover:bg-blue-950/40'
                          }`}
                        >
                          <span className="text-[10px]">SUDUT</span>
                          <span className="text-sm font-black">BIRU</span>
                          <span className="text-[9px] font-normal italic opacity-85">({toTitleCase(matchState.atlitBiru.nama)})</span>
                        </button>

                        {/* Sudut Merah */}
                        <button
                          onClick={() => {
                            triggerClick();
                            setSelectedWinnerCorner('MERAH');
                          }}
                          className={`py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs border transition-all duration-200 cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-1 ${
                            selectedWinnerCorner === 'MERAH'
                              ? 'bg-red-650 border-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] scale-102 font-black'
                              : 'bg-red-950/20 border-red-950/50 text-red-400 hover:bg-red-950/40'
                          }`}
                        >
                          <span className="text-[10px]">SUDUT</span>
                          <span className="text-sm font-black">MERAH</span>
                          <span className="text-[9px] font-normal italic opacity-85">({toTitleCase(matchState.atlitMerah.nama)})</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 2: Select Victory Method */}
                    <div className="space-y-2">
                      <span className="block text-[10px] uppercase font-bold text-purple-400 tracking-wider font-mono">2. Pilih Kategori Kemenangan</span>
                      <div className="grid grid-cols-2 gap-3.5">
                        {/* (a) TEKNIK */}
                        <button
                          onClick={() => {
                            triggerClick();
                            if (!selectedWinnerCorner) {
                              showToast("Silakan pilih sudut pemenang terlebih dahulu!", "warning");
                              return;
                            }
                            if (soundEnabled) playBuzzer();
                            updateMatchState({
                              ...matchState,
                              pemenang: selectedWinnerCorner,
                              victoryType: 'TEKNIK',
                              showMatchEndPopUp: true,
                              statusPertandingan: 'SELESAI',
                              timerBerjalan: false,
                              umumkanPemenang: true,
                            });
                            setShowDewanStopMatchModal(false);
                            setSelectedWinnerCorner(null);
                            showToast(`Pertandingan Selesai: Kemenangan TEKNIK untuk Sudut ${selectedWinnerCorner}`, "success");
                          }}
                          className="py-3 px-4 rounded-xl border border-purple-500/20 hover:border-purple-500/50 bg-[#1f1035] text-white hover:bg-[#281544] transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-0.5 group"
                        >
                          <span className="font-black text-sm text-yellow-400 group-hover:scale-105 transition-transform">TEKNIK</span>
                          <span className="text-[8px] text-purple-300">Kemenangan Teknik</span>
                        </button>

                        {/* (b) MUTLAK */}
                        <button
                          onClick={() => {
                            triggerClick();
                            if (!selectedWinnerCorner) {
                              showToast("Silakan pilih sudut pemenang terlebih dahulu!", "warning");
                              return;
                            }
                            if (soundEnabled) playBuzzer();
                            updateMatchState({
                              ...matchState,
                              pemenang: selectedWinnerCorner,
                              victoryType: 'MUTLAK',
                              showMatchEndPopUp: true,
                              statusPertandingan: 'SELESAI',
                              timerBerjalan: false,
                              umumkanPemenang: true,
                            });
                            setShowDewanStopMatchModal(false);
                            setSelectedWinnerCorner(null);
                            showToast(`Pertandingan Selesai: Kemenangan MUTLAK untuk Sudut ${selectedWinnerCorner}`, "success");
                          }}
                          className="py-3 px-4 rounded-xl border border-purple-500/20 hover:border-purple-500/50 bg-[#1f1035] text-white hover:bg-[#281544] transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-0.5 group"
                        >
                          <span className="font-black text-sm text-yellow-400 group-hover:scale-105 transition-transform">MUTLAK</span>
                          <span className="text-[8px] text-purple-300">Kemenangan Mutlak</span>
                        </button>

                        {/* (c) WMP */}
                        <button
                          onClick={() => {
                            triggerClick();
                            if (!selectedWinnerCorner) {
                              showToast("Silakan pilih sudut pemenang terlebih dahulu!", "warning");
                              return;
                            }
                            if (soundEnabled) playBuzzer();
                            updateMatchState({
                              ...matchState,
                              pemenang: selectedWinnerCorner,
                              victoryType: 'WMP',
                              showMatchEndPopUp: true,
                              statusPertandingan: 'SELESAI',
                              timerBerjalan: false,
                              umumkanPemenang: true,
                            });
                            setShowDewanStopMatchModal(false);
                            setSelectedWinnerCorner(null);
                            showToast(`Pertandingan Selesai: Kemenangan TEKNIK (WMP) untuk Sudut ${selectedWinnerCorner}`, "success");
                          }}
                          className="py-3 px-4 rounded-xl border border-purple-500/20 hover:border-purple-500/50 bg-[#1f1035] text-white hover:bg-[#281544] transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-0.5 group"
                        >
                          <span className="font-black text-sm text-yellow-400 group-hover:scale-105 transition-transform">WMP</span>
                          <span className="text-[8px] text-purple-300">Kemenangan WMP</span>
                        </button>

                        {/* (d) UD */}
                        <button
                          onClick={() => {
                            triggerClick();
                            if (!selectedWinnerCorner) {
                              showToast("Silakan pilih sudut pemenang terlebih dahulu!", "warning");
                              return;
                            }
                            if (soundEnabled) playBuzzer();
                            updateMatchState({
                              ...matchState,
                              pemenang: selectedWinnerCorner,
                              victoryType: 'UNDUR_DIRI',
                              showMatchEndPopUp: true,
                              statusPertandingan: 'SELESAI',
                              timerBerjalan: false,
                              umumkanPemenang: true,
                            });
                            setShowDewanStopMatchModal(false);
                            setSelectedWinnerCorner(null);
                            showToast(`Pertandingan Selesai: Kemenangan UNDUR DIRI untuk Sudut ${selectedWinnerCorner}`, "success");
                          }}
                          className="py-3 px-4 rounded-xl border border-purple-500/20 hover:border-purple-500/50 bg-[#1f1035] text-white hover:bg-[#281544] transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-0.5 group"
                        >
                          <span className="font-black text-sm text-yellow-400 group-hover:scale-105 transition-transform">UD</span>
                          <span className="text-[8px] text-purple-300">Kemenangan Undur Diri</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-center border-t border-purple-900/40">
                      <button
                        onClick={() => {
                          triggerClick();
                          setShowDewanStopMatchModal(false);
                          setSelectedWinnerCorner(null);
                        }}
                        className="px-6 py-2 bg-slate-900 hover:bg-slate-850 border border-purple-950 hover:border-purple-900 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 uppercase tracking-wider"
                      >
                        Batal / Tutup
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ROUND END NOTIFICATION POPUP FOR DEWAN */}
            <AnimatePresence>
              {matchState.showRoundEndPopUp && (
                peekRoundEnd ? (
                  <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="absolute bottom-4 left-4 right-4 bg-gradient-to-r from-red-950/95 to-purple-950/95 border-2 border-red-500/60 p-4 rounded-xl flex items-center justify-between text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] z-50 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-red-650/30 text-red-500 flex items-center justify-center animate-pulse">
                        <AlertOctagon className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black tracking-wider uppercase font-mono">BABAK {matchState.babakAktif} SELESAI</p>
                        <p className="text-[10px] text-gray-300">Skor Sementara: <span className="font-bold text-red-500">M {calculateFinalScore('MERAH', matchState)}</span> - <span className="font-bold text-blue-500">B {calculateFinalScore('BIRU', matchState)}</span> | Klik tombol kanan untuk membuka lembar ringkasan</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setPeekRoundEnd(false)}
                      className="px-3 py-1.5 bg-red-650 hover:bg-red-550 active:scale-95 text-[10px] font-extrabold uppercase tracking-widest rounded-lg cursor-pointer transition-all border border-red-400"
                    >
                      Buka Ringkasan
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 15 }}
                      transition={{ type: "spring", damping: 25, stiffness: 180 }}
                      className="max-w-4xl w-full bg-gradient-to-b from-[#1c0835] via-[#0f0322] to-[#04010a] border border-red-500/40 p-8 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.4)] relative overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 text-left items-stretch"
                    >
                      {/* Decorative elements */}
                      <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse"></div>
                      
                      {/* Left Column: Round Status & Instructions */}
                      <div className="flex flex-col justify-between space-y-6 h-full text-center md:text-left">
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-red-950/80 text-red-500 border border-red-500/50 rounded-full flex items-center justify-center mx-auto md:mx-0 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-pulse">
                            <AlertOctagon className="w-8 h-8 animate-bounce" />
                          </div>
                          <div>
                            <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-tight font-sans">
                              BABAK {matchState.babakAktif} SELESAI
                            </h3>
                            <p className="text-amber-400 text-xs tracking-wider uppercase font-mono font-bold animate-pulse mt-1">
                              WAKTU MATCH TELAH HABIS
                            </p>
                          </div>
                          <p className="text-slate-300 text-xs leading-relaxed">
                            Silakan tunggu Sekretaris untuk mereset waktu tanding dan melanjutkan ke babak selanjutnya agar dewan juri dipersiapkan kembali.
                          </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            onClick={() => setPeekRoundEnd(true)}
                            className="px-6 py-2.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer w-full text-center"
                          >
                            Intip Nilai
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Comparative Stats Grid */}
                      <div className="flex flex-col justify-center space-y-4 h-full border-t md:border-t-0 md:border-l border-red-500/15 pt-6 md:pt-0 md:pl-8">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest block font-mono text-center md:text-left">Perbandingan Nilai Atlit</span>
                        
                        <div className="grid grid-cols-2 gap-4 py-2 flex-grow">
                          {/* Red Team */}
                          <div className="bg-red-950/20 border border-red-900/45 p-4 rounded-2xl text-left relative overflow-hidden flex flex-col justify-between shadow-inner">
                            <div className="absolute right-[-10px] bottom-[-10px] font-black text-6xl text-red-950/10 select-none">M</div>
                            <div className="z-10">
                              <span className="text-[10px] font-extrabold tracking-widest text-red-400 uppercase block mb-1">SUDUT MERAH</span>
                              <span className="text-base font-black text-white truncate block">{matchState.atlitMerah.nama || 'Pesilat Merah'}</span>
                              <span className="text-[10px] text-zinc-400 block truncate">{matchState.atlitMerah.kontingen || 'KONTINGEN'}</span>
                            </div>
                            <div className="mt-4 flex items-baseline justify-between z-10">
                              <span className="text-xs text-zinc-400 col-span-1">Skor Total</span>
                              <span className="text-3xl font-black text-red-500 col-span-1">{calculateFinalScore('MERAH', matchState)}</span>
                            </div>
                          </div>

                          {/* Blue Team */}
                          <div className="bg-blue-950/20 border border-blue-900/45 p-4 rounded-2xl text-left relative overflow-hidden flex flex-col justify-between shadow-inner">
                            <div className="absolute right-[-10px] bottom-[-10px] font-black text-6xl text-blue-950/10 select-none">B</div>
                            <div className="z-10">
                              <span className="text-[10px] font-extrabold tracking-widest text-blue-400 uppercase block mb-1">SUDUT BIRU</span>
                              <span className="text-base font-black text-white truncate block">{matchState.atlitBiru.nama || 'Pesilat Biru'}</span>
                              <span className="text-[10px] text-zinc-400 block truncate">{matchState.atlitBiru.kontingen || 'KONTINGEN'}</span>
                            </div>
                            <div className="mt-4 flex items-baseline justify-between z-10">
                              <span className="text-xs text-zinc-400 col-span-1">Skor Total</span>
                              <span className="text-3xl font-black text-blue-500 col-span-1">{calculateFinalScore('BIRU', matchState)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )
              )}
            </AnimatePresence>

          </motion.div>
        )}

        {/* JURI SELECTING SCREEN VIEW */}
        {role === 'JURI_SELECT' && (
          <motion.div
            key="juri_select"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col justify-center items-center px-4 py-8 max-w-lg mx-auto w-full text-center"
          >
            <h2 className="text-3xl font-black mb-1.5 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300">PILIH IDENTITAS JURI</h2>
            <p className="text-gray-400 text-xs mb-8">Pilih salah satu nomor Juri untuk bertugas memasukkan nilai pukulan dan tendangan tanding.</p>
            
            <div className="grid grid-cols-1 gap-4 w-full">
              {[1, 2, 3].map((num) => {
                const isActive = matchState.activeJuriIds?.includes(num);
                return (
                  <button
                    key={num}
                    disabled={isActive}
                    onClick={() => {
                      setSelectedJuriId(num as 1 | 2 | 3);
                      selectRoleAndTriggerAudio('JURI_PANEL');
                    }}
                    className={`group relative flex items-center justify-between p-5 rounded-xl font-bold transition-all shadow-lg select-none ${
                      isActive 
                        ? 'bg-slate-950/40 border-slate-900 text-slate-500 cursor-not-allowed opacity-55' 
                        : 'bg-[#140a24]/90 hover:bg-[#1d0d35]/95 border-purple-900/40 hover:border-purple-500/80 text-white active:scale-95 cursor-pointer'
                    } border`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${isActive ? 'bg-slate-900 text-slate-600' : 'bg-purple-950 text-purple-400'}`}>
                        <User className="w-5 h-5" />
                      </div>
                      <div className="text-left flex flex-col justify-center">
                        <span className={`text-lg leading-tight uppercase ${isActive ? 'text-slate-500 line-through font-medium' : 'text-white'}`}>
                          PETUGAS JURI {num}
                        </span>
                        {isActive && (
                          <span className="text-[9px] text-red-500 font-mono font-bold uppercase tracking-wider animate-pulse pt-0.5">
                            🔴 SEDANG BERTUGAS / TERKUNCI
                          </span>
                        )}
                      </div>
                    </div>
                    {!isActive && (
                      <span className="text-xs text-purple-400 font-mono group-hover:translate-x-1 transition-transform">Masuk Panel &rarr;</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* JURI SCORING PANEL SCREEN VIEW */}
        {role === 'JURI_PANEL' && (
          <motion.div
            key="juri_panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`flex flex-col max-w-7xl mx-auto w-full justify-between relative landscape:overflow-hidden ${
              isFullscreen 
                ? 'h-screen max-h-screen p-1.5 sm:p-2 md:p-4 overflow-hidden' 
                : 'flex-1 p-4 landscape:p-2 landscape:h-[calc(100vh-48px)] landscape:max-h-[calc(100vh-48px)]'
            }`}
          >
            {/* LOCK COVER SCREEN */}
            {matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI' && (
              <div className="absolute inset-0 bg-[#05000a]/92 backdrop-blur-md z-45 flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-purple-500/10">
                <div className="w-16 h-16 bg-purple-950/40 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20 shadow-lg">
                  <Lock className="w-8 h-8 animate-bounce" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight uppercase font-display">PANEL JURI TERKUNCI</h3>
                <p className="text-sm text-slate-300 mt-2 max-w-md font-sans">
                  Pertandingan belum dimulai atau telah dibatalkan. Silakan minta <strong className="text-purple-400">Sekretaris</strong> untuk mengaktifkan status <strong className="text-amber-400">"Mulai Pertandingan"</strong> agar juri dapat memberikan penilaian.
                </p>
              </div>
            )}

            
            {/* Header / Athlete Details Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 landscape:grid-cols-5 gap-2 md:gap-3 bg-[#110524] p-2 md:p-3 rounded-xl border border-purple-900/30 landscape:py-1 items-center">
              <div className="flex flex-col justify-center col-span-2">
                <span className="text-[10px] text-purple-400 font-semibold tracking-wider font-mono">PANEL PENILAIAN AKTIF: JURI {selectedJuriId}</span>
                <span className="text-sm font-bold text-white uppercase landscape:hidden md:landscape:block leading-tight">{matchState.eventName}</span>
              </div>
              
              <div className="flex flex-col justify-center items-center py-1 bg-purple-950/40 rounded-lg border border-purple-900/20 landscape:py-0">
                <span className="text-[10px] text-purple-400 font-mono font-semibold landscape:text-[8px]">ROUND</span>
                <span className="text-lg font-black text-white landscape:text-sm">BABAK {matchState.babakAktif}</span>
              </div>

              <div className="flex flex-col justify-center items-end landscape:items-center">
                <span className="text-[10px] text-purple-400 font-mono font-semibold landscape:hidden md:landscape:block">SISA WAKTU</span>
                <span className="text-lg font-bold font-mono text-amber-400 landscape:text-sm">{Math.floor(matchState.sisaWaktu / 60).toString().padStart(2, '0')}:{(matchState.sisaWaktu % 60).toString().padStart(2, '0')}</span>
              </div>

              <button 
                onClick={toggleFullscreen}
                className="col-span-2 md:col-span-1 landscape:col-span-1 py-1.5 md:py-2 px-3 rounded-lg border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 font-mono uppercase text-[9px] font-extrabold tracking-widest text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'LAYAR BIASA' : 'LAYAR PENUH'}</span>
              </button>
            </div>

            {/* Athlete Data Bar / Detail Informasi Pertandingan */}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 justify-center items-center py-1.5 px-3 bg-[#0d041c]/60 rounded-lg border border-purple-900/20 text-[10px] font-mono text-purple-300">
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Partai:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.partai || '-'}</span>
              </div>
              <span className="text-purple-950">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Tahapan:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.tahapPertandingan || '-'}</span>
              </div>
              <span className="text-purple-950">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Kelas:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.kelas || '-'}</span>
              </div>
              <span className="text-purple-950">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Putra/Putri:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.gender || '-'}</span>
              </div>
              <span className="text-purple-950">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-purple-400 font-bold uppercase">Usia:</span>
                <span className="text-[#fce3ff] font-extrabold">{matchState.kategoriUsia || '-'}</span>
              </div>
            </div>

            {/* Main Interactive Scoring Arena: Big Blue vs. Big Red Buttons */}
            <div className="flex-1 grid grid-cols-1 landscape:grid-cols-2 md:grid-cols-2 gap-3 md:gap-8 my-2 md:my-4 relative min-h-0">
              
              {/* Blue Angle (Left) */}
              <div className="flex flex-col justify-between p-3 md:p-6 bg-gradient-to-b from-blue-950/40 to-blue-900/10 rounded-2xl border border-blue-900/30 landscape:p-2 min-h-0">
                <div className="flex justify-between items-center border-b border-blue-900/20 pb-2 mb-2 landscape:pb-0.5 landscape:mb-1">
                  <div>
                    <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded mr-2 font-mono">BIRU</span>
                    <span className="text-sm font-bold text-white landscape:text-xs leading-tight">{matchState.atlitBiru.nama}</span>
                  </div>
                  <span className="text-xs text-slate-400 landscape:hidden sm:landscape:inline">{matchState.atlitBiru.kontingen}</span>
                </div>

                {/* Big Giant Touch/Click Targets for Punch and Kick */}
                <div className="flex flex-col gap-2 md:gap-4 flex-1 justify-center my-1 md:my-2 w-full min-h-0">
                  <button
                    disabled={(matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING'}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if ((matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING') return;
                      registerJuriClick('BIRU', 'PUNCH');
                    }}
                    className={`w-full flex-1 min-h-0 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex flex-col justify-center items-center py-1 md:py-4 select-none touch-none text-white landscape:py-0 transition-all duration-100 cursor-pointer ${
                      activeBluePunch
                        ? 'bg-blue-600 border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6),inset_0_0_8px_rgba(255,255,255,0.3)] scale-[0.98]'
                        : 'bg-blue-900 border border-blue-500/50 hover:bg-blue-800 active:bg-blue-750 shadow-lg'
                    }`}
                  >
                    <span className="text-xl md:text-3xl font-black tracking-wider landscape:text-lg">PUNCH</span>
                    <span className="text-xs font-mono text-blue-300 landscape:hidden md:landscape:block">(PUKULAN)</span>
                  </button>

                  <button
                    disabled={(matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING'}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if ((matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING') return;
                      registerJuriClick('BIRU', 'KICK');
                    }}
                    className={`w-full flex-1 min-h-0 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex flex-col justify-center items-center py-1 md:py-4 select-none touch-none text-white landscape:py-0 transition-all duration-100 cursor-pointer ${
                      activeBlueKick
                        ? 'bg-blue-600 border-2 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6),inset_0_0_8px_rgba(255,255,255,0.3)] scale-[0.98]'
                        : 'bg-blue-900 border border-blue-500/50 hover:bg-blue-800 active:bg-blue-750 shadow-lg'
                    }`}
                  >
                    <span className="text-xl md:text-3xl font-black tracking-wider landscape:text-lg">KICK</span>
                    <span className="text-xs font-mono text-blue-200 landscape:hidden md:landscape:block">(TENDANGAN)</span>
                  </button>
                </div>

                {/* Score Log Entered by THIS Juri */}
                <div className="mt-2 md:mt-4 p-1.5 md:p-3 bg-slate-950/50 rounded-lg flex justify-end items-center landscape:mt-0.5 landscape:py-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        triggerClick();
                        setDeleteConfirmSudut('BIRU');
                      }}
                      disabled={(matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING'}
                      className="px-2 py-1 bg-red-650 hover:bg-red-700 active:bg-red-800 disabled:opacity-45 disabled:cursor-not-allowed text-white font-mono font-bold text-[9px] rounded uppercase transition-all cursor-pointer"
                      title="Backspace / Hapus Nilai Biru"
                    >
                      HAPUS (BACKSPACE)
                    </button>
                    <span className="text-[11px] md:text-sm font-bold font-mono text-blue-300">
                      P: {matchState.rawScores.filter(r => r.juriId === selectedJuriId && r.sudut === 'BIRU' && r.jenis === 'PUNCH' && r.babak === matchState.babakAktif).length} | 
                      K: {matchState.rawScores.filter(r => r.juriId === selectedJuriId && r.sudut === 'BIRU' && r.jenis === 'KICK' && r.babak === matchState.babakAktif).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Red Angle (Right) */}
              <div className="flex flex-col justify-between p-3 md:p-6 bg-gradient-to-b from-red-950/40 to-red-900/10 rounded-2xl border border-red-900/30 landscape:p-2 min-h-0">
                <div className="flex justify-between items-center border-b border-red-900/20 pb-2 mb-2 landscape:pb-0.5 landscape:mb-1">
                  <div>
                    <span className="text-[10px] bg-red-650 text-white font-bold px-1.5 py-0.5 rounded mr-2 font-mono">MERAH</span>
                    <span className="text-sm font-bold text-white landscape:text-xs leading-tight">{matchState.atlitMerah.nama}</span>
                  </div>
                  <span className="text-xs text-slate-400 landscape:hidden sm:landscape:inline">{matchState.atlitMerah.kontingen}</span>
                </div>

                {/* Big Giant Touch/Click Targets for Punch and Kick */}
                <div className="flex flex-col gap-2 md:gap-4 flex-1 justify-center my-1 md:my-2 w-full min-h-0">
                  <button
                    disabled={(matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING'}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if ((matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING') return;
                      registerJuriClick('MERAH', 'PUNCH');
                    }}
                    className={`w-full flex-1 min-h-0 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex flex-col justify-center items-center py-1 md:py-4 select-none touch-none text-white landscape:py-0 transition-all duration-100 cursor-pointer ${
                      activeRedPunch
                        ? 'bg-red-600 border-2 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6),inset_0_0_8px_rgba(255,255,255,0.3)] scale-[0.98]'
                        : 'bg-red-900 border border-red-500/50 hover:bg-red-800 active:bg-red-750 shadow-lg'
                    }`}
                  >
                    <span className="text-xl md:text-3xl font-black tracking-wider landscape:text-lg">PUNCH</span>
                    <span className="text-xs font-mono text-red-300 landscape:hidden md:landscape:block">(PUKULAN)</span>
                  </button>

                  <button
                    disabled={(matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING'}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if ((matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING') return;
                      registerJuriClick('MERAH', 'KICK');
                    }}
                    className={`w-full flex-1 min-h-0 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex flex-col justify-center items-center py-1 md:py-4 select-none touch-none text-white landscape:py-0 transition-all duration-100 cursor-pointer ${
                      activeRedKick
                        ? 'bg-red-600 border-2 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.6),inset_0_0_8px_rgba(255,255,255,0.3)] scale-[0.98]'
                        : 'bg-red-900 border border-red-500/50 hover:bg-red-800 active:bg-red-750 shadow-lg'
                    }`}
                  >
                    <span className="text-xl md:text-3xl font-black tracking-wider landscape:text-lg">KICK</span>
                    <span className="text-xs font-mono text-red-200 landscape:hidden md:landscape:block">(TENDANGAN)</span>
                  </button>
                </div>

                {/* Score Log Entered by THIS Juri */}
                <div className="mt-2 md:mt-4 p-1.5 md:p-3 bg-slate-950/50 rounded-lg flex justify-between items-center landscape:mt-0.5 landscape:py-1">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] md:text-sm font-bold font-mono text-red-300">
                      P: {matchState.rawScores.filter(r => r.juriId === selectedJuriId && r.sudut === 'MERAH' && r.jenis === 'PUNCH' && r.babak === matchState.babakAktif).length} | 
                      K: {matchState.rawScores.filter(r => r.juriId === selectedJuriId && r.sudut === 'MERAH' && r.jenis === 'KICK' && r.babak === matchState.babakAktif).length}
                    </span>
                    <button
                      onClick={() => {
                        triggerClick();
                        setDeleteConfirmSudut('MERAH');
                      }}
                      disabled={(matchState.statusPertandingan !== 'BERJALAN' && matchState.statusPertandingan !== 'SELESAI') || matchState.verifikasi.status === 'PENDING'}
                      className="px-2 py-1 bg-red-650 hover:bg-red-700 active:bg-red-800 disabled:opacity-45 disabled:cursor-not-allowed text-white font-mono font-bold text-[9px] rounded uppercase transition-all cursor-pointer"
                      title="Backspace / Hapus Nilai Merah"
                    >
                      HAPUS (BACKSPACE)
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* VERIFIKASI POP UP FOR JURIES */}
            {matchState.verifikasi.status === 'PENDING' && !matchState.verifikasi.juriVotes[selectedJuriId] && (
              <div className="absolute inset-0 bg-[#06010fa5] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50">
                <div className="max-w-md w-full bg-[#150a26] border border-purple-500 p-8 rounded-2xl space-y-6 text-center shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200">
                  <div className="w-16 h-16 bg-purple-900/40 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-purple-500/30">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">VERIFIKASI DEWAN</h3>
                    <p className="text-xs text-purple-300 mt-1 uppercase font-semibold font-mono">TIPE: {matchState.verifikasi.jenis}</p>
                    <p className="text-xs text-slate-400 mt-2">Dewan Penilai meminta keputusan juri terkait keabsahan aksi baru-baru ini. Berikan keputusan Anda:</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                    <button
                      onClick={() => {
                        triggerClick();
                        const nextVotes = { ...matchState.verifikasi.juriVotes, [selectedJuriId]: 'BIRU' };
                        updateMatchState({
                          ...matchState,
                          verifikasi: { ...matchState.verifikasi, juriVotes: nextVotes }
                        });
                      }}
                      className="px-4 py-3 bg-blue-700 hover:bg-blue-600 rounded-xl font-bold text-white text-sm tracking-wide transition-all shadow-md active:scale-95"
                    >
                      BIRU
                    </button>
                    <button
                      onClick={() => {
                        triggerClick();
                        const nextVotes = { ...matchState.verifikasi.juriVotes, [selectedJuriId]: 'TIDAK_SAH' };
                        updateMatchState({
                          ...matchState,
                          verifikasi: { ...matchState.verifikasi, juriVotes: nextVotes }
                        });
                      }}
                      className="px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-white text-sm tracking-wide transition-all shadow-md active:scale-95"
                    >
                      TIDAK SAH
                    </button>
                    <button
                      onClick={() => {
                        triggerClick();
                        const nextVotes = { ...matchState.verifikasi.juriVotes, [selectedJuriId]: 'MERAH' };
                        updateMatchState({
                          ...matchState,
                          verifikasi: { ...matchState.verifikasi, juriVotes: nextVotes }
                        });
                      }}
                      className="px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white text-sm tracking-wide transition-all shadow-md active:scale-95"
                    >
                      MERAH
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Waiting for other juries to reply screen overlay */}
            {matchState.verifikasi.status === 'PENDING' && matchState.verifikasi.juriVotes[selectedJuriId] && (
              <div className="absolute inset-0 bg-[#07010e95] backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 z-40">
                <div className="bg-[#120722] border border-purple-950 p-6 rounded-xl text-center max-w-sm space-y-2">
                  <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
                  <h4 className="text-base font-bold text-white">Jawaban Juri {selectedJuriId} Terkirim!</h4>
                  <p className="text-xs text-slate-400">Menunggu Dewan memproses keputusan akhir consensus dari juri-juri lainnya.</p>
                </div>
              </div>
            )}

            {/* ROUND END NOTIFICATION POPUP */}
            <AnimatePresence>
              {matchState.showRoundEndPopUp && matchState.juriTerkunci && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#00000ed2] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 15 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 15 }}
                    transition={{ type: "spring", damping: 25, stiffness: 180 }}
                    className="max-w-md w-full bg-[#110524] border border-red-500/40 p-8 rounded-2xl space-y-4"
                  >
                    <div className="w-16 h-16 bg-red-950 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2 select-none">
                      <AlertOctagon className="w-8 h-8 font-extrabold animate-bounce" />
                    </div>
                    <h3 className="text-3xl font-black text-white tracking-tight">ROUND {matchState.babakAktif} SELESAI</h3>
                    <p className="text-slate-300 text-xs leading-relaxed">Waktu babak telah habis. Silakan tunggu sekretaris melanjutkan ke babak selanjutnya agar panel nilai dapat dibuka kembali.</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* MATCH END NOTIFICATION POPUP */}
            <AnimatePresence>
              {matchState.showMatchEndPopUp && matchState.umumkanPemenang && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ef6] backdrop-blur-lg rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-md w-full bg-[#130626]/90 border border-purple-500 p-8 rounded-2xl space-y-4"
                  >
                    <Award className="w-16 h-16 text-yellow-500 mx-auto animate-bounce" />
                    <h3 className="text-3xl font-black text-white tracking-tight">PERTANDINGAN SELESAI</h3>
                    <div className="p-3 bg-purple-950/40 rounded-lg text-sm border border-purple-900/20 text-purple-300 font-bold uppercase">
                      PEMENANG: SUDUT {determineWinner(matchState) || 'SAMA SKOR/DRAW'}
                    </div>
                    <p className="text-slate-400 text-xs text-center">Seluruh babak dan partai tanding ini telah diselesaikan. Panel dinonaktifkan menunggu reset/pertandingan baru dari Sekretaris.</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* VAR CHECKING POPUP FOR JURI (MIRRORED FROM MONITOR) */}
            <AnimatePresence>
              {matchState.varChecking && (matchState.varChecking.status === 'CHECKING' || matchState.varChecking.status === 'RESULT') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ed2] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className={`max-w-xl w-full bg-[#0a0315] border-2 rounded-3xl p-10 space-y-6 shadow-2xl transition-all duration-300 ${
                      matchState.varChecking.sudut === 'BIRU' 
                        ? 'shadow-[0_0_80px_rgba(59,130,246,0.9)] border-blue-500/80 bg-gradient-to-b from-blue-950/20 to-[#0c122c]/50' 
                        : 'shadow-[0_0_80px_rgba(239,68,68,0.9)] border-red-500/80 bg-gradient-to-b from-red-950/20 to-[#2a0d0d]/50'
                    }`}
                  >
                    {/* Blinking icon during checking */}
                    <div className="flex justify-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-lg ${
                        matchState.varChecking.status === 'CHECKING' ? 'animate-pulse' : ''
                      } ${
                        matchState.varChecking.sudut === 'BIRU'
                          ? 'bg-blue-950/80 border-blue-500 text-blue-400'
                          : 'bg-red-950/80 border-red-500 text-red-400'
                      }`}>
                        <MonitorIcon className="w-10 h-10" />
                      </div>
                    </div>

                    <div>
                      {matchState.varChecking.status === 'CHECKING' ? (
                        <>
                          <h2 className="text-4xl font-black text-white tracking-widest uppercase animate-pulse">
                            VAR CHECKING...
                          </h2>
                          <span className={`text-sm tracking-widest font-mono font-extrabold block mt-2 uppercase ${
                            matchState.varChecking.sudut === 'BIRU' ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            SUDUT {matchState.varChecking.sudut}
                          </span>
                          <p className="text-slate-400 text-xs mt-4 uppercase tracking-wider font-mono">
                            Dewan Sedang Meninjau VAR
                          </p>
                        </>
                      ) : (
                        <>
                          <h2 className={`text-5xl font-black tracking-widest uppercase ${
                            matchState.varChecking.result === 'SAH' ? 'text-green-500 animate-bounce' : 'text-red-500'
                          }`}>
                            RESULT : {matchState.varChecking.result === 'SAH' ? 'SAH' : 'TIDAK SAH'}
                          </h2>
                          <span className={`text-sm tracking-widest font-mono font-extrabold block mt-2 uppercase ${
                            matchState.varChecking.sudut === 'BIRU' ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            SUDUT {matchState.varChecking.sudut}
                          </span>
                          <p className="text-slate-400 text-xs mt-4 uppercase tracking-wider font-mono">
                            Keputusan VAR Telah Ditetapkan
                          </p>
                        </>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HAPUS NILAI CONFIRMATION POPUP FOR JURIES */}
            <AnimatePresence>
              {deleteConfirmSudut && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 bg-[#00000ed2] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-55 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-md w-full bg-[#130626] border-2 border-red-500/50 p-6 md:p-8 rounded-2xl space-y-5 md:space-y-6 shadow-[0_0_40px_rgba(239,68,68,0.25)]"
                  >
                    <div className="w-14 h-14 bg-red-950/50 text-red-500 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                      <Trash2 className="w-8 h-8 text-red-500 animate-pulse" />
                    </div>
                    
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">Hapus Nilai?</h3>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        Apakah Anda yakin ingin menghapus nilai terakhir untuk <strong className={deleteConfirmSudut === 'BIRU' ? 'text-blue-400 font-extrabold' : 'text-red-400 font-extrabold'}>SUDUT {deleteConfirmSudut}</strong>?
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* YA */}
                      <button
                        onClick={() => {
                          triggerClick();
                          deleteLastJuriClick(deleteConfirmSudut);
                          setDeleteConfirmSudut(null);
                        }}
                        className="py-3 px-4 rounded-xl bg-red-650 hover:bg-red-700 text-white font-extrabold text-sm uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                      >
                        Ya
                      </button>

                      {/* TIDAK */}
                      <button
                        onClick={() => {
                          triggerClick();
                          setDeleteConfirmSudut(null);
                        }}
                        className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-950 text-slate-300 font-extrabold text-sm uppercase tracking-wider transition-all duration-150 cursor-pointer active:scale-95"
                      >
                        Tidak
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}

        {role === 'REGISTRASI_DATA' && (
          <motion.div
            key="registrasi_data"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden"
          >
            <RegistrasiDataPanel
              onBack={() => setRole('SEKRETARIS')}
              eventName={matchState.eventName}
              logoKiri={matchState.logoKiri}
              logoKanan={matchState.logoKanan}
              onApplySchedule={(scheduleRows) => {
                const mappedLines = scheduleRows.map((row: any) => ({
                  partai: row.partai,
                  kelas: row.kelas,
                  gender: row.gender,
                  kategoriUsia: row.kategoriUsia,
                  tahapPertandingan: row.tahapPertandingan,
                  atlitMerah: row.atlitMerah,
                  atlitBiru: row.atlitBiru,
                  isCompleted: row.isCompleted
                }));
                setJadwalLines(mappedLines);
                
                if (mappedLines.length > 0) {
                  const firstRow = mappedLines[0];
                  let dur = 120;
                  const kUsia = firstRow.kategoriUsia || 'REMAJA';
                  if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                    dur = 90;
                  } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                    dur = 120;
                  } else if (kUsia === 'MASTER A') {
                    dur = 90;
                  } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                    dur = 60;
                  }

                  const isCompleted = firstRow.isCompleted || history.some(h => String(h.partai) === String(firstRow.partai));

                  updateMatchState({
                    ...matchState,
                    partai: firstRow.partai,
                    kelas: firstRow.kelas,
                    gender: firstRow.gender,
                    kategoriUsia: firstRow.kategoriUsia,
                    tahapPertandingan: firstRow.tahapPertandingan,
                    durasiBabak: dur,
                    sisaWaktu: dur,
                    babakAktif: 1,
                    statusPertandingan: isCompleted ? 'SELESAI' : 'BELUM_MULAI',
                    atlitMerah: {
                      nama: firstRow.atlitMerah?.nama || "",
                      kontingen: firstRow.atlitMerah?.kontingen || ""
                    },
                    atlitBiru: {
                      nama: firstRow.atlitBiru?.nama || "",
                      kontingen: firstRow.atlitBiru?.kontingen || ""
                    }
                  });

                  setLocalPartai(firstRow.partai || "1");
                  setLocalKelas(firstRow.kelas || "");
                  setLocalAtlitMerahNama(firstRow.atlitMerah?.nama || "");
                  setLocalAtlitMerahKontingen(firstRow.atlitMerah?.kontingen || "");
                  setLocalAtlitBiruNama(firstRow.atlitBiru?.nama || "");
                  setLocalAtlitBiruKontingen(firstRow.atlitBiru?.kontingen || "");
                }
              }}
            />
          </motion.div>
        )}

        {/* SEKRETARIS (SECRETARY) CONFIG & COCKPIT SCREEN VIEW */}
        {role === 'SEKRETARIS' && (
          <motion.div
            key="sekretaris"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`flex-1 flex flex-col w-full mx-auto transition-all duration-300 ${
              isFullscreen 
                ? 'p-2 max-w-[99vw] h-[calc(100vh-16px)] overflow-hidden space-y-2' 
                : 'p-4 max-w-7xl space-y-4 overflow-y-auto pb-10'
            }`}
          >
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 bg-purple-950/10 border border-purple-950/30 w-full ${isFullscreen ? 'p-2 rounded-lg' : 'p-3.5 rounded-xl'}`}>
              <h2 className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 uppercase tracking-tight transition-all ${
                isFullscreen ? 'text-lg md:text-xl lg:text-2xl' : 'text-2xl md:text-3xl'
              }`}>
                PANEL SEKRETARIS & ENGINE KONTROL
              </h2>
              
              <button 
                onClick={toggleFullscreen}
                className="py-2 px-4 rounded-xl border border-purple-500/30 hover:border-purple-500/60 bg-purple-950/80 hover:bg-purple-900/80 text-purple-300 hover:text-white font-mono uppercase text-[10px] font-extrabold tracking-widest text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 shadow-md self-end md:self-auto shrink-0"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'LAYAR BIASA' : 'LAYAR PENUH'}</span>
              </button>
            </div>
            
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${
              isFullscreen ? 'lg:h-[calc(100vh-80px)] min-h-0 overflow-hidden items-stretch' : 'items-start'
            }`}>
              
              {/* Left Side: Configure Match details & Athlete properties */}
              <div className={`lg:col-span-8 bg-gradient-to-b from-brand-purple/40 to-black/60 rounded-2xl border border-purple-500/20 shadow-xl transition-all ${
                isFullscreen ? 'p-3.5 md:p-4 lg:h-full flex flex-col justify-between gap-3 min-h-0 overflow-hidden' : 'p-6 space-y-4'
              }`}>
                <h3 className={`font-bold border-b border-purple-500/20 flex items-center gap-2 shrink-0 ${
                  isFullscreen ? 'text-sm pb-1' : 'text-lg pb-1.5'
                }`}>
                  <Settings className="w-4.5 h-4.5 text-purple-400" />
                  Parameter Pertandingan
                </h3>
                
                <div className={`grid transition-all shrink-0 ${
                  isFullscreen 
                    ? 'grid-cols-1 md:grid-cols-4 gap-x-3 gap-y-1.5 p-3.5 rounded-xl bg-purple-950/15 border border-purple-500/5 text-xs' 
                    : 'grid-cols-1 md:grid-cols-2 gap-4'
                }`}>
                  {/* Event Name */}
                  <div className={`${isFullscreen ? 'col-span-1 md:col-span-4' : 'col-span-1 md:col-span-2'} space-y-1`}>
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Nama Event Kejuaraan</label>
                    <input 
                      id="input-eventName"
                      type="text" 
                      value={localEventName}
                      onChange={(e) => setLocalEventName(e.target.value.toUpperCase())}
                      onBlur={() => updateMatchState({ ...matchState, eventName: localEventName })}
                      className={`w-full bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-lg font-bold placeholder-purple-950/50 outline-none text-white focus:ring-1 focus:ring-purple-400 ${
                        isFullscreen ? 'p-3.5 text-base' : 'p-2.5 text-sm'
                      }`}
                      placeholder="CONTOH: KEJUARAAN PENCAK SILAT WILAYAH 2026"
                    />
                  </div>

                  {/* Tempat Pelaksanaan & Waktu Pelaksanaan */}
                  <div className={`${isFullscreen ? 'col-span-1 md:col-span-4' : 'col-span-1 md:col-span-2'} grid grid-cols-1 md:grid-cols-2 gap-4`}>
                    {/* Tempat Pelaksanaan */}
                    <div className="space-y-1">
                      <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Tempat Pelaksanaan</label>
                      <input 
                        id="input-tempatPelaksanaan"
                        type="text" 
                        value={localTempatPelaksanaan}
                        onChange={(e) => setLocalTempatPelaksanaan(e.target.value.toUpperCase())}
                        onBlur={() => updateMatchState({ ...matchState, tempatPelaksanaan: localTempatPelaksanaan })}
                        className={`w-full bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-lg font-bold placeholder-purple-950/50 outline-none text-white focus:ring-1 focus:ring-purple-400 ${
                          isFullscreen ? 'p-3.5 text-base' : 'p-2.5 text-sm'
                        }`}
                        placeholder="CONTOH: PADEPOKAN PENCAK SILAT TMII, JAKARTA"
                      />
                    </div>

                    {/* Waktu Pelaksanaan */}
                    <div className="space-y-1">
                      <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Waktu Pelaksanaan</label>
                      <input 
                        id="input-waktuPelaksanaan"
                        type="text" 
                        value={localWaktuPelaksanaan}
                        onChange={(e) => setLocalWaktuPelaksanaan(e.target.value.toUpperCase())}
                        onBlur={() => updateMatchState({ ...matchState, waktuPelaksanaan: localWaktuPelaksanaan })}
                        className={`w-full bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-lg font-bold placeholder-purple-950/50 outline-none text-white focus:ring-1 focus:ring-purple-400 ${
                          isFullscreen ? 'p-3.5 text-base' : 'p-2.5 text-sm'
                        }`}
                        placeholder="CONTOH: 12 - 15 JUNI 2026"
                      />
                    </div>
                  </div>

                  {/* Event Logo Inputs */}
                  <div className={`${isFullscreen ? 'col-span-1 md:col-span-4' : 'col-span-1 md:col-span-2'} grid grid-cols-1 md:grid-cols-2 bg-purple-950/10 border border-purple-950/40 rounded-xl transition-all ${
                    isFullscreen ? 'gap-2.5 p-2' : 'gap-4 p-4'
                  }`}>
                    {/* Logo Kiri */}
                    <div className="space-y-1">
                      <label className={`text-purple-300 font-semibold uppercase tracking-wider font-mono block ${isFullscreen ? 'text-[10px]' : 'text-xs'}`}>Logo Sisi Kiri (Monitor)</label>
                      <div className="flex items-center gap-3">
                        {matchState.logoKiri ? (
                          <div className={`relative bg-black/40 border border-purple-500/30 p-1 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                            isFullscreen ? 'h-10 w-10' : 'h-14 w-14'
                          }`}>
                            <img 
                              src={matchState.logoKiri} 
                              alt="Kiri Preview" 
                              className="max-h-full max-w-full object-contain rounded"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={() => {
                                triggerClick();
                                updateMatchState({ ...matchState, logoKiri: "" });
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-red-650 hover:bg-red-500 border border-red-500 p-0.5 rounded-full text-white cursor-pointer"
                              title="Hapus logo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className={`bg-black/40 border border-dashed border-purple-950/70 rounded-lg flex flex-col items-center justify-center text-slate-600 shrink-0 transition-all ${
                            isFullscreen ? 'h-10 w-10' : 'h-14 w-14'
                          }`}>
                            <Upload className="w-4 h-4 opacity-40" />
                            <span className="text-[7px] font-mono mt-0.5 uppercase tracking-tighter">KOSONG</span>
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <input 
                            id="input-logoKiri"
                            type="text" 
                            value={localLogoKiri}
                            onChange={(e) => setLocalLogoKiri(e.target.value)}
                            onBlur={() => updateMatchState({ ...matchState, logoKiri: localLogoKiri })}
                            className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-md font-semibold outline-none text-white placeholder-purple-950/50 ${
                              isFullscreen ? 'p-3 text-sm' : 'p-1.5 text-xs'
                            }`}
                            placeholder="Masukkan/paste URL logo..."
                          />
                          <label className={`inline-flex items-center justify-center gap-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/20 rounded-md font-bold text-purple-300 hover:text-white cursor-pointer transition-all active:scale-95 ${
                            isFullscreen ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[10px]'
                          }`}>
                            <Upload className="w-3 h-3" /> Upload Logo Kiri
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    const base64 = event.target?.result as string;
                                    const compressed = await compressImage(base64);
                                    try {
                                      const res = await fetch('/api/logo/kiri', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ logo: compressed })
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        updateMatchState({ ...matchState, logoKiri: data.url });
                                      } else {
                                        updateMatchState({ ...matchState, logoKiri: compressed });
                                      }
                                    } catch (err) {
                                      updateMatchState({ ...matchState, logoKiri: compressed });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                    </div>
 
                    {/* Logo Kanan */}
                    <div className="space-y-1">
                      <label className={`text-purple-300 font-semibold uppercase tracking-wider font-mono block ${isFullscreen ? 'text-[10px]' : 'text-xs'}`}>Logo Sisi Kanan (Monitor)</label>
                      <div className="flex items-center gap-3">
                        {matchState.logoKanan ? (
                          <div className={`relative bg-black/40 border border-purple-500/30 p-1 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                            isFullscreen ? 'h-10 w-10' : 'h-14 w-14'
                          }`}>
                            <img 
                              src={matchState.logoKanan} 
                              alt="Kanan Preview" 
                              className="max-h-full max-w-full object-contain rounded"
                              referrerPolicy="no-referrer"
                            />
                            <button
                              onClick={() => {
                                triggerClick();
                                updateMatchState({ ...matchState, logoKanan: "" });
                              }}
                              className="absolute -top-1.5 -right-1.5 bg-red-650 hover:bg-red-500 border border-red-500 p-0.5 rounded-full text-white cursor-pointer"
                              title="Hapus logo"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className={`bg-black/40 border border-dashed border-purple-950/70 rounded-lg flex flex-col items-center justify-center text-slate-600 shrink-0 transition-all ${
                            isFullscreen ? 'h-10 w-10' : 'h-14 w-14'
                          }`}>
                            <Upload className="w-4 h-4 opacity-40" />
                            <span className="text-[7px] font-mono mt-0.5 uppercase tracking-tighter">KOSONG</span>
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <input 
                            id="input-logoKanan"
                            type="text" 
                            value={localLogoKanan}
                            onChange={(e) => setLocalLogoKanan(e.target.value)}
                            onBlur={() => updateMatchState({ ...matchState, logoKanan: localLogoKanan })}
                            className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded-md font-semibold outline-none text-white placeholder-purple-950/50 ${
                              isFullscreen ? 'p-3 text-sm' : 'p-1.5 text-xs'
                            }`}
                            placeholder="Masukkan/paste URL logo..."
                          />
                          <label className={`inline-flex items-center justify-center gap-1 bg-purple-950/60 hover:bg-purple-900 border border-purple-500/20 rounded-md font-bold text-purple-300 hover:text-white cursor-pointer transition-all active:scale-95 ${
                            isFullscreen ? 'px-2 py-0.5 text-[9px]' : 'px-3 py-1 text-[10px]'
                          }`}>
                            <Upload className="w-3 h-3" /> Upload Logo Kanan
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    const base64 = event.target?.result as string;
                                    const compressed = await compressImage(base64);
                                    try {
                                      const res = await fetch('/api/logo/kanan', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ logo: compressed })
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        updateMatchState({ ...matchState, logoKanan: data.url });
                                      } else {
                                        updateMatchState({ ...matchState, logoKanan: compressed });
                                      }
                                    } catch (err) {
                                      updateMatchState({ ...matchState, logoKanan: compressed });
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                        {/* Partai & Kelas */}
                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[10px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Partai Tanding (#)</label>
                    <input 
                      id="input-partai"
                      type="text" 
                      value={localPartai}
                      disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                      onChange={(e) => setLocalPartai(e.target.value)}
                      onBlur={() => {
                        const targetPartai = localPartai.trim();
                        const isMatchCompleted = history.some(h => String(h.partai) === String(targetPartai));
                        let updatedState = { 
                          ...matchState, 
                          partai: targetPartai,
                          statusPertandingan: isMatchCompleted ? 'SELESAI' as const : 'BELUM_MULAI' as const
                        };
                        
                        const normalizePartai = (p: any): string => {
                          if (p === undefined || p === null) return '';
                          const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                          const matched = str.match(/\d+/);
                          if (matched) {
                            return parseInt(matched[0], 10).toString();
                          }
                          return str;
                        };

                        const excelDataStr = localStorage.getItem('silat_excel_matches');
                        if (excelDataStr) {
                          try {
                            const excelMatches = JSON.parse(excelDataStr);
                            if (Array.isArray(excelMatches)) {
                              const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                              if (matchRow) {
                                const nameM = (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase();
                                const kontM = (matchRow['Kontingen Merah'] || "").toString().toUpperCase();
                                const nameB = (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase();
                                const kontB = (matchRow['Kontingen Biru'] || "").toString().toUpperCase();
                                const kls = matchRow['Kelas'] ? matchRow['Kelas'].toString().toUpperCase() : matchState.kelas;
                                const gdr = matchRow['Gender'] && matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                const evt = matchState.eventName; // Preserve custom event name instead of resetting to default
                                
                                let kUsia = matchRow['Kategori Usia'] ? matchRow['Kategori Usia'].toString().trim().toUpperCase() : (matchState.kategoriUsia || 'REMAJA');
                                if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                  kUsia = 'PRA REMAJA';
                                }
                                const tPertandingan = matchRow['Tahap Pertandingan'] ? matchRow['Tahap Pertandingan'].toString().trim().toUpperCase() : (matchState.tahapPertandingan || 'PENYISIHAN');

                                let dur = matchState.durasiBabak;
                                if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                                  dur = 90;
                                } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                                  dur = 120;
                                } else if (kUsia === 'MASTER A') {
                                  dur = 90;
                                } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                                  dur = 60;
                                }

                                if (matchRow['Durasi Babak (Menit)']) {
                                  const durStr = matchRow['Durasi Babak (Menit)'].toString().trim();
                                  if (durStr.includes(':')) {
                                    const parts = durStr.split(':');
                                    const mins = parseInt(parts[0], 10) || 0;
                                    const secs = parseInt(parts[1], 10) || 0;
                                    dur = (mins * 60) + secs;
                                  } else {
                                    const parsedSecs = parseInt(durStr, 10);
                                    if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                      if (parsedSecs < 10) {
                                        dur = parsedSecs * 60;
                                      } else {
                                        dur = parsedSecs;
                                      }
                                    }
                                  }
                                }

                                const rowCompleted = history.some(h => String(h.partai) === String(targetPartai));
                                updatedState = {
                                  ...updatedState,
                                  atlitMerah: { nama: nameM, kontingen: kontM },
                                  atlitBiru: { nama: nameB, kontingen: kontB },
                                  kelas: kls,
                                  kategoriUsia: kUsia,
                                  tahapPertandingan: tPertandingan,
                                  gender: gdr,
                                  eventName: evt,
                                  durasiBabak: dur,
                                  sisaWaktu: dur,
                                  babakAktif: 1,
                                  statusPertandingan: rowCompleted ? 'SELESAI' : 'BELUM_MULAI'
                                };
                                showToast(`Data Partai ${targetPartai} berhasil dimuat dari Excel!`, 'success');
                              }
                            }
                          } catch (err) {
                            console.error("Error reading excel database lookup", err);
                          }
                        }
                        updateMatchState(updatedState);
                      }}
                      className={`w-full bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Tahap Pertandingan</label>
                    <select
                      value={matchState.tahapPertandingan || "PENYISIHAN"}
                      disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                      onChange={(e) => {
                        triggerClick();
                        updateMatchState({
                          ...matchState,
                          tahapPertandingan: e.target.value
                        });
                      }}
                      className={`w-full bg-[#12092e] bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                    >
                      <option value="PENYISIHAN" className="bg-[#12092e] text-white font-semibold">PENYISIHAN</option>
                      <option value="PEREMPAT FINAL" className="bg-[#12092e] text-white font-semibold">PEREMPAT FINAL</option>
                      <option value="SEMI FINAL" className="bg-[#12092e] text-white font-semibold">SEMI FINAL</option>
                      <option value="FINAL" className="bg-[#12092e] text-white font-semibold">FINAL</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Kelas / Nomor</label>
                    <input 
                      id="input-kelas"
                      type="text" 
                      value={localKelas}
                      disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                      onChange={(e) => setLocalKelas(e.target.value.toUpperCase())}
                      onBlur={() => updateMatchState({ ...matchState, kelas: localKelas })}
                      className={`w-full bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                      placeholder="Contoh: A, B, atau TUNGGAL"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Kategori Usia</label>
                    <select
                      value={matchState.kategoriUsia || "REMAJA"}
                      disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                      onChange={(e) => {
                        triggerClick();
                        const val = e.target.value;
                        let dur = 120; // default 2 minutes (120 seconds)
                        if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1"].includes(val)) {
                           dur = 90; // 01.30 Menit
                        } else if (["PRA REMAJA", "REMAJA", "DEWASA"].includes(val)) {
                           dur = 120; // 02.00 Menit
                        } else if (val === "MASTER 2") {
                           dur = 60; // 01.00 Menit
                        }
                        updateMatchState({
                          ...matchState,
                          kategoriUsia: val,
                          durasiBabak: dur,
                          sisaWaktu: dur,
                          babakAktif: 1 // ALWAYS start and reset to round 1 when category changes
                        });
                      }}
                      className={`w-full bg-[#12092e] bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                    >
                      <option value="PRA USIA DINI" className="bg-[#12092e] text-white font-semibold">PRA USIA DINI</option>
                      <option value="USIA DINI 1" className="bg-[#12092e] text-white font-semibold">USIA DINI 1</option>
                      <option value="USIA DINI 2" className="bg-[#12092e] text-white font-semibold">USIA DINI 2</option>
                      <option value="PRA REMAJA" className="bg-[#12092e] text-white font-semibold">PRA REMAJA</option>
                      <option value="REMAJA" className="bg-[#12092e] text-white font-semibold">REMAJA</option>
                      <option value="DEWASA" className="bg-[#12092e] text-white font-semibold">DEWASA</option>
                      <option value="MASTER 1" className="bg-[#12092e] text-white font-semibold">MASTER 1</option>
                      <option value="MASTER 2" className="bg-[#12092e] text-white font-semibold">MASTER 2</option>
                    </select>
                  </div>

                  {/* Stage Dropdown & Gender Selector */}
                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Gender (Kategori)</label>
                    <div className={`grid grid-cols-2 ${isFullscreen ? 'gap-2.5 text-sm' : 'gap-2'}`}>
                      <button
                        onClick={() => { triggerClick(); updateMatchState({ ...matchState, gender: 'PUTRA' }); }}
                        disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                        className={`font-bold transition-all ${isFullscreen ? 'py-3 px-3 text-[14px] rounded-lg' : 'py-2 px-3 text-sm rounded-lg'} border ${matchState.gender === 'PUTRA' ? 'bg-purple-700 border-purple-500' : 'bg-slate-900 border-slate-950 text-slate-400 hover:bg-slate-800'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        PUTRA
                      </button>
                      <button
                        onClick={() => { triggerClick(); updateMatchState({ ...matchState, gender: 'PUTRI' }); }}
                        disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                        className={`font-bold transition-all ${isFullscreen ? 'py-3 px-3 text-[14px] rounded-lg' : 'py-2 px-3 text-sm rounded-lg'} border ${matchState.gender === 'PUTRI' ? 'bg-purple-700 border-purple-500' : 'bg-slate-900 border-slate-950 text-slate-400 hover:bg-slate-800'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        PUTRI
                      </button>
                    </div>
                  </div>

                  {/* Round Time selector */}
                  <div className="space-y-1">
                    <label className={`${isFullscreen ? 'text-[11px]' : 'text-xs'} text-purple-400 font-semibold uppercase tracking-wider font-mono`}>Durasi Babak (Timer)</label>
                    <select
                      value={matchState.durasiBabak}
                      disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                      onChange={(e) => {
                        const seconds = parseInt(e.target.value);
                        updateMatchState({
                          ...matchState,
                          durasiBabak: seconds,
                          sisaWaktu: seconds
                        });
                      }}
                      className={`w-full bg-[#12092e] bg-gradient-to-r from-blue-900/30 via-slate-900/50 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 font-bold outline-none text-white focus:ring-1 focus:ring-purple-400 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isFullscreen ? 'p-3.5 text-base rounded-lg' : 'p-2.5 text-sm rounded-lg'
                      }`}
                    >
                      <option value="60" className="bg-[#12092e] text-white font-semibold">01.00 Menit</option>
                      <option value="70" className="bg-[#12092e] text-white font-semibold">01.10 Menit</option>
                      <option value="80" className="bg-[#12092e] text-white font-semibold">01.20 Menit</option>
                      <option value="90" className="bg-[#12092e] text-white font-semibold">01.30 Menit</option>
                      <option value="100" className="bg-[#12092e] text-white font-semibold">01.40 Menit</option>
                      <option value="110" className="bg-[#12092e] text-white font-semibold">01.50 Menit</option>
                      <option value="120" className="bg-[#12092e] text-white font-semibold">02.00 Menit</option>
                      <option value="150" className="bg-[#12092e] text-white font-semibold">02.30 Menit</option>
                      <option value="180" className="bg-[#12092e] text-white font-semibold">03.00 Menit</option>
                    </select>
                  </div>
                </div>

                {/* Athlete Profile Editors */}
                <div className={`grid grid-cols-1 md:grid-cols-2 border-t border-purple-950/60 transition-all ${
                  isFullscreen ? 'gap-3 pt-2.5 flex-1 min-h-0' : 'gap-6 pt-2'
                }`}>
                  {/* Sudut Biru Athlete Card Wrapper */}
                  <div className="flex flex-col gap-2">
                    {/* Sudut Biru Athlete Card */}
                    <div className={`bg-gradient-to-r from-blue-900/80 to-transparent border-l-4 border-blue-500 shadow-xl transition-all ${
                      isFullscreen ? 'p-3 rounded-xl space-y-2 h-fit' : 'p-4 rounded-xl space-y-3'
                    }`}>
                      <span className="text-[10px] bg-blue-650 text-white font-bold px-1.5 py-0.5 rounded font-mono w-max">SUDUT BIRU</span>
                      <div className={`space-y-1 ${isFullscreen ? 'gap-1' : ''}`}>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Nama Atlit</label>
                          <input 
                            id="input-atlitBiruNama"
                            type="text" 
                            value={localAtlitBiruNama}
                            onChange={(e) => setLocalAtlitBiruNama(e.target.value.toUpperCase())}
                            onBlur={() => updateMatchState({ ...matchState, atlitBiru: { ...matchState.atlitBiru, nama: localAtlitBiruNama } })}
                            disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                            className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded font-bold text-white uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                              isFullscreen ? 'p-3.5 text-base' : 'p-2 text-xs'
                            }`}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">Kontingen</label>
                          <input 
                            id="input-atlitBiruKontingen"
                            type="text" 
                            value={localAtlitBiruKontingen}
                            onChange={(e) => setLocalAtlitBiruKontingen(e.target.value.toUpperCase())}
                            onBlur={() => updateMatchState({ ...matchState, atlitBiru: { ...matchState.atlitBiru, kontingen: localAtlitBiruKontingen } })}
                            disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                            className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded font-bold text-white uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                              isFullscreen ? 'p-3.5 text-base' : 'p-2 text-xs'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button: CEK PARTAI SELANJUTNYA */}
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => {
                          triggerClick();
                          setShowNextMatchesPopup(true);
                        }}
                        className={`font-black uppercase tracking-wider transition-all duration-200 rounded-xl border flex items-center justify-center gap-1 shadow-md active:scale-95 text-yellow-950 border-yellow-600 bg-yellow-500 hover:bg-yellow-600 cursor-pointer ${
                          isFullscreen ? 'py-4 text-sm md:text-base' : 'py-2.5 text-xs'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> CEK PARTAI SELANJUTNYA
                      </button>
                    </div>
                  </div>

                  {/* Sudut Merah Athlete Card Wrapper */}
                  <div className="flex flex-col gap-2">
                    {/* Sudut Merah Athlete Card */}
                    <div className={`bg-gradient-to-br from-red-900/80 to-transparent border-l-4 border-red-500 shadow-xl transition-all ${
                      isFullscreen ? 'p-3 rounded-xl space-y-2 h-fit' : 'p-4 rounded-xl space-y-3'
                    }`}>
                      <span className="text-[10px] bg-red-650 text-white font-bold px-1.5 py-0.5 rounded font-mono w-max">SUDUT MERAH</span>
                      <div className={`space-y-1 ${isFullscreen ? 'gap-1' : ''}`}>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-red-100 font-bold uppercase tracking-wider">Nama Atlit</label>
                          <input 
                            id="input-atlitMerahNama"
                            type="text" 
                            value={localAtlitMerahNama}
                            onChange={(e) => setLocalAtlitMerahNama(e.target.value.toUpperCase())}
                            onBlur={() => updateMatchState({ ...matchState, atlitMerah: { ...matchState.atlitMerah, nama: localAtlitMerahNama } })}
                            disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                            className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded font-bold text-white uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                              isFullscreen ? 'p-3.5 text-base' : 'p-2 text-xs'
                            }`}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[10px] text-red-100 font-bold uppercase tracking-wider">Kontingen</label>
                          <input 
                            id="input-atlitMerahKontingen"
                            type="text" 
                            value={localAtlitMerahKontingen}
                            onChange={(e) => setLocalAtlitMerahKontingen(e.target.value.toUpperCase())}
                            onBlur={() => updateMatchState({ ...matchState, atlitMerah: { ...matchState.atlitMerah, kontingen: localAtlitMerahKontingen } })}
                            disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                            className={`w-full bg-gradient-to-r from-blue-900/30 to-purple-900/30 hover:from-blue-900/45 hover:to-purple-900/45 focus:from-blue-900/50 focus:to-purple-900/50 border border-purple-500/40 hover:border-purple-500/60 focus:border-purple-400 rounded font-bold text-white uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                              isFullscreen ? 'p-3.5 text-base' : 'p-2 text-xs'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Navigation Buttons: PREV MATCH and NEXT MATCH */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          triggerClick();
                          const normalizePartai = (p: any): string => {
                            if (p === undefined || p === null) return '';
                            const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                            const matched = str.match(/\d+/);
                            if (matched) return parseInt(matched[0], 10).toString();
                            return str;
                          };
                          const excelDataStr = localStorage.getItem('silat_excel_matches');
                          let targetPartai = "";
                          if (excelDataStr) {
                            try {
                              const excelMatches = JSON.parse(excelDataStr);
                              if (Array.isArray(excelMatches) && excelMatches.length > 0) {
                                const currentIndex = excelMatches.findIndex((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(matchState.partai));
                                if (currentIndex > 0) {
                                  const prevRow = excelMatches[currentIndex - 1];
                                  targetPartai = prevRow['Partai'] ? prevRow['Partai'].toString() : "";
                                }
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          if (!targetPartai) {
                            const matches = matchState.partai.match(/\d+/);
                            if (matches) {
                              const num = parseInt(matches[0], 10);
                              if (num > 1) {
                                targetPartai = matchState.partai.replace(matches[0], (num - 1).toString());
                              } else {
                                showToast("Sudah di Partai pertama!", "warning");
                                return;
                              }
                            } else {
                              const parsed = parseInt(matchState.partai, 10);
                              if (!isNaN(parsed) && parsed > 1) {
                                targetPartai = (parsed - 1).toString();
                              } else {
                                showToast("Sudah di Partai pertama atau format partai tidak numerik!", "warning");
                                return;
                              }
                            }
                          }
                          
                          // Load details
                          let nextAtlitMerah = { nama: "", kontingen: "" };
                          let nextAtlitBiru = { nama: "", kontingen: "" };
                          let nextKelas = matchState.kelas;
                          let nextGender = matchState.gender;
                          let nextEventName = matchState.eventName;
                          let nextKategoriUsia = matchState.kategoriUsia || 'REMAJA';
                          let nextTahapPertandingan = matchState.tahapPertandingan || 'PENYISIHAN';
                          let nextDurasi = matchState.durasiBabak;
                          let foundExcel = false;

                          if (excelDataStr) {
                            try {
                              const excelMatches = JSON.parse(excelDataStr);
                              if (Array.isArray(excelMatches)) {
                                const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                                if (matchRow) {
                                  foundExcel = true;
                                  nextAtlitMerah = {
                                    nama: (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Merah'] || "").toString().toUpperCase()
                                  };
                                  nextAtlitBiru = {
                                    nama: (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Biru'] || "").toString().toUpperCase()
                                  };
                                  if (matchRow['Kelas']) nextKelas = matchRow['Kelas'].toString().toUpperCase();
                                  if (matchRow['Gender']) nextGender = matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                  // Preserve custom event name instead of resetting to default
                                  // if (matchRow['Nama Event']) nextEventName = matchRow['Nama Event'].toString().toUpperCase();
                                  
                                  if (matchRow['Kategori Usia']) {
                                    let kUsia = matchRow['Kategori Usia'].toString().trim().toUpperCase();
                                    if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                  kUsia = 'PRA REMAJA';
                                }
                                    nextKategoriUsia = kUsia;
                                    
                                    if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                                      nextDurasi = 120;
                                    } else if (kUsia === 'MASTER A') {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                                      nextDurasi = 60;
                                    }
                                  }
                                  if (matchRow['Tahap Pertandingan']) {
                                    nextTahapPertandingan = matchRow['Tahap Pertandingan'].toString().trim().toUpperCase();
                                  }
                                  if (matchRow['Durasi Babak (Menit)']) {
                                    const durStr = matchRow['Durasi Babak (Menit)'].toString().trim();
                                    if (durStr.includes(':')) {
                                      const parts = durStr.split(':');
                                      const mins = parseInt(parts[0], 10) || 0;
                                      const secs = parseInt(parts[1], 10) || 0;
                                      nextDurasi = (mins * 60) + secs;
                                    } else {
                                      const parsedSecs = parseInt(durStr, 10);
                                      if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                        if (parsedSecs < 10) {
                                          nextDurasi = parsedSecs * 60;
                                        } else {
                                          nextDurasi = parsedSecs;
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }

                          const isTargetCompleted = history.some(h => String(h.partai) === String(targetPartai)) || (jadwalLines.find(jl => String(jl.partai) === String(targetPartai))?.isCompleted);

                          updateMatchState({
                            ...matchState,
                            partai: targetPartai,
                            kelas: nextKelas,
                            gender: nextGender,
                            eventName: nextEventName,
                            kategoriUsia: nextKategoriUsia,
                            tahapPertandingan: nextTahapPertandingan,
                            durasiBabak: nextDurasi,
                            sisaWaktu: nextDurasi,
                            statusPertandingan: isTargetCompleted ? 'SELESAI' : 'BELUM_MULAI',
                            timerBerjalan: false,
                            validatedScores: [],
                            rawScores: [],
                            penaltiesMerah: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            penaltiesBiru: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            accumulatedPenaltyMerah: 0,
                            accumulatedPenaltyBiru: 0,
                            historyPenaltiesMerah: {},
                            historyPenaltiesBiru: {},
                            babakAktif: 1,
                            diskualifikasi: null,
                            pemenang: null,
                            verifikasi: {
                              id: "", status: 'IDLE', jenis: 'JATUHAN', juriVotes: {}, result: null
                            },
                            showRoundEndPopUp: false,
                            showMatchEndPopUp: false,
                            atlitMerah: nextAtlitMerah,
                            atlitBiru: nextAtlitBiru
                          });

                          setLocalPartai(targetPartai);
                          setLocalKelas(nextKelas);
                          setLocalAtlitMerahNama(nextAtlitMerah.nama);
                          setLocalAtlitMerahKontingen(nextAtlitMerah.kontingen);
                          setLocalAtlitBiruNama(nextAtlitBiru.nama);
                          setLocalAtlitBiruKontingen(nextAtlitBiru.kontingen);

                          if (foundExcel) {
                            showToast(`Sukses memuat Partai ${targetPartai} dari Excel!`, "success");
                          } else {
                            showToast(`Partai ${targetPartai} siap diinput manual.`, "info");
                          }
                        }}
                        className={`font-black uppercase tracking-wider transition-all duration-200 rounded-xl border flex items-center justify-center gap-1 shadow-md active:scale-95 text-white border-orange-600 bg-orange-500 hover:bg-orange-600 cursor-pointer ${
                          isFullscreen ? 'py-4 text-sm md:text-base' : 'py-2.5 text-xs'
                        }`}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> PREV MATCH
                      </button>
                      
                      <button
                        onClick={() => {
                          triggerClick();
                          const normalizePartai = (p: any): string => {
                            if (p === undefined || p === null) return '';
                            const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                            const matched = str.match(/\d+/);
                            if (matched) return parseInt(matched[0], 10).toString();
                            return str;
                          };
                          const excelDataStr = localStorage.getItem('silat_excel_matches');
                          let targetPartai = "";
                          if (excelDataStr) {
                            try {
                              const excelMatches = JSON.parse(excelDataStr);
                              if (Array.isArray(excelMatches) && excelMatches.length > 0) {
                                const currentIndex = excelMatches.findIndex((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(matchState.partai));
                                if (currentIndex >= 0 && currentIndex < excelMatches.length - 1) {
                                  const nextRow = excelMatches[currentIndex + 1];
                                  targetPartai = nextRow['Partai'] ? nextRow['Partai'].toString() : "";
                                }
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          if (!targetPartai) {
                            const matches = matchState.partai.match(/\d+/);
                            if (matches) {
                              const num = parseInt(matches[0], 10);
                              targetPartai = matchState.partai.replace(matches[0], (num + 1).toString());
                            } else {
                              const parsed = parseInt(matchState.partai, 10);
                              if (!isNaN(parsed)) {
                                targetPartai = (parsed + 1).toString();
                              } else {
                                targetPartai = "1";
                              }
                            }
                          }
                          
                          // Load details
                          let nextAtlitMerah = { nama: "", kontingen: "" };
                          let nextAtlitBiru = { nama: "", kontingen: "" };
                          let nextKelas = matchState.kelas;
                          let nextGender = matchState.gender;
                          let nextEventName = matchState.eventName;
                          let nextKategoriUsia = matchState.kategoriUsia || 'REMAJA';
                          let nextTahapPertandingan = matchState.tahapPertandingan || 'PENYISIHAN';
                          let nextDurasi = matchState.durasiBabak;
                          let foundExcel = false;

                          if (excelDataStr) {
                            try {
                              const excelMatches = JSON.parse(excelDataStr);
                              if (Array.isArray(excelMatches)) {
                                const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                                if (matchRow) {
                                  foundExcel = true;
                                  nextAtlitMerah = {
                                    nama: (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Merah'] || "").toString().toUpperCase()
                                  };
                                  nextAtlitBiru = {
                                    nama: (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Biru'] || "").toString().toUpperCase()
                                  };
                                  if (matchRow['Kelas']) nextKelas = matchRow['Kelas'].toString().toUpperCase();
                                  if (matchRow['Gender']) nextGender = matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                  // Preserve custom event name instead of resetting to default
                                  // if (matchRow['Nama Event']) nextEventName = matchRow['Nama Event'].toString().toUpperCase();
                                  
                                  if (matchRow['Kategori Usia']) {
                                    let kUsia = matchRow['Kategori Usia'].toString().trim().toUpperCase();
                                    if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                  kUsia = 'PRA REMAJA';
                                }
                                    nextKategoriUsia = kUsia;
                                    
                                    if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                                      nextDurasi = 120;
                                    } else if (kUsia === 'MASTER A') {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                                      nextDurasi = 60;
                                    }
                                  }
                                  if (matchRow['Tahap Pertandingan']) {
                                    nextTahapPertandingan = matchRow['Tahap Pertandingan'].toString().trim().toUpperCase();
                                  }
                                  if (matchRow['Durasi Babak (Menit)']) {
                                    const durStr = matchRow['Durasi Babak (Menit)'].toString().trim();
                                    if (durStr.includes(':')) {
                                      const parts = durStr.split(':');
                                      const mins = parseInt(parts[0], 10) || 0;
                                      const secs = parseInt(parts[1], 10) || 0;
                                      nextDurasi = (mins * 60) + secs;
                                    } else {
                                      const parsedSecs = parseInt(durStr, 10);
                                      if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                        if (parsedSecs < 10) {
                                          nextDurasi = parsedSecs * 60;
                                        } else {
                                          nextDurasi = parsedSecs;
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }

                          const isTargetCompleted = history.some(h => String(h.partai) === String(targetPartai)) || (jadwalLines.find(jl => String(jl.partai) === String(targetPartai))?.isCompleted);

                          updateMatchState({
                            ...matchState,
                            partai: targetPartai,
                            kelas: nextKelas,
                            gender: nextGender,
                            eventName: nextEventName,
                            kategoriUsia: nextKategoriUsia,
                            tahapPertandingan: nextTahapPertandingan,
                            durasiBabak: nextDurasi,
                            sisaWaktu: nextDurasi,
                            statusPertandingan: isTargetCompleted ? 'SELESAI' : 'BELUM_MULAI',
                            timerBerjalan: false,
                            validatedScores: [],
                            rawScores: [],
                            penaltiesMerah: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            penaltiesBiru: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            accumulatedPenaltyMerah: 0,
                            accumulatedPenaltyBiru: 0,
                            historyPenaltiesMerah: {},
                            historyPenaltiesBiru: {},
                            babakAktif: 1,
                            diskualifikasi: null,
                            pemenang: null,
                            verifikasi: {
                              id: "", status: 'IDLE', jenis: 'JATUHAN', juriVotes: {}, result: null
                            },
                            showRoundEndPopUp: false,
                            showMatchEndPopUp: false,
                            atlitMerah: nextAtlitMerah,
                            atlitBiru: nextAtlitBiru
                          });

                          setLocalPartai(targetPartai);
                          setLocalKelas(nextKelas);
                          setLocalAtlitMerahNama(nextAtlitMerah.nama);
                          setLocalAtlitMerahKontingen(nextAtlitMerah.kontingen);
                          setLocalAtlitBiruNama(nextAtlitBiru.nama);
                          setLocalAtlitBiruKontingen(nextAtlitBiru.kontingen);

                          if (foundExcel) {
                            showToast(`Sukses memuat Partai ${targetPartai} dari Excel!`, "success");
                          } else {
                            showToast(`Partai ${targetPartai} siap diinput manual.`, "info");
                          }
                        }}
                        className={`font-black uppercase tracking-wider transition-all duration-200 rounded-xl border flex items-center justify-center gap-1 shadow-md active:scale-95 text-white border-green-700 bg-green-600 hover:bg-green-700 cursor-pointer ${
                          isFullscreen ? 'py-4 text-sm md:text-base' : 'py-2.5 text-xs'
                        }`}
                      >
                        NEXT MATCH <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>



                {/* Akselerator Turnamen: Registrasi Data & Turnamen */}
                <div className={`bg-gradient-to-r from-purple-950/25 to-indigo-950/25 border border-purple-500/20 rounded-xl transition-all ${
                  isFullscreen ? 'p-3 py-2.5 space-y-2 border-purple-500/40 h-fit shrink-0' : 'p-4 space-y-3'
                }`}>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-300 uppercase tracking-wider ${isFullscreen ? 'text-xs md:text-sm' : 'text-sm'}`}>Registrasi Data &amp; Turnamen</h4>
                      <p className={`text-slate-400 ${isFullscreen ? 'text-[11px] md:text-xs' : 'text-[10px]'}`}>Pendaftaran pesilat, visualisasi bagan braket tanding, dan kontrol penjadwalan partai.</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        triggerClick();
                        setRole('REGISTRASI_DATA');
                      }}
                      className={`w-full flex items-center justify-center gap-2 rounded-xl border border-purple-500/35 hover:border-purple-400 hover:text-white bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-purple-100 font-extrabold uppercase tracking-widest transition-all cursor-pointer active:scale-97 shadow-lg ${
                        isFullscreen ? 'py-4.5 px-4 text-xs md:text-sm' : 'py-3.5 px-4 text-xs'
                      }`}
                    >
                      <Trophy className={`${isFullscreen ? 'w-4.5 h-4.5' : 'w-3.5 h-3.5'} text-amber-400`} />
                      REGISTRASI DATA
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side: TIMER COCKPIT controllers & MATCH HISTORY */}
              <div className={`lg:col-span-4 transition-all duration-300 ${
                isFullscreen 
                  ? 'space-y-2 lg:h-full lg:overflow-hidden flex flex-col justify-between min-h-0' 
                  : 'space-y-4'
              }`}>
                
                {/* Timer Cockpit Card */}
                <div className={`bg-gradient-to-b from-brand-purple/40 to-black/60 rounded-2xl border border-purple-500/20 text-center relative overflow-hidden transition-all ${
                  isFullscreen ? 'p-3 space-y-2 h-fit shrink-0' : 'p-5 space-y-4'
                }`}>
                  <h3 className={`font-bold uppercase tracking-wider text-purple-400 border-b border-purple-500/20 flex items-center gap-1.5 justify-center font-display ${
                    isFullscreen ? 'text-xs pb-0.5' : 'text-sm pb-1'
                  }`}>
                    <Clock className="w-4 h-4 text-purple-400 font-bold" />
                    KONTROL UTAMA JALANNYA TANDING
                  </h3>

                  {/* Operational Status Pertandingan */}
                  <div className={`bg-black/50 border border-purple-500/10 text-left space-y-1 transition-all ${
                    isFullscreen ? 'p-1.5 rounded-lg text-[11px]' : 'p-2.5 rounded-xl text-xs'
                  }`}>
                    <span className={`text-purple-300 font-semibold tracking-wider font-mono block ${
                      isFullscreen ? 'text-[9px]' : 'text-[10px]'
                    }`}>STATUS LAGA:</span>
                    <div className="flex justify-between items-center">
                      <span className={`font-black tracking-widest font-mono text-xs ${
                        matchState.statusPertandingan === 'BERJALAN' 
                          ? 'text-green-400 animate-pulse'
                          : 'text-amber-500 font-bold'
                      }`}>
                        {matchState.statusPertandingan === 'BERJALAN' 
                          ? '● LAGA AKTIF BERJALAN' 
                          : '● LAGA DIKUNCI / JEDA'
                        }
                      </span>
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                        matchState.statusPertandingan === 'BERJALAN' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                      }`}>
                        {matchState.statusPertandingan === 'BERJALAN' ? 'active' : 'locked'}
                      </span>
                    </div>
                  </div>

                  {/* LAGA STATE CONTROLLERS: MULAI & RESET PERTANDINGAN */}
                  <div className="grid grid-cols-2 gap-2">
                    {!showResetConfirm ? (
                      <>
                        <button
                          onClick={() => {
                            updateMatchState({
                              ...matchState,
                              statusPertandingan: 'BERJALAN',
                              timerBerjalan: false,
                              showRoundEndPopUp: false
                            });
                          }}
                          disabled={matchState.statusPertandingan === 'BERJALAN' || matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                          className={`text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                            isFullscreen ? 'py-1.5' : 'py-2.5'
                          } ${
                            (matchState.statusPertandingan === 'BERJALAN' || matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai)))
                              ? 'bg-purple-950/20 border-purple-950/40 text-purple-600/70 cursor-not-allowed opacity-60'
                              : 'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white shadow-md active:scale-95 cursor-pointer'
                          }`}
                        >
                          <span>🚀 MULAI</span>
                          <span className="text-[8px] opacity-80">(BUKA KUNCI)</span>
                        </button>

                        <button
                          onClick={() => {
                            triggerClick();
                            setShowResetConfirm(true);
                          }}
                          className={`text-[10px] font-black uppercase tracking-wider bg-red-950/45 hover:bg-red-800 border border-red-500/30 text-red-100 rounded-lg shadow-md hover:border-red-400 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer ${
                            isFullscreen ? 'py-1.5' : 'py-2.5'
                          }`}
                        >
                          <span>🛑 RESET</span>
                          <span className="text-[8px] opacity-80 text-red-400">(RESET & KUNCI)</span>
                        </button>
                      </>
                    ) : (
                      <div className={`col-span-2 bg-gradient-to-r from-red-950 to-red-900 border border-red-500/40 rounded-xl text-center animate-fadeIn ${
                        isFullscreen ? 'p-2 space-y-1' : 'p-3 space-y-2'
                      }`}>
                        <span className="text-[11px] font-extrabold text-red-200 uppercase tracking-tight block">⚠️ YAKIN BERSIHKAN LAGA?</span>
                        <div className="text-[9px] text-red-300 leading-normal max-w-xs mx-auto">
                          Waktu, skor juri, dan data sanksi pada partai saat ini akan dibatalkan & dikosongkan.
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              if (soundEnabled) playBuzzer();

                              // 1. Calculate targetPartai (Cek partai selanjutnya)
                              let targetPartai = "1";
                              if (matchState.partai) {
                                const matches = matchState.partai.match(/\d+/);
                                if (matches) {
                                  const num = parseInt(matches[0], 10);
                                  targetPartai = matchState.partai.replace(matches[0], (num + 1).toString());
                                } else {
                                  targetPartai = (parseInt(matchState.partai, 10) || 0) + 1 + "";
                                }
                              }

                              // 2. Clear athletes field (hapus/kosongkan Field Data Atlit Biru/Merah)
                              setLocalAtlitBiruNama("");
                              setLocalAtlitBiruKontingen("");
                              setLocalAtlitMerahNama("");
                              setLocalAtlitMerahKontingen("");

                              // 3. Update local states
                              setLocalPartai(targetPartai);

                              // 4. Empty all schedules in Generate Jadwal
                              setJadwalLines([]);
                              localStorage.removeItem('silat_jadwal_lines');
                              localStorage.removeItem('silat_excel_matches');

                              // 5. Update matchState
                              updateMatchState({
                                ...matchState,
                                statusPertandingan: 'BELUM_MULAI',
                                timerBerjalan: false,
                                validatedScores: [],
                                rawScores: [],
                                wmpTriggered: false,
                                wmpBypassed: false,
                                wmpBypassedScoreDiff: 0,
                                wmpWon: false,
                                wmpBabak1Occurred: false,
                                penaltiesMerah: {
                                  binaan1: false, binaan2: false,
                                  teguran1: false, teguran2: false,
                                  peringatan1: false, peringatan2: false,
                                },
                                penaltiesBiru: {
                                  binaan1: false, binaan2: false,
                                  teguran1: false, teguran2: false,
                                  peringatan1: false, peringatan2: false,
                                },
                                accumulatedPenaltyMerah: 0,
                                accumulatedPenaltyBiru: 0,
                                historyPenaltiesMerah: {},
                                historyPenaltiesBiru: {},
                                varChecking: {
                                  status: 'IDLE',
                                  sudut: null,
                                  result: null
                                },
                                sisaWaktu: matchState.durasiBabak,
                                babakAktif: 1,
                                diskualifikasi: null,
                                pemenang: null,
                                verifikasi: {
                                  id: "",
                                  status: 'IDLE',
                                  jenis: 'JATUHAN',
                                  juriVotes: {},
                                  result: null
                                },
                                showRoundEndPopUp: false,
                                showMatchEndPopUp: false,
                                atlitBiru: { nama: "", kontingen: "" },
                                atlitMerah: { nama: "", kontingen: "" },
                                partai: targetPartai,
                                silat_jadwal_lines: [],
                                silat_excel_matches: []
                              });

                              // 6. Open Cek Partai Selanjutnya popup
                              setShowNextMatchesPopup(true);

                              setShowResetConfirm(false);
                            }}
                            className="bg-red-650 hover:bg-red-550 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg tracking-widest uppercase cursor-pointer transition-all active:scale-95 border border-red-500"
                          >
                            YA, RESET
                          </button>
                          <button
                            onClick={() => {
                              triggerClick();
                              setShowResetConfirm(false);
                            }}
                            className="bg-[#1e1e1e] hover:bg-[#2d2d2d] border border-white/10 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg tracking-widest uppercase cursor-pointer transition-all active:scale-95"
                          >
                            BATAL
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Gigantic visual clock */}
                  <div className={`border-t border-purple-500/10 transition-all ${isFullscreen ? 'py-1' : 'py-2'}`}>
                    <span className={`font-black font-mono text-amber-400 tracking-wider transition-all duration-300 ${
                      isFullscreen ? 'text-3xl md:text-4xl lg:text-4xl' : 'text-5xl'
                    }`}>
                      {Math.floor(matchState.sisaWaktu / 60).toString().padStart(2, '0')}:{(matchState.sisaWaktu % 60).toString().padStart(2, '0')}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-mono">
                      Stellar Offline Counter Clock
                    </div>
                  </div>

                  {/* Cockpit buttons (Play, Pause, Reset, Change Round) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={toggleTimer}
                      disabled={matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai))}
                      className={`rounded-lg font-bold flex items-center justify-center gap-1.5 shadow-md transition-all ${
                        isFullscreen ? 'py-2 text-[11px]' : 'py-3 text-xs'
                      } ${
                        (matchState.statusPertandingan === 'SELESAI' || history.some(h => String(h.partai) === String(matchState.partai)))
                          ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                          : matchState.timerBerjalan ? 'bg-red-700 hover:bg-red-600 active:scale-95 cursor-pointer' : 'bg-green-700 hover:bg-green-650 active:scale-95 cursor-pointer'
                      }`}
                    >
                      {matchState.timerBerjalan ? (
                        <>
                          <Pause className="w-4 h-4" />
                          PAUSE MATCH
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          MULAI / RESUME
                        </>
                      )}
                    </button>

                    <button
                      onClick={resetTimer}
                      className={`bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-slate-400 ${
                        isFullscreen ? 'py-2 text-[11px]' : 'py-3 text-xs'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4" />
                      RESET WAKTU
                    </button>
                  </div>

                  {/* BELL / HORN BUTTON tepat dibawah tombol MULAI/RESUME & RESET WAKTU */}
                  <div className={`transition-all ${isFullscreen ? 'pt-1' : 'pt-2'}`}>
                    <button 
                      onMouseDown={() => {
                        if (soundEnabled) startBuzzer();
                      }}
                      onMouseUp={() => {
                        if (soundEnabled) stopBuzzer();
                      }}
                      onMouseLeave={() => {
                        if (soundEnabled) stopBuzzer();
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        if (soundEnabled) startBuzzer();
                      }}
                      onTouchEnd={() => {
                        if (soundEnabled) stopBuzzer();
                      }}
                      className={`w-full text-center rounded-lg bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-650 text-white font-extrabold tracking-wide shadow-xl shadow-purple-950/40 relative group overflow-hidden active:scale-95 transition-all outline-none user-select-none select-none ${
                        isFullscreen ? 'py-5 text-base md:text-lg border border-purple-500/30' : 'py-8 text-lg md:text-xl border border-purple-500/20'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5">
                        BELL / HORN
                        <kbd className="hidden md:inline-flex items-center text-[10px] uppercase font-mono tracking-tighter bg-black/40 px-1.5 py-0.5 rounded border border-white/10 text-purple-200">SHIFT</kbd>
                      </span>
                    </button>
                  </div>

                  {/* Dynamic Round Changer Buttons */}
                  <div className={`grid gap-2 transition-all ${isFullscreen ? 'pt-1' : 'pt-2'} ${getMaxRounds(matchState.kategoriUsia) === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {Array.from({ length: getMaxRounds(matchState.kategoriUsia) }, (_, i) => i + 1).map((rIndex) => (
                      <button
                        key={rIndex}
                        onClick={() => {
                          triggerClick();
                          const nextRound = rIndex as 1 | 2 | 3 | 4;
                          const currentRound = matchState.babakAktif;
                          
                          let newPenaltiesMerah = { ...matchState.penaltiesMerah };
                          let newPenaltiesBiru = { ...matchState.penaltiesBiru };
                          let newAccumulatedPenaltyMerah = matchState.accumulatedPenaltyMerah || 0;
                          let newAccumulatedPenaltyBiru = matchState.accumulatedPenaltyBiru || 0;
 
                          if (nextRound > currentRound) {
                            let extraMerah = 0;
                            if (matchState.penaltiesMerah.teguran1) extraMerah += 1;
                            if (matchState.penaltiesMerah.teguran2) extraMerah += 2;
 
                            let extraBiru = 0;
                            if (matchState.penaltiesBiru.teguran1) extraBiru += 1;
                            if (matchState.penaltiesBiru.teguran2) extraBiru += 2;
 
                            newAccumulatedPenaltyMerah += extraMerah;
                            newAccumulatedPenaltyBiru += extraBiru;
 
                            newPenaltiesMerah = {
                              ...newPenaltiesMerah,
                              binaan1: false,
                              binaan2: false,
                              teguran1: false,
                              teguran2: false,
                            };
                            newPenaltiesBiru = {
                              ...newPenaltiesBiru,
                              binaan1: false,
                              binaan2: false,
                              teguran1: false,
                              teguran2: false,
                            };
                          }
 
                          updateMatchState({
                            ...matchState,
                            babakAktif: nextRound,
                            sisaWaktu: matchState.durasiBabak,
                            accumulatedPenaltyMerah: newAccumulatedPenaltyMerah,
                            accumulatedPenaltyBiru: newAccumulatedPenaltyBiru,
                            penaltiesMerah: newPenaltiesMerah,
                            penaltiesBiru: newPenaltiesBiru,
                          });
                        }}
                        className={`font-bold rounded-lg transition-all duration-350 ${
                          isFullscreen ? 'py-1 text-[11px]' : 'py-2 text-xs'
                        } ${
                          matchState.babakAktif === rIndex 
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-2 border-purple-400 scale-[1.08] shadow-[0_0_15px_rgba(168,85,247,0.65)] text-white font-extrabold' 
                            : 'bg-[#0f041d] border border-purple-950/60 text-slate-400 hover:bg-[#1a082e] hover:text-white'
                        }`}
                      >
                        B{rIndex}
                      </button>
                    ))}
                  </div>

                  {/* Unduh PDF Partai yang Sedang Berlangsung */}
                  <div className={`transition-all border-t border-purple-500/10 ${isFullscreen ? 'pt-1.5' : 'pt-2.5'}`}>
                    <button
                      onClick={() => {
                        if (soundEnabled) playPointSound();
                        downloadMatchPDF(matchState);
                      }}
                      className={`w-full py-2 px-3 rounded-lg bg-gradient-to-r from-red-805 to-purple-805 hover:from-red-700 hover:to-purple-700 text-white font-extrabold tracking-wider border border-purple-500/45 uppercase cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg ${
                        isFullscreen ? 'text-[9px]' : 'text-[11px]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-red-400" />
                      Unduh PDF (Partai Sedang Berjalan)
                    </button>
                  </div>
                </div>

                {/* Match History, downloading, and deleting */}
                <div className={`bg-[#120822] border border-purple-900/30 transition-all ${
                  isFullscreen ? 'p-3 space-y-2 flex-1 flex flex-col justify-between min-h-0' : 'p-5 space-y-3'
                }`}>
                  <div className={`flex justify-between items-center border-b border-purple-900/30 ${
                    isFullscreen ? 'pb-1' : 'pb-2'
                  }`}>
                    <h3 className={`font-bold text-white flex items-center gap-1.5 ${
                      isFullscreen ? 'text-xs' : 'text-sm'
                    }`}>
                      <Layers className="w-4 h-4 text-purple-400" />
                      Histori Hasil Tanding
                    </h3>
                    <div className="flex gap-1.5">
                      <button
                        title="Simpan Partai Aktif"
                        onClick={() => {
                          if (soundEnabled) playPointSound();
                          // Save current match as a history record!
                          const record: PastMatch = {
                            id: uuid(),
                            eventName: matchState.eventName,
                            partai: matchState.partai,
                            kelas: matchState.kelas,
                            gender: matchState.gender,
                            kategoriUsia: matchState.kategoriUsia || "REMAJA",
                            tahapPertandingan: matchState.tahapPertandingan || "PENYISIHAN",
                            atlitMerah: matchState.atlitMerah,
                            atlitBiru: matchState.atlitBiru,
                            skorAkhirMerah: calculateFinalScore('MERAH', matchState),
                            skorAkhirBiru: calculateFinalScore('BIRU', matchState),
                            pemenang: determineWinner(matchState),
                            timestamp: Date.now(),
                            rawScores: matchState.rawScores,
                            validatedScores: matchState.validatedScores,
                            penaltiesMerah: matchState.penaltiesMerah,
                            penaltiesBiru: matchState.penaltiesBiru,
                            accumulatedPenaltyMerah: matchState.accumulatedPenaltyMerah,
                            accumulatedPenaltyBiru: matchState.accumulatedPenaltyBiru,
                            historyPenaltiesMerah: matchState.historyPenaltiesMerah,
                            historyPenaltiesBiru: matchState.historyPenaltiesBiru,
                            diskualifikasi: matchState.diskualifikasi,
                            logoKiri: matchState.logoKiri,
                            logoKanan: matchState.logoKanan,
                            wmpWon: matchState.wmpWon,
                            wmpPemenang: matchState.wmpPemenang,
                            victoryType: matchState.victoryType || (matchState.diskualifikasi ? 'DISKUALIFIKASI' : 'ANGKA')
                          };
                          const newHistory = [...history, record];
                          setHistory(newHistory);
                          saveMatchHistory(newHistory);
                          showToast("Partai tanding berhasil diarsipkan ke sejarah lokal!", "success");
                        }}
                        className="py-1 px-2 bg-purple-950 hover:bg-purple-900 rounded text-[9px] text-purple-300 font-bold font-mono"
                      >
                        Arsipkan
                      </button>
                      <button
                        onClick={() => {
                          triggerClick();
                          if (history.length === 0) {
                            showToast('Sejarah kosong!', 'warning');
                            return;
                          }
                          exportHistoryToExcel(history);
                        }}
                        className="py-1 px-2 bg-green-950 hover:bg-green-900 text-green-300 rounded text-[9px] font-bold font-mono flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> EXCEL
                      </button>
                    </div>
                  </div>

                  <div className={`overflow-y-auto space-y-2 pr-1 ${
                    isFullscreen ? 'flex-1 scrollbar-thin' : 'max-h-48'
                  }`}>
                    {history.length === 0 ? (
                      <div className={`text-center text-slate-500 font-mono ${isFullscreen ? 'py-2 text-[10px]' : 'py-6 text-xs'}`}>
                        Belum ada sejarah tanding diarsipkan.
                      </div>
                    ) : (
                      history.slice().reverse().map((h, hIdx) => {
                        const isSelected = selectedHistoryId === h.id || (selectedHistoryId === null && hIdx === 0);
                        return (
                          <div 
                            key={h.id} 
                            onClick={() => {
                              if (soundEnabled) playClickSound();
                              setSelectedHistoryId(h.id);
                            }}
                            className={`p-2.5 rounded-lg text-xs space-y-1 transition-all duration-350 cursor-pointer ${
                              isSelected 
                                ? 'bg-[#150a26] border border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-[1.01]' 
                                : 'bg-[#0a0315] border border-purple-950/80 hover:bg-[#110523] hover:border-purple-900/50'
                            }`}
                          >
                          <div className="flex justify-between text-[10px] text-purple-400 font-mono">
                            <span>Partai {h.partai} • Kelas {h.kelas}</span>
                            <span>{new Date(h.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          
                          <div className="grid grid-cols-5 text-center mt-1 items-center gap-0.5">
                            <span className="col-span-2 text-blue-300 font-bold uppercase truncate text-left">{h.atlitBiru.nama}</span>
                            <span className="font-mono bg-purple-950/20 py-0.5 text-slate-300 rounded font-bold">{h.skorAkhirBiru} - {h.skorAkhirMerah}</span>
                            <span className="col-span-2 text-red-300 font-bold uppercase truncate text-right">{h.atlitMerah.nama}</span>
                          </div>

                          <div className="flex justify-between items-center border-t border-purple-950/40 pt-1.5 mt-1">
                            <span className="text-[8px] uppercase tracking-wider text-amber-400 font-semibold">
                              PEMENANG: SUDUT {h.pemenang || 'DRAFT/SERI'}
                            </span>
                            <button
                              onClick={() => {
                                if (soundEnabled) playPointSound();
                                downloadMatchPDF(h);
                              }}
                              className="px-2 py-0.5 bg-red-950/60 hover:bg-red-900 border border-red-500/30 rounded text-[8px] text-red-450 font-bold font-mono uppercase flex items-center gap-1 transition-all cursor-pointer hover:border-red-500/60 active:scale-95"
                            >
                              <FileText className="w-2.5 h-2.5 text-red-400" /> PDF
                            </button>
                          </div>
                        </div>
                      ); })
                    )}
                  </div>

                  {/* TOMBOL STATISTIK PERTANDINGAN */}
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      if (history.length === 0) {
                        showToast("Belum ada sejarah tanding diarsipkan untuk menampilkan statistik.", "warning");
                        return;
                      }
                      
                      const currentMatch = history.find(h => h.id === selectedHistoryId) || history[history.length - 1];
                      if (currentMatch) {
                        let defaultCorner: 'BIRU' | 'MERAH' = 'BIRU';
                        if (currentMatch.pemenang === 'BIRU' || currentMatch.pemenang === 'MERAH') {
                          defaultCorner = currentMatch.pemenang;
                        } else if (currentMatch.pemenang === 'DISK_BIRU') {
                          defaultCorner = 'BIRU';
                        } else if (currentMatch.pemenang === 'DISK_MERAH') {
                          defaultCorner = 'MERAH';
                        }
                        setActiveStatsCorner(defaultCorner);
                      }
                      setShowStatsBanner(true);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl border border-indigo-500/40 bg-indigo-950/45 hover:bg-indigo-900/45 font-extrabold uppercase tracking-wider text-indigo-300 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-indigo-500/10 ${
                      isFullscreen ? 'text-[9px] mb-1' : 'text-[11px] mb-2'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                    STATISTIK PERTANDINGAN
                  </button>

                  {history.length > 0 && (
                    !showClearHistoryConfirm ? (
                      <button
                        onClick={() => {
                          triggerClick();
                          setShowClearHistoryConfirm(true);
                        }}
                        className={`w-full text-center bg-red-950/40 hover:bg-red-950 border border-red-900/30 text-red-400 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          isFullscreen ? 'py-1 text-[9px]' : 'py-1.5 text-[10px]'
                        }`}
                      >
                        <Trash2 className="w-3 h-3" /> Hapus Semua Sejarah
                      </button>
                    ) : (
                      <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-3 text-center space-y-2">
                        <span className="text-[10px] font-extrabold text-red-200 uppercase tracking-tight block">⚠️ HAPUS SEMUA SEJARAH TANDING?</span>
                        <p className="text-[9px] text-slate-400 leading-relaxed">Tindakan ini tidak dapat dibatalkan.</p>
                        <div className="flex gap-2 justify-center pt-1">
                          <button
                            onClick={() => {
                              if (soundEnabled) playBuzzer();
                              clearMatchHistory();
                              setHistory([]);
                              setShowClearHistoryConfirm(false);
                            }}
                            className="bg-red-650 hover:bg-red-550 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-md tracking-wider uppercase cursor-pointer transition-all active:scale-95 border border-red-500"
                          >
                            YA, HAPUS
                          </button>
                          <button
                            onClick={() => {
                              triggerClick();
                              setShowClearHistoryConfirm(false);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 border border-white/10 text-white font-extrabold text-[9px] px-2.5 py-1 rounded-md tracking-wider uppercase cursor-pointer transition-all active:scale-95"
                          >
                            BATAL
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* 🔒 Status Lisensi Button */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (soundEnabled) playClickSound();
                      setShowLicenseStatusPopup(true);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 font-bold uppercase tracking-wider text-[10px] text-purple-300 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    STATUS LISENSI
                  </button>
                </div>

              </div>

            </div>

            {/* Accidental Round End Prompt inside Secretary view */}
            <AnimatePresence>
              {matchState.showRoundEndPopUp && !matchState.showMatchEndPopUp && (
                peekRoundEnd ? (
                  <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-purple-900/90 to-slate-900/90 border-2 border-purple-500/60 p-3 rounded-xl flex items-center justify-between text-white shadow-[0_0_30px_rgba(168,85,247,0.3)] z-50 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-650/30 text-purple-400 flex items-center justify-center animate-pulse">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-black tracking-wider uppercase font-mono">BABAK {matchState.babakAktif} SELESAI</p>
                        <p className="text-[10px] text-gray-300">Skor Sementara: <span className="font-bold text-red-550">M {calculateFinalScore('MERAH', matchState)}</span> - <span className="font-bold text-blue-500">B {calculateFinalScore('BIRU', matchState)}</span> | Klik tombol kanan untuk dewan juri</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setPeekRoundEnd(false)}
                      className="px-3 py-1 bg-purple-700 hover:bg-purple-600 active:scale-95 text-[10px] font-extrabold uppercase tracking-widest rounded-lg cursor-pointer transition-all border border-purple-400"
                    >
                      Buka Overlay
                    </button>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-center"
                  >
                    <motion.div 
                      initial={{ scale: 0.9, y: 15 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 15 }}
                      transition={{ type: "spring", damping: 25, stiffness: 180 }}
                      className="bg-[#120722] border-2 border-purple-500 p-8 rounded-3xl max-w-4xl w-full shadow-[0_0_50px_rgba(168,85,247,0.4)] relative overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 text-left items-stretch"
                    >
                      {/* Decorative gradient header bar */}
                      <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 animate-pulse"></div>

                      {/* Left Column: Round Status Info & Intip Button */}
                      <div className="flex flex-col justify-between space-y-6 h-full text-center md:text-left">
                        <div className="space-y-4">
                          <div className="w-16 h-16 bg-purple-950/80 text-purple-450 border border-purple-500/55 rounded-full flex items-center justify-center mx-auto md:mx-0 shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-pulse">
                            <Clock className="w-8 h-8 animate-bounce" />
                          </div>
                          <div>
                            <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400 tracking-tight font-sans">
                              BABAK {matchState.babakAktif} SELESAI
                            </h3>
                            <p className="text-purple-450 text-[10px] tracking-widest uppercase font-mono font-bold animate-pulse mt-1">
                              WAKTU MATCH HABIS
                            </p>
                          </div>

                          <div className="p-4 bg-purple-950/25 border border-purple-900/40 rounded-xl text-left">
                            <span className="text-[9px] font-extrabold text-purple-400 tracking-widest uppercase block mb-1">Rekomendasi Transisi</span>
                            <p className="text-[10px] text-slate-300 leading-relaxed">
                              Skor sudut {calculateFinalScore('MERAH', matchState) > calculateFinalScore('BIRU', matchState) ? 'MERAH memimpin sementara' : calculateFinalScore('BIRU', matchState) > calculateFinalScore('MERAH', matchState) ? 'BIRU memimpin sementara' : 'SAMA KUAT/DRAW'}. Pilih <span className="font-semibold text-white">Ya</span> di panel sebelah kanan setelah dewan juri siap.
                            </p>
                          </div>

                          {/* GRID INFORMASI PARTAI SELANJUTNYA */}
                          {(() => {
                            const nextMatch = getNextMatchInfo();
                            return (
                              <div className="p-4 bg-[#110524]/80 border border-purple-500/30 rounded-2xl text-left space-y-2">
                                <div className="flex items-center justify-between border-b border-purple-500/20 pb-1.5">
                                  <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase flex items-center gap-1">
                                    ⏭️ PARTAI SELANJUTNYA (UPCOMING)
                                  </span>
                                  {nextMatch && (
                                    <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">
                                      Partai {nextMatch.partai}
                                    </span>
                                  )}
                                </div>
                                {nextMatch ? (
                                  <div className="grid grid-cols-2 gap-4 pt-1">
                                    {/* Atlit Biru Corner */}
                                    <div className="bg-gradient-to-r from-blue-900/80 to-transparent border-l-4 border-blue-500 shadow-lg p-2.5 rounded-xl flex flex-col justify-between">
                                      <div>
                                        <span className="text-[8px] font-bold text-blue-400 tracking-wider uppercase block">SUDUT BIRU</span>
                                        <span className="text-xs font-bold text-white truncate block mt-0.5">{nextMatch.biru.nama}</span>
                                      </div>
                                      <span className="text-[10px] text-zinc-400 mt-1 uppercase truncate block">{nextMatch.biru.kontingen}</span>
                                    </div>

                                    {/* Atlit Merah Corner */}
                                    <div className="bg-gradient-to-br from-red-900/80 to-transparent border-l-4 border-red-500 shadow-lg p-2.5 rounded-xl flex flex-col justify-between">
                                      <div>
                                        <span className="text-[8px] font-bold text-red-400 tracking-wider uppercase block">SUDUT MERAH</span>
                                        <span className="text-xs font-bold text-white truncate block mt-0.5">{nextMatch.merah.nama}</span>
                                      </div>
                                      <span className="text-[10px] text-zinc-400 mt-1 uppercase truncate block">{nextMatch.merah.kontingen}</span>
                                    </div>

                                    {/* Match Parameter Metadata Grid */}
                                    <div className="col-span-2 grid grid-cols-3 gap-2 bg-purple-950/30 border border-purple-500/10 p-2 rounded-lg text-[9px] text-purple-300 font-mono">
                                      <div>
                                        <span className="text-purple-400 font-bold block">KELAS:</span>
                                        <span className="text-white font-extrabold">{nextMatch.kelas}</span>
                                      </div>
                                      <div>
                                        <span className="text-purple-400 font-bold block">GENDER:</span>
                                        <span className="text-white font-extrabold">{nextMatch.gender}</span>
                                      </div>
                                      <div>
                                        <span className="text-purple-400 font-bold block">TAHAPAN:</span>
                                        <span className="text-white font-extrabold truncate block">{nextMatch.tahapPertandingan}</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="py-2 text-center text-[10px] text-zinc-500 font-mono italic">
                                    Tidak ada partai selanjutnya yang terdaftar di database Excel.
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex justify-center md:justify-start pt-2 border-t border-purple-500/5">
                          <button
                            onClick={() => setPeekRoundEnd(true)}
                            className="text-[11px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider cursor-pointer transition-colors"
                          >
                            Intip Lembar Ringkasan Nilai &rarr;
                          </button>
                        </div>
                      </div>

                      {/* Right Column: Comparison & Decisions */}
                      <div className="flex flex-col justify-center space-y-4 h-full border-t md:border-t-0 md:border-l border-purple-500/15 pt-6 md:pt-0 md:pl-8">
                        {/* STATS COMPARISON BOX */}
                        <div className="grid grid-cols-2 gap-4 py-1">
                          {/* Blue Corner Info */}
                          <div className="bg-gradient-to-r from-blue-900/80 to-transparent border-l-4 border-blue-500 shadow-xl p-4 rounded-2xl text-left relative overflow-hidden flex flex-col justify-between shadow-inner">
                            <div className="absolute right-[-8px] bottom-[-8px] font-black text-5xl text-blue-950/10 select-none">B</div>
                            <div className="z-10">
                              <span className="text-[9px] font-extrabold tracking-widest text-blue-400 uppercase block mb-0.5">SUDUT BIRU</span>
                              <span className="text-xs font-bold text-white truncate block">{matchState.atlitBiru.nama || 'Pesilat Biru'}</span>
                            </div>
                            <div className="mt-3 flex items-baseline justify-between z-10">
                              <span className="text-[10px] text-zinc-400">Total Skor</span>
                              <span className="text-xl font-black text-blue-500">{calculateFinalScore('BIRU', matchState)}</span>
                            </div>
                          </div>

                          {/* Red Corner Info */}
                          <div className="bg-gradient-to-br from-red-900/80 to-transparent border-l-4 border-red-500 shadow-xl p-4 rounded-2xl text-left relative overflow-hidden flex flex-col justify-between shadow-inner">
                            <div className="absolute right-[-8px] bottom-[-8px] font-black text-5xl text-red-950/10 select-none">M</div>
                            <div className="z-10">
                              <span className="text-[9px] font-extrabold tracking-widest text-red-400 uppercase block mb-0.5">SUDUT MERAH</span>
                              <span className="text-xs font-bold text-white truncate block">{matchState.atlitMerah.nama || 'Pesilat Merah'}</span>
                            </div>
                            <div className="mt-3 flex items-baseline justify-between z-10">
                              <span className="text-[10px] text-zinc-400">Total Skor</span>
                              <span className="text-xl font-black text-red-500">{calculateFinalScore('MERAH', matchState)}</span>
                            </div>
                          </div>
                        </div>

                        {/* KUNCI PANEL JURI CONTROLS (BABAK 1 dan 2) */}
                        <div className="border border-purple-500/20 bg-purple-950/25 p-4 rounded-2xl flex flex-col items-center gap-2.5 text-center">
                          <span className="text-[10px] font-extrabold tracking-widest text-amber-400 font-mono block uppercase animate-pulse">
                            🔒 MONITOR JURI SINKRON
                          </span>
                          {matchState.juriTerkunci ? (
                            <div className="w-full py-2 px-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 uppercase tracking-wide">
                              <Lock className="w-3.5 h-3.5" /> JURI TELAH DIKUNCI
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                triggerClick();
                                updateMatchState({
                                  ...matchState,
                                  juriTerkunci: true
                                });
                                showToast("Sukses Mengunci Panel Juri untuk Babak ini!", "success");
                              }}
                              className="w-full py-2 px-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl border border-red-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                            >
                              <Lock className="w-3.5 h-3.5 animate-pulse" /> KUNCI PANEL JURI
                            </button>
                          )}
                          <p className="text-[9px] text-zinc-400 font-sans font-medium">
                            *Jika belum ditekan, layar Panel Juri tidak akan terkunci dan juri masih bisa memantau.
                          </p>
                        </div>

                        <div className="bg-purple-950/40 border border-purple-500/20 p-4 rounded-2xl text-center space-y-3">
                          <span className="text-amber-400 font-mono text-[10px] uppercase font-bold tracking-widest block animate-pulse">KONFIRMASI TRANSISI BABAK</span>
                          <h4 className="text-white text-sm font-bold leading-snug">
                            Apakah Anda yakin ingin melanjutkan pertandingan ke <span className="text-green-400 font-bold bg-green-950/60 px-2 py-0.5 rounded border border-green-805">BABAK {Math.min(getMaxRounds(matchState.kategoriUsia), matchState.babakAktif + 1)}</span>?
                          </h4>
                          <p className="text-[10px] text-zinc-400 leading-relaxed">
                            Pilihan ini menghindari kesalahan penekanan babak oleh sekretaris. Seluruh panel juri dan dewan akan disinkronkan otomatis.
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            id="btn-confirm-tidak"
                            onClick={() => {
                              triggerClick();
                              updateMatchState({
                                ...matchState,
                                showRoundEndPopUp: false
                              });
                              showToast("Batal Lanjut, Tetap di Babak Saat Ini.", "info");
                            }}
                            className="flex-1 py-3 px-4 bg-[#1b102f] hover:bg-[#2c1c4d] border border-purple-500/30 text-purple-300 font-extrabold text-xs rounded-xl tracking-wider uppercase cursor-pointer transition-all active:scale-95 text-center"
                          >
                            TIDAK
                          </button>
                          
                          <button
                            id="btn-confirm-ya"
                            onClick={() => {
                              triggerClick();
                              const nextRound = Math.min(getMaxRounds(matchState.kategoriUsia), matchState.babakAktif + 1) as 1 | 2 | 3 | 4;
                              const currentRound = matchState.babakAktif;

                              let newPenaltiesMerah = { ...matchState.penaltiesMerah };
                              let newPenaltiesBiru = { ...matchState.penaltiesBiru };
                              let newAccumulatedPenaltyMerah = matchState.accumulatedPenaltyMerah || 0;
                              let newAccumulatedPenaltyBiru = matchState.accumulatedPenaltyBiru || 0;

                              if (nextRound > currentRound) {
                                let extraMerah = 0;
                                if (matchState.penaltiesMerah.teguran1) extraMerah += 1;
                                if (matchState.penaltiesMerah.teguran2) extraMerah += 2;

                                let extraBiru = 0;
                                if (matchState.penaltiesBiru.teguran1) extraBiru += 1;
                                if (matchState.penaltiesBiru.teguran2) extraBiru += 2;

                                newAccumulatedPenaltyMerah += extraMerah;
                                newAccumulatedPenaltyBiru += extraBiru;

                                newPenaltiesMerah = {
                                  ...newPenaltiesMerah,
                                  binaan1: false,
                                  binaan2: false,
                                  teguran1: false,
                                  teguran2: false,
                                };
                                newPenaltiesBiru = {
                                  ...newPenaltiesBiru,
                                  binaan1: false,
                                  binaan2: false,
                                  teguran1: false,
                                  teguran2: false,
                                };
                              }

                              updateMatchState({
                                ...matchState,
                                babakAktif: nextRound,
                                sisaWaktu: matchState.durasiBabak,
                                showRoundEndPopUp: false,
                                timerBerjalan: false,
                                accumulatedPenaltyMerah: newAccumulatedPenaltyMerah,
                                accumulatedPenaltyBiru: newAccumulatedPenaltyBiru,
                                penaltiesMerah: newPenaltiesMerah,
                                penaltiesBiru: newPenaltiesBiru,
                                juriTerkunci: false,
                                umumkanPemenang: false,
                              });
                              showToast(`Sukses Lanjut ke Babak ${nextRound}!`, "success");
                            }}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase cursor-pointer active:scale-95 transition-all text-center border border-green-500/30"
                          >
                            YA
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )
              )}
            </AnimatePresence>

            {/* WINNER POPUP ANNOUNCEMENT FOR SEKRETARIS */}
            <AnimatePresence>
              {(matchState.showMatchEndPopUp || matchState.diskualifikasi) && (() => {
              // Calculate nextPartai and look up if there is next match
              let nextPartai = "1";
              if (matchState.partai) {
                const matches = matchState.partai.match(/\d+/);
                if (matches) {
                  const num = parseInt(matches[0], 10);
                  nextPartai = matchState.partai.replace(matches[0], (num + 1).toString());
                } else {
                  nextPartai = (parseInt(matchState.partai, 10) || 0) + 1 + "";
                }
              }

              const normalizePartai = (p: any): string => {
                if (p === undefined || p === null) return '';
                const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                const matched = str.match(/\d+/);
                if (matched) {
                  return parseInt(matched[0], 10).toString();
                }
                return str;
              };

              const excelDataStr = localStorage.getItem('silat_excel_matches');
              let foundExcel = false;
              if (excelDataStr) {
                try {
                  const excelMatches = JSON.parse(excelDataStr);
                  if (Array.isArray(excelMatches)) {
                    const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(nextPartai));
                    if (matchRow) {
                      foundExcel = true;
                    }
                  }
                } catch (err) {
                  console.error(err);
                }
              }

              const noMoreMatches = !foundExcel;

              return (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ef9] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-2xl w-full bg-[#160a2acc] border-2 border-purple-500 p-8 rounded-3xl space-y-6 shadow-2xl"
                  >
                    <Award className="w-20 h-20 text-yellow-500 mx-auto animate-bounce" />
                    <div>
                      <span className="text-[10px] text-purple-400 uppercase font-bold tracking-widest font-mono">PANEL SEKRETARIS - KEPUTUSAN FINAL</span>
                      <h3 className="text-3xl font-black text-white tracking-tight uppercase mt-1">PERTANDINGAN TELAH SELESAI</h3>
                      {matchState.diskualifikasi && (
                        <span className="inline-block mt-2 bg-pink-950 text-pink-300 border border-pink-500/50 text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full font-mono animate-pulse">
                          Kemenangan Diskualifikasi (DQ)
                        </span>
                      )}
                    </div>

                    <div className={`p-5 rounded-2xl border transition-all duration-300 ${
                      determineWinner(matchState) === 'MERAH'
                        ? (isLightMode ? 'bg-red-50 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-red-950/80 border-red-500/50 shadow-[0_0_27px_rgba(239,68,68,0.3)]')
                        : determineWinner(matchState) === 'BIRU'
                        ? (isLightMode ? 'bg-blue-50 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-blue-950/80 border-blue-500/50 shadow-[0_0_27px_rgba(59,130,246,0.3)]')
                        : (isLightMode ? 'bg-white border-slate-200' : 'bg-[#0a0315] border-purple-950')
                    }`}>
                      {determineWinner(matchState) === 'MERAH' ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                            <span className="bg-red-600 text-white font-extrabold text-xs px-3 py-1 rounded font-mono uppercase tracking-widest shadow-sm">PEMENANG: SUDUT MERAH</span>
                            <span className={`font-bold text-xs px-3 py-1 rounded font-mono tracking-widest shadow-sm border ${isLightMode ? 'bg-red-100/85 text-red-700 border-red-200' : 'bg-red-500/20 text-red-200 border-red-500/30'}`}>
                              {getWinningReason(matchState)}
                            </span>
                          </div>
                          <h4 className={`text-4xl font-black mt-3 uppercase ${isLightMode ? 'text-red-900' : 'text-white'}`}>{matchState.atlitMerah.nama}</h4>
                          <p className={`text-sm font-bold mt-1 uppercase ${isLightMode ? 'text-red-600' : 'text-red-400'}`}>{matchState.atlitMerah.kontingen}</p>
                        </div>
                      ) : determineWinner(matchState) === 'BIRU' ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                            <span className="bg-blue-600 text-white font-extrabold text-xs px-3 py-1 rounded font-mono uppercase tracking-widest shadow-sm">PEMENANG: SUDUT BIRU</span>
                            <span className={`font-bold text-xs px-3 py-1 rounded font-mono tracking-widest shadow-sm border ${isLightMode ? 'bg-blue-100/85 text-blue-700 border-blue-200' : 'bg-blue-500/20 text-blue-200 border-blue-500/30'}`}>
                              {getWinningReason(matchState)}
                            </span>
                          </div>
                          <h4 className={`text-4xl font-black mt-3 uppercase ${isLightMode ? 'text-blue-900' : 'text-white'}`}>{matchState.atlitBiru.nama}</h4>
                          <p className={`text-sm font-bold mt-1 uppercase ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`}>{matchState.atlitBiru.kontingen}</p>
                        </div>
                      ) : (
                        <h4 className={`text-2xl font-black ${isLightMode ? 'text-slate-800' : 'text-white'}`}>DRAW / SERI (POIN AKHIR SAMA)</h4>
                      )}
                    </div>

                    {determineWinner(matchState) === null && (
                      <div className="text-center p-4 bg-[#1c0f30]/60 border border-purple-500/30 rounded-2xl space-y-3">
                        <span className="text-amber-400 font-mono text-[9px] uppercase font-bold tracking-widest block animate-pulse">OVERTIME / BABAK TAMBAHAN</span>
                        <p className="text-[11px] text-purple-200 leading-relaxed px-4">
                          Hasil pertandingan bernilai sama kuat bahkan setelah evaluasi poin hukuman & prestasi teknik. Silakan tekan tombol di bawah untuk menambah 1 Babak Tambahan.
                        </p>
                        <button
                          id="btn-lanjut-babak-4"
                          onClick={() => {
                            triggerClick();
                            const nextRound = (matchState.babakAktif + 1) as 1 | 2 | 3 | 4;
                            
                            let newPenaltiesMerah = { ...matchState.penaltiesMerah };
                            let newPenaltiesBiru = { ...matchState.penaltiesBiru };
                            let newAccumulatedPenaltyMerah = matchState.accumulatedPenaltyMerah || 0;
                            let newAccumulatedPenaltyBiru = matchState.accumulatedPenaltyBiru || 0;

                            let extraMerah = 0;
                            if (matchState.penaltiesMerah.teguran1) extraMerah += 1;
                            if (matchState.penaltiesMerah.teguran2) extraMerah += 2;

                            let extraBiru = 0;
                            if (matchState.penaltiesBiru.teguran1) extraBiru += 1;
                            if (matchState.penaltiesBiru.teguran2) extraBiru += 2;

                            newAccumulatedPenaltyMerah += extraMerah;
                            newAccumulatedPenaltyBiru += extraBiru;

                            newPenaltiesMerah = {
                              ...newPenaltiesMerah,
                              binaan1: false,
                              binaan2: false,
                              teguran1: false,
                              teguran2: false,
                            };
                            newPenaltiesBiru = {
                              ...newPenaltiesBiru,
                              binaan1: false,
                              binaan2: false,
                              teguran1: false,
                              teguran2: false,
                            };

                            updateMatchState({
                              ...matchState,
                              babakAktif: nextRound,
                              sisaWaktu: matchState.durasiBabak,
                              showRoundEndPopUp: false,
                              showMatchEndPopUp: false,
                              timerBerjalan: false,
                              accumulatedPenaltyMerah: newAccumulatedPenaltyMerah,
                              accumulatedPenaltyBiru: newAccumulatedPenaltyBiru,
                              penaltiesMerah: newPenaltiesMerah,
                              penaltiesBiru: newPenaltiesBiru,
                              statusPertandingan: 'BELUM_MULAI'
                            });
                            showToast(`Sukses Lanjut ke Babak ${nextRound} (Babak Tambahan)!`, "success");
                          }}
                          className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 hover:from-amber-500 hover:to-yellow-500 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase cursor-pointer active:scale-95 transition-all text-center border border-amber-500/30 font-sans"
                        >
                          LANJUT BABAK {matchState.babakAktif + 1} (BABAK TAMBAHAN)
                        </button>
                      </div>
                    )}

                    {/* GRID INFORMASI PARTAI SELANJUTNYA (BABAK 3 SELESAI / MATCH FINISHED) */}
                    {(() => {
                      const nextMatch = getNextMatchInfo();
                      return (
                        <div className="p-4 bg-[#110524]/80 border border-purple-500/30 rounded-2xl text-left space-y-2">
                          <div className="flex items-center justify-between border-b border-purple-500/20 pb-1.5">
                            <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase flex items-center gap-1">
                              ⏭️ PARTAI SELANJUTNYA (UPCOMING)
                            </span>
                            {nextMatch && (
                              <span className="text-[10px] text-amber-400 font-mono font-bold uppercase">
                                Partai {nextMatch.partai}
                              </span>
                            )}
                          </div>
                          {nextMatch ? (
                            <div className="grid grid-cols-2 gap-4 pt-1">
                              {/* Atlit Biru Corner */}
                              <div className="bg-gradient-to-r from-blue-900/80 to-transparent border-l-4 border-blue-500 shadow-lg p-2.5 rounded-xl flex flex-col justify-between">
                                <div>
                                  <span className="text-[8px] font-bold text-blue-400 tracking-wider uppercase block">SUDUT BIRU</span>
                                  <span className="text-xs font-bold text-white truncate block mt-0.5">{nextMatch.biru.nama}</span>
                                </div>
                                <span className="text-[10px] text-zinc-400 mt-1 uppercase truncate block">{nextMatch.biru.kontingen}</span>
                              </div>

                              {/* Atlit Merah Corner */}
                              <div className="bg-gradient-to-br from-red-900/80 to-transparent border-l-4 border-red-500 shadow-lg p-2.5 rounded-xl flex flex-col justify-between">
                                <div>
                                  <span className="text-[8px] font-bold text-red-400 tracking-wider uppercase block">SUDUT MERAH</span>
                                  <span className="text-xs font-bold text-white truncate block mt-0.5">{nextMatch.merah.nama}</span>
                                </div>
                                <span className="text-[10px] text-zinc-400 mt-1 uppercase truncate block">{nextMatch.merah.kontingen}</span>
                              </div>

                              {/* Match Parameter Grid */}
                              <div className="col-span-2 grid grid-cols-3 gap-2 bg-purple-950/30 border border-purple-500/10 p-2 rounded-lg text-[9px] text-purple-300 font-mono">
                                <div>
                                  <span className="text-purple-400 font-bold block">KELAS:</span>
                                  <span className="text-white font-extrabold">{nextMatch.kelas}</span>
                                </div>
                                <div>
                                  <span className="text-purple-400 font-bold block">GENDER:</span>
                                  <span className="text-white font-extrabold">{nextMatch.gender}</span>
                                </div>
                                <div>
                                  <span className="text-purple-400 font-bold block">TAHAPAN:</span>
                                  <span className="text-white font-extrabold truncate block">{nextMatch.tahapPertandingan}</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-2 text-center text-[10px] text-zinc-500 font-mono italic">
                              Tidak ada partai selanjutnya yang terdaftar di database Excel.
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* UMUMKAN PEMENANG CONTROLS */}
                    <div className="border border-purple-500/20 bg-purple-950/25 p-4 rounded-xl flex flex-col items-center gap-2 text-center">
                      <span className="text-[10px] font-extrabold tracking-widest text-purple-400 font-mono block uppercase">
                        📢 PUBLISH HASIL PERTANDINGAN
                      </span>
                      {matchState.umumkanPemenang ? (
                        <div className="w-full py-3 px-4 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-black uppercase rounded-xl flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> PEMENANG DIUMUMKAN DI SEMUA LAYAR
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            triggerClick();
                            if (soundEnabled) playBuzzer();
                            updateMatchState({
                              ...matchState,
                              umumkanPemenang: true,
                              juriTerkunci: true
                            });
                            showToast("Pemenang Berhasil diumumkan di Layar Monitor dan Panel Juri!", "success");
                          }}
                          className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl border border-purple-400/30 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                        >
                          <Award className="w-4 h-4 animate-bounce" /> UMUMKAN PEMENANG
                        </button>
                      )}
                      <p className="text-[9px] text-zinc-400">
                        *Jika belum ditekan, notifikasi Pemenang tidak ditayangkan di Monitor & Panel Juri.
                      </p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <button
                        onClick={() => {
                          triggerClick();
                          // 1. Archive current completed match
                          const record: PastMatch = {
                            id: uuid(),
                            eventName: matchState.eventName,
                            partai: matchState.partai,
                            kelas: matchState.kelas,
                            gender: matchState.gender,
                            kategoriUsia: matchState.kategoriUsia || "REMAJA",
                            tahapPertandingan: matchState.tahapPertandingan || "PENYISIHAN",
                            atlitMerah: matchState.atlitMerah,
                            atlitBiru: matchState.atlitBiru,
                            skorAkhirMerah: calculateFinalScore('MERAH', matchState),
                            skorAkhirBiru: calculateFinalScore('BIRU', matchState),
                            pemenang: determineWinner(matchState),
                            timestamp: Date.now(),
                            rawScores: matchState.rawScores,
                            validatedScores: matchState.validatedScores,
                            penaltiesMerah: matchState.penaltiesMerah,
                            penaltiesBiru: matchState.penaltiesBiru,
                            accumulatedPenaltyMerah: matchState.accumulatedPenaltyMerah,
                            accumulatedPenaltyBiru: matchState.accumulatedPenaltyBiru,
                            historyPenaltiesMerah: matchState.historyPenaltiesMerah,
                            historyPenaltiesBiru: matchState.historyPenaltiesBiru,
                            diskualifikasi: matchState.diskualifikasi,
                            logoKiri: matchState.logoKiri,
                            logoKanan: matchState.logoKanan,
                            wmpWon: matchState.wmpWon,
                            wmpPemenang: matchState.wmpPemenang,
                            victoryType: matchState.victoryType || (matchState.diskualifikasi ? 'DISKUALIFIKASI' : 'ANGKA')
                          };
                          const newHistory = [...history, record];
                          setHistory(newHistory);
                          saveMatchHistory(newHistory);

                          // 2. Clear & Prepare for Next Partai
                          let targetPartai = "1";
                          if (matchState.partai) {
                            const matches = matchState.partai.match(/\d+/);
                            if (matches) {
                              const num = parseInt(matches[0], 10);
                              targetPartai = matchState.partai.replace(matches[0], (num + 1).toString());
                            } else {
                              targetPartai = (parseInt(matchState.partai, 10) || 0) + 1 + "";
                            }
                          }

                          let nextAtlitMerah = { nama: "", kontingen: "" };
                          let nextAtlitBiru = { nama: "", kontingen: "" };
                          let nextKelas = matchState.kelas;
                          let nextGender = matchState.gender;
                          let nextEventName = matchState.eventName;
                          let nextKategoriUsia = matchState.kategoriUsia || 'REMAJA';
                          let nextTahapPertandingan = matchState.tahapPertandingan || 'PENYISIHAN';
                          let nextDurasi = matchState.durasiBabak;

                          let foundExcelInner = false;
                          if (excelDataStr) {
                            try {
                              const excelMatches = JSON.parse(excelDataStr);
                              if (Array.isArray(excelMatches)) {
                                const matchRow = excelMatches.find((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(targetPartai));
                                if (matchRow) {
                                  foundExcelInner = true;
                                  nextAtlitMerah = {
                                    nama: (matchRow['Nama Pesilat Merah'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Merah'] || "").toString().toUpperCase()
                                  };
                                  nextAtlitBiru = {
                                    nama: (matchRow['Nama Pesilat Biru'] || "").toString().toUpperCase(),
                                    kontingen: (matchRow['Kontingen Biru'] || "").toString().toUpperCase()
                                  };
                                  if (matchRow['Kelas']) nextKelas = matchRow['Kelas'].toString().toUpperCase();
                                  if (matchRow['Gender']) nextGender = matchRow['Gender'].toString().toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA';
                                  // Preserve custom event name instead of resetting to default
                                  // if (matchRow['Nama Event']) nextEventName = matchRow['Nama Event'].toString().toUpperCase();
                                  
                                  if (matchRow['Kategori Usia']) {
                                    let kUsia = matchRow['Kategori Usia'].toString().trim().toUpperCase();
                                    if (kUsia.replace(' ', '-').replace('_', '-') === 'PRA-REMAJA') {
                                  kUsia = 'PRA REMAJA';
                                }
                                    nextKategoriUsia = kUsia;
                                    
                                    if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                                      nextDurasi = 120;
                                    } else if (kUsia === 'MASTER A') {
                                      nextDurasi = 90;
                                    } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                                      nextDurasi = 60;
                                    }
                                  }
                                  if (matchRow['Tahap Pertandingan']) {
                                    nextTahapPertandingan = matchRow['Tahap Pertandingan'].toString().trim().toUpperCase();
                                  }

                                  if (matchRow['Durasi Babak (Menit)']) {
                                    const durStr = matchRow['Durasi Babak (Menit)'].toString().trim();
                                    if (durStr.includes(':')) {
                                      const parts = durStr.split(':');
                                      const mins = parseInt(parts[0], 10) || 0;
                                      const secs = parseInt(parts[1], 10) || 0;
                                      nextDurasi = (mins * 60) + secs;
                                    } else {
                                      const parsedSecs = parseInt(durStr, 10);
                                      if (!isNaN(parsedSecs) && parsedSecs > 0) {
                                        if (parsedSecs < 10) {
                                          nextDurasi = parsedSecs * 60;
                                        } else {
                                          nextDurasi = parsedSecs;
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }

                          updateMatchState({
                            ...matchState,
                            partai: targetPartai,
                            kelas: nextKelas,
                            gender: nextGender,
                            eventName: nextEventName,
                            kategoriUsia: nextKategoriUsia,
                            tahapPertandingan: nextTahapPertandingan,
                            durasiBabak: nextDurasi,
                            sisaWaktu: nextDurasi,
                            statusPertandingan: 'BELUM_MULAI',
                            timerBerjalan: false,
                            validatedScores: [],
                            rawScores: [],
                            penaltiesMerah: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            penaltiesBiru: {
                              binaan1: false, binaan2: false,
                              teguran1: false, teguran2: false,
                              peringatan1: false, peringatan2: false,
                            },
                            accumulatedPenaltyMerah: 0,
                            accumulatedPenaltyBiru: 0,
                            historyPenaltiesMerah: {},
                            historyPenaltiesBiru: {},
                            babakAktif: 1,
                            diskualifikasi: null,
                            pemenang: null,
                            verifikasi: {
                              id: "", status: 'IDLE', jenis: 'JATUHAN', juriVotes: {}, result: null
                            },
                            showRoundEndPopUp: false,
                            showMatchEndPopUp: false,
                            juriTerkunci: false,
                            umumkanPemenang: false,
                            atlitMerah: nextAtlitMerah,
                            atlitBiru: nextAtlitBiru
                          });

                          setLocalPartai(targetPartai);
                          setLocalKelas(nextKelas);
                          setLocalAtlitMerahNama(nextAtlitMerah.nama);
                          setLocalAtlitMerahKontingen(nextAtlitMerah.kontingen);
                          setLocalAtlitBiruNama(nextAtlitBiru.nama);
                          setLocalAtlitBiruKontingen(nextAtlitBiru.kontingen);

                          if (noMoreMatches) {
                            showToast("PARTAI DIARSIPKAN! Semua pertandingan telah selesai, papan skor direset & dikunci.", "success");
                          } else {
                            if (foundExcelInner) {
                              showToast(`PARTAI BERHASIL DIARSIPKAN! Data Partai ${targetPartai} berhasil dimuat dari Excel.`, "success");
                            } else {
                              showToast(`PARTAI BERHASIL DIARSIPKAN! Silakan masukkan pesilat Partai Baru ${targetPartai}.`, "success");
                            }
                          }
                        }}
                        className={`w-full py-4 bg-gradient-to-r ${
                          noMoreMatches 
                            ? 'from-red-700 via-rose-800 to-red-950 hover:from-red-600 hover:to-red-800' 
                            : 'from-purple-700 via-pink-700 to-amber-600 hover:from-purple-600 hover:to-amber-500'
                        } text-white font-extrabold rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer border border-purple-500/50`}
                      >
                        {noMoreMatches ? (
                          <>
                            <Sparkles className="w-4 h-4 text-rose-300 animate-spin" />
                            Akhiri dan Reset/Kunci
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                            Lanjutkan Partai Selanjutnya (Arsipkan)
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          triggerClick();
                          // Close popup but keep current match data for review as-is
                          updateMatchState({
                            ...matchState,
                            showMatchEndPopUp: false,
                            diskualifikasi: null,
                            pemenang: null
                          });
                        }}
                        className="text-xs text-purple-400 hover:text-white transition-colors underline uppercase font-semibold cursor-pointer block mx-auto mt-2"
                      >
                        Tutup & Tinjau Kembali Skor
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
                );
              })()}
            </AnimatePresence>

            <AnimatePresence>
              {showNextMatchesPopup && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-[#00000ed2] backdrop-blur-md flex flex-col items-center justify-center p-4 md:p-6 z-[9999] text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-2xl w-full bg-[#110524] border border-purple-500/40 p-6 rounded-2xl flex flex-col max-h-[85vh] text-left shadow-2xl"
                  >
                  {/* Header / Title */}
                  <div className="flex justify-between items-center border-b border-purple-900/30 pb-3 mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-purple-400" />
                      <h3 className="text-xl font-black text-white tracking-tight uppercase">Daftar Sisa Partai Pertandingan</h3>
                    </div>
                    <button
                      onClick={() => {
                        triggerClick();
                        setShowNextMatchesPopup(false);
                      }}
                      className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Excel Data List */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {(() => {
                      const excelDataStr = localStorage.getItem('silat_excel_matches');
                      if (!excelDataStr) {
                        return (
                          <div className="p-8 text-center text-slate-400 font-medium space-y-2">
                            <p>Belum ada data partai dari unggahan Excel.</p>
                            <p className="text-xs text-slate-500 font-mono">Unggah template Excel terlebih dahulu pada menu "Akselerator Turnamen & Penjadwalan" di bawah.</p>
                          </div>
                        );
                      }

                      try {
                        const excelMatches = JSON.parse(excelDataStr);
                        if (!Array.isArray(excelMatches) || excelMatches.length === 0) {
                          return (
                            <div className="p-8 text-center text-slate-400 font-medium space-y-2">
                              <p>Belum ada data partai dari unggahan Excel.</p>
                              <p className="text-xs text-slate-500 font-mono">Unggah template Excel terlebih dahulu pada menu "Akselerator Turnamen & Penjadwalan" di bawah.</p>
                            </div>
                          );
                        }

                        // We can find the current match's index so we can highlight where we are and show subsequent/remaining matches.
                        const normalizePartai = (p: any): string => {
                          if (p === undefined || p === null) return '';
                          const str = String(p).trim().toLowerCase().replace(/\s+/g, '');
                          const matched = str.match(/\d+/);
                          if (matched) return parseInt(matched[0], 10).toString();
                          return str;
                        };

                        const currentIndex = excelMatches.findIndex((rowAny: any) => normalizePartai(rowAny['Partai']) === normalizePartai(matchState.partai));

                        return (
                          <div className="space-y-2.5">
                            {excelMatches.map((rowAny: any, idx: number) => {
                              const isCurrent = idx === currentIndex;
                              const isPast = idx < currentIndex;
                              const isUpcoming = idx > currentIndex;

                              let bgClass = "bg-[#160b2d]/50 border-purple-900/25 text-slate-300";
                              if (isCurrent) {
                                bgClass = "bg-[#25104d] border-purple-500 ring-1 ring-purple-500/50 text-white shadow-lg";
                              } else if (isPast) {
                                bgClass = "bg-[#0b0416]/30 border-purple-950/20 text-slate-500 opacity-60";
                              }

                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-xl border transition-all text-sm flex flex-col md:flex-row md:items-center justify-between gap-2 ${bgClass}`}
                                >
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                                        isCurrent 
                                          ? 'bg-purple-600 text-white animate-pulse' 
                                          : isPast 
                                            ? 'bg-slate-800 text-slate-400' 
                                            : 'bg-purple-950/60 text-purple-400 font-bold'
                                      }`}>
                                        PARTAI {rowAny['Partai']}
                                      </span>
                                      
                                      <span className="text-xs font-bold text-amber-500 uppercase">
                                        {rowAny['Kelas'] ? `KELAS ${rowAny['Kelas']}` : ''} ({rowAny['Gender'] || 'PUTRA'})
                                      </span>

                                      <span className="text-[10px] bg-slate-900/60 text-slate-400 font-semibold px-1.5 py-0.5 rounded uppercase">
                                        {rowAny['Kategori Usia'] || 'REMAJA'}
                                      </span>

                                      {isCurrent && (
                                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded animate-pulse">
                                          SEDANG BERLANGSUNG
                                        </span>
                                      )}
                                    </div>

                                    {/* Athlete names */}
                                    <div className="grid grid-cols-2 gap-4 pt-1">
                                      <div>
                                        <span className="text-[10px] text-blue-400 block font-bold font-sans">SUDUT BIRU</span>
                                        <p className="font-bold uppercase tracking-tight text-xs md:text-sm truncate">
                                          {rowAny['Nama Pesilat Biru'] || '-'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 uppercase truncate">
                                          {rowAny['Kontingen Biru'] || '-'}
                                        </p>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-red-400 block font-bold font-sans">SUDUT MERAH</span>
                                        <p className="font-bold uppercase tracking-tight text-xs md:text-sm truncate">
                                          {rowAny['Nama Pesilat Merah'] || '-'}
                                        </p>
                                        <p className="text-[10px] text-slate-400 uppercase truncate">
                                          {rowAny['Kontingen Merah'] || '-'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 md:pl-4 border-t md:border-t-0 md:border-l border-purple-900/20 pt-2 md:pt-0">
                                    <p className="text-[10px] text-slate-400 font-mono leading-none">
                                      {rowAny['Tahap Pertandingan'] || 'PENYISIHAN'}
                                    </p>
                                    <p className="text-xs font-bold text-purple-300 mt-1">
                                      {rowAny['Durasi Babak (Menit)'] || '02:00'}
                                    </p>
                                    {isUpcoming && idx === currentIndex + 1 && (
                                      <span className="text-[9px] text-[#0f111d] bg-amber-400 font-black uppercase rounded-md px-1.5 py-0.5 mt-1 inline-block animate-bounce shadow">
                                        BERIKUTNYA
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      } catch (err) {
                        return (
                          <div className="p-4 text-center text-red-400 text-xs font-serif">
                            Gagal membaca data partai dari excel.
                          </div>
                        );
                      }
                    })()}
                  </div>

                  {/* Close Footer button */}
                  <div className="border-t border-purple-900/30 pt-4 mt-4 text-right shrink-0">
                    <button
                      onClick={() => {
                        triggerClick();
                        setShowNextMatchesPopup(false);
                      }}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs uppercase cursor-pointer transition-all active:scale-[0.97] shadow-md border border-purple-500/20"
                    >
                      TUTUP
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

            {/* POPUP 2: GENERATE BAGAN MODEL */}
            <AnimatePresence>
              {showGenerateBaganPopup && (() => {
                const N = baganAthletes.length;
                const roundsData = getDynamicBracketRounds(baganAthletes);
                const totalRounds = roundsData.length;

                return (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 220 }}
                      className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-6xl w-full max-h-[95vh] flex flex-col overflow-hidden shadow-2xl text-slate-100"
                    >
                    
                    {/* Modal Header */}
                    <div className="p-4 bg-purple-950/20 border-b border-purple-900/30 flex justify-between items-center shrink-0">
                      <div>
                        <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-sm md:text-base uppercase tracking-wider flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-purple-400" />
                          GENERATOR BAGAN DYNAMIC (BELINGKARI 8 - 64 SLOTS / UP TO 50 ATHLETES)
                        </h3>
                        <p className="text-slate-400 text-[10px]">Tingkatkan performa kejuaraan dengan bagan otomatis up to 64 slot atlit. Format input diimpor dari Excel atau di-input manual.</p>
                      </div>
                      <button
                        onClick={() => { triggerClick(); setShowGenerateBaganPopup(false); }}
                        className="p-1 px-2.5 rounded-lg bg-red-950/30 text-red-400 border border-red-500/20 hover:bg-red-900/40 hover:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        X
                      </button>
                    </div>

                    <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
                      
                      {/* Left Column: athlete inputs (5 cols) */}
                      <div className="lg:col-span-5 space-y-4">
                        
                        {/* Excel Upload Zone */}
                        <div className="border border-dashed border-purple-500/20 bg-purple-950/10 hover:bg-purple-950/15 rounded-xl p-3.5 text-center transition-all">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Impor Cepat Dari Excel</span>
                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            id="bagan-excel-file"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                await handleBaganFileUpload(e.target.files[0]);
                              }
                            }}
                          />
                          <div className="flex flex-wrap gap-2 justify-center">
                            <label
                              htmlFor="bagan-excel-file"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/70 border border-purple-500/30 font-bold text-xs text-purple-300 cursor-pointer transition-all active:scale-[0.98]"
                            >
                              <Upload className="w-3.5 h-3.5" /> Pilih File Excel
                            </label>
                            <button
                              onClick={() => {
                                triggerClick();
                                downloadBaganExcelTemplate();
                                showToast('Template Excel Bagan berhasil diunduh!', 'success');
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 font-bold text-xs cursor-pointer transition-all active:scale-[0.98]"
                            >
                              <Download className="w-3.5 h-3.5" /> Unduh Template
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-500 mt-1.5 font-sans">Template Roster berisi kolom <b>Nama</b> dan <b>Kontingen</b>. (Ukurannya menyesuaikan jumlah baris impor, maksimal 64 baris)</p>
                        </div>

                        {/* Parameter Pertandingan Bagan */}
                        <div className="bg-purple-955/40 border border-purple-500/20 p-3.5 rounded-xl space-y-2.5">
                          <span className="text-[10px] uppercase font-black text-purple-300 tracking-wider block">ID, KATEGORI & KAPASITAS BAGAN</span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">KELAS</label>
                              <input
                                type="text"
                                value={baganKelas}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setBaganKelas(val);
                                  localStorage.setItem('silat_bagan_kelas', val);
                                }}
                                className="w-full bg-slate-950 border border-slate-800 text-xs px-2 py-1.5 rounded-lg focus:border-purple-500 text-purple-300 font-bold uppercase outline-none"
                                placeholder="CONTOH: A"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">GENDER</label>
                              <select
                                value={baganGender}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBaganGender(val);
                                  localStorage.setItem('silat_bagan_gender', val);
                                }}
                                className="w-full bg-[#12092e] bg-slate-950 border border-slate-800 text-xs px-1.5 py-1.5 rounded-lg focus:border-purple-500 text-purple-300 font-bold outline-none cursor-pointer"
                              >
                                <option value="PUTRA" className="bg-[#12092e] text-white font-semibold">PUTRA</option>
                                <option value="PUTRI" className="bg-[#12092e] text-white font-semibold">PUTRI</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">GOLONGAN</label>
                              <input
                                type="text"
                                value={baganUsia}
                                onChange={(e) => {
                                  const val = e.target.value.toUpperCase();
                                  setBaganUsia(val);
                                  localStorage.setItem('silat_bagan_usia', val);
                                }}
                                className="w-full bg-slate-950 border border-slate-800 text-xs px-2 py-1.5 rounded-lg focus:border-purple-500 text-purple-300 font-bold uppercase outline-none"
                                placeholder="CONTOH: REMAJA"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/50">
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">JUMLAH ATLIT</label>
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={`${baganAthletes.filter((a: any) => a.nama).length} ATLIT`}
                                className="w-full bg-slate-950 border border-slate-800 text-[11px] px-2 py-1.5 rounded-lg text-emerald-400 font-mono font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1">KAPASITAS BAGAN</label>
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={`${baganAthletes.length} SLOT`}
                                className="w-full bg-slate-950 border border-slate-800 text-[11px] px-2 py-1.5 rounded-lg text-purple-400 font-mono font-bold outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 font-bold block mb-1 font-mono">TAHAP LUT-1</label>
                              <select
                                value={baganStartingStage}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBaganStartingStage(val);
                                  localStorage.setItem('silat_bagan_starting_stage', val);
                                }}
                                className="w-full bg-[#12092e] bg-slate-950 border border-slate-800 text-[11px] px-1.5 py-1.5 rounded-lg focus:border-purple-500 text-purple-300 font-bold outline-none cursor-pointer"
                              >
                                <option value="PENYISIHAN" className="bg-[#12092e] text-white font-semibold">PENYISIHAN</option>
                                <option value="PEREMPAT FINAL" className="bg-[#12092e] text-white font-semibold">PEREMPAT FINAL</option>
                                <option value="BABAK UTAMA" className="bg-[#12092e] text-white font-semibold">BABAK UTAMA</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Manual Input Rows */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider">Editor Roster Atlit ({baganAthletes.length} Slot)</span>
                            <div className="flex flex-wrap gap-1 md:gap-1.5 justify-end">
                              <button
                                onClick={() => {
                                  triggerClick();
                                  const newA = [...baganAthletes, { nama: "", kontingen: "" }];
                                  setBaganAthletes(newA);
                                  localStorage.setItem('silat_bagan_athletes', JSON.stringify(newA));
                                  showToast('Slot baru ditambahkan.', 'success');
                                }}
                                className="text-[9px] px-2 py-1 bg-purple-900/40 hover:bg-purple-900/70 text-purple-300 border border-purple-500/20 rounded font-bold uppercase transition cursor-pointer"
                              >
                                + Slot
                              </button>
                              <button
                                onClick={() => {
                                  triggerClick();
                                  if (baganAthletes.length > 2) {
                                    const newA = baganAthletes.slice(0, -1);
                                    setBaganAthletes(newA);
                                    localStorage.setItem('silat_bagan_athletes', JSON.stringify(newA));
                                    showToast('Slot terakhir dihapus.', 'info');
                                  } else {
                                    showToast('Minimal harus ada 2 slot.', 'warning');
                                  }
                                }}
                                className="text-[9px] px-2 py-1 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-500/20 rounded font-bold uppercase transition cursor-pointer"
                              >
                                - Slot
                              </button>
                              <button
                                onClick={() => {
                                  triggerClick();
                                  const shuffled = [...baganAthletes].sort(() => Math.random() - 0.5);
                                  setBaganAthletes(shuffled);
                                  localStorage.setItem('silat_bagan_athletes', JSON.stringify(shuffled));
                                  showToast('Daftar Atlit berhasil diacak (shuffled)!', 'success');
                                }}
                                className="text-[9px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-pink-300 border border-pink-500/20 rounded font-bold uppercase transition cursor-pointer"
                              >
                                Shuffle
                              </button>
                              <button
                                onClick={() => {
                                  triggerClick();
                                  const cleared = Array(baganAthletes.length).fill(null).map((_, i) => ({ nama: "", kontingen: "" }));
                                  setBaganAthletes(cleared);
                                  localStorage.removeItem('silat_bagan_athletes');
                                  showToast('Daftar atlet dikosongkan.', 'info');
                                }}
                                className="text-[9px] px-2 py-1 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-500/20 rounded font-bold uppercase transition cursor-pointer"
                              >
                                Kosongkan
                              </button>
                            </div>
                          </div>

                          {/* List Inputs */}
                          <div className="max-h-[38vh] overflow-y-auto space-y-2 pr-1 border border-slate-800/60 p-2 rounded-xl bg-slate-950/20">
                            {baganAthletes.map((ath, idx) => {
                              const item = ath || { nama: "", kontingen: "" };
                              return (
                                <div key={idx} className="flex gap-2 items-center bg-slate-905 border border-slate-800/80 rounded-lg p-1.5">
                                  <span className="font-mono text-[9px] text-purple-400 w-5 text-center font-bold">#{idx + 1}</span>
                                  <div className="grid grid-cols-2 gap-2 flex-1">
                                    <input
                                      type="text"
                                      placeholder={`Nama Atlit ${idx + 1}`}
                                      value={item.nama}
                                      onChange={(e) => {
                                        const newA = [...baganAthletes];
                                        newA[idx] = { ...newA[idx], nama: e.target.value.toUpperCase() };
                                        setBaganAthletes(newA);
                                        localStorage.setItem('silat_bagan_athletes', JSON.stringify(newA));
                                      }}
                                      className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10.5px] text-white focus:border-purple-500 outline-none w-full"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Kontingen"
                                      value={item.kontingen}
                                      onChange={(e) => {
                                        const newA = [...baganAthletes];
                                        newA[idx] = { ...newA[idx], kontingen: e.target.value.toUpperCase() };
                                        setBaganAthletes(newA);
                                        localStorage.setItem('silat_bagan_athletes', JSON.stringify(newA));
                                      }}
                                      className="bg-slate-950 border border-slate-800 px-2 py-1 rounded text-[10.5px] text-slate-300 focus:border-purple-500 outline-none w-full"
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Dynamic Visual Tree Render (7 cols) */}
                      <div className="lg:col-span-7 bg-slate-955 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
                        
                        <div className="flex justify-between items-center mb-1 border-b border-slate-800/40 pb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">Preview Bracket Interaktif ({N} Slot)</span>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[8px] text-slate-500 font-mono">RESPONSIVE COMPILING WORK</span>
                          </div>
                        </div>

                        {/* Beautiful horizontally scrollable tree container */}
                        <div className="flex-1 overflow-x-auto overflow-y-hidden select-text mt-2 pr-1 pb-2">
                          <div className="flex gap-4 h-full py-1" style={{ minWidth: `${totalRounds * 180}px` }}>
                            
                            {roundsData.map((roundObj: any, rIdx: number) => {
                              return (
                                <div key={rIdx} className="flex-1 flex flex-col justify-around h-full min-w-[170px] relative pt-6 border-r border-slate-900/10 last:border-r-0">
                                  <div className="absolute top-0 left-0 right-2 text-center text-[7.5px] font-black tracking-widest text-slate-400 uppercase font-mono bg-slate-900 border border-slate-800 rounded py-0.5 select-none">
                                    {roundObj.roundName}
                                  </div>

                                  <div className="space-y-4 flex flex-col justify-around h-full">
                                    {roundObj.matches.map((m: any) => {
                                      const isP1Bye = !m.red.nama;
                                      const isP2Bye = !m.blue.nama;
                                      return (
                                        <div key={m.partaiId} className="border border-slate-800 bg-slate-900 rounded-lg overflow-hidden text-[9px] shadow hover:border-purple-500/20 transition-all">
                                          <div className="bg-slate-950 px-1.5 py-0.5 text-slate-500 text-[7.5px] font-mono border-b border-slate-800/25">
                                            PARTAI {m.partaiId}
                                          </div>
                                          <div className="p-1 px-1.5 border-l-2 border-blue-500">
                                            <p className="font-bold text-blue-400 truncate">{isP2Bye ? `(SLOT BLUE P${m.partaiId})` : m.blue.nama}</p>
                                            <p className="text-[7.5px] text-slate-400 truncate">{isP2Bye ? "BYE" : m.blue.kontingen}</p>
                                          </div>
                                          <div className="p-1 px-1.5 border-t border-slate-800/80 border-l-2 border-red-500">
                                            <p className="font-bold text-red-400 truncate">{isP1Bye ? `(SLOT RED P${m.partaiId})` : m.red.nama}</p>
                                            <p className="text-[7.5px] text-slate-400 truncate">{isP1Bye ? "BYE" : m.red.kontingen}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Champion Trophy Block at the extreme right of tree */}
                            <div className="flex flex-col justify-center items-center px-4 shrink-0 min-w-[130px] h-full">
                              <div className="p-2.5 bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 rounded-xl text-center shadow-lg w-full flex flex-col items-center">
                                <span className="text-[14px] animate-bounce">🏆</span>
                                <span className="font-black text-amber-400 text-[8px] block uppercase my-0.5">CHAMPION</span>
                                <div className="h-4.5 w-full bg-slate-950/80 rounded border border-slate-850 flex items-center justify-center text-[7px] text-amber-500/90 font-mono font-bold">
                                  WINNER P{roundsData[roundsData.length - 1]?.matches[0]?.partaiId || (N - 1)}
                                </div>
                              </div>
                            </div>

                          </div>
                        </div>

                        <div className="text-slate-500 text-[8px] mt-1.5 italic font-sans text-center">
                          *Geser horizontal ke kanan untuk melihat rincian melaju ke semifinal, final & juara.
                        </div>

                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">Daftar Terisi: <b>{baganAthletes.filter((a: any) => a.nama).length} / {baganAthletes.length} Atlit</b></span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { triggerClick(); setShowGenerateBaganPopup(false); }}
                          className="px-4 py-2 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          TUTUP PANEL
                        </button>
                        <button
                          onClick={() => {
                            triggerClick();
                            const N = baganAthletes.length;
                            const roundsData = getDynamicBracketRounds(baganAthletes);
                            if (roundsData.length === 0) {
                              showToast("Tidak ada pertandingan untuk dikirim!", "warning");
                              return;
                            }

                            // Calculate starting party offset based on existing jadwalLines length
                            const startPartaiOffset = jadwalLines.length;

                            // 1. Flat-map all matches across all rounds
                            const allRawMatches: { roundName: string; match: any }[] = [];
                            roundsData.forEach((roundObj: any) => {
                              roundObj.matches.forEach((m: any) => {
                                allRawMatches.push({
                                  roundName: roundObj.roundName,
                                  match: m
                                });
                              });
                            });

                            // 2. Resolve every match sequentially in the bracket tree to handle BYE propagation
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

                            // 3. Filter only real matches (exclude BYE matches)
                            const realMatches = allRawMatches.filter(item => {
                              const resolved = resolvedMatches.get(item.match.partaiId);
                              return resolved && !resolved.isByeMatch;
                            });

                            // 4. Map original bracket partaiId to newly assigned sequential partai number
                            const originalToNewPartaiMap = new Map<number, number>();
                            realMatches.forEach((item, index) => {
                              const newPartaiNumber = index + 1 + startPartaiOffset;
                              originalToNewPartaiMap.set(item.match.partaiId, newPartaiNumber);
                            });

                            // 5. Construct the schedule entries
                            const newMatches: any[] = [];
                            realMatches.forEach((item, index) => {
                              const newPartaiNumber = index + 1 + startPartaiOffset;
                              const m = item.match;
                              const resolved = resolvedMatches.get(m.partaiId);

                              const getAthleteScheduleName = (p: any) => {
                                if (!p) return "";
                                if (p.isBye || p.nama === "BYE") return "BYE";
                                if (p.type === 'placeholder') {
                                  const refNewPartai = originalToNewPartaiMap.get(p.fromPartai);
                                  return `MENUNGGU PEMENANG PARTAI ${refNewPartai !== undefined ? refNewPartai : p.fromPartai + startPartaiOffset}`;
                                }
                                return p.nama || "";
                              };

                              const getAthleteScheduleKontingen = (p: any) => {
                                if (!p) return "";
                                if (p.isBye || p.nama === "BYE" || p.type === 'placeholder') return "SUDUT KOSONG";
                                return p.kontingen || "";
                              };

                              const pRed = resolved.actualRed;
                              const pBlue = resolved.actualBlue;

                              newMatches.push({
                                partai: String(newPartaiNumber),
                                kelas: baganKelas,
                                gender: baganGender,
                                kategoriUsia: baganUsia,
                                tahapPertandingan: item.roundName,
                                atlitMerah: {
                                  nama: getAthleteScheduleName(pRed),
                                  kontingen: getAthleteScheduleKontingen(pRed)
                                },
                                atlitBiru: {
                                  nama: getAthleteScheduleName(pBlue),
                                  kontingen: getAthleteScheduleKontingen(pBlue)
                                }
                              });
                            });

                            const updatedJadwal = [...jadwalLines, ...newMatches];
                            setJadwalLines(updatedJadwal);
                            localStorage.setItem('silat_jadwal_lines', JSON.stringify(updatedJadwal));
                            showToast(`Sukses mengirimkan ${newMatches.length} partai ke Generate Jadwal!`, "success");
                          }}
                          disabled={baganAthletes.filter((a: any) => a.nama).length === 0}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 border ${
                            baganAthletes.filter((a: any) => a.nama).length > 0
                              ? 'bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white border-emerald-500/20 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                          }`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> KIRIM KE JADWAL ({baganAthletes.length} Slot)
                        </button>
                        <button
                          onClick={() => {
                            triggerClick();
                            const filtered = baganAthletes.filter((a: any) => a.nama);
                            downloadTournamentBracketPDF(
                              matchState.eventName || "Kejuaraan Pencak Silat",
                              baganAthletes,
                              `BAGAN KATEGORI ${baganKelas} ${baganGender}`,
                              baganKelas,
                              baganGender,
                              baganUsia
                            );
                            showToast("Memulai unduhan PDF Bagan!", "success");
                          }}
                          disabled={baganAthletes.filter((a: any) => a.nama).length === 0}
                          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 border ${
                            baganAthletes.filter((a: any) => a.nama).length > 0
                              ? 'bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white border-purple-500/20 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                          }`}
                        >
                          <Download className="w-3.5 h-3.5" /> UNDUH PDF BAGAN
                        </button>
                      </div>
                    </div>

                    </motion.div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* POPUP 3: GENERATE JADWAL MODEL */}
            <AnimatePresence>
              {showGenerateJadwalPopup && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-slate-100"
                  >
                  
                  {/* Header */}
                  <div className="p-4 bg-indigo-950/20 border-b border-indigo-900/30 flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 text-sm md:text-base uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        GENERATOR DAN PARAMETER JADWAL PERTANDINGAN
                      </h3>
                      <p className="text-slate-400 text-[10px]">Unggah berkas jadwal pertandingan (.xlsx), edit data secara presisi, lalu gunakan rincian partai langsung di lapangan.</p>
                    </div>
                    <button
                      onClick={() => { triggerClick(); setShowGenerateJadwalPopup(false); }}
                      className="p-1 px-2.5 rounded-lg bg-red-950/30 text-red-400 border border-red-500/20 hover:bg-red-900/40 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      X
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 overflow-y-auto space-y-4 font-sans text-xs">
                    
                    {/* Control Bar: Excel Upload & reset */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-indigo-950/10 border border-indigo-500/10 p-3.5 rounded-xl">
                      <div className="md:col-span-6">
                        <p className="text-xs font-black text-indigo-300 uppercase tracking-wide">Unggah Spreadsheet Jadwal Partai</p>
                        <p className="text-[10px] text-slate-400">Pastikan kolom spreadsheet mengandung: Partai, Kelas, Gender, Kategori Usia, Tahap, Nama Merah, Kontingen Merah, Nama Biru, Kontingen Biru</p>
                      </div>
                      <div className="md:col-span-6 flex flex-col gap-2 w-full max-w-lg ml-auto">
                        {/* Baris 1: Gelanggang (kiri) & Unduh Template (kanan) */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* GELANGGANG Selector Dropdown Button */}
                          <div className="relative w-full">
                            <button
                              onClick={() => {
                                triggerClick();
                                setShowGelanggangDropdown(!showGelanggangDropdown);
                              }}
                              className="w-full h-10 px-4 bg-indigo-950/40 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/30 font-bold text-xs rounded-xl cursor-pointer transition flex items-center justify-between focus:outline-none shadow-md"
                            >
                              <span className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                <span>GELANGGANG: <b className="text-cyan-400 font-extrabold">{selectedGelanggang}</b></span>
                              </span>
                              <ChevronDown className={`w-3.5 h-3.5 text-indigo-300 transition-transform duration-200 ${showGelanggangDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {/* Dropdown Options List */}
                            {showGelanggangDropdown && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setShowGelanggangDropdown(false)} 
                                />
                                <div className="absolute right-0 mt-2 w-full bg-slate-900 border border-indigo-500/35 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-fade-in">
                                  {['GELANGGANG I', 'GELANGGANG II', 'GELANGGANG III', 'GELANGGANG IV', 'GELANGGANG V'].map((gName) => (
                                    <button
                                      key={gName}
                                      onClick={() => {
                                        triggerClick();
                                        setSelectedGelanggang(gName);
                                        localStorage.setItem('silat_selected_gelanggang', gName);
                                        setShowGelanggangDropdown(false);
                                        showToast(`Set Gelanggang ke: ${gName}`, 'success');
                                      }}
                                      className={`w-full text-left px-4 py-2.5 hover:bg-indigo-950 text-xs transition cursor-pointer font-bold flex items-center justify-between ${
                                        selectedGelanggang === gName ? 'text-cyan-400 bg-indigo-900/30' : 'text-slate-300'
                                      }`}
                                    >
                                      <span>{gName}</span>
                                      {selectedGelanggang === gName && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              triggerClick();
                              downloadJadwalExcelTemplate();
                              showToast('Template Spreadsheet Jadwal berhasil diunduh!', 'success');
                            }}
                            className="w-full h-10 px-4 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5 shadow-md"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-400" /> UNDUH TEMPLATE
                          </button>
                        </div>

                        {/* Baris 2: Kosongkan Jadwal (kiri) & Impor File Jadwal (kanan) */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              triggerClick();
                              setJadwalLines([]);
                              localStorage.removeItem('silat_jadwal_lines');
                              showToast('Jadwal pertandingan dikosongkan.', 'info');
                            }}
                            className="w-full h-10 px-4 hover:bg-red-900/30 text-red-400 border border-red-500/20 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 bg-red-950/15 shadow-md"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" /> KOSONGKAN JADWAL
                          </button>

                          <input
                            type="file"
                            accept=".xlsx, .xls"
                            id="jadwal-excel-file"
                            className="hidden"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                await handleJadwalFileUpload(e.target.files[0]);
                              }
                            }}
                          />
                          <label
                            htmlFor="jadwal-excel-file"
                            className="w-full h-10 px-4 hover:bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 font-bold text-xs rounded-xl cursor-pointer transition flex items-center justify-center gap-1.5 bg-indigo-950/25 shadow-md text-center"
                          >
                            <Upload className="w-3.5 h-3.5 text-indigo-400" /> IMPOR FILE JADWAL
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Schedule Table Preview */}
                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                      <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center text-[10px]">
                        <span className="font-bold text-slate-300 uppercase">Daftar Jadwal Pertandingan Yang Terbuka ({jadwalLines.length} Partai)</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              triggerClick();
                              if (jadwalLines.length === 0) {
                                showToast('Belum ada jadwal pertandingan untuk di-shuffle/rotasi!', 'warning');
                                return;
                              }
                              const updated = jadwalLines.map(row => {
                                const tempMerah = { ...row.atlitMerah };
                                const tempBiru = { ...row.atlitBiru };
                                return {
                                  ...row,
                                  atlitMerah: tempBiru,
                                  atlitBiru: tempMerah
                                };
                              });
                              setJadwalLines(updated);
                              localStorage.setItem('silat_jadwal_lines', JSON.stringify(updated));
                              showToast('Sukses merotasi sudut Atlit Merah ↔ Atlit Biru!', 'success');
                            }}
                            className="text-amber-400 hover:text-amber-300 font-bold uppercase select-none flex items-center gap-0.5 cursor-pointer text-[9px] md:text-[10px]"
                          >
                            <Shuffle className="w-3 h-3 animate-pulse" /> SHUFFLE
                          </button>
                          <button
                            onClick={() => {
                              triggerClick();
                              const newParty = {
                                partai: String(jadwalLines.length + 1),
                                kelas: "B",
                                gender: "PUTRA",
                                kategoriUsia: "REMAJA",
                                tahapPertandingan: "PENYISIHAN",
                                atlitMerah: { nama: "PESILAT MERAH BARU", kontingen: "CONTINGENT MERAH" },
                                atlitBiru: { nama: "PESILAT BIRU BARU", kontingen: "CONTINGENT BIRU" }
                              };
                              const updated = [...jadwalLines, newParty];
                              setJadwalLines(updated);
                              localStorage.setItem('silat_jadwal_lines', JSON.stringify(updated));
                              showToast('Satu Baris Jadwal Kosong Baru Ditambahkan!', 'success');
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-bold uppercase select-none flex items-center gap-0.5 cursor-pointer text-[9px] md:text-[10px]"
                          >
                            <Plus className="w-3 h-3 animate-pulse" /> Tambah Baris Partai
                          </button>
                        </div>
                      </div>

                      {jadwalLines.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 text-xs font-sans">
                          Belum ada jadwal pertandingan yang diimpor. Silahkan klik impor untuk mengunggah jadwal spreadsheet Excel (.xlsx).
                        </div>
                      ) : (
                        <div className="overflow-x-auto max-h-[48vh]">
                          <table className="w-full text-left border-collapse text-[11px] font-sans">
                            <thead>
                              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono text-[9px] md:text-[10px]">
                                <th className="p-2 w-12 text-center font-bold">PARTAI</th>
                                <th className="p-2 w-14 text-center">KELAS</th>
                                <th className="p-2 w-16 text-center">GENDER</th>
                                <th className="p-2 w-20 text-center">USIA</th>
                                <th className="p-2 w-24 text-center">TAHAPAN</th>
                                <th className="p-2 bg-blue-950/10 border-l border-slate-850 text-blue-400">SUDUT BIRU (ATLET & REGU)</th>
                                <th className="p-2 bg-red-950/10 border-l border-slate-850 text-red-400">SUDUT MERAH (ATLET & REGU)</th>
                                <th className="p-2 text-center w-28">FITUR KONTROL</th>
                              </tr>
                            </thead>
                            <tbody>
                              {jadwalLines.map((row, idx) => {
                                return (
                                  <tr key={idx} className="border-b border-slate-800/60 hover:bg-slate-900/40 transition">
                                    <td className="p-2 text-center font-mono font-bold text-white">
                                      <input
                                        type="text"
                                        value={row.partai}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].partai = e.target.value;
                                          setJadwalLines(copy);
                                        }}
                                        className="bg-transparent text-center border-none focus:bg-slate-950 rounded w-full font-bold focus:outline-purple-500 py-0.5"
                                      />
                                    </td>
                                    <td className="p-2 text-center uppercase">
                                      <input
                                        type="text"
                                        value={row.kelas}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].kelas = e.target.value.toUpperCase();
                                          setJadwalLines(copy);
                                        }}
                                        className="bg-transparent text-center border-none focus:bg-slate-950 rounded w-full focus:outline-purple-500 py-0.5"
                                      />
                                    </td>
                                    <td className="p-2 text-center font-mono text-[10px]">
                                      <select
                                        value={row.gender}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].gender = e.target.value;
                                          setJadwalLines(copy);
                                        }}
                                        className="bg-slate-900 border-none rounded py-0.5 w-full text-center text-[10px] focus:outline-purple-500"
                                      >
                                        <option value="PUTRA">PUTRA</option>
                                        <option value="PUTRI">PUTRI</option>
                                      </select>
                                    </td>
                                    <td className="p-2 text-center">
                                      <input
                                        type="text"
                                        value={row.kategoriUsia}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].kategoriUsia = e.target.value.toUpperCase();
                                          setJadwalLines(copy);
                                        }}
                                        className="bg-transparent text-center border-none focus:bg-slate-950 rounded w-full focus:outline-purple-500 py-0.5"
                                      />
                                    </td>
                                    <td className="p-2 text-center">
                                      <input
                                        type="text"
                                        value={row.tahapPertandingan}
                                        onChange={(e) => {
                                          const copy = [...jadwalLines];
                                          copy[idx].tahapPertandingan = e.target.value.toUpperCase();
                                          setJadwalLines(copy);
                                        }}
                                        className="bg-transparent text-center border-none focus:bg-slate-950 rounded w-full focus:outline-purple-500 py-0.5"
                                      />
                                    </td>
                                    
                                    {/* Sudut Biru Fields */}
                                    <td className="p-2 bg-blue-950/5 border-l border-slate-800">
                                      <div className="space-y-1">
                                        <input
                                          type="text"
                                          placeholder="Nama Pesilat"
                                          value={row.atlitBiru?.nama}
                                          onChange={(e) => {
                                            const copy = [...jadwalLines];
                                            copy[idx].atlitBiru = { ...copy[idx].atlitBiru, nama: e.target.value.toUpperCase() };
                                            setJadwalLines(copy);
                                          }}
                                          className="bg-slate-950/60 border border-blue-500/15 px-1.5 py-0.5 rounded text-[11px] font-bold text-blue-300 focus:outline-blue-500 w-full"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Kontingen"
                                          value={row.atlitBiru?.kontingen}
                                          onChange={(e) => {
                                            const copy = [...jadwalLines];
                                            copy[idx].atlitBiru = { ...copy[idx].atlitBiru, kontingen: e.target.value.toUpperCase() };
                                            setJadwalLines(copy);
                                          }}
                                          className="bg-slate-950/60 border border-slate-800/80 px-1.5 py-0 rounded text-[9px] text-slate-400 focus:outline-blue-500 w-full"
                                        />
                                      </div>
                                    </td>

                                    {/* Sudut Merah Fields */}
                                    <td className="p-2 bg-red-950/5 border-l border-slate-800">
                                      <div className="space-y-1">
                                        <input
                                          type="text"
                                          placeholder="Nama Pesilat"
                                          value={row.atlitMerah?.nama}
                                          onChange={(e) => {
                                            const copy = [...jadwalLines];
                                            copy[idx].atlitMerah = { ...copy[idx].atlitMerah, nama: e.target.value.toUpperCase() };
                                            setJadwalLines(copy);
                                          }}
                                          className="bg-slate-950/60 border border-red-500/15 px-1.5 py-0.5 rounded text-[11px] font-bold text-red-300 focus:outline-red-500 w-full"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Kontingen"
                                          value={row.atlitMerah?.kontingen}
                                          onChange={(e) => {
                                            const copy = [...jadwalLines];
                                            copy[idx].atlitMerah = { ...copy[idx].atlitMerah, kontingen: e.target.value.toUpperCase() };
                                            setJadwalLines(copy);
                                          }}
                                          className="bg-slate-950/60 border border-slate-800/80 px-1.5 py-0 rounded text-[9px] text-slate-400 focus:outline-red-500 w-full"
                                        />
                                      </div>
                                    </td>

                                    {/* Use Button */}
                                    <td className="p-2 text-center border-l border-slate-800">
                                      <button
                                        onClick={() => {
                                          triggerClick();
                                          
                                          // Update matchState and local input variables in sequence
                                          const dur = matchState.durasiBabak || 120;
                                          updateMatchState({
                                            ...matchState,
                                            partai: row.partai,
                                            kelas: row.kelas,
                                            gender: row.gender,
                                            kategoriUsia: row.kategoriUsia,
                                            tahapPertandingan: row.tahapPertandingan,
                                            durasiBabak: dur,
                                            sisaWaktu: dur,
                                            babakAktif: 1,
                                            atlitMerah: {
                                              nama: row.atlitMerah?.nama || "",
                                              kontingen: row.atlitMerah?.kontingen || ""
                                            },
                                            atlitBiru: {
                                              nama: row.atlitBiru?.nama || "",
                                              kontingen: row.atlitBiru?.kontingen || ""
                                            }
                                          });

                                          // Sync the local states inside Sekretaris Panel form
                                          setLocalPartai(row.partai);
                                          setLocalKelas(row.kelas);
                                          setLocalAtlitMerahNama(row.atlitMerah?.nama || "");
                                          setLocalAtlitMerahKontingen(row.atlitMerah?.kontingen || "");
                                          setLocalAtlitBiruNama(row.atlitBiru?.nama || "");
                                          setLocalAtlitBiruKontingen(row.atlitBiru?.kontingen || "");

                                          showToast(`Sukses memuat Partai ${row.partai} ke Cockpit Arena!`, "success");
                                          setShowGenerateJadwalPopup(false);
                                        }}
                                        className="w-full py-1.5 rounded-lg bg-indigo-900/70 hover:bg-indigo-805 border border-indigo-505 text-white font-black text-[9px] uppercase tracking-wider transition hover:shadow active:scale-95 cursor-pointer"
                                      >
                                        Gunakan Jadwal
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">Daftar Jadwal: <b>{jadwalLines.length} Partai Pertandingan</b></span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { triggerClick(); setShowGenerateJadwalPopup(false); }}
                        className="px-4 py-2 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-lg transition cursor-pointer"
                      >
                        TUTUP
                      </button>
                      <button
                        onClick={() => {
                          triggerClick();
                          downloadMatchSchedulePDF(
                            matchState.eventName || "Kejuaraan Pencak Silat", 
                            jadwalLines,
                            matchState.logoKiri,
                            matchState.logoKanan,
                            selectedGelanggang
                          );
                          showToast("Memulai unduhan PDF Jadwal!", "success");
                        }}
                        disabled={jadwalLines.length === 0}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 border ${
                          jadwalLines.length > 0
                            ? 'bg-gradient-to-r from-indigo-800 to-cyan-800 hover:from-indigo-700 hover:to-cyan-700 text-white border-indigo-500/20 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" /> UNDUH PDF JADWAL
                      </button>
                      <button
                        onClick={() => {
                          triggerClick();
                          if (jadwalLines.length === 0) {
                            showToast("Belum ada jadwal untuk diterapkan!", "warning");
                            return;
                          }

                          // 1. Map and save all schedules to silat_excel_matches for Secretary Panel queue
                          const mappedMatches = jadwalLines.map((row) => ({
                            'Partai': row.partai,
                            'Kelas': row.kelas,
                            'Gender': row.gender,
                            'Kategori Usia': row.kategoriUsia,
                            'Tahap Pertandingan': row.tahapPertandingan,
                            'Nama Pesilat Merah': row.atlitMerah?.nama || '',
                            'Kontingen Merah': row.atlitMerah?.kontingen || '',
                            'Nama Pesilat Biru': row.atlitBiru?.nama || '',
                            'Kontingen Biru': row.atlitBiru?.kontingen || '',
                            'Nama Event': matchState.eventName || 'Kejuaraan Pencak Silat',
                            'Durasi Babak (Menit)': ["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER A", "USIA DINI"].includes(row.kategoriUsia) ? '01:30' : (row.kategoriUsia === "MASTER 2" || row.kategoriUsia === "MASTER B" ? "01:00" : "02:00")
                          }));

                          try {
                            localStorage.setItem('silat_excel_matches', JSON.stringify(mappedMatches));
                          } catch (err) {
                            console.warn("Gagal menyimpan jadwal pertandingan massal:", err);
                          }

                          // 2. Load the first party as the active match in Cockpit / Arena
                          const firstRow = jadwalLines[0];
                          if (firstRow) {
                            let dur = 120;
                            const kUsia = firstRow.kategoriUsia || 'REMAJA';
                            if (["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "USIA DINI", "MASTER 1", "MASTER A"].includes(kUsia)) {
                              dur = 90;
                            } else if (kUsia === 'REMAJA' || kUsia === 'DEWASA') {
                              dur = 120;
                            } else if (kUsia === 'MASTER A') {
                              dur = 90;
                            } else if (kUsia === 'MASTER 2' || kUsia === 'MASTER B') {
                              dur = 60;
                            }

                            updateMatchState({
                              ...matchState,
                              partai: firstRow.partai,
                              kelas: firstRow.kelas,
                              gender: firstRow.gender,
                              kategoriUsia: firstRow.kategoriUsia,
                              tahapPertandingan: firstRow.tahapPertandingan,
                              durasiBabak: dur,
                              sisaWaktu: dur,
                              babakAktif: 1,
                              atlitMerah: {
                                nama: firstRow.atlitMerah?.nama || "",
                                kontingen: firstRow.atlitMerah?.kontingen || ""
                              },
                              atlitBiru: {
                                nama: firstRow.atlitBiru?.nama || "",
                                kontingen: firstRow.atlitBiru?.kontingen || ""
                              },
                              silat_excel_matches: mappedMatches
                            });

                            // 3. Sync the local input fields in Sekretaris Panel Form
                            setLocalPartai(firstRow.partai);
                            setLocalKelas(firstRow.kelas);
                            setLocalAtlitMerahNama(firstRow.atlitMerah?.nama || "");
                            setLocalAtlitMerahKontingen(firstRow.atlitMerah?.kontingen || "");
                            setLocalAtlitBiruNama(firstRow.atlitBiru?.nama || "");
                            setLocalAtlitBiruKontingen(firstRow.atlitBiru?.kontingen || "");
                          }

                          showToast(`Sukses menerapkan ${jadwalLines.length} Partai ke Parameter Panel Sekretaris!`, "success");
                          setShowGenerateJadwalPopup(false);
                        }}
                        disabled={jadwalLines.length === 0}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-97 border ${
                          jadwalLines.length > 0
                            ? 'bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 text-white border-emerald-500/20 cursor-pointer'
                            : 'bg-slate-800 text-slate-500 border-slate-700/30 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> TERAPKAN SEMUA JADWAL
                      </button>
                    </div>
                  </div>

                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          </motion.div>
        )}

        {/* MONITOR DISPLAY (Main Spectacular Arena Board View) */}
        {role === 'MONITOR' && (
          <motion.div
            key="monitor"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={`flex-1 flex flex-col w-full mx-auto justify-between ${
              isFullscreen 
                ? 'h-screen max-h-screen overflow-hidden p-2.5 md:p-4 space-y-2' 
                : 'p-4 max-w-7xl space-y-2'
            }`}
          >
            
            {/* Main Spectacular Event Display Header */}
            <div className={`relative flex items-center justify-between bg-gradient-to-r from-transparent via-purple-900/35 via-indigo-950/20 via-blue-900/35 to-transparent shadow-[0_0_25px_rgba(168,85,247,0.15)] rounded-2xl select-none transition-all duration-300 overflow-hidden ${
              isFullscreen 
                ? 'py-2 px-4 md:px-16 min-h-[75px] md:min-h-[95px]' 
                : 'py-4 px-4 md:px-16 min-h-[110px] md:min-h-[140px]'
            }`}>
              {/* Gambar Pesilat Kiri (Pojok Kiri Ujung Grid) */}
              <img 
                src="/assets/pesilatkiri.svg?v=15" 
                onError={(e) => { e.currentTarget.src = "/assets/pesilat1.png?v=15"; }}
                alt="Pesilat Kiri" 
                className="absolute left-0 bottom-0 h-full w-auto object-contain pointer-events-none z-0"
                referrerPolicy="no-referrer"
              />

              {/* Center Content - Span full width to optimize for big monitors */}
              <div className="text-center flex-1 mx-auto max-w-6xl w-full py-1 relative z-10">
                <h2 
                  className={`font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 uppercase tracking-tighter drop-shadow-md leading-none whitespace-normal break-words text-center ${
                    isFullscreen ? 'text-xl md:text-3xl lg:text-4xl xl:text-5xl font-stretch-75' : 'text-lg md:text-2xl lg:text-4xl xl:text-5xl'
                  }`}
                  style={{ 
                    fontFamily: "'Arial Narrow', 'sans-serif-condensed', system-ui, sans-serif",
                    textAlign: "center"
                  }}
                >
                  {matchState.eventName}
                </h2>
                <div className={`text-slate-300 font-mono font-black tracking-widest uppercase ${
                  isFullscreen ? 'text-xs md:text-lg lg:text-xl xl:text-2xl mt-1.5' : 'text-xs md:text-lg lg:text-xl mt-2'
                }`}>
                  PARTAI <span className="text-purple-300 font-extrabold">{String(matchState.partai || '').toUpperCase().replace(/^PARTAI\s+/i, '').trim()}</span>{' '}
                  <span className="mx-2 text-slate-500">|</span>{' '}
                  KELAS <span className="text-purple-300 font-extrabold">{String(matchState.kelas || '').toUpperCase().replace(/^KELAS\s+/i, '').trim()}</span>{' '}
                  <span className="text-purple-300 font-bold">({String(matchState.gender || '').toUpperCase().trim()})</span>{' '}
                  <span className="text-purple-300 font-extrabold">{String(matchState.kategoriUsia || "REMAJA").toUpperCase().trim()}</span>{' '}
                  <span className="mx-2 text-slate-500">|</span>{' '}
                  <span className="text-purple-300 font-extrabold">{String(matchState.tahapPertandingan || "PENYISIHAN").toUpperCase().trim()}</span>
                </div>
              </div>

              {/* Gambar Pesilat Kanan (Pojok Kanan Ujung Grid, berada di belakang tombol fullscreen jika ada) */}
              <img 
                src="/assets/pesilatkanan.svg?v=15" 
                onError={(e) => { e.currentTarget.src = "/assets/pesilat2.png?v=15"; }}
                alt="Pesilat Kanan" 
                className="absolute right-0 bottom-0 h-full w-auto object-contain pointer-events-none z-0"
                referrerPolicy="no-referrer"
              />

              {/* Fullscreen Toggle placed absolutely to the right without disrupting the centering */}
              {!isFullscreen && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 select-none z-20">
                  <button
                    onClick={toggleFullscreen}
                    className="bg-purple-950/60 hover:bg-purple-900/60 text-purple-300 hover:text-white rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-all active:scale-95 cursor-pointer flex items-center justify-center shadow-lg p-2 md:p-3"
                    title="Layar Penuh"
                  >
                    <Maximize2 className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Giant Mirrored Scores facing each other (The Absolute main event element) */}
            <div className={`grid grid-cols-1 md:grid-cols-11 items-stretch flex-1 ${
              isFullscreen ? 'gap-2 my-1 md:my-1.5' : 'gap-4 my-2'
            }`}>
              
              {/* Blue Arena Corner Column Side */}
              <div className={`md:col-span-4 flex flex-col justify-between ${
                isFullscreen ? 'gap-1.5' : 'gap-3'
              }`}>
                {/* Blue Arena Corner Total Score (Left Side) */}
                <div className={`relative overflow-hidden border text-center transition-all duration-300 flex-1 flex flex-col justify-between ${
                  isFullscreen ? 'pt-4 rounded-none' : 'pt-8 rounded-none'
                } ${
                  biruUnggul 
                    ? 'border-blue-400 bg-gradient-to-b from-blue-900/40 to-[#0c122c]/60 shadow-[0_0_25px_rgba(59,130,246,0.7),inset_0_0_15px_rgba(59,130,246,0.35)] scale-[1.01]' 
                    : glowBiru 
                      ? 'bg-blue-650/30 border-yellow-400/90 shadow-xl shadow-blue-500/20 scale-102' 
                      : 'bg-gradient-to-b from-blue-950/40 to-[#0c122c]/50 border-blue-900/40'
                }`}>
                  {/* Golden Beam Tracing Light Overlay */}
                  {biruUnggul && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                      <defs>
                        <linearGradient id="goldGradientBiru" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffd700" stopOpacity="0" />
                          <stop offset="30%" stopColor="#ffd700" stopOpacity="0.8" />
                          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                          <stop offset="70%" stopColor="#ffd700" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="none"
                        pathLength="100"
                        stroke="url(#goldGradientBiru)"
                        strokeWidth="4"
                        className="animate-border-beam"
                      />
                    </svg>
                  )}
                  {/* Background Text "BIRU" styled exactly like Council/Dewan Panel */}
                  <div className={`absolute top-1 left-4 font-black italic select-none pointer-events-none z-0 transition-all duration-300 ${
                    isFullscreen ? 'text-[36px] md:text-[45px]' : 'text-[32px] md:text-[40px]'
                  } ${biruUnggul ? 'gold-shine-text opacity-100' : ''}`}
                  style={!biruUnggul ? { 
                    color: 'rgba(59, 130, 246, 0.22)',
                    textShadow: '0 0 1px rgba(59, 130, 246, 0.5)' 
                  } : undefined}>BIRU</div>
                  
                  {/* Body: Angka Nilai Besar */}
                  <div className={`flex-1 flex items-center justify-center relative z-10 ${
                    isFullscreen ? 'py-0.5' : 'py-6'
                  }`}>
                    <span className={`font-sans md:font-mono font-black text-blue-400 leading-none select-none tracking-tighter drop-shadow-[0_8px_24px_rgba(59,130,246,0.4)] ${
                      isFullscreen 
                        ? 'text-7xl md:text-[14vh] lg:text-[19vh] xl:text-[23vh] 2xl:text-[25vh]' 
                        : 'text-8xl md:text-[11rem] lg:text-[12rem]'
                    }`}>
                      {calculateFinalScore('BIRU', matchState)}
                    </span>
                  </div>
                  
                  {/* Footer: Nama Atlit */}
                  <div className={`w-full bg-gradient-to-r from-blue-800 via-blue-800 to-[#0a0f29]/30 rounded-none border-t border-blue-950/30 shadow-lg relative z-10 ${
                    isFullscreen ? 'py-2.5 md:py-3.5 px-3' : 'py-3.5'
                  }`}>
                    <h4 className={`text-left italic font-black text-white uppercase truncate px-4 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${
                      isFullscreen ? 'text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl' : 'text-lg md:text-xl'
                    }`}>
                      {matchState.atlitBiru.nama}
                    </h4>
                    <p className={`text-left italic text-blue-100 font-extrabold tracking-wider uppercase truncate mt-1 px-4 drop-shadow-sm ${
                      isFullscreen ? 'text-[10px] md:text-xs lg:text-sm xl:text-base' : 'text-xs md:text-sm'
                    }`}>
                      {matchState.atlitBiru.kontingen}
                    </p>
                  </div>
                </div>

                {/* Horizontal Penalty/Hukuman Grid (Blue Side) */}
                <div className={`bg-gradient-to-b from-[#060b24]/90 to-[#020410]/90 border border-blue-950/60 rounded-none font-mono flex flex-col justify-center ${
                  isFullscreen ? 'p-2.5 md:p-3.5' : 'p-2 md:p-2.5'
                }`}>
                  <div className="flex flex-row-reverse items-center justify-between gap-1 w-full">
                    
                    {/* Peringatan 2 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesBiru.peringatan2 
                          ? 'border-red-500 bg-gradient-to-b from-red-500/20 via-transparent to-red-500/10 text-red-500 font-bold shadow-[0_0_20px_rgba(239,68,68,0.55),inset_0_0_12px_rgba(239,68,68,0.3)] animate-pulse' 
                          : 'bg-[#0f0720]/45 border-blue-900/30 text-slate-600/30'
                      }`}
                      title="Peringatan 2"
                    >
                      <RenderIconOrCustom iconKey="peringatan2" DefaultIcon={Peringatan2Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Peringatan 1 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesBiru.peringatan1 
                          ? 'border-red-500 bg-gradient-to-b from-red-500/20 via-transparent to-red-500/10 text-red-500 font-bold shadow-[0_0_20px_rgba(239,68,68,0.55),inset_0_0_12px_rgba(239,68,68,0.3)] animate-pulse' 
                          : 'bg-[#0f0720]/45 border-blue-900/30 text-slate-600/30'
                      }`}
                      title="Peringatan 1"
                    >
                      <RenderIconOrCustom iconKey="peringatan1" DefaultIcon={Peringatan1Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Teguran 2 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesBiru.teguran2 
                          ? 'border-orange-500 bg-gradient-to-b from-orange-500/20 via-transparent to-orange-500/10 text-orange-500 font-bold shadow-[0_0_20px_rgba(249,115,22,0.55),inset_0_0_12px_rgba(249,115,22,0.3)]' 
                          : 'bg-[#0f0720]/45 border-blue-900/30 text-slate-600/30'
                      }`}
                      title="Teguran 2"
                    >
                      <RenderIconOrCustom iconKey="teguran2" DefaultIcon={Teguran2Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Teguran 1 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesBiru.teguran1 
                          ? 'border-orange-500 bg-gradient-to-b from-orange-500/20 via-transparent to-orange-500/10 text-orange-500 font-bold shadow-[0_0_20px_rgba(249,115,22,0.55),inset_0_0_12px_rgba(249,115,22,0.3)]' 
                          : 'bg-[#0f0720]/45 border-blue-900/30 text-slate-600/30'
                      }`}
                      title="Teguran 1"
                    >
                      <RenderIconOrCustom iconKey="teguran1" DefaultIcon={Teguran1Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Binaan 2 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesBiru.binaan2 
                          ? 'border-yellow-500 bg-gradient-to-b from-yellow-500/20 via-transparent to-yellow-500/10 text-yellow-500 font-bold shadow-[0_0_20px_rgba(234,179,8,0.55),inset_0_0_12px_rgba(234,179,8,0.3)]' 
                          : 'bg-[#0f0720]/45 border-blue-900/30 text-slate-600/30'
                      }`}
                      title="Binaan 2"
                    >
                      <RenderIconOrCustom iconKey="binaan2" DefaultIcon={Binaan2Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Binaan 1 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesBiru.binaan1 
                          ? 'border-yellow-500 bg-gradient-to-b from-yellow-500/20 via-transparent to-yellow-500/10 text-yellow-500 font-bold shadow-[0_0_20px_rgba(234,179,8,0.55),inset_0_0_12px_rgba(234,179,8,0.3)]' 
                          : 'bg-[#0f0720]/45 border-blue-900/30 text-slate-600/30'
                      }`}
                      title="Binaan 1"
                    >
                      <RenderIconOrCustom iconKey="binaan1" DefaultIcon={Binaan1Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                  </div>
                </div>

                {/* Horizontal Juri Individual/Rekap Nilai Grid (Blue Side) */}
                <div className={`bg-gradient-to-b from-[#060b24]/90 to-[#020410]/90 border border-blue-950/60 rounded-none font-mono flex flex-col justify-center relative overflow-hidden ${
                  isFullscreen ? 'p-1.5 md:p-2' : 'p-2 md:p-2.5'
                }`}>
                  <div className="flex flex-row-reverse items-center justify-between gap-1.5 w-full relative z-10">
                    {[1, 2, 3].map((jId) => {
                      const punchCount = matchState.rawScores.filter(s => s.juriId === jId && s.sudut === 'BIRU' && s.jenis === 'PUNCH' && s.babak === matchState.babakAktif && s.validated).length;
                      const kickCount = matchState.rawScores.filter(s => s.juriId === jId && s.sudut === 'BIRU' && s.jenis === 'KICK' && s.babak === matchState.babakAktif && s.validated).length;
                      
                      const punchFlash = flashCells[`${jId}-BIRU-PUNCH`];
                      const kickFlash = flashCells[`${jId}-BIRU-KICK`];

                      return (
                        <div key={jId} className="flex-1 flex flex-col items-center justify-between bg-blue-950/20 rounded-lg border border-blue-900/10 p-1 min-w-0">
                          {/* Label Juri */}
                          <div className={`text-center font-bold text-slate-300 font-mono tracking-wider truncate mb-1 w-full ${
                            isFullscreen ? 'text-[9px] md:text-[11px]' : 'text-[10px]'
                          }`}>
                            JURI {jId}
                          </div>
                          
                          {/* Punch & Kick side by side */}
                          <div className="grid grid-cols-2 gap-1 w-full">
                            {/* PUNCH CELL */}
                            <div
                              className={`flex items-center justify-center rounded-lg border font-black font-mono text-center transition-all duration-300 ${
                                isFullscreen ? 'py-1 md:py-1.5' : 'py-1 md:py-1.5'
                              } ${
                                punchFlash
                                  ? 'bg-yellow-400 border-yellow-250 text-black shadow-[0_0_15px_#facc15] scale-105 z-10'
                                  : 'bg-[#0f0720]/45 border-blue-900/30 text-blue-300'
                              }`}
                            >
                              <RenderIconOrCustom iconKey="punch" DefaultIcon={PunchIcon} className={isFullscreen ? "w-5 h-5 md:w-6 h-6" : "w-5 h-5"} />
                            </div>

                            {/* KICK CELL */}
                            <div
                              className={`flex items-center justify-center rounded-lg border font-black font-mono text-center transition-all duration-300 ${
                                isFullscreen ? 'py-1 md:py-1.5' : 'py-1 md:py-1.5'
                              } ${
                                kickFlash
                                  ? 'bg-yellow-400 border-yellow-250 text-black shadow-[0_0_15px_#facc15] scale-105 z-10'
                                  : 'bg-[#0f0720]/45 border-blue-900/30 text-blue-300'
                              }`}
                            >
                              <RenderIconOrCustom iconKey="kick" DefaultIcon={KickIcon} className={isFullscreen ? "w-5 h-5 md:w-6 h-6" : "w-5 h-5"} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Central Time indicators & Active Round panel */}
              <div className={`md:col-span-3 flex flex-col items-center justify-between bg-[#0e041dd0] border border-purple-950/85 rounded-3xl h-full transition-all duration-300 ${
                isFullscreen ? 'p-2 space-y-2' : 'p-5 space-y-6'
              }`}>
                
                {/* Logo Kiri - Sisi Kiri di Atas TIMER */}
                <div className="w-full flex flex-col items-center justify-center pt-1">
                  <div className={isFullscreen 
                    ? "w-[22vh] h-[22vh] max-w-[240px] max-h-[240px] min-w-[120px] min-h-[120px] flex items-center justify-center p-0 bg-transparent border-none transition-all duration-500 transform hover:scale-105"
                    : "w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 flex items-center justify-center p-0 bg-transparent border-none transition-all duration-300 transform hover:scale-102"
                  }>
                    <img 
                      src={matchState.logoKiri || "/assets/temadiscors.png?v=15"} 
                      alt="Logo Kiri" 
                      className="max-h-full max-w-full object-contain transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                
                <div className="text-center w-full">
                  <span className={`text-purple-400 uppercase font-black tracking-widest font-mono block mb-0.5 ${
                    isFullscreen ? 'text-xs md:text-[1.8vh]' : 'text-xs'
                  }`}>TIMER</span>
                  <div className={`font-black font-mono text-amber-400 tracking-wider drop-shadow-[0_4px_10px_rgba(245,158,11,0.2)] ${
                    isFullscreen ? 'text-5xl md:text-[7vh] lg:text-[8.5vh] xl:text-[10vh] leading-none' : 'text-5xl md:text-6xl'
                  }`}>
                    {Math.floor(matchState.sisaWaktu / 60).toString().padStart(2, '0')}:{(matchState.sisaWaktu % 60).toString().padStart(2, '0')}
                  </div>
                </div>

                {/* Round status bubbles stacked vertically for modern wide look */}
                <div className={`w-full px-2 ${isFullscreen ? 'space-y-1 md:space-y-[1vh]' : 'space-y-2.5'}`}>
                  <span className={`text-center text-slate-400 block font-extrabold uppercase tracking-widest font-mono ${
                    isFullscreen ? 'text-xs md:text-[1.8vh]' : 'text-[10px] md:text-xs'
                  }`}>BABAK AKTIF</span>
                  <div className={`flex flex-col w-full ${isFullscreen ? 'gap-1 md:gap-[1vh]' : 'gap-2'}`}>
                    {Array.from({ length: getMaxRounds(matchState.kategoriUsia) }, (_, i) => i + 1).map((num) => (
                      <div
                        key={num}
                        className={`font-black font-mono rounded-xl text-center tracking-wider uppercase transition-all duration-300 ${
                          isFullscreen ? 'py-1 md:py-[1vh] text-xs md:text-[2vh]' : 'py-3 text-xs md:text-sm'
                        } ${
                          matchState.babakAktif === num
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.7)] border-2 border-purple-400 scale-[1.04]'
                            : 'bg-purple-950/20 text-slate-500 border border-purple-950/30'
                        }`}
                      >
                        BABAK {num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Logo Kanan - Sisi Kanan di Bawah "BABAK 3" */}
                <div className="w-full flex flex-col items-center justify-center pb-1">
                  <div className={isFullscreen 
                    ? "w-[22vh] h-[22vh] max-w-[240px] max-h-[240px] min-w-[120px] min-h-[120px] flex items-center justify-center p-0 bg-transparent border-none transition-all duration-500 transform hover:scale-105"
                    : "w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 xl:w-36 xl:h-36 flex items-center justify-center p-0 bg-transparent border-none transition-all duration-300 transform hover:scale-102"
                  }>
                    <img 
                      src={matchState.logoKanan || "/assets/temadiscors.png?v=15"} 
                      alt="Logo Kanan" 
                      className="max-h-full max-w-full object-contain transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              </div>

              {/* Red Arena Corner Column Side */}
              <div className={`md:col-span-4 flex flex-col justify-between ${
                isFullscreen ? 'gap-1.5' : 'gap-3'
              }`}>
                {/* Red Arena Corner Total Score (Right Side) */}
                <div className={`relative overflow-hidden border text-center transition-all duration-300 flex-1 flex flex-col justify-between ${
                  isFullscreen ? 'pt-4 rounded-none' : 'pt-8 rounded-none'
                } ${
                  merahUnggul 
                    ? 'border-red-500 bg-gradient-to-b from-red-900/40 to-[#2c0c0c]/60 shadow-[0_0_25px_rgba(239,68,68,0.7),inset_0_0_15px_rgba(239,68,68,0.35)] scale-[1.01]' 
                    : glowMerah 
                      ? 'bg-red-650/30 border-yellow-400/90 shadow-xl shadow-red-500/20 scale-102' 
                      : 'bg-gradient-to-b from-red-950/40 to-[#2c0c0c]/50 border-red-900/40'
                }`}>
                  {/* Golden Beam Tracing Light Overlay */}
                  {merahUnggul && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                      <defs>
                        <linearGradient id="goldGradientMerah" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#ffd700" stopOpacity="0" />
                          <stop offset="30%" stopColor="#ffd700" stopOpacity="0.8" />
                          <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
                          <stop offset="70%" stopColor="#ffd700" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <rect
                        x="0"
                        y="0"
                        width="100%"
                        height="100%"
                        fill="none"
                        pathLength="100"
                        stroke="url(#goldGradientMerah)"
                        strokeWidth="4"
                        className="animate-border-beam"
                      />
                    </svg>
                  )}
                  {/* Background Text "MERAH" styled exactly like Council/Dewan Panel */}
                  <div className={`absolute top-1 right-4 font-black italic select-none pointer-events-none z-0 transition-all duration-300 ${
                    isFullscreen ? 'text-[36px] md:text-[45px]' : 'text-[32px] md:text-[40px]'
                  } ${merahUnggul ? 'gold-shine-text opacity-100' : ''}`}
                  style={!merahUnggul ? { 
                    color: 'rgba(239, 68, 68, 0.22)',
                    textShadow: '0 0 1px rgba(239, 68, 68, 0.5)' 
                  } : undefined}>MERAH</div>
                  
                  {/* Body: Angka Nilai Besar */}
                  <div className={`flex-1 flex items-center justify-center relative z-10 ${
                    isFullscreen ? 'py-0.5' : 'py-6'
                  }`}>
                    <span className={`font-sans md:font-mono font-black text-red-500 leading-none select-none tracking-tighter drop-shadow-[0_8px_24px_rgba(239,68,68,0.4)] ${
                      isFullscreen 
                        ? 'text-7xl md:text-[14vh] lg:text-[19vh] xl:text-[23vh] 2xl:text-[25vh]' 
                        : 'text-8xl md:text-[11rem] lg:text-[12rem]'
                    }`}>
                      {calculateFinalScore('MERAH', matchState)}
                    </span>
                  </div>
                  
                  {/* Footer: Nama Atlit */}
                  <div className={`w-full bg-gradient-to-r from-[#290a0a]/30 via-red-800 to-red-800 rounded-none border-t border-red-950/30 shadow-lg relative z-10 ${
                    isFullscreen ? 'py-2.5 md:py-3.5 px-3' : 'py-3.5'
                  }`}>
                    <h4 className={`text-right italic font-black text-white uppercase truncate px-4 leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${
                      isFullscreen ? 'text-base md:text-lg lg:text-xl xl:text-2xl 2xl:text-3xl' : 'text-lg md:text-xl'
                    }`}>
                      {matchState.atlitMerah.nama}
                    </h4>
                    <p className={`text-right italic text-red-100 font-extrabold tracking-wider uppercase truncate mt-1 px-4 drop-shadow-sm ${
                      isFullscreen ? 'text-[10px] md:text-xs lg:text-sm xl:text-base' : 'text-xs md:text-sm'
                    }`}>
                      {matchState.atlitMerah.kontingen}
                    </p>
                  </div>
                </div>

                {/* Horizontal Penalty/Hukuman Grid (Red Side) */}
                <div className={`bg-gradient-to-b from-[#240606]/90 to-[#100202]/90 border border-red-950/60 rounded-none font-mono flex flex-col justify-center ${
                  isFullscreen ? 'p-2.5 md:p-3.5' : 'p-2 md:p-2.5'
                }`}>
                  <div className="flex flex-row items-center justify-between gap-1 w-full">
                    
                    {/* Peringatan 2 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesMerah.peringatan2 
                          ? 'border-red-500 bg-gradient-to-b from-red-500/20 via-transparent to-red-500/10 text-red-500 font-bold shadow-[0_0_20px_rgba(239,68,68,0.55),inset_0_0_12px_rgba(239,68,68,0.3)] animate-pulse' 
                          : 'bg-[#200707]/45 border-red-900/30 text-slate-600/30'
                      }`}
                      title="Peringatan 2"
                    >
                      <RenderIconOrCustom iconKey="peringatan2" DefaultIcon={Peringatan2Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Peringatan 1 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesMerah.peringatan1 
                          ? 'border-red-500 bg-gradient-to-b from-red-500/20 via-transparent to-red-500/10 text-red-500 font-bold shadow-[0_0_20px_rgba(239,68,68,0.55),inset_0_0_12px_rgba(239,68,68,0.3)] animate-pulse' 
                          : 'bg-[#200707]/45 border-red-900/30 text-slate-600/30'
                      }`}
                      title="Peringatan 1"
                    >
                      <RenderIconOrCustom iconKey="peringatan1" DefaultIcon={Peringatan1Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Teguran 2 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesMerah.teguran2 
                          ? 'border-orange-500 bg-gradient-to-b from-orange-500/20 via-transparent to-orange-500/10 text-orange-500 font-bold shadow-[0_0_20px_rgba(249,115,22,0.55),inset_0_0_12px_rgba(249,115,22,0.3)]' 
                          : 'bg-[#200707]/45 border-red-900/30 text-slate-600/30'
                      }`}
                      title="Teguran 2"
                    >
                      <RenderIconOrCustom iconKey="teguran2" DefaultIcon={Teguran2Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Teguran 1 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesMerah.teguran1 
                          ? 'border-orange-500 bg-gradient-to-b from-orange-500/20 via-transparent to-orange-500/10 text-orange-500 font-bold shadow-[0_0_20px_rgba(249,115,22,0.55),inset_0_0_12px_rgba(249,115,22,0.3)]' 
                          : 'bg-[#200707]/45 border-red-900/30 text-slate-600/30'
                      }`}
                      title="Teguran 1"
                    >
                      <RenderIconOrCustom iconKey="teguran1" DefaultIcon={Teguran1Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Binaan 2 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesMerah.binaan2 
                          ? 'border-yellow-500 bg-gradient-to-b from-yellow-500/20 via-transparent to-yellow-500/10 text-yellow-500 font-bold shadow-[0_0_20px_rgba(234,179,8,0.55),inset_0_0_12px_rgba(234,179,8,0.3)]' 
                          : 'bg-[#200707]/45 border-red-900/30 text-slate-600/30'
                      }`}
                      title="Binaan 2"
                    >
                      <RenderIconOrCustom iconKey="binaan2" DefaultIcon={Binaan2Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                    {/* Binaan 1 */}
                    <div 
                      className={`flex-1 flex items-center justify-center rounded-lg border transition-all duration-300 ${
                        isFullscreen ? 'py-4 md:py-6' : 'py-1.5'
                      } ${
                        matchState.penaltiesMerah.binaan1 
                          ? 'border-yellow-500 bg-gradient-to-b from-yellow-500/20 via-transparent to-yellow-500/10 text-yellow-500 font-bold shadow-[0_0_20px_rgba(234,179,8,0.55),inset_0_0_12px_rgba(234,179,8,0.3)]' 
                          : 'bg-[#200707]/45 border-red-900/30 text-slate-600/30'
                      }`}
                      title="Binaan 1"
                    >
                      <RenderIconOrCustom iconKey="binaan1" DefaultIcon={Binaan1Icon} className={isFullscreen ? "w-8 h-8 md:w-11 h-11" : "w-6 h-6"} />
                    </div>

                  </div>
                </div>

                {/* Horizontal Juri Individual/Rekap Nilai Grid (Red Side) */}
                <div className={`bg-gradient-to-b from-[#240606]/90 to-[#100202]/90 border border-red-950/60 rounded-none font-mono flex flex-col justify-center relative overflow-hidden ${
                  isFullscreen ? 'p-1.5 md:p-2' : 'p-2 md:p-2.5'
                }`}>
                  <div className="flex flex-row items-center justify-between gap-1.5 w-full relative z-10">
                    {[1, 2, 3].map((jId) => {
                      const punchCount = matchState.rawScores.filter(s => s.juriId === jId && s.sudut === 'MERAH' && s.jenis === 'PUNCH' && s.babak === matchState.babakAktif && s.validated).length;
                      const kickCount = matchState.rawScores.filter(s => s.juriId === jId && s.sudut === 'MERAH' && s.jenis === 'KICK' && s.babak === matchState.babakAktif && s.validated).length;
                      
                      const punchFlash = flashCells[`${jId}-MERAH-PUNCH`];
                      const kickFlash = flashCells[`${jId}-MERAH-KICK`];

                      return (
                        <div key={jId} className="flex-1 flex flex-col items-center justify-between bg-red-950/20 rounded-lg border border-red-900/10 p-1 min-w-0">
                          {/* Label Juri */}
                          <div className={`text-center font-bold text-slate-300 font-mono tracking-wider truncate mb-1 w-full ${
                            isFullscreen ? 'text-[9px] md:text-[11px]' : 'text-[10px]'
                          }`}>
                            JURI {jId}
                          </div>
                          
                          {/* Punch & Kick side by side */}
                          <div className="grid grid-cols-2 gap-1 w-full">
                            {/* PUNCH CELL */}
                            <div
                              className={`flex items-center justify-center rounded-lg border font-black font-mono text-center transition-all duration-300 ${
                                isFullscreen ? 'py-1 md:py-1.5' : 'py-1 md:py-1.5'
                              } ${
                                punchFlash
                                  ? 'bg-yellow-400 border-yellow-250 text-black shadow-[0_0_15px_#facc15] scale-105 z-10'
                                  : 'bg-[#200707]/45 border-red-900/30 text-red-300'
                              }`}
                            >
                              <RenderIconOrCustom iconKey="punch" DefaultIcon={PunchIcon} className={isFullscreen ? "w-5 h-5 md:w-6 h-6" : "w-5 h-5"} />
                            </div>

                            {/* KICK CELL */}
                            <div
                              className={`flex items-center justify-center rounded-lg border font-black font-mono text-center transition-all duration-300 ${
                                isFullscreen ? 'py-1 md:py-1.5' : 'py-1 md:py-1.5'
                              } ${
                                kickFlash
                                  ? 'bg-yellow-400 border-yellow-250 text-black shadow-[0_0_15px_#facc15] scale-105 z-10'
                                  : 'bg-[#200707]/45 border-red-900/30 text-red-300'
                              }`}
                            >
                              <RenderIconOrCustom iconKey="kick" DefaultIcon={KickIcon} className={isFullscreen ? "w-5 h-5 md:w-6 h-6" : "w-5 h-5"} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* VERIFIKASI PENDING OVERLAY NOTIFICATION */}
            <AnimatePresence>
              {matchState.verifikasi.status === 'PENDING' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ed2] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-xl w-full bg-[#0a0315] border-2 border-purple-500/80 rounded-3xl p-10 space-y-6 shadow-2xl bg-gradient-to-b from-purple-950/20 to-[#120722]/50"
                  >
                    {/* Blinking icon */}
                    <div className="flex justify-center">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-purple-500 bg-purple-950/80 text-purple-400 animate-pulse shadow-lg">
                        <AlertTriangle className="w-10 h-10 text-amber-400" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-4xl font-extrabold text-white tracking-wider uppercase animate-pulse">
                        PROSES VERIFIKASI...
                      </h2>
                      <span className="inline-block bg-purple-900/60 border border-purple-500/50 px-4 py-1.5 rounded-full uppercase text-sm font-semibold tracking-widest font-mono text-purple-200 shadow-md">
                        TIPE: {matchState.verifikasi.jenis}
                      </span>
                      <p className="text-slate-400 text-sm mt-4 uppercase tracking-widest font-mono font-medium">
                        Menunggu Keputusan / Vote Juri 1, 2, 3
                      </p>
                    </div>
                    
                    {/* Real-time status tracker for juror votes */}
                    <div className="flex justify-center gap-6 pt-2">
                      {[1, 2, 3].map((juriNum) => {
                        const voted = !!matchState.verifikasi.juriVotes[juriNum];
                        return (
                          <div key={juriNum} className="flex flex-col items-center gap-1.5">
                            <span className="text-xs font-mono font-bold text-purple-300">JURI {juriNum}</span>
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              voted 
                                ? 'bg-green-950/80 border-green-500 text-green-400 font-extrabold scale-110 shadow-[0_0_12px_rgba(34,197,94,0.4)]' 
                                : 'bg-slate-900/80 border-slate-700 text-slate-500 font-medium'
                            }`}>
                              {voted ? "✓" : "⏳"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WINNER POPUP ANNOUNCEMENT FOR MONITOR */}
            <AnimatePresence>
              {(matchState.showMatchEndPopUp || matchState.diskualifikasi) && matchState.umumkanPemenang && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ef9] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-2xl w-full bg-[#160a2acc] border-2 border-purple-500 p-10 rounded-3xl space-y-6 shadow-2xl"
                  >
                    <Award className="w-24 h-24 text-amber-400 mx-auto animate-bounce" />
                    <div>
                      <span className="text-[10px] text-purple-400 uppercase font-bold tracking-widest font-mono">PERTANDINGAN DINYATAKAN SELESAI</span>
                      <h2 className="text-4xl font-black text-white tracking-tight mt-1 uppercase">PENGUMUMAN PEMENANG</h2>
                    </div>
                    
                    <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                      determineWinner(matchState) === 'MERAH'
                        ? (isLightMode ? 'bg-red-50 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'bg-red-950/80 border-red-500/50 shadow-[0_0_27px_rgba(239,68,68,0.3)]')
                        : determineWinner(matchState) === 'BIRU'
                        ? (isLightMode ? 'bg-blue-50 border-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-blue-950/80 border-blue-500/50 shadow-[0_0_27px_rgba(59,130,246,0.3)]')
                        : (isLightMode ? 'bg-white border-slate-200' : 'bg-[#0a0315] border-purple-950')
                    }`}>
                      {/* Display actual winner name and college */}
                      {determineWinner(matchState) === 'MERAH' ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                            <span className="bg-red-600 text-white font-extrabold text-xs px-3 py-1 rounded font-mono uppercase tracking-widest shadow-sm">PEMENANG: SUDUT MERAH</span>
                            <span className={`font-bold text-xs px-3 py-1 rounded font-mono tracking-widest shadow-sm border ${isLightMode ? 'bg-red-100/85 text-red-700 border-red-200' : 'bg-red-500/20 text-red-200 border-red-500/30'}`}>
                              {getWinningReason(matchState)}
                            </span>
                          </div>
                          <h3 className={`text-3xl font-black mt-3 uppercase ${isLightMode ? 'text-red-900' : 'text-white'}`}>{matchState.atlitMerah.nama}</h3>
                          <p className={`text-sm font-medium mt-1 uppercase ${isLightMode ? 'text-red-600' : 'text-red-400'}`}>{matchState.atlitMerah.kontingen}</p>
                        </div>
                      ) : determineWinner(matchState) === 'BIRU' ? (
                        <div>
                          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                            <span className="bg-blue-600 text-white font-extrabold text-xs px-3 py-1 rounded font-mono uppercase tracking-widest shadow-sm">PEMENANG: SUDUT BIRU</span>
                            <span className={`font-bold text-xs px-3 py-1 rounded font-mono tracking-widest shadow-sm border ${isLightMode ? 'bg-blue-100/85 text-blue-700 border-blue-200' : 'bg-blue-500/20 text-blue-200 border-blue-500/30'}`}>
                              {getWinningReason(matchState)}
                            </span>
                          </div>
                          <h3 className={`text-3xl font-black mt-3 uppercase ${isLightMode ? 'text-blue-900' : 'text-white'}`}>{matchState.atlitBiru.nama}</h3>
                          <p className={`text-sm font-medium mt-1 uppercase ${isLightMode ? 'text-blue-600' : 'text-blue-400'}`}>{matchState.atlitBiru.kontingen}</p>
                        </div>
                      ) : (
                        <h3 className={`text-2xl font-black ${isLightMode ? 'text-slate-800' : 'text-white'}`}>DRAW / SERI KALKULASI</h3>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 max-w-md mx-auto">Keputusan panitia bersifat mutlak dan telah sah diarsipkan secara digital pada sistem database offline Sekretaris.</p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* VAR CHECKING POPUP FOR MONITOR */}
            <AnimatePresence>
              {matchState.varChecking && (matchState.varChecking.status === 'CHECKING' || matchState.varChecking.status === 'RESULT') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ed2] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className={`max-w-xl w-full bg-[#0a0315] border-2 rounded-3xl p-10 space-y-6 shadow-2xl transition-all duration-300 ${
                      matchState.varChecking.sudut === 'BIRU' 
                        ? 'shadow-[0_0_80px_rgba(59,130,246,0.9)] border-blue-500/80 bg-gradient-to-b from-blue-950/20 to-[#0c122c]/50' 
                        : 'shadow-[0_0_80px_rgba(239,68,68,0.9)] border-red-500/80 bg-gradient-to-b from-red-950/20 to-[#2a0d0d]/50'
                    }`}
                  >
                    {/* Blinking icon during checking */}
                    <div className="flex justify-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 shadow-lg ${
                        matchState.varChecking.status === 'CHECKING' ? 'animate-pulse' : ''
                      } ${
                        matchState.varChecking.sudut === 'BIRU'
                          ? 'bg-blue-950/80 border-blue-500 text-blue-400'
                          : 'bg-red-950/80 border-red-500 text-red-400'
                      }`}>
                        <MonitorIcon className="w-10 h-10" />
                      </div>
                    </div>

                    <div>
                      {matchState.varChecking.status === 'CHECKING' ? (
                        <>
                          <h2 className="text-4xl font-black text-white tracking-widest uppercase animate-pulse">
                            VAR CHECKING...
                          </h2>
                          <span className={`text-sm tracking-widest font-mono font-extrabold block mt-2 uppercase ${
                            matchState.varChecking.sudut === 'BIRU' ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            SUDUT {matchState.varChecking.sudut}
                          </span>
                          <p className="text-slate-400 text-xs mt-4 uppercase tracking-wider font-mono">
                            Dewan Sedang Meninjau VAR
                          </p>
                        </>
                      ) : (
                        <>
                          <h2 className={`text-5xl font-black tracking-widest uppercase ${
                            matchState.varChecking.result === 'SAH' ? 'text-green-500 animate-bounce' : 'text-red-500'
                          }`}>
                            RESULT : {matchState.varChecking.result === 'SAH' ? 'SAH' : 'TIDAK SAH'}
                          </h2>
                          <span className={`text-sm tracking-widest font-mono font-extrabold block mt-2 uppercase ${
                            matchState.varChecking.sudut === 'BIRU' ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            SUDUT {matchState.varChecking.sudut}
                          </span>
                          <p className="text-slate-400 text-xs mt-4 uppercase tracking-wider font-mono">
                            Keputusan VAR Telah Ditetapkan
                          </p>
                        </>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* VERIFIKASI RESULT POPUP FOR MONITOR */}
            <AnimatePresence>
              {showVerifikasiResultPopup && verifikasiPopupData && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#00000ef8] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 z-50 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className={`max-w-xl w-full bg-[#0a0315] border-2 rounded-3xl p-10 space-y-6 shadow-2xl transition-all duration-300 ${
                      verifikasiPopupData.result === 'BIRU' 
                        ? 'shadow-[0_0_80px_rgba(59,130,246,0.9)] border-blue-500 bg-gradient-to-b from-blue-950/25 to-[#0b1335]/65' 
                        : verifikasiPopupData.result === 'MERAH'
                        ? 'shadow-[0_0_80px_rgba(239,68,68,0.9)] border-red-500 bg-gradient-to-b from-red-950/25 to-[#330f0f]/65'
                        : 'shadow-[0_0_80px_rgba(168,85,247,0.7)] border-purple-500 bg-gradient-to-b from-purple-950/25 to-[#240f35]/65'
                    }`}
                  >
                    <div className="flex justify-center">
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 shadow-xl animate-bounce ${
                        verifikasiPopupData.result === 'BIRU'
                          ? 'bg-blue-950/90 border-blue-400 text-blue-300'
                          : verifikasiPopupData.result === 'MERAH'
                          ? 'bg-red-950/90 border-red-400 text-red-300'
                          : 'bg-purple-950/90 border-purple-400 text-purple-300'
                      }`}>
                        {verifikasiPopupData.jenis === 'JATUHAN' ? (
                          <JatuhanIcon className="w-12 h-12" />
                        ) : (
                          <AlertTriangle className="w-12 h-12" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-purple-400 block">
                        HASIL KEPUTUSAN VERIFIKASI DEWAN
                      </span>
                      <h2 className="text-4xl font-black text-white tracking-wide uppercase">
                        VERIFIKASI {verifikasiPopupData.jenis}
                      </h2>
                    </div>

                    <div className={`py-5 px-8 rounded-2xl border-2 font-black ${
                      verifikasiPopupData.result === 'TIDAK_SAH'
                        ? 'bg-amber-950/40 border-amber-600/60 text-amber-400'
                        : verifikasiPopupData.result === 'MERAH'
                        ? 'bg-red-950/40 border-red-600/60 text-red-400'
                        : 'bg-blue-950/40 border-blue-600/60 text-blue-400'
                    }`}>
                      <div className="text-[11px] font-mono tracking-widest text-slate-400 uppercase font-semibold">HASIL KEPUTUSAN:</div>
                      <div className="text-4xl uppercase tracking-wider mt-1">
                        {verifikasiPopupData.result === 'TIDAK_SAH' ? (
                          'TIDAK SAH'
                        ) : (
                          `SAH - SUDUT ${verifikasiPopupData.result}`
                        )}
                      </div>
                    </div>

                    <p className="text-slate-400 text-xs font-mono tracking-widest uppercase">
                      Keputusan Mutlak Juri & Dewan Silat
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showMonitorRoundFinishedBanner && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 bg-[#02000dfb] backdrop-blur-xl rounded-2xl flex flex-col items-center justify-center p-8 z-55 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.85, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: -25 }}
                    transition={{ type: "spring", damping: 20, stiffness: 120 }}
                    className="max-w-3xl w-full bg-gradient-to-b from-[#1c083a] via-[#090215] to-[#010005] border-2 border-red-500/80 p-12 rounded-3xl space-y-8 shadow-[0_0_100px_rgba(239,68,68,0.25)] relative overflow-hidden"
                  >
                    {/* Background glow effects */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
                    
                    <div className="space-y-6">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        className="w-24 h-24 bg-red-950/40 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)] animate-pulse"
                      >
                        <Clock className="w-12 h-12" />
                      </motion.div>

                      <span className="inline-flex items-center gap-2 bg-red-950 text-red-300 border border-red-500/30 text-xs sm:text-sm uppercase font-black tracking-widest px-5 py-2 rounded-full font-mono">
                        📢 INFORMASI WAKTU PERTANDINGAN
                      </span>
                      
                      <h1 className="text-5xl sm:text-6.5xl font-black text-white tracking-tighter uppercase leading-none drop-shadow-md">
                        BABAK {finishedRoundNumber} <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500">SELESAI</span>
                      </h1>
                      
                      <div className="h-1.5 w-40 bg-gradient-to-r from-red-600 to-pink-600 mx-auto rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse" />
                      
                      <p className="text-sm text-zinc-400 font-mono tracking-wider max-w-lg mx-auto">
                        Waktu babak {finishedRoundNumber} telah berakhir.
                        {finishedRoundNumber !== 3 ? (
                          <span className="block mt-2 text-amber-400 font-semibold animate-pulse">Menyiapkan Informasi Partai Selanjutnya...</span>
                        ) : (
                          <span className="block mt-2 text-purple-400 font-semibold animate-pulse">Menghitung Keputusan Pemenang Akhir...</span>
                        )}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showMonitorNextMatchBanner && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-[#02000dd0] backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-8 z-55 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="max-w-4xl w-full bg-gradient-to-b from-[#180a30] to-[#04010a] border-2 border-purple-500/80 p-10 rounded-3xl space-y-8 shadow-[0_0_80px_rgba(147,51,234,0.3)]"
                  >
                    <div className="space-y-4">
                      <span className="inline-flex items-center gap-2 bg-purple-950 text-purple-300 border border-purple-500/30 text-xs uppercase font-extrabold tracking-widest px-4 py-1.5 rounded-full font-mono animate-pulse">
                        ⏳ BABAK BERAKHIR &bull; UPCOMING MATCH
                      </span>
                      <h2 className="text-5xl sm:text-7.5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 tracking-tighter uppercase leading-none drop-shadow-lg">
                        PARTAI SELANJUTNYA
                      </h2>
                      <p className="text-xs text-zinc-400 font-mono tracking-widest uppercase">Akan tampil otomatis selama 5 detik</p>
                    </div>

                    {(() => {
                      const nextMatch = getNextMatchInfo();
                      if (nextMatch) {
                        return (
                          <div className="space-y-6 w-full">
                            <div className="bg-purple-950/40 border border-purple-500/30 p-6 rounded-2xl">
                              <span className="text-2xl font-black text-amber-400 font-mono tracking-tight block">
                                PARTAI {nextMatch.partai}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-8 items-stretch">
                              {/* Sudut Biru */}
                              <div className="bg-gradient-to-b from-blue-950/30 to-blue-900/10 border border-blue-500/30 p-6 rounded-2xl text-left relative overflow-hidden flex flex-col justify-between shadow-lg">
                                <div className="absolute right-[-15px] bottom-[-15px] font-black text-7xl text-blue-500/5 select-none">B</div>
                                <div className="space-y-1 z-10">
                                  <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-widest shadow-sm">SUDUT BIRU</span>
                                  <h3 className="text-2xl font-black text-white truncate block mt-2 uppercase">{nextMatch.biru.nama}</h3>
                                </div>
                                <p className="text-sm font-bold text-blue-400 uppercase mt-2 z-10 truncate">{nextMatch.biru.kontingen}</p>
                              </div>

                              {/* Sudut Merah */}
                              <div className="bg-gradient-to-b from-red-950/30 to-red-900/10 border border-red-500/30 p-6 rounded-2xl text-left relative overflow-hidden flex flex-col justify-between shadow-lg">
                                <div className="absolute right-[-15px] bottom-[-15px] font-black text-7xl text-red-500/5 select-none">M</div>
                                <div className="space-y-1 z-10">
                                  <span className="bg-red-650 text-white font-extrabold text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-widest shadow-sm">SUDUT MERAH</span>
                                  <h3 className="text-2xl font-black text-white truncate block mt-2 uppercase">{nextMatch.merah.nama}</h3>
                                </div>
                                <p className="text-sm font-bold text-red-400 uppercase mt-2 z-10 truncate">{nextMatch.merah.kontingen}</p>
                              </div>
                            </div>

                            {/* Parameters Metadata Grid */}
                            <div className="grid grid-cols-4 gap-4 bg-purple-950/20 border border-purple-500/15 p-4 rounded-xl text-xs text-purple-300 font-mono text-center">
                              <div>
                                <span className="text-purple-400 font-bold block text-[10px]">KELAS</span>
                                <span className="text-white font-black text-base uppercase mt-1 block">{nextMatch.kelas}</span>
                              </div>
                              <div>
                                <span className="text-purple-400 font-bold block text-[10px]">GENDER</span>
                                <span className="text-white font-black text-base uppercase mt-1 block">{nextMatch.gender}</span>
                              </div>
                              <div>
                                <span className="text-purple-400 font-bold block text-[10px]">USIA</span>
                                <span className="text-white font-black text-base uppercase mt-1 block">{nextMatch.kategoriUsia}</span>
                              </div>
                              <div>
                                <span className="text-purple-400 font-bold block text-[10px]">TAHAP</span>
                                <span className="text-white font-black text-base uppercase mt-1 block truncate">{nextMatch.tahapPertandingan}</span>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="py-8 bg-purple-950/20 rounded-2xl border border-purple-500/20 text-center w-full">
                            <p className="text-lg text-purple-300 font-bold italic">Semua partai tanding dalam database jadwal telah diselesaikan.</p>
                            <p className="text-xs text-zinc-400 mt-1">Gunakan dashboard Sekretaris untuk mengimpor atau menambahkan partai baru.</p>
                          </div>
                        );
                      }
                    })()}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </motion.div>
        )}

      </AnimatePresence>

        {/* Spectacular Persistent Role Switcher Footer */}
        {role !== 'LANDING' && !(role === 'MONITOR' && isFullscreen) && !(role === 'SEKRETARIS' && isFullscreen) && !(role === 'JURI_PANEL' && isFullscreen) && (
          <footer className="h-14 bg-black flex items-center justify-between px-6 border-t border-purple-500/10 z-20 shrink-0">
            <div className="flex gap-1.5 flex-wrap">
              {!((role === 'JURI_PANEL' || role === 'DEWAN' || role === 'SEKRETARIS') && isFullscreen) && (
                <button
                  onClick={() => selectRoleAndTriggerAudio('LANDING')}
                  className="px-3.5 py-1.5 text-[10px] font-bold rounded-lg border uppercase tracking-widest border-purple-500/30 text-purple-300 hover:bg-purple-950/40 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <ArrowLeft className="w-3 h-3" /> Beranda Utama
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-[10px] text-white/20 uppercase font-mono tracking-widest hidden sm:inline font-bold">
                Nebeng's Official Digital Scoring Silat | Versi 2.4. - IRFAN, S.Pd.
              </div>
              {!((role === 'JURI_PANEL' || role === 'DEWAN' || role === 'SEKRETARIS') && isFullscreen) && (
                <button 
                  onClick={() => {
                    triggerClick();
                    setRotated(!rotated);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${rotated ? 'bg-purple-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-purple-400'}`}
                  title="Rotasi Layar Landscape"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </footer>
        )}

      </div>



      {/* 🔐 POPUP STATUS LISENSI (KOKPIT KONTROL LISENSI) */}
      <AnimatePresence>
        {showLicenseStatusPopup && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-gradient-to-b from-[#18092a] to-black border border-purple-500/30 rounded-2xl p-5 shadow-2xl relative space-y-4 text-white"
            >
              {/* Reset button at top right corner */}
              <button
                type="button"
                onClick={() => {
                  triggerClick();
                  setShowLicenseStatusPopup(false);
                }}
                className="absolute top-4 right-4 text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 p-1.5 rounded-lg border border-purple-500/20 cursor-pointer transition-all active:scale-95 animate-in fade-in"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-purple-500/20 pb-3">
                <Shield className="w-5 h-5 text-purple-400 animate-pulse" />
                <div className="text-left">
                  <h3 className="font-extrabold uppercase tracking-wider text-purple-300 text-sm font-display">
                    KOKPIT KONTROL LISENSI
                  </h3>
                  <span className="text-[9px] text-purple-400/80 font-mono block">Status Proteksi & Manajemen Sistem</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Device ID Display & Copy */}
                <div className="bg-black/50 border border-purple-950 p-3 rounded-xl space-y-1.5 text-left">
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300">
                    <span>Device ID Perangkat Anda</span>
                    <span className="text-[7px] px-1.5 py-0.2 bg-purple-900/40 border border-purple-500/25 rounded text-amber-400 font-mono font-bold">Signature</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-mono text-xs font-black text-amber-300 select-all tracking-wider break-all">
                      {serverDeviceId}
                    </span>
                    <button
                      onClick={() => {
                        triggerClick();
                        navigator.clipboard.writeText(serverDeviceId);
                        showToast('Device ID berhasil disalin ke clipboard!', 'success');
                      }}
                      className="p-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/20 rounded text-purple-300 hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Salin Device ID"
                    >
                      <Upload className="w-3.5 h-3.5 rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Activation Key Generated & Copy */}
                <div className="bg-black/50 border border-purple-950 p-3 rounded-xl space-y-1.5 text-left">
                  <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300">
                    <span>KUNCI AKTIVASI (AUTO-MATH)</span>
                    <span className="text-[7px] px-1.5 py-0.2 bg-green-950/40 border border-green-500/25 rounded text-green-400 font-mono font-bold">Valid</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 font-mono text-xs font-black text-green-400 select-all tracking-widest break-all">
                      {generateActivationKey(serverDeviceId)}
                    </span>
                    <button
                      onClick={() => {
                        triggerClick();
                        navigator.clipboard.writeText(generateActivationKey(serverDeviceId));
                        showToast('Kunci Aktivasi berhasil disalin ke clipboard!', 'success');
                      }}
                      className="p-1.5 bg-purple-950 hover:bg-purple-900 border border-purple-500/20 rounded text-purple-300 hover:text-white transition-all active:scale-95 cursor-pointer shrink-0"
                      title="Salin Kunci Aktivasi"
                    >
                      <Upload className="w-3.5 h-3.5 rotate-90" />
                    </button>
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-2 bg-purple-950/30 border border-purple-500/15 p-2.5 rounded-xl text-[10px] font-mono text-left">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-slate-400 text-[8px] uppercase tracking-wider block">Mode Sandbox</span>
                    <span className={`font-black text-[9px] uppercase tracking-tight ${!isOutsideSandbox() ? 'text-green-400' : 'text-amber-400'}`}>
                      {!isOutsideSandbox() ? '✅ SANDBOX (FREE)' : '⚠️ OFFLINE/LOCAL'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 border-l border-purple-500/15 pl-2.5">
                    <span className="text-slate-400 text-[8px] uppercase tracking-wider block">Status Proteksi</span>
                    <span className={`font-black text-[9px] uppercase tracking-tight ${isCurrentlyLocked ? 'text-red-400' : 'text-green-400'}`}>
                      {isCurrentlyLocked ? '🚨 TERKUNCI' : '✅ TERBUKA'}
                    </span>
                  </div>
                </div>

                {/* Simulation Control Block */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center bg-purple-950/20 border border-purple-500/10 p-2 rounded-lg text-[10px] font-mono text-left">
                    <span className="text-slate-400">Status Simulasi:</span>
                    <span className={`font-black uppercase tracking-wider px-1.5 py-0.5 rounded text-[8.5px] ${
                      isSimulatedLocked
                        ? 'bg-amber-550/10 text-amber-400 border border-amber-555/35'
                        : 'bg-green-550/10 text-green-450 border border-green-555/35'
                    }`}>
                      {isSimulatedLocked ? '🚨 TERKUNCI' : '✅ BERJALAN'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerClick();
                        toggleSimulatedLock();
                      }}
                      className={`py-2 px-2 rounded-xl font-bold uppercase text-[9px] tracking-wider transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSimulatedLocked
                          ? 'bg-gradient-to-r from-green-700 to-indigo-700 hover:from-green-600 hover:to-indigo-650 text-white shadow-md border border-green-500/30'
                          : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-550 hover:to-orange-550 text-white shadow-md border border-amber-500/30'
                      }`}
                    >
                      {isSimulatedLocked ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          UN-LOCK
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          SIMULASIKAN
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        triggerClick();
                        localStorage.removeItem('silat_activation_key');
                        localStorage.removeItem('silat_simulated_lock');
                        setIsAppLicensed(false);
                        setIsSimulatedLocked(false);
                        setActivationKeyInput('');
                        if (soundEnabled) playClickSound();
                        fetch('/api/license/reset', { method: 'POST' })
                          .then(() => showToast('Status Lisensi Berhasil Direset pada Server!', 'success'))
                          .catch(() => showToast('Gagal mereset lisensi di server lokal.', 'warning'));
                      }}
                      className="py-2.5 px-2 bg-red-950/40 hover:bg-red-900/40 border border-red-500/30 text-red-300 hover:text-white rounded-xl text-[9px] font-extrabold uppercase tracking-widest transition-all active:scale-[0.97] cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      RESET LISENSI
                    </button>
                  </div>

                  <p className="text-[9px] text-slate-500 font-mono text-center leading-normal pt-1">
                    Tekan tombol simulasi di atas untuk menguji penguncian sistem secara nyata.
                  </p>
                </div>
              </div>

              <div className="border-t border-purple-500/25 pt-3.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    triggerClick();
                    setShowLicenseStatusPopup(false);
                  }}
                  className="px-4 py-2 bg-purple-950 hover:bg-purple-900 text-purple-200 hover:text-white rounded-lg border border-purple-500/30 text-xs font-bold uppercase transition-all active:scale-[0.95] cursor-pointer"
                >
                  TUTUP
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WMP AUTO-PAUSE POPUP / NOTIFICATION */}
      <AnimatePresence>
        {role !== 'LANDING' && matchState.wmpTriggered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#00000ed2] backdrop-blur-md flex items-center justify-center p-4 z-[100] text-center select-none"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="max-w-xl w-full bg-[#140a24] border-2 border-amber-500 rounded-3xl p-8 space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-white"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500 text-amber-500 flex items-center justify-center animate-pulse">
                  <span className="text-3xl font-bold font-mono">⚠️</span>
                </div>
              </div>

              <div>
                <h3 className="text-[10px] text-amber-500 font-extrabold uppercase tracking-[0.2em] font-mono">
                  NOTIFIKASI SELISIH NILAI
                </h3>
                <h2 className="text-3xl font-black mt-2 font-sans uppercase tracking-tight">
                  SELISIH SKOR TERDETEKSI
                </h2>
              </div>

              <div className="bg-[#24133d]/50 p-5 rounded-2xl border border-purple-500/25 space-y-3">
                <p className="text-sm leading-relaxed text-slate-300">
                  Nilai sudah selisih <span className="font-extrabold text-amber-400 font-mono text-lg">{
                    (matchState.kategoriUsia || '').toUpperCase().includes('PRA') ? '20' : '30'
                  }</span> pada babak ke-<span className="font-black text-white font-mono text-lg">{matchState.babakAktif}</span> untuk kategori <span className="font-extrabold text-purple-300">{matchState.kategoriUsia || "REMAJA"}</span>.
                </p>
                
                {/* Display total scores */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-purple-500/10 font-mono">
                  <div className="text-center p-2 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300">
                    <span className="text-[9px] block text-slate-400">MERAH</span>
                    <span className="text-2xl font-black">{calculateFinalScore('MERAH', matchState)}</span>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-300">
                    <span className="text-[9px] block text-slate-400">BIRU</span>
                    <span className="text-2xl font-black">{calculateFinalScore('BIRU', matchState)}</span>
                  </div>
                </div>
              </div>

              {role === 'SEKRETARIS' ? (
                <div className="space-y-4">
                  <p className="text-xs text-amber-300 font-medium">Apakah pertandingan akan dihentikan dan menetapkan pemenang?</p>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        triggerClick();
                        // "Tidak" -> Close and keep timer paused. Set bypass to prevent re-triggering.
                        const scoreB = calculateFinalScore('BIRU', matchState);
                        const scoreR = calculateFinalScore('MERAH', matchState);
                        const currentDiff = Math.abs(scoreB - scoreR);
                        updateMatchState({
                          ...matchState,
                          wmpTriggered: false,
                          wmpBypassed: true,
                          wmpBypassedScoreDiff: currentDiff,
                          timerBerjalan: false
                        });
                      }}
                      className="py-3.5 bg-red-950/40 hover:bg-red-900/40 active:scale-95 border border-red-500/30 hover:border-red-555 rounded-2xl text-xs font-black uppercase tracking-widest text-red-300 transition-all cursor-pointer text-center"
                    >
                      Batal / Tidak
                    </button>
                    
                    <button
                      onClick={() => {
                        triggerClick();
                        // "Ya" -> automatically announce Winner with victory status WMP, archive and proceed!
                        const winner = matchState.wmpPemenang || (calculateFinalScore('BIRU', matchState) > calculateFinalScore('MERAH', matchState) ? 'BIRU' : 'MERAH');
                        
                        // Set ended on WMP
                        updateMatchState({
                          ...matchState,
                          wmpWon: true,
                          wmpPemenang: winner,
                          statusPertandingan: 'SELESAI',
                          showMatchEndPopUp: true,
                          umumkanPemenang: true,
                          wmpTriggered: false,
                          wmpBypassed: true
                        });
                      }}
                      className="py-3.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-amber-500/10 border border-amber-400/30 text-center animate-pulse"
                    >
                      Putuskan / Ya (WMP)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-purple-950/40 border border-purple-500/25 rounded-2xl">
                  <span className="text-sm font-black font-mono tracking-widest text-amber-400 animate-pulse block">
                    MENUNGGU KEPUTUSAN WASIT
                  </span>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase font-mono">
                    Sekretaris Sedang Meninjau Pilihan WMP
                  </p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📊 BANNER MODAL STATISTIK PERTANDINGAN */}
      <AnimatePresence>
        {showStatsBanner && (() => {
          const selectedMatch = history.find(h => h.id === selectedHistoryId) || history[history.length - 1] || null;
          
          const getMatchRoundStats = () => {
            if (!selectedMatch) return { data: [], totalGrossSum: 0, overall: { p: 0, k: 0, j: 0, hp: 0, pPct: 0, kPct: 0, jPct: 0, hpPct: 0 } };
            
            const targetCorner = activeStatsCorner;
            const roundsList = [1, 2, 3];
            const hasRound4 = selectedMatch.validatedScores?.some(v => v.babak === 4) || 
                              (targetCorner === 'MERAH' ? selectedMatch.historyPenaltiesMerah?.[4] : selectedMatch.historyPenaltiesBiru?.[4]) !== undefined;
            if (hasRound4) {
              roundsList.push(4);
            }

            const checkPeringatanIndex = (roundNumber: number, key: 'peringatan1' | 'peringatan2') => {
              const pArr = targetCorner === 'MERAH' ? selectedMatch.historyPenaltiesMerah : selectedMatch.historyPenaltiesBiru;
              const p = pArr?.[roundNumber];
              if (!p || !p[key]) return false;
              for (let prev = 1; prev < roundNumber; prev++) {
                const prevPen = pArr?.[prev];
                if (prevPen && prevPen[key]) {
                  return false;
                }
              }
              return true;
            };

            const getRoundPenaltyDeductions = (b: number) => {
              const pArr = targetCorner === 'MERAH' ? selectedMatch.historyPenaltiesMerah : selectedMatch.historyPenaltiesBiru;
              const penalties = pArr?.[b];
              let deduction = 0;
              if (penalties) {
                if (penalties.teguran1) deduction += 1;
                if (penalties.teguran2) deduction += 2;
                if (checkPeringatanIndex(b, 'peringatan1')) deduction += 5;
                if (checkPeringatanIndex(b, 'peringatan2')) deduction += 10;
              }
              return deduction;
            };

            let overallP = 0;
            let overallK = 0;
            let overallJ = 0;
            let overallHp = 0;
            let overallGrossSum = 0;

            const dataObj = roundsList.map(b => {
              const pCount = selectedMatch.validatedScores?.filter(v => v.sudut === targetCorner && v.babak === b && v.jenis === 'PUNCH').length || 0;
              const pPts = pCount * 1;
              const kCount = selectedMatch.validatedScores?.filter(v => v.sudut === targetCorner && v.babak === b && v.jenis === 'KICK').length || 0;
              const kPts = kCount * 2;
              const jCount = selectedMatch.validatedScores?.filter(v => v.sudut === targetCorner && v.babak === b && v.jenis === 'JATUHAN').length || 0;
              const jPts = jCount * 3;
              
              const hpPts = getRoundPenaltyDeductions(b);
              const gross = pPts + kPts + jPts;
              
              overallP += pPts;
              overallK += kPts;
              overallJ += jPts;
              overallHp += hpPts;
              overallGrossSum += gross;

              return {
                babak: b,
                pukulan: pPts,
                tendangan: kPts,
                jatuhan: jPts,
                hukuman: hpPts,
                totalGross: gross
              };
            });

            const overallObj = {
              p: overallP,
              k: overallK,
              j: overallJ,
              hp: overallHp,
              pPct: overallGrossSum > 0 ? parseFloat(((overallP / overallGrossSum) * 100).toFixed(1)) : 0,
              kPct: overallGrossSum > 0 ? parseFloat(((overallK / overallGrossSum) * 100).toFixed(1)) : 0,
              jPct: overallGrossSum > 0 ? parseFloat(((overallJ / overallGrossSum) * 100).toFixed(1)) : 0,
              hpPct: overallGrossSum > 0 ? parseFloat(((overallHp / overallGrossSum) * 105).toFixed(1)) : 0 // slight weight scale for view
            };

            return {
              data: dataObj,
              totalGrossSum: overallGrossSum,
              overall: overallObj
            };
          };

          const parsedStats = getMatchRoundStats();
          const maxScoreScaleValue = Math.max(
            5,
            ...parsedStats.data.map(d => Math.max(d.pukulan, d.tendangan, d.jatuhan, d.hukuman))
          );

          const activeAthleteName = activeStatsCorner === 'BIRU' ? selectedMatch?.atlitBiru.nama : selectedMatch?.atlitMerah.nama;
          const activeAthleteKontingen = activeStatsCorner === 'BIRU' ? selectedMatch?.atlitBiru.kontingen : selectedMatch?.atlitMerah.kontingen;
          const activeAthleteFinalScore = activeStatsCorner === 'BIRU' ? selectedMatch?.skorAkhirBiru : selectedMatch?.skorAkhirMerah;

          return (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] select-none text-white animate-in fade-in duration-300">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full max-w-5xl bg-gradient-to-b from-[#110522] to-black border border-purple-500/25 rounded-3xl p-5 md:p-6 shadow-[0_0_60px_rgba(109,40,217,0.3)] relative flex flex-col max-h-[92vh]"
              >
                {/* Close Button top right */}
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playClickSound();
                    setShowStatsBanner(false);
                  }}
                  className="absolute top-4 right-4 text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 p-1.5 rounded-lg border border-purple-500/20 cursor-pointer transition-all active:scale-95 z-50 animate-in fade-in"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-2 border-b border-purple-500/20 pb-4 shrink-0">
                  <BarChart3 className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <div className="text-left">
                    <h2 className="font-extrabold uppercase tracking-wider text-white text-base md:text-lg font-sans">
                      📊 STATISTIK RINGKASAN PERTANDINGAN
                    </h2>
                    <span className="text-[10px] text-purple-400/80 font-mono block">Informasi Persentase Nilai Teknik (3,2,1) &amp; Total Hukuman Atlet</span>
                  </div>
                </div>

                {/* Grid content */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4 overflow-y-auto scrollbar-thin flex-1 min-h-0 pr-1 pb-4">
                  
                  {/* Left Side: Match selection list and corner toggle */}
                  <div className="md:col-span-4 space-y-4 flex flex-col text-left">
                    
                    {/* Archived Match List Selection */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 block border-l-2 border-indigo-500 pl-1.5">
                        PILIH PARTAI DIARSIPKAN:
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                        {history.slice().reverse().map((h) => {
                          const isSel = selectedMatch?.id === h.id;
                          return (
                            <div 
                              key={h.id}
                              onClick={() => {
                                if (soundEnabled) playClickSound();
                                setSelectedHistoryId(h.id);
                              }}
                              className={`p-2.5 rounded-xl border text-[10px] cursor-pointer transition-all flex justify-between items-center ${
                                isSel 
                                  ? 'bg-[#1e0a35] border-indigo-500/80 text-white font-black shadow-md shadow-indigo-500/10' 
                                  : 'bg-black/30 border-purple-950/60 text-slate-400 hover:bg-purple-950/15 hover:text-slate-200 hover:border-purple-900/30'
                              }`}
                            >
                              <span className="truncate">Partai {h.partai} • Kelas {h.kelas}</span>
                              <span className="font-mono text-[9px] px-1.5 py-0.2 bg-black/40 border border-purple-950 rounded text-slate-400">
                                {h.atlitBiru.nama.split(' ')[0]} vs {h.atlitMerah.nama.split(' ')[0]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Corner Tabs Toggle */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-mono font-bold text-indigo-400 block border-l-2 border-indigo-500 pl-1.5">
                        SUDUT ATLET YANG DIANANALISIS:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Sudut Biru */}
                        <button
                          type="button"
                          onClick={() => {
                            if (soundEnabled) playClickSound();
                            setActiveStatsCorner('BIRU');
                          }}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                            activeStatsCorner === 'BIRU'
                              ? 'bg-blue-950/60 border-blue-550/80 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.25)] scale-[1.01]'
                              : 'bg-black/30 border-blue-950/20 text-slate-400 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[8px] font-mono tracking-wider uppercase font-black text-blue-400">SUDUT BIRU</span>
                            {activeStatsCorner === 'BIRU' && <span className="text-blue-400 text-xs font-black">●</span>}
                          </div>
                          <span className="font-black mt-2 text-xs truncate uppercase text-white leading-tight">{selectedMatch?.atlitBiru.nama || "ATLIT BIRU"}</span>
                          <span className="text-[9px] font-mono opacity-80 uppercase truncate mt-0.5">{selectedMatch?.atlitBiru.kontingen}</span>
                          <span className="text-xs font-mono font-black text-blue-400 mt-2">Skor: {selectedMatch?.skorAkhirBiru || 0}</span>
                        </button>

                        {/* Sudut Merah */}
                        <button
                          type="button"
                          onClick={() => {
                            if (soundEnabled) playClickSound();
                            setActiveStatsCorner('MERAH');
                          }}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                            activeStatsCorner === 'MERAH'
                              ? 'bg-red-950/60 border-red-540/80 text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.25)] scale-[1.01]'
                              : 'bg-black/30 border-red-950/20 text-slate-400 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[8px] font-mono tracking-wider uppercase font-black text-red-400">SUDUT MERAH</span>
                            {activeStatsCorner === 'MERAH' && <span className="text-red-400 text-xs font-black">●</span>}
                          </div>
                          <span className="font-black mt-2 text-xs truncate uppercase text-white leading-tight">{selectedMatch?.atlitMerah.nama || "ATLIT MERAH"}</span>
                          <span className="text-[9px] font-mono opacity-80 uppercase truncate mt-0.5">{selectedMatch?.atlitMerah.kontingen}</span>
                          <span className="text-xs font-mono font-black text-red-400 mt-2">Skor: {selectedMatch?.skorAkhirMerah || 0}</span>
                        </button>
                      </div>
                    </div>

                    {/* summary profile card */}
                    <div className="bg-black/30 border border-purple-950 p-3 rounded-2xl text-[10px] font-mono text-slate-400 space-y-1">
                      <span className="font-extrabold text-purple-400 block uppercase mb-1">DATA PARTAI:</span>
                      <div>Kategori: <span className="text-white font-extrabold">{selectedMatch?.kategoriUsia || "REMAJA"}</span></div>
                      <div>Kelas/Gender: <span className="text-white font-extrabold">{selectedMatch?.kelas} {selectedMatch?.gender}</span></div>
                      <div>Tahap: <span className="text-white font-extrabold">{selectedMatch?.tahapPertandingan}</span></div>
                      <div className="text-amber-400 font-extrabold pt-1">Pemenang: Sudut {selectedMatch?.pemenang || 'SERI/DRAFT'}</div>
                    </div>

                  </div>

                  {/* Right Side: The statistics bar chart and percentages */}
                  <div className="md:col-span-8 flex flex-col justify-between gap-4">
                    
                    {/* Athlete banner headers */}
                    <div className="bg-[#0b0314] border border-purple-950/70 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
                      <div>
                        <span className={`text-[9px] font-mono tracking-widest uppercase font-extrabold px-2 py-0.5 rounded ${
                          activeStatsCorner === 'BIRU' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15' : 'bg-red-500/10 text-red-400 border border-red-500/15'
                        }`}>
                          SUDUT {activeStatsCorner}
                        </span>
                        <h3 className="text-base font-black uppercase text-white mt-1.5 leading-none">{activeAthleteName}</h3>
                        <p className="text-[10px] text-slate-400 font-mono mt-1.5 font-bold tracking-wider uppercase">{activeAthleteKontingen}</p>
                      </div>
                      <div className="text-left sm:text-right flex flex-row sm:flex-col items-baseline sm:items-end gap-1 shrink-0">
                        <span className="text-[8px] text-slate-450 font-mono uppercase font-black tracking-wide leading-none">Skor Akhir:</span>
                        <span className="text-2xl font-black font-mono text-amber-400 leading-none">{activeAthleteFinalScore} pts</span>
                      </div>
                    </div>

                    {/* Grouped Bar Chart Stage */}
                    <div className="bg-black/40 border border-purple-950 p-4 rounded-xl space-y-4">
                      <div className="flex justify-between items-center border-b border-purple-950/50 pb-2">
                        <span className="text-[10px] font-extrabold uppercase font-mono text-purple-300">Grafik Batang Perolehan Nilai Teknik (Pukulan, Tendangan, Jatuhan) &amp; Hukuman Per-Babak</span>
                        <span className="text-[9px] text-slate-500 font-mono">Max Scale: {maxScoreScaleValue} pts</span>
                      </div>

                      <div className="flex flex-col h-48 justify-end relative mt-2">
                        {/* background scaling values */}
                        <div className="absolute inset-x-0 top-[15%] border-b border-purple-950/25 font-mono text-[8.5px] text-slate-600 pr-2 pointer-events-none flex justify-end">
                          <span>{Math.round(maxScoreScaleValue * 0.85)}</span>
                        </div>
                        <div className="absolute inset-x-0 top-[40%] border-b border-purple-950/25 font-mono text-[8.5px] text-slate-600 pr-2 pointer-events-none flex justify-end">
                          <span>{Math.round(maxScoreScaleValue * 0.60)}</span>
                        </div>
                        <div className="absolute inset-x-0 top-[65%] border-b border-purple-950/25 font-mono text-[8.5px] text-slate-600 pr-2 pointer-events-none flex justify-end">
                          <span>{Math.round(maxScoreScaleValue * 0.35)}</span>
                        </div>
                        <div className="absolute inset-x-0 top-[90%] border-b border-purple-950/30 font-mono text-[8.5px] text-slate-600 pr-2 pointer-events-none flex justify-end">
                          <span>0</span>
                        </div>

                        <div className="flex-1 flex gap-4 sm:gap-7 justify-around items-end h-full pb-1 z-10">
                          {parsedStats.data.map((d) => {
                            return (
                              <div key={d.babak} className="flex flex-col items-center gap-1.5 w-full max-w-[120px] relative">
                                <div className="flex gap-1 items-end justify-center w-full h-32">
                                  {/* Pukulan (1) - Indigo */}
                                  <div className="group relative flex-1 flex flex-col justify-end h-full">
                                    <span className="opacity-0 group-hover:opacity-100 absolute -top-[34px] left-1/2 -translate-x-1/2 bg-slate-950 border border-indigo-500/30 text-indigo-300 text-[8px] font-mono font-black px-1.5 py-0.5 rounded shadow-xl pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
                                      Pukulan: {d.pukulan} pts
                                    </span>
                                    <div 
                                      style={{ height: `${(d.pukulan / maxScoreScaleValue) * 100}%` }} 
                                      className="w-full rounded-t bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/20 hover:border-indigo-400 transition-all duration-300 hover:shadow-[0_0_8px_rgba(99,102,241,0.4)] cursor-pointer"
                                    />
                                  </div>

                                  {/* Tendangan (2) - Cyan */}
                                  <div className="group relative flex-1 flex flex-col justify-end h-full">
                                    <span className="opacity-0 group-hover:opacity-100 absolute -top-[34px] left-1/2 -translate-x-1/2 bg-slate-950 border border-cyan-500/30 text-cyan-300 text-[8px] font-mono font-black px-1.5 py-0.5 rounded shadow-xl pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
                                      Tendangan: {d.tendangan} pts
                                    </span>
                                    <div 
                                      style={{ height: `${(d.tendangan / maxScoreScaleValue) * 100}%` }} 
                                      className="w-full rounded-t bg-cyan-600 hover:bg-cyan-500 border border-cyan-400/20 hover:border-cyan-400 transition-all duration-300 hover:shadow-[0_0_8px_rgba(6,182,212,0.4)] cursor-pointer"
                                    />
                                  </div>

                                  {/* Jatuhan (3) - Emerald */}
                                  <div className="group relative flex-1 flex flex-col justify-end h-full">
                                    <span className="opacity-0 group-hover:opacity-100 absolute -top-[34px] left-1/2 -translate-x-1/2 bg-slate-950 border border-emerald-500/30 text-emerald-300 text-[8px] font-mono font-black px-1.5 py-0.5 rounded shadow-xl pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
                                      Jatuhan: {d.jatuhan} pts
                                    </span>
                                    <div 
                                      style={{ height: `${(d.jatuhan / maxScoreScaleValue) * 100}%` }} 
                                      className="w-full rounded-t bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/20 hover:border-emerald-400 transition-all duration-300 hover:shadow-[0_0_8px_rgba(16,185,129,0.4)] cursor-pointer"
                                    />
                                  </div>

                                  {/* Hukuman - Rose */}
                                  <div className="group relative flex-1 flex flex-col justify-end h-full">
                                    <span className="opacity-0 group-hover:opacity-100 absolute -top-[34px] left-1/2 -translate-x-1/2 bg-slate-950 border border-rose-500/30 text-rose-300 text-[8px] font-mono font-black px-1.5 py-0.5 rounded shadow-xl pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
                                      Hukuman: -{d.hukuman} pts
                                    </span>
                                    <div 
                                      style={{ height: `${(d.hukuman / maxScoreScaleValue) * 100}%` }} 
                                      className="w-full rounded-t bg-rose-600 hover:bg-rose-550 border border-rose-450/20 hover:border-rose-400 transition-all duration-300 hover:shadow-[0_0_8px_rgba(244,63,94,0.4)] cursor-pointer"
                                    />
                                  </div>
                                </div>

                                <span className="text-[9px] font-black uppercase font-mono text-purple-400 tracking-wider">
                                  {d.babak === 4 ? "B. TAMBAH" : `BABAK ${d.babak}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Legend Row */}
                      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2 border-t border-purple-950/40 text-[9px] font-mono font-bold">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-indigo-600 border border-indigo-400/20 rounded-sm block shadow-[0_0_5px_rgba(99,102,241,0.3)]" />
                          <span className="text-slate-400">Pukulan (1 pts)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-cyan-600 border border-cyan-400/20 rounded-sm block shadow-[0_0_5px_rgba(6,182,212,0.3)]" />
                          <span className="text-slate-400">Tendangan (2 pts)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-emerald-600 border border-emerald-400/20 rounded-sm block shadow-[0_0_5px_rgba(16,185,129,0.3)]" />
                          <span className="text-slate-400">Jatuhan (3 pts)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 bg-rose-600 border border-rose-400/20 rounded-sm block shadow-[0_0_5px_rgba(244,63,94,0.3)]" />
                          <span className="text-slate-400">Hukuman Atlet (-)</span>
                        </div>
                      </div>
                    </div>

                    {/* Percentages and Penalties Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Technical 1 (Pukulan) Pct */}
                      <div className="bg-[#0b0314] border border-indigo-950/70 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[8px] font-mono tracking-widest text-indigo-405 block font-bold uppercase">TEKNIK 1 (PUKULAN)</span>
                        <div className="flex justify-between items-baseline">
                          <span className="text-base font-black text-white">{parsedStats.overall.p} <span className="text-[8px] text-slate-500 font-normal">pts</span></span>
                          <span className="text-[10px] font-mono font-black text-indigo-300">{parsedStats.overall.pPct}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-indigo-950/40">
                          <div style={{ width: `${parsedStats.overall.pPct}%` }} className="bg-indigo-505 h-full rounded-full" />
                        </div>
                      </div>

                      {/* Technical 2 (Tendangan) Pct */}
                      <div className="bg-[#0b0314] border border-cyan-950/70 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[8px] font-mono tracking-widest text-cyan-405 block font-bold uppercase">TEKNIK 2 (TENDANGAN)</span>
                        <div className="flex justify-between items-baseline">
                          <span className="text-base font-black text-white">{parsedStats.overall.k} <span className="text-[8px] text-slate-500 font-normal">pts</span></span>
                          <span className="text-[10px] font-mono font-black text-cyan-300">{parsedStats.overall.kPct}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-cyan-950/40">
                          <div style={{ width: `${parsedStats.overall.kPct}%` }} className="bg-cyan-505 h-full rounded-full" />
                        </div>
                      </div>

                      {/* Technical 3 (Jatuhan) Pct */}
                      <div className="bg-[#0b0314] border border-emerald-950/70 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[8px] font-mono tracking-widest text-emerald-405 block font-bold uppercase">TEKNIK 3 (JATUHAN)</span>
                        <div className="flex justify-between items-baseline">
                          <span className="text-base font-black text-white">{parsedStats.overall.j} <span className="text-[8px] text-slate-500 font-normal">pts</span></span>
                          <span className="text-[10px] font-mono font-black text-emerald-300">{parsedStats.overall.jPct}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-emerald-950/40">
                          <div style={{ width: `${parsedStats.overall.jPct}%` }} className="bg-emerald-505 h-full rounded-full" />
                        </div>
                      </div>

                      {/* Penalty Pct (out of overall scores) */}
                      <div className="bg-[#0b0314] border border-rose-950/70 p-3 rounded-xl text-left space-y-1">
                        <span className="text-[8px] font-mono tracking-widest text-rose-405 block font-bold uppercase">TOTAL HUKUMAN (*)</span>
                        <div className="flex justify-between items-baseline">
                          <span className="text-base font-black text-rose-455">-{parsedStats.overall.hp} <span className="text-[8px] text-slate-500 font-normal">pts</span></span>
                          <span className="text-[10px] font-mono font-black text-rose-400">{selectedMatch ? Math.round((parsedStats.overall.hp / Math.max(1, parsedStats.overall.p + parsedStats.overall.k + parsedStats.overall.j)) * 100) : 0}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-rose-950/40">
                          <div style={{ width: `${selectedMatch ? Math.min(100, Math.round((parsedStats.overall.hp / Math.max(1, parsedStats.overall.p + parsedStats.overall.k + parsedStats.overall.j)) * 100)) : 0}%` }} className="bg-rose-505 h-full rounded-full" />
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

              {/* Footer and exit button */}
              <div className="border-t border-purple-500/15 pt-3.5 flex justify-between items-center shrink-0">
                <span className="text-[9px] text-slate-500 font-mono">*Persentase dihitung berdasarkan total Nilai Teknik dari total perolehan nilai positif dari Babak 1,2,3 dan babak tambahan.</span>
                <button
                  type="button"
                  onClick={() => {
                    if (soundEnabled) playClickSound();
                    setShowStatsBanner(false);
                  }}
                  className="px-6 py-2 bg-[#2d1154] hover:bg-purple-900 text-purple-200 hover:text-white rounded-xl border border-purple-500/30 text-xs font-bold uppercase transition-all active:scale-[0.96] cursor-pointer"
                >
                  Tutup / Selesai
                </button>
              </div>

            </motion.div>
          </div>
        );
      })()}
      </AnimatePresence>

      {/* Customized Non-blocking Floating Toast Overlay */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center p-2 w-full max-w-sm md:max-w-md animate-bounce pointer-events-none">
          <div className={`p-4 rounded-xl shadow-2xl border text-xs font-black backdrop-blur-md flex items-center gap-3 w-full justify-between tracking-wide pointer-events-auto ${
            toast.type === 'success' 
              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/50' 
              : toast.type === 'warning'
              ? 'bg-amber-950/95 text-amber-300 border-amber-500/50'
              : 'bg-indigo-950/95 text-indigo-300 border-indigo-500/50'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">📢</span>
              <span>{toast.message}</span>
            </div>
            <button 
              onClick={() => setToast(null)} 
              className="text-white/40 hover:text-white font-mono font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
