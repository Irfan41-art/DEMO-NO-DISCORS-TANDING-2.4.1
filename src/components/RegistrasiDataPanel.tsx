import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  Download, 
  Upload, 
  Calendar, 
  Trophy, 
  Settings, 
  Users, 
  ChevronRight, 
  FileSpreadsheet, 
  ListFilter, 
  Shield, 
  CheckCircle2, 
  FileText,
  AlertTriangle,
  RotateCcw,
  Files,
  Shuffle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { playClickSound } from '../sound';
import { downloadTournamentBracketPDF, downloadMatchSchedulePDF, getDynamicBracketRounds, downloadAllTournamentBracketsPDF } from '../utils/pdf';

interface Athlete {
  id: string;
  nama: string;
  kontingen: string;
  kelasTanding: string;
  kategoriUsia: string;
  gender: 'PUTRA' | 'PUTRI';
}

interface MatchPairing {
  id: string;
  kelasTanding: string;
  kategoriUsia: string;
  gender: 'PUTRA' | 'PUTRI';
  tahapPertandingan: string;
  atlitMerah: { nama: string; kontingen: string };
  atlitBiru: { nama: string; kontingen: string };
  partaiNo?: number; // assigned party number if checked
}

interface RegistrasiDataPanelProps {
  onBack: () => void;
  eventName: string;
  logoKiri?: string;
  logoKanan?: string;
  onApplySchedule: (schedule: any[]) => void;
}

export default function RegistrasiDataPanel({
  onBack,
  eventName,
  logoKiri,
  logoKanan,
  onApplySchedule
}: RegistrasiDataPanelProps) {
  const [activeTab, setActiveTab] = useState<'INPUT_ATLIT' | 'BAGAN' | 'KONTROL_PARTAI'>('INPUT_ATLIT');
  const [showAllInGrid, setShowAllInGrid] = useState<boolean>(false);
  const [bracketLayout, setBracketLayout] = useState<'STANDARD' | 'DUAL_SIDED'>('DUAL_SIDED');
  
  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const [svgLines, setSvgLines] = useState<{ id: string; path: string; type: 'red' | 'blue' }[]>([]);
  
  // ----------------------------------------------------
  // ATHLETES STATE & STORAGE
  // ----------------------------------------------------
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);
  
  // Load match history from local storage on mount or tab changes
  useEffect(() => {
    const loadHistory = () => {
      try {
        const saved = window.localStorage.getItem('silat_match_history');
        if (saved) {
          setMatchHistory(JSON.parse(saved));
        } else {
          setMatchHistory([]);
        }
      } catch (e) {
        console.warn("Could not read silat_match_history from localStorage", e);
      }
    };
    loadHistory();
  }, [activeTab]);
  
  // Custom toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    // Clear toast after 3.5 seconds
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Custom prompt modal state
  const [promptModal, setPromptModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
  } | null>(null);
  const [promptValue, setPromptValue] = useState('');
  
  // Form state
  const [formId, setFormId] = useState<string | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formKontingen, setFormKontingen] = useState('');
  const [formKelas, setFormKelas] = useState('KELAS A');
  const [formUsia, setFormUsia] = useState('REMAJA');
  const [formGender, setFormGender] = useState<'PUTRA' | 'PUTRI'>('PUTRA');

  // Load registered athletes from local storage on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('silat_registered_athletes');
      if (saved) {
        setAthletes(JSON.parse(saved));
      } else {
        // Start completely empty as default
        setAthletes([]);
        window.localStorage.setItem('silat_registered_athletes', JSON.stringify([]));
      }
    } catch (e) {
      console.warn("Could not read silat_registered_athletes from localStorage", e);
    }
  }, []);

  // Sync state changes with localStorage
  const saveAthletes = (updatedList: Athlete[]) => {
    setAthletes(updatedList);
    try {
      window.localStorage.setItem('silat_registered_athletes', JSON.stringify(updatedList));
    } catch (err) {
      console.warn("Storage write failed", err);
    }
  };

  // ----------------------------------------------------
  // FORM & INPUT LOGIC
  // ----------------------------------------------------
  const handleSaveAthlete = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formNama.trim() || !formKontingen.trim()) {
      showNotification("Nama Atlit dan Kontingen tidak boleh kosong.", "error");
      return;
    }

    const uppercaseNama = formNama.trim().toUpperCase();
    const uppercaseKontingen = formKontingen.trim().toUpperCase();

    if (formId) {
      // Edit existing
      const updated = athletes.map(a => 
        a.id === formId 
          ? { ...a, nama: uppercaseNama, kontingen: uppercaseKontingen, kelasTanding: formKelas, kategoriUsia: formUsia, gender: formGender }
          : a
      );
      saveAthletes(updated);
      showNotification("Data Atlit berhasil diubah!", "success");
    } else {
      // Add new
      const newAthlete: Athlete = {
        id: 'ath-' + Math.random().toString(36).substring(2, 9),
        nama: uppercaseNama,
        kontingen: uppercaseKontingen,
        kelasTanding: formKelas,
        kategoriUsia: formUsia,
        gender: formGender
      };
      saveAthletes([...athletes, newAthlete]);
      showNotification("Data Atlit berhasil didaftarkan!", "success");
    }

    // Reset Form Input
    setFormId(null);
    setFormNama('');
    setFormKontingen('');
  };

  const handleEditAthlete = (ath: Athlete) => {
    playClickSound();
    setFormId(ath.id);
    setFormNama(ath.nama);
    setFormKontingen(ath.kontingen);
    setFormKelas(ath.kelasTanding);
    setFormUsia(ath.kategoriUsia);
    setFormGender(ath.gender);
  };

  const handleDeleteAthlete = (id: string) => {
    playClickSound();
    setConfirmModal({
      isOpen: true,
      title: "Hapus Atlit",
      message: "Apakah Anda yakin ingin menghapus data Atlit ini?",
      onConfirm: () => {
        const filtered = athletes.filter(a => a.id !== id);
        saveAthletes(filtered);
        showNotification("Data Atlit berhasil dihapus!", "success");
      }
    });
  };

  const handleCancelEdit = () => {
    playClickSound();
    setFormId(null);
    setFormNama('');
    setFormKontingen('');
  };

  // Filter automatically on form parameters
  const filteredAthletes = athletes.filter(a => 
    a.kelasTanding === formKelas && 
    a.kategoriUsia === formUsia && 
    a.gender === formGender
  );

  // All sorted athletes for global grid view option (grouped by Kelas, Gender, Nama)
  const sortedAllAthletes = [...athletes].sort((a, b) => {
    const classComp = a.kelasTanding.localeCompare(b.kelasTanding);
    if (classComp !== 0) return classComp;
    const genderComp = a.gender.localeCompare(b.gender);
    if (genderComp !== 0) return genderComp;
    return a.nama.localeCompare(b.nama);
  });

  const displayedAthletes = showAllInGrid ? sortedAllAthletes : filteredAthletes;

  // ----------------------------------------------------
  // BAGAN PERTANDINGAN LOGIC
  // ----------------------------------------------------
  // Get list of unique class combinations with registered athletes
  const getUniqueClasses = () => {
    const keys = new Set<string>();
    const list: { kelas: string; usia: string; gender: 'PUTRA' | 'PUTRI' }[] = [];
    
    athletes.forEach(a => {
      const key = `${a.kelasTanding}|${a.kategoriUsia}|${a.gender}`;
      if (!keys.has(key)) {
        keys.add(key);
        list.push({ kelas: a.kelasTanding, usia: a.kategoriUsia, gender: a.gender });
      }
    });

    // Sort by class and gender alphabetically
    return list.sort((a, b) => {
      const cl = a.kelas.localeCompare(b.kelas);
      if (cl !== 0) return cl;
      return a.gender.localeCompare(b.gender);
    });
  };

  const getStageLevel = (roundName: string): number => {
    const name = roundName.toUpperCase().trim();
    if (name.includes("FINAL") && !name.includes("PEREMPAT") && !name.includes("SEMI")) return 4;
    if (name.includes("SEMIFINAL") || name.includes("SEMI FINAL")) return 3;
    if (name.includes("PEREMPAT") || name.includes("QUARTER")) return 2;
    return 1; // Default/PENYISIHAN
  };

  // Helper to get global match numbering based on:
  // 1. Sort classes by participant count descending
  // 2. Traversal from bottom (lowest stage/Penyisihan) to top (Final)
  // 3. Rotational scheduling: taking 2 matches per class at a time, then moving to next class.
  const getGlobalMatchMap = () => {
    const map = new Map<string, number>(); // key: `${kelas}|${usia}|${gender}|${roundName}|${localPartaiId}` -> globalPartaiId
    
    // Group athletes by class
    const groups: Record<string, Athlete[]> = {};
    athletes.forEach(a => {
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
  };

  const uniqueClasses = getUniqueClasses();
  const [selectedClassIndex, setSelectedClassIndex] = useState<number>(0);
  const activeClass = uniqueClasses[selectedClassIndex] || uniqueClasses[0] || null;

  const bracketAthletes = activeClass 
    ? athletes.filter(a => 
        a.kelasTanding === activeClass.kelas && 
        a.kategoriUsia === activeClass.usia && 
        a.gender === activeClass.gender
      )
    : [];

  const getResolvedBracketRounds = (athList: Athlete[]) => {
    const rounds = getDynamicBracketRounds(athList);
    if (!activeClass) return rounds;
    const globalMatchMap = getGlobalMatchMap();

    // Walk through rounds from 0 to last to resolve winners from matchHistory
    for (let r = 0; r < rounds.length; r++) {
      const round = rounds[r];
      round.matches.forEach((match: any) => {
        const resolveSide = (side: any) => {
          if (side && side.fromPartai) {
            let globalId: number | undefined;
            for (const [key, val] of globalMatchMap.entries()) {
              if (key.startsWith(`${activeClass.kelas}|${activeClass.usia}|${activeClass.gender}|`) && key.endsWith(`|${side.fromPartai}`)) {
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
  };

  // Generate elegant bracket rounds from helper resolved with match winners
  const bracketRounds = getResolvedBracketRounds(bracketAthletes);

  const handleShuffleBracketSeeds = () => {
    playClickSound();
    if (!activeClass || bracketAthletes.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Kocak Bagan",
      message: "Kocak/Acak urutan atlit untuk pengundian bagan tanding?",
      onConfirm: () => {
        const shuffled = [...athletes];
        // Shuffle only the active class athletes
        const indexes = athletes
          .map((a, idx) => (a.kelasTanding === activeClass.kelas && a.kategoriUsia === activeClass.usia && a.gender === activeClass.gender) ? idx : -1)
          .filter(idx => idx !== -1);
        
        const shuffledActive = [...bracketAthletes].sort(() => Math.random() - 0.5);
        indexes.forEach((origIdx, i) => {
          shuffled[origIdx] = shuffledActive[i];
        });
        saveAthletes(shuffled);
        showNotification("Urutan bagan berhasil dikocak!", "success");
      }
    });
  };

  const handleClearBracketClass = () => {
    playClickSound();
    if (!activeClass) return;
    setConfirmModal({
      isOpen: true,
      title: "Kosongkan Kelas",
      message: `Apakah Anda yakin ingin menghapus seluruh atlit di kelas ${activeClass.kelas} ${activeClass.usia} ${activeClass.gender}?`,
      onConfirm: () => {
        const filtered = athletes.filter(a => 
          !(a.kelasTanding === activeClass.kelas && a.kategoriUsia === activeClass.usia && a.gender === activeClass.gender)
        );
        saveAthletes(filtered);
        showNotification("Daftar atlit kelas ini berhasil dikosongkan!", "success");
      }
    });
  };

  const handleResetAllAthletes = () => {
    playClickSound();
    setConfirmModal({
      isOpen: true,
      title: "Reset Semua Data Atlit",
      message: "Apakah Anda yakin ingin menghapus seluruh data atlit terdaftar? Semua data yang di-input manual maupun dari hasil impor Excel akan terhapus secara permanen, termasuk seluruh histori tanding.",
      onConfirm: () => {
        // Clear athletes
        saveAthletes([]);
        
        // Clear pairings & scheduled partai ids
        setPairings([]);
        setScheduledPartaiIds([]);
        
        // Clear match history state & local storage
        setMatchHistory([]);
        try {
          window.localStorage.removeItem('silat_match_history');
          window.localStorage.removeItem('silat_jadwal_lines');
          window.localStorage.removeItem('silat_excel_matches');
          window.localStorage.removeItem('silat_bagan_athletes');
          window.localStorage.removeItem('silat_match_state'); // Clear current active match state as well
        } catch (e) {
          console.warn("Could not clear some localStorage keys", e);
        }

        // Broadcast history update to other screens/windows
        try {
          const broadcastChannel = new BroadcastChannel('silat_scoring_sync');
          broadcastChannel.postMessage({ type: 'UPDATE_HISTORY', history: [] });
          broadcastChannel.postMessage({ type: 'UPDATE_STATE', state: null }); // Also reset active state
        } catch (err) {
          console.warn("Could not broadcast reset to channel", err);
        }

        // Sync with LAN Server to clear history
        try {
          fetch('/api/history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([]),
          }).catch(() => {});
        } catch (err) {}

        showNotification("Semua data atlit dan histori tanding berhasil dikosongkan!", "success");
      }
    });
  };

  const calculateBracketLines = () => {
    if (!bracketContainerRef.current) return;
    const parent = bracketContainerRef.current;
    const lines: any[] = [];

    const activeClass = uniqueClasses[selectedClassIndex];
    if (!activeClass) return;

    const bracketAthletes = athletes.filter(
      (a) =>
        a.kelasTanding === activeClass.kelas &&
        a.kategoriUsia === activeClass.usia &&
        a.gender === activeClass.gender
    );
    const bracketRounds = getResolvedBracketRounds(bracketAthletes);

    bracketRounds.forEach((round: any, rIndex: number) => {
      round.matches.forEach((match: any) => {
        const childEl = document.getElementById(`match-card-${match.partaiId}`);
        if (!childEl) return;

        const blueParentPartai = match.blue.fromPartai;
        const redParentPartai = match.red.fromPartai;

        const blueParentEl = blueParentPartai ? document.getElementById(`match-card-${blueParentPartai}`) : null;
        const redParentEl = redParentPartai ? document.getElementById(`match-card-${redParentPartai}`) : null;

        const childRect = childEl.getBoundingClientRect();
        const containerRect = parent.getBoundingClientRect();

        const childX = childRect.left - containerRect.left;
        const childY = childRect.top + childRect.height / 2 - containerRect.top;

        if (blueParentEl && redParentEl) {
          // BOTH parents exist! Combine into 1 unified line structure
          const blueRect = blueParentEl.getBoundingClientRect();
          const redRect = redParentEl.getBoundingClientRect();

          // Check if parents are left of the child
          const isLeftBranch = blueRect.left < childRect.left;

          const blueX = isLeftBranch 
            ? blueRect.right - containerRect.left 
            : blueRect.left - containerRect.left;
          const blueY = blueRect.top + blueRect.height / 2 - containerRect.top;

          const redX = isLeftBranch 
            ? redRect.right - containerRect.left 
            : redRect.left - containerRect.left;
          const redY = redRect.top + redRect.height / 2 - containerRect.top;

          const enterChildX = isLeftBranch 
            ? childX 
            : childRect.right - containerRect.left;

          const midX = isLeftBranch 
            ? (Math.max(blueX, redX) + childX) / 2
            : (Math.min(blueX, redX) + (childRect.right - containerRect.left)) / 2;

          const midY = (blueY + redY) / 2;

          const path = `M ${blueX} ${blueY} L ${midX} ${blueY} L ${midX} ${redY} L ${redX} ${redY} M ${midX} ${midY} L ${midX} ${childY} L ${enterChildX} ${childY}`;

          lines.push({
            id: `line-match-${match.partaiId}-combined`,
            path,
            type: 'neutral'
          });
        } else if (blueParentEl) {
          // ONLY blue parent exists
          const blueRect = blueParentEl.getBoundingClientRect();
          const isLeftBranch = blueRect.left < childRect.left;

          const blueX = isLeftBranch 
            ? blueRect.right - containerRect.left 
            : blueRect.left - containerRect.left;
          const blueY = blueRect.top + blueRect.height / 2 - containerRect.top;

          const enterChildX = isLeftBranch 
            ? childX 
            : childRect.right - containerRect.left;

          const midX = (blueX + enterChildX) / 2;

          const path = `M ${blueX} ${blueY} L ${midX} ${blueY} L ${midX} ${childY} L ${enterChildX} ${childY}`;

          lines.push({
            id: `line-match-${match.partaiId}-blue`,
            path,
            type: 'blue'
          });
        } else if (redParentEl) {
          // ONLY red parent exists
          const redRect = redParentEl.getBoundingClientRect();
          const isLeftBranch = redRect.left < childRect.left;

          const redX = isLeftBranch 
            ? redRect.right - containerRect.left 
            : redRect.left - containerRect.left;
          const redY = redRect.top + redRect.height / 2 - containerRect.top;

          const enterChildX = isLeftBranch 
            ? childX 
            : childRect.right - containerRect.left;

          const midX = (redX + enterChildX) / 2;

          const path = `M ${redX} ${redY} L ${midX} ${redY} L ${midX} ${childY} L ${enterChildX} ${childY}`;

          lines.push({
            id: `line-match-${match.partaiId}-red`,
            path,
            type: 'red'
          });
        }
      });
    });

    setSvgLines(lines);
  };

  useEffect(() => {
    if (activeTab === 'BAGAN' && athletes.length > 0) {
      // Run immediately
      calculateBracketLines();

      // Staggered execution for visual transition and layout updates
      const t1 = setTimeout(calculateBracketLines, 50);
      const t2 = setTimeout(calculateBracketLines, 150);
      const t3 = setTimeout(calculateBracketLines, 300);
      const t4 = setTimeout(calculateBracketLines, 600);
      const t5 = setTimeout(calculateBracketLines, 1000);

      // Periodic check interval to handle dynamic resizing, zoom, font loading, or layout shifts
      const intervalId = setInterval(calculateBracketLines, 400);

      window.addEventListener('resize', calculateBracketLines);

      let observer: ResizeObserver | null = null;
      if (bracketContainerRef.current && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => {
          calculateBracketLines();
        });
        observer.observe(bracketContainerRef.current);
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
        clearInterval(intervalId);
        window.removeEventListener('resize', calculateBracketLines);
        if (observer) observer.disconnect();
      };
    }
  }, [activeTab, athletes, selectedClassIndex, bracketLayout, matchHistory]);

  // ----------------------------------------------------
  // KONTROL PARTAI STATE & SCHEDULING (CHECKBOXES)
  // ----------------------------------------------------
  const [pairings, setPairings] = useState<MatchPairing[]>([]);
  const [scheduledPartaiIds, setScheduledPartaiIds] = useState<string[]>([]);

  // Regenerate pairings when athletes list changes
  useEffect(() => {
    const globalMatchMap = getGlobalMatchMap();
    // Group athletes by class
    const groups: Record<string, Athlete[]> = {};
    athletes.forEach(a => {
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
      kelasTanding: string;
      kategoriUsia: string;
      gender: 'PUTRA' | 'PUTRI';
      roundName: string;
      stageLevel: number;
      match: any;
      pRed: any;
      pBlue: any;
      originalPartaiId: number;
    }

    const allMatchRecords: MatchRecord[] = [];

    sortedGroupKeys.forEach(groupKey => {
      const athList = groups[groupKey];
      const [kelas, usia, gender] = groupKey.split('|');
      const rounds = getDynamicBracketRounds(athList);

      const resolvedMatches = new Map<number, any>();

      const allRawMatches: any[] = [];
      rounds.forEach((roundObj: any) => {
        roundObj.matches.forEach((m: any) => {
          allRawMatches.push({
            roundName: roundObj.roundName,
            match: m
          });
        });
      });

      const getActualParticipant = (side: any): any => {
        if (!side) return { isBye: true, nama: "BYE" };
        if (side.isBye || side.nama === "BYE") {
          return { isBye: true, nama: "BYE" };
        }
        if (side.fromPartai) {
          // Find the round name of the previous local match
          const prevMatchObj = allRawMatches.find(item => item.match.partaiId === side.fromPartai);
          if (prevMatchObj) {
            const mapKey = `${kelas}|${usia}|${gender}|${prevMatchObj.roundName}|${side.fromPartai}`;
            const globalPartaiNo = globalMatchMap.get(mapKey);
            if (globalPartaiNo) {
              const h = matchHistory.find(item => String(item.partai) === String(globalPartaiNo));
              if (h && h.pemenang) {
                const isRedWin = h.pemenang === 'MERAH' || h.pemenang === 'DISK_MERAH';
                const winner = isRedWin ? h.atlitMerah : h.atlitBiru;
                return {
                  type: 'athlete',
                  nama: winner.nama || "",
                  kontingen: winner.kontingen || ""
                };
              }
            }
          }

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
          const pRed = resolved ? resolved.actualRed : null;
          const pBlue = resolved ? resolved.actualBlue : null;
          const stageLevel = getStageLevel(item.roundName);

          allMatchRecords.push({
            groupKey,
            kelasTanding: kelas,
            kategoriUsia: usia,
            gender: gender as 'PUTRA' | 'PUTRI',
            roundName: item.roundName,
            stageLevel,
            match: m,
            pRed,
            pBlue,
            originalPartaiId: m.partaiId
          });
        }
      });
    });

    const newPairings: MatchPairing[] = [];

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

              const getAthleteScheduleName = (p: any, defaultVal: string) => {
                if (!p) return defaultVal;
                if (p.isBye || p.nama === "BYE") return "BYE";
                if (p.type === 'placeholder') return `PEMENANG PARTAI ${p.fromPartai}`;
                return p.nama || defaultVal;
              };

              const getAthleteScheduleKontingen = (p: any, defaultVal: string) => {
                if (!p) return defaultVal;
                if (p.isBye || p.nama === "BYE" || p.type === 'placeholder') return "SUDUT KOSONG";
                return p.kontingen || defaultVal;
              };

              const redName = getAthleteScheduleName(record.pRed, record.match.red?.nama || "");
              const redKontingen = getAthleteScheduleKontingen(record.pRed, record.match.red?.kontingen || "");
              const blueName = getAthleteScheduleName(record.pBlue, record.match.blue?.nama || "");
              const blueKontingen = getAthleteScheduleKontingen(record.pBlue, record.match.blue?.kontingen || "");

              newPairings.push({
                id: `pair-${record.groupKey.replace(/\|/g, '-')}-${record.roundName}-${record.originalPartaiId}`,
                kelasTanding: record.kelasTanding,
                kategoriUsia: record.kategoriUsia,
                gender: record.gender,
                tahapPertandingan: record.roundName,
                atlitMerah: { nama: redName, kontingen: redKontingen },
                atlitBiru: { nama: blueName, kontingen: blueKontingen }
              });
            }
            classIndices[key] = currentIndex + takeCount;
          }
        }
      }
    }

    setPairings(newPairings);

    // Sync from local storage loaded schedules
    try {
      const savedLines = window.localStorage.getItem('silat_jadwal_lines');
      if (savedLines) {
        const parsed = JSON.parse(savedLines);
        const ids: string[] = [];
        // Map saved partidos to pairings ids
        parsed.forEach((line: any) => {
          const match = newPairings.find(p => 
            p.kelasTanding === line.kelas && 
            p.gender === line.gender && 
            p.kategoriUsia === line.kategoriUsia &&
            p.tahapPertandingan === line.tahapPertandingan &&
            p.atlitMerah.nama === line.atlitMerah?.nama &&
            p.atlitBiru.nama === line.atlitBiru?.nama
          );
          if (match) {
            ids.push(match.id);
          }
        });
        setScheduledPartaiIds(ids);
      } else if (newPairings.length > 0) {
        // Centang otomatis baris yang sudah ditetapkan Partainya jika belum ada jadwal tersimpan
        const ids = newPairings.map(p => p.id);
        setScheduledPartaiIds(ids);

        const scheduledMatches = newPairings.map((pair, index) => {
          const orderNo = index + 1;
          const h = matchHistory.find(item => String(item.partai) === String(orderNo));
          const isCompleted = !!(h && h.pemenang);
          return {
            partai: String(orderNo),
            kelas: pair.kelasTanding,
            gender: pair.gender,
            kategoriUsia: pair.kategoriUsia,
            tahapPertandingan: pair.tahapPertandingan,
            atlitMerah: pair.atlitMerah,
            atlitBiru: pair.atlitBiru,
            isCompleted: isCompleted
          };
        });

        window.localStorage.setItem('silat_jadwal_lines', JSON.stringify(scheduledMatches));
        onApplySchedule(scheduledMatches);
      }
    } catch {}
  }, [athletes, matchHistory]);

  // Handle Match Selection Checkbox
  const handleToggleSchedule = (pairingId: string) => {
    playClickSound();
    let updatedIds = [...scheduledPartaiIds];
    if (updatedIds.includes(pairingId)) {
      updatedIds = updatedIds.filter(id => id !== pairingId);
    } else {
      updatedIds.push(pairingId);
    }
    setScheduledPartaiIds(updatedIds);

    // Reconstruct the official scheduled matches list
    const scheduledMatches = updatedIds.map((id, index) => {
      const pair = pairings.find(p => p.id === id)!;
      const orderNo = index + 1;
      const h = matchHistory.find(item => String(item.partai) === String(orderNo));
      const isCompleted = !!(h && h.pemenang);
      return {
        partai: String(orderNo),
        kelas: pair.kelasTanding,
        gender: pair.gender,
        kategoriUsia: pair.kategoriUsia,
        tahapPertandingan: pair.tahapPertandingan,
        atlitMerah: pair.atlitMerah,
        atlitBiru: pair.atlitBiru,
        isCompleted: isCompleted
      };
    });

    // Save schedules to local storages
    try {
      window.localStorage.setItem('silat_jadwal_lines', JSON.stringify(scheduledMatches));
      
      // Also construct silat_excel_matches format
      const excelMatches = scheduledMatches.map(row => ({
        'Partai': row.partai,
        'Kelas': row.kelas,
        'Gender': row.gender,
        'Kategori Usia': row.kategoriUsia,
        'Tahap Pertandingan': row.tahapPertandingan,
        'Nama Pesilat Merah': row.atlitMerah?.nama || '',
        'Kontingen Merah': row.atlitMerah?.kontingen || '',
        'Nama Pesilat Biru': row.atlitBiru?.nama || '',
        'Kontingen Biru': row.atlitBiru?.kontingen || '',
        'Nama Event': eventName || 'Kejuaraan Pencak Silat',
        'Durasi Babak (Menit)': ["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER A", "USIA DINI"].includes(row.kategoriUsia) ? '01:30' : (row.kategoriUsia === "MASTER 2" || row.kategoriUsia === "MASTER B" ? "01:00" : "02:00")
      }));
      window.localStorage.setItem('silat_excel_matches', JSON.stringify(excelMatches));
      
      // Propagate update upstream
      onApplySchedule(scheduledMatches);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleApplySelectedSchedule = () => {
    playClickSound();
    if (scheduledPartaiIds.length === 0) {
      showNotification("Tidak ada partai tanding terpilih untuk diterapkan! Silakan centang partai terlebih dahulu.", "error");
      return;
    }

    const scheduledMatches = scheduledPartaiIds.map((id, index) => {
      const pair = pairings.find(p => p.id === id);
      if (!pair) return null;
      const orderNo = index + 1;
      const h = matchHistory.find(item => String(item.partai) === String(orderNo));
      const isCompleted = !!(h && h.pemenang);
      return {
        partai: String(orderNo),
        kelas: pair.kelasTanding,
        gender: pair.gender,
        kategoriUsia: pair.kategoriUsia,
        tahapPertandingan: pair.tahapPertandingan,
        atlitMerah: pair.atlitMerah,
        atlitBiru: pair.atlitBiru,
        isCompleted: isCompleted
      };
    }).filter(Boolean) as any[];

    try {
      window.localStorage.setItem('silat_jadwal_lines', JSON.stringify(scheduledMatches));

      const excelMatches = scheduledMatches.map(row => ({
        'Partai': row.partai,
        'Kelas': row.kelas,
        'Gender': row.gender,
        'Kategori Usia': row.kategoriUsia,
        'Tahap Pertandingan': row.tahapPertandingan,
        'Nama Pesilat Merah': row.atlitMerah?.nama || '',
        'Kontingen Merah': row.atlitMerah?.kontingen || '',
        'Nama Pesilat Biru': row.atlitBiru?.nama || '',
        'Kontingen Biru': row.atlitBiru?.kontingen || '',
        'Nama Event': eventName || 'Kejuaraan Pencak Silat',
        'Durasi Babak (Menit)': ["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER A", "USIA DINI"].includes(row.kategoriUsia) ? '01:30' : (row.kategoriUsia === "MASTER 2" || row.kategoriUsia === "MASTER B" ? "01:00" : "02:00")
      }));
      window.localStorage.setItem('silat_excel_matches', JSON.stringify(excelMatches));

      onApplySchedule(scheduledMatches);
      showNotification(`Berhasil menerapkan ${scheduledMatches.length} Jadwal Partai terpilih ke Parameter Pertandingan!`, "success");
    } catch (e) {
      console.warn(e);
      showNotification("Gagal menerapkan jadwal pertandingan!", "error");
    }
  };

  const handleAutoScheduleAndCheckAll = () => {
    playClickSound();
    const ids = pairings.map(p => p.id);
    setScheduledPartaiIds(ids);

    const scheduledMatches = pairings.map((pair, index) => {
      const orderNo = index + 1;
      const h = matchHistory.find(item => String(item.partai) === String(orderNo));
      const isCompleted = !!(h && h.pemenang);
      return {
        partai: String(orderNo),
        kelas: pair.kelasTanding,
        gender: pair.gender,
        kategoriUsia: pair.kategoriUsia,
        tahapPertandingan: pair.tahapPertandingan,
        atlitMerah: pair.atlitMerah,
        atlitBiru: pair.atlitBiru,
        isCompleted: isCompleted
      };
    });

    try {
      window.localStorage.setItem('silat_jadwal_lines', JSON.stringify(scheduledMatches));
      
      // Also construct silat_excel_matches format
      const excelMatches = scheduledMatches.map(row => ({
        'Partai': row.partai,
        'Kelas': row.kelas,
        'Gender': row.gender,
        'Kategori Usia': row.kategoriUsia,
        'Tahap Pertandingan': row.tahapPertandingan,
        'Nama Pesilat Merah': row.atlitMerah?.nama || '',
        'Kontingen Merah': row.atlitMerah?.kontingen || '',
        'Nama Pesilat Biru': row.atlitBiru?.nama || '',
        'Kontingen Biru': row.atlitBiru?.kontingen || '',
        'Nama Event': eventName || 'Kejuaraan Pencak Silat',
        'Durasi Babak (Menit)': ["PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER A", "USIA DINI"].includes(row.kategoriUsia) ? '01:30' : (row.kategoriUsia === "MASTER 2" || row.kategoriUsia === "MASTER B" ? "01:00" : "02:00")
      }));
      window.localStorage.setItem('silat_excel_matches', JSON.stringify(excelMatches));

      onApplySchedule(scheduledMatches);
      showNotification("Sistem berhasil mengatur dan centang otomatis semua Partai (Mixed/Prioritas Kelas Terbanyak)!", "success");
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCancelAllSelections = () => {
    playClickSound();
    if (scheduledPartaiIds.length === 0) {
      showNotification("Tidak ada partai tanding terpilih untuk dibatalkan!", "info");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Batalkan Semua Pilihan",
      message: "Apakah Anda yakin ingin membatalkan seluruh pilihan partai yang tercentang?",
      onConfirm: () => {
        setScheduledPartaiIds([]);
        try {
          window.localStorage.setItem('silat_jadwal_lines', JSON.stringify([]));
          window.localStorage.setItem('silat_excel_matches', JSON.stringify([]));
          onApplySchedule([]);
          showNotification("Semua pilihan Partai berhasil dibatalkan!", "success");
        } catch (e) {
          console.warn(e);
        }
      }
    });
  };

  // Handle Edit Match corners or stages
  const handleEditMatchPairing = (pairId: string) => {
    playClickSound();
    const pair = pairings.find(p => p.id === pairId);
    if (!pair) return;
    
    setPromptValue(pair.tahapPertandingan);
    setPromptModal({
      isOpen: true,
      title: "Ubah Tahap Pertandingan",
      message: "Ubah Tahap Pertandingan (misal: SEMIFINAL, FINAL):",
      defaultValue: pair.tahapPertandingan,
      onConfirm: (val) => {
        const uppercaseStage = val.trim().toUpperCase() || pair.tahapPertandingan;
        const updatedPairings = pairings.map(p => 
          p.id === pairId ? { ...p, tahapPertandingan: uppercaseStage } : p
        );
        setPairings(updatedPairings);
        showNotification("Tahap pertandingan berhasil diubah!", "success");
      }
    });
  };

  const handleDeleteMatchPairing = (pairId: string) => {
    playClickSound();
    setConfirmModal({
      isOpen: true,
      title: "Hapus Partai",
      message: "Hapus pasang tanding ini dari daftar partai?",
      onConfirm: () => {
        const filtered = pairings.filter(p => p.id !== pairId);
        setPairings(filtered);
        if (scheduledPartaiIds.includes(pairId)) {
          setScheduledPartaiIds(scheduledPartaiIds.filter(id => id !== pairId));
        }
        showNotification("Pasangan tanding berhasil dihapus!", "success");
      }
    });
  };

  // Grouped athletes count per class (recap)
  const getClassRecaps = () => {
    const counts: Record<string, number> = {};
    athletes.forEach(a => {
      const key = `${a.kelasTanding} ${a.kategoriUsia} ${a.gender}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([kelasName, total]) => ({ kelasName, total }));
  };

  // ----------------------------------------------------
  // EXCEL & PDF IMPORTS/EXPORTS
  // ----------------------------------------------------
  
  // 1. INPUT DATA ATLIT EXCEL/PDF FEATURES
  const downloadTemplateExcelAtlit = () => {
    playClickSound();
    const data = [
      {
        'Nama': 'ADI WIJAYA',
        'Kontingen': 'JAWA TENGAH',
        'Kelas Tanding': 'KELAS A',
        'Kategori Usia': 'REMAJA',
        'Gender': 'PUTRA'
      },
      {
        'Nama': 'SITI AMINAH',
        'Kontingen': 'BANTEN',
        'Kelas Tanding': 'KELAS B',
        'Kategori Usia': 'REMAJA',
        'Gender': 'PUTRI'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Atlit');
    XLSX.writeFile(workbook, 'Template_Import_Atlit_Silat.xlsx');
  };

  const exportExcelAtlit = () => {
    playClickSound();
    if (athletes.length === 0) {
      showNotification("Belum ada data Atlit untuk diexport!", "error");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(athletes.map((a, i) => ({
      No: i + 1,
      Nama: a.nama,
      Kontingen: a.kontingen,
      'Kelas Tanding': a.kelasTanding,
      'Kategori Usia': a.kategoriUsia,
      Gender: a.gender
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Atlit');
    XLSX.writeFile(workbook, `Export_Registrasi_Atlit_Silat_${Date.now()}.xlsx`);
  };

  const importExcelAtlit = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        const imported: Athlete[] = rows.map((r, i) => {
          const rawGender = String(r['Gender'] || r['gender'] || 'PUTRA').toUpperCase().trim();
          const gender: 'PUTRA' | 'PUTRI' = (rawGender.includes('PUTRI') || rawGender.includes('PEREMPUAN') || rawGender.includes('FEMALE')) ? 'PUTRI' : 'PUTRA';
          
          let rawKelas = String(r['Kelas Tanding'] || r['kelas_tanding'] || r['Kelas'] || 'KELAS A').toUpperCase().trim();
          if (/^[A-J]$/.test(rawKelas)) {
            rawKelas = `KELAS ${rawKelas}`;
          } else {
            const match = rawKelas.match(/KELAS\s*([A-J])/i);
            if (match) {
              rawKelas = `KELAS ${match[1].toUpperCase()}`;
            }
          }

          return {
            id: 'ath-imported-' + i + '-' + Math.random().toString(36).substring(2, 6),
            nama: String(r['Nama'] || r['nama'] || `Atlit ${i}`).toUpperCase().trim(),
            kontingen: String(r['Kontingen'] || r['kontingen'] || 'DAERAH').toUpperCase().trim(),
            kelasTanding: rawKelas,
            kategoriUsia: String(r['Kategori Usia'] || r['kategori_usia'] || r['Usia'] || 'REMAJA').toUpperCase().trim(),
            gender: gender
          };
        });

        if (imported.length > 0) {
          saveAthletes([...athletes, ...imported]);
          showNotification(`Sukses mengimpor ${imported.length} Atlit baru!`, "success");
        } else {
          showNotification("Gagal mendeteksi data Atlit dalam berkas.", "error");
        }
      } catch (err) {
        showNotification("Gagal memproses berkas Excel: " + err, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadPDFAthletes = () => {
    playClickSound();
    const doc = new jsPDF() as any;
    doc.setFontSize(14);
    doc.text("LAPORAN REGISTRASI DATA ATLIT PENCAK SILAT", 14, 15);
    doc.setFontSize(9);
    doc.text(`Event: ${eventName || 'KEJUARAAN NASIONAL PENCAK SILAT'}`, 14, 20);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 24);

    const body = sortedAllAthletes.map((a, i) => [
      i + 1,
      a.nama,
      a.kontingen,
      a.kelasTanding,
      a.kategoriUsia,
      a.gender
    ]);

    autoTable(doc, {
      startY: 28,
      head: [['No', 'Nama Atlit', 'Kontingen', 'Kelas Tanding', 'Kategori Usia', 'Gender']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [40, 10, 80] }
    });

    doc.save(`Registrasi_Atlit_Silat_${Date.now()}.pdf`);
  };

  // 2. BAGAN EXCEL/PDF FEATURES
  const downloadTemplateExcelBagan = () => {
    playClickSound();
    const data = [
      {
        'Nama': 'ANDI SANTOSO',
        'Kontingen': 'JAWA TENGAH'
      },
      {
        'Nama': 'BUDI PRASETYO',
        'Kontingen': 'DKI JAKARTA'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Bagan');
    XLSX.writeFile(workbook, 'Template_Bagan_Atlit_Silat.xlsx');
  };

  const exportExcelBagan = () => {
    playClickSound();
    if (bracketAthletes.length === 0 || !activeClass) {
      showNotification("Belum ada data Atlit di Kelas terpilih untuk di-export!", "error");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(bracketAthletes.map((a, i) => ({
      No: i + 1,
      Nama: a.nama,
      Kontingen: a.kontingen
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Bagan_${activeClass.kelas}`);
    XLSX.writeFile(workbook, `Bagan_Kelas_${activeClass.kelas}_${activeClass.gender}_${Date.now()}.xlsx`);
  };

  const importExcelBagan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeClass) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        const imported: Athlete[] = rows.map((r, i) => ({
          id: 'ath-bg-imported-' + i + '-' + Math.random().toString(36).substring(2, 6),
          nama: String(r['Nama'] || r['nama'] || `Atlit ${i}`).toUpperCase().trim(),
          kontingen: String(r['Kontingen'] || r['kontingen'] || 'DAERAH').toUpperCase().trim(),
          kelasTanding: activeClass.kelas,
          kategoriUsia: activeClass.usia,
          gender: activeClass.gender
        }));

        if (imported.length > 0) {
          saveAthletes([...athletes, ...imported]);
          showNotification(`Sukses mengimpor ${imported.length} Atlit ke kelas ${activeClass.kelas}!`, "success");
        } else {
          showNotification("Gagal mendeteksi data Atlit.", "error");
        }
      } catch (err) {
        showNotification("Gagal memproses berkas Excel: " + err, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadPDFBagan = () => {
    playClickSound();
    if (!activeClass || bracketAthletes.length === 0) {
      showNotification("Belum ada data bagan untuk dicetak!", "error");
      return;
    }
    downloadTournamentBracketPDF(
      eventName || "KEJUARAAN NASIONAL PENCAK SILAT",
      bracketAthletes,
      "BAGAN PERTANDINGAN DIGITAL",
      activeClass.kelas,
      activeClass.gender,
      activeClass.usia,
      bracketLayout === 'DUAL_SIDED'
    );
  };

  const downloadAllPDFBagan = () => {
    playClickSound();
    const classes = getUniqueClasses();
    if (classes.length === 0) {
      showNotification("Belum ada data bagan terdaftar untuk dicetak!", "error");
      return;
    }
    downloadAllTournamentBracketsPDF(
      eventName || "KEJUARAAN NASIONAL PENCAK SILAT",
      athletes,
      classes,
      bracketLayout === 'DUAL_SIDED'
    );
    showNotification(`Mengunduh ${classes.length} halaman bagan braket ke dalam 1 file PDF...`, "success");
  };

  // 3. KONTROL PARTAI EXCEL/PDF FEATURES
  const downloadTemplateExcelKontrolPartai = () => {
    playClickSound();
    const data = [
      {
        'Partai': 1,
        'Kelas': 'Kelas A',
        'Gender': 'PUTRA',
        'Kategori Usia': 'REMAJA',
        'Tahap Pertandingan': 'PENYISIHAN',
        'Nama Pesilat Merah': 'ADI WIJAYA',
        'Kontingen Merah': 'JAWA TENGAH',
        'Nama Pesilat Biru': 'RIZKY PUTRA',
        'Kontingen Biru': 'JAWA TIMUR'
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Jadwal');
    XLSX.writeFile(workbook, 'Template_Jadwal_Partai_Silat.xlsx');
  };

  const exportExcelKontrolPartai = () => {
    playClickSound();
    const activeSchedule = scheduledPartaiIds.map((id, index) => {
      const pair = pairings.find(p => p.id === id)!;
      return {
        'Partai': index + 1,
        'Kelas': pair.kelasTanding,
        'Gender': pair.gender,
        'Kategori Usia': pair.kategoriUsia,
        'Tahap Pertandingan': pair.tahapPertandingan,
        'Nama Pesilat Merah': pair.atlitMerah.nama,
        'Kontingen Merah': pair.atlitMerah.kontingen,
        'Nama Pesilat Biru': pair.atlitBiru.nama,
        'Kontingen Biru': pair.atlitBiru.kontingen
      };
    });

    if (activeSchedule.length === 0) {
      showNotification("Belum ada partai tanding yang dicentang masuk jadwal!", "error");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(activeSchedule);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal Pertandingan');
    XLSX.writeFile(workbook, `Jadwal_Kontrol_Partai_Silat_${Date.now()}.xlsx`);
  };

  const importExcelKontrolPartai = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        const importedPairings: MatchPairing[] = rows.map((r, i) => {
          const rawGender = String(r['Gender'] || r['gender'] || 'PUTRA').toUpperCase().trim();
          const gender: 'PUTRA' | 'PUTRI' = (rawGender.includes('PUTRI') || rawGender.includes('PEREMPUAN') || rawGender.includes('FEMALE')) ? 'PUTRI' : 'PUTRA';
          
          return {
            id: `pair-imported-${i}-${Math.random().toString(36).substring(2, 6)}`,
            kelasTanding: String(r['Kelas'] || r['kelas_tanding'] || r['Kelas Tanding'] || 'Kelas A').trim(),
            kategoriUsia: String(r['Kategori Usia'] || r['kategori_usia'] || r['Usia'] || 'REMAJA').toUpperCase().trim(),
            gender: gender,
            tahapPertandingan: String(r['Tahap Pertandingan'] || r['tahap_pertandingan'] || r['Tahap'] || 'PENYISIHAN').toUpperCase().trim(),
            atlitMerah: {
              nama: String(r['Nama Pesilat Merah'] || r['merah_nama'] || 'PESILAT MERAH').toUpperCase().trim(),
              kontingen: String(r['Kontingen Merah'] || r['merah_kontingen'] || 'MERAH').toUpperCase().trim()
            },
            atlitBiru: {
              nama: String(r['Nama Pesilat Biru'] || r['biru_nama'] || 'PESILAT BIRU').toUpperCase().trim(),
              kontingen: String(r['Kontingen Biru'] || r['biru_kontingen'] || 'BIRU').toUpperCase().trim()
            }
          };
        });

        if (importedPairings.length > 0) {
          // Set to pairings list
          setPairings([...pairings, ...importedPairings]);
          showNotification(`Sukses mengimpor ${importedPairings.length} partai tanding baru! Silakan centang partai yang ingin dimasukkan ke jadwal.`, "success");
        } else {
          showNotification("Gagal mendeteksi data partai.", "error");
        }
      } catch (err) {
        showNotification("Gagal memproses berkas Excel: " + err, "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadPDFKontrolPartai = () => {
    playClickSound();
    const scheduledRows = scheduledPartaiIds.map((id, index) => {
      const pair = pairings.find(p => p.id === id)!;
      return {
        partai: String(index + 1),
        kelas: pair.kelasTanding,
        gender: pair.gender,
        kategoriUsia: pair.kategoriUsia,
        tahapPertandingan: pair.tahapPertandingan,
        atlitMerah: pair.atlitMerah,
        atlitBiru: pair.atlitBiru
      };
    });

    if (scheduledRows.length === 0) {
      showNotification("Belum ada Partai yang masuk dalam jadwal!", "error");
      return;
    }

    downloadMatchSchedulePDF(
      eventName || "KEJUARAAN NASIONAL PENCAK SILAT",
      scheduledRows,
      logoKiri,
      logoKanan,
      "GELANGGANG I"
    );
  };

  const renderMatchCard = (match: any, round: any) => {
    const getGlobalPlaceholderName = (rawName: string) => {
      const clean = rawName.trim().toUpperCase();
      if (clean.startsWith("PEMENANG PTY")) {
        const matchNumStr = clean.replace("PEMENANG PTY", "").trim();
        const localId = parseInt(matchNumStr, 10);
        if (!isNaN(localId)) {
          const globalMatchMap = getGlobalMatchMap();
          let globalId: number | undefined;
          for (const [key, val] of globalMatchMap.entries()) {
            if (key.startsWith(`${activeClass?.kelas}|${activeClass?.usia}|${activeClass?.gender}|`) && key.endsWith(`|${localId}`)) {
              globalId = val;
              break;
            }
          }
          if (globalId !== undefined) {
            return `PEMENANG PTY ${globalId}`;
          }
        }
      }
      return clean;
    };

    const blueSlot = (() => {
      const name = (match.blue.nama || "").trim().toUpperCase();
      const kontingen = (match.blue.kontingen || "").trim().toUpperCase();
      if (!name || name === "BYE" || match.blue.isBye) {
        return { name: "-", kontingen: "" };
      }
      if (name.startsWith("PEMENANG PTY")) {
        return { name: getGlobalPlaceholderName(name), kontingen: "-" };
      }
      return { name, kontingen };
    })();

    const redSlot = (() => {
      const name = (match.red.nama || "").trim().toUpperCase();
      const kontingen = (match.red.kontingen || "").trim().toUpperCase();
      if (!name || name === "BYE" || match.red.isBye) {
        return { name: "-", kontingen: "" };
      }
      if (name.startsWith("PEMENANG PTY")) {
        return { name: getGlobalPlaceholderName(name), kontingen: "-" };
      }
      return { name, kontingen };
    })();

    const globalPartaiNo = (() => {
      const globalMatchMap = getGlobalMatchMap();
      const mapKey = `${activeClass?.kelas}|${activeClass?.usia}|${activeClass?.gender}|${round.roundName}|${match.partaiId}`;
      return globalMatchMap.get(mapKey);
    })();

    const matchCompletedInfo = (() => {
      if (globalPartaiNo) {
        const h = matchHistory.find(item => String(item.partai) === String(globalPartaiNo));
        if (h && h.pemenang) {
          return {
            completed: true,
            pemenang: h.pemenang
          };
        }
      }
      return { completed: false, pemenang: null };
    })();

    return (
      <div 
        key={match.partaiId}
        id={`match-card-${match.partaiId}`}
        className={`w-full max-w-[210px] bg-slate-900/95 border rounded-lg flex flex-col relative shadow-lg hover:border-purple-500/40 hover:shadow-purple-500/5 transition-all z-10 ${
          matchCompletedInfo.completed 
            ? 'border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/10 shadow-emerald-950/20' 
            : 'border-slate-700/60'
        }`}
      >
        {/* Party Label ID */}
        <span className="absolute -top-2 left-3 bg-slate-950 text-slate-400 border border-slate-800 text-[8px] font-extrabold px-1.5 py-0.2 rounded font-mono">
          PARTAI {globalPartaiNo || "-"}
        </span>

        {/* Blue Corner (Top) */}
        <div className="flex items-stretch justify-between h-[36px]">
          <div className="flex-1 min-w-0 py-1 px-2.5 flex flex-col justify-center">
            <div className="flex items-center gap-1 min-w-0">
              <div className={`text-[11px] font-black truncate text-slate-100 uppercase font-sans ${
                matchCompletedInfo.completed && (matchCompletedInfo.pemenang === 'MERAH' || matchCompletedInfo.pemenang === 'DISK_MERAH') 
                  ? 'line-through text-slate-500 opacity-40 font-normal' 
                  : ''
              }`}>
                {blueSlot.name}
              </div>
              {matchCompletedInfo.completed && (matchCompletedInfo.pemenang === 'BIRU' || matchCompletedInfo.pemenang === 'DISK_BIRU') && (
                <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
              )}
            </div>
            <div className="text-[9px] font-bold text-slate-400 truncate tracking-wide uppercase h-3 mt-0">
              {blueSlot.kontingen || "\u00A0"}
            </div>
          </div>
          <div className="w-2 bg-blue-600 flex-shrink-0 self-stretch rounded-tr-lg border-l border-slate-850" />
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-slate-800/60 w-full flex-shrink-0" />

        {/* Red Corner (Bottom) */}
        <div className="flex items-stretch justify-between h-[36px]">
          <div className="flex-1 min-w-0 py-1 px-2.5 flex flex-col justify-center">
            <div className="flex items-center gap-1 min-w-0">
              <div className={`text-[11px] font-black truncate text-slate-100 uppercase font-sans ${
                matchCompletedInfo.completed && (matchCompletedInfo.pemenang === 'BIRU' || matchCompletedInfo.pemenang === 'DISK_BIRU') 
                  ? 'line-through text-slate-500 opacity-40 font-normal' 
                  : ''
              }`}>
                {redSlot.name}
              </div>
              {matchCompletedInfo.completed && (matchCompletedInfo.pemenang === 'MERAH' || matchCompletedInfo.pemenang === 'DISK_MERAH') && (
                <Trophy className="w-3 h-3 text-amber-500 shrink-0" />
              )}
            </div>
            <div className="text-[9px] font-bold text-slate-400 truncate tracking-wide uppercase h-3 mt-0">
              {redSlot.kontingen || "\u00A0"}
            </div>
          </div>
          <div className="w-2 bg-red-600 flex-shrink-0 self-stretch rounded-br-lg border-l border-slate-850" />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col h-full select-none bg-[#05000a] text-slate-100 p-2 md:p-4 overflow-hidden relative font-sans">
      
      {/* HEADER BAR */}
      <header className="flex justify-between items-center bg-[#0c051a] border border-purple-500/20 px-5 py-3 rounded-2xl shrink-0 mb-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playClickSound();
              onBack();
            }}
            className="px-4 py-2 bg-[#1b1035] hover:bg-[#2c1a52] text-xs font-black rounded-xl border border-purple-500/30 cursor-pointer shadow-md transition-all uppercase tracking-wide text-purple-300 hover:text-slate-100 flex items-center gap-1.5 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> KEMBALI
          </button>
          <div>
            <h1 className="text-sm md:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 font-display tracking-wider uppercase">
              MODUL REGISTRASI DATA TURNAMEN
            </h1>
            <p className="text-[10px] text-slate-400 font-bold leading-none uppercase tracking-wide mt-0.5 font-mono">
              Registrasi Atlit • Visualisasi Bagan Braket • Kontrol Penjadwalan Partai
            </p>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex bg-[#030107] border border-purple-500/10 rounded-xl p-1 shrink-0 shadow-inner">
          <button
            onClick={() => { playClickSound(); setActiveTab('INPUT_ATLIT'); }}
            className={`px-4 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all uppercase tracking-wide flex items-center gap-1.5 ${
              activeTab === 'INPUT_ATLIT' ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow shadow-purple-500/20 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            1. Input Atlit
          </button>
          <button
            onClick={() => { playClickSound(); setActiveTab('BAGAN'); }}
            className={`px-4 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all uppercase tracking-wide flex items-center gap-1.5 ${
              activeTab === 'BAGAN' ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow shadow-purple-500/20 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            2. Bagan Braket
          </button>
          <button
            onClick={() => { playClickSound(); setActiveTab('KONTROL_PARTAI'); }}
            className={`px-4 py-1.5 text-xs font-black rounded-lg cursor-pointer transition-all uppercase tracking-wide flex items-center gap-1.5 ${
              activeTab === 'KONTROL_PARTAI' ? 'bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow shadow-purple-500/20 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            3. Kontrol Partai
          </button>
        </div>
      </header>

      {/* CORE DISPLAY */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          
          {/* TAB A: INPUT DATA ATLIT */}
          {activeTab === 'INPUT_ATLIT' && (
            <motion.div
              key="tab-input-atlit"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-12 gap-5 h-full overflow-y-auto pr-1 pb-4 items-start"
            >
              {/* Form Input Panel */}
              <div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-[#1e083c] via-[#090416] to-[#03092b] border-2 border-purple-400/50 rounded-2xl p-5 space-y-4 shadow-xl shadow-purple-950/20">
                <h2 className="text-xs font-black text-amber-500 tracking-wider flex items-center gap-2 border-b border-purple-500/20 pb-2 uppercase font-mono">
                  <Plus className="w-4.5 h-4.5 text-amber-500" />
                  {formId ? 'Ubah Data Pesilat' : 'Pendaftaran Pesilat'}
                </h2>

                <form onSubmit={handleSaveAthlete} className="space-y-3.5">
                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-mono block mb-1 font-bold">Nama Lengkap Pesilat</label>
                    <input
                      type="text"
                      required
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="Contoh: ADI WIJAYA"
                      className="w-full bg-[#030107] border border-purple-500/20 rounded-xl px-3 py-2 text-xs font-bold text-white uppercase focus:border-purple-500 outline-none transition-all shadow-inner font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-mono block mb-1 font-bold">Asal Kontingen / Daerah</label>
                    <input
                      type="text"
                      required
                      value={formKontingen}
                      onChange={(e) => setFormKontingen(e.target.value)}
                      placeholder="Contoh: JAWA TENGAH"
                      className="w-full bg-[#030107] border border-purple-500/20 rounded-xl px-3 py-2 text-xs font-bold text-white uppercase focus:border-purple-500 outline-none transition-all shadow-inner font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-slate-400 uppercase font-mono block mb-1 font-bold">Kelas Tanding</label>
                      <select
                        value={formKelas}
                        onChange={(e) => setFormKelas(e.target.value)}
                        className="w-full bg-[#030107] border border-purple-500/20 rounded-xl px-2 py-2 text-xs font-black text-white outline-none transition-all"
                      >
                        <option value="KELAS A">KELAS A</option>
                        <option value="KELAS B">KELAS B</option>
                        <option value="KELAS C">KELAS C</option>
                        <option value="KELAS D">KELAS D</option>
                        <option value="KELAS E">KELAS E</option>
                        <option value="KELAS F">KELAS F</option>
                        <option value="KELAS G">KELAS G</option>
                        <option value="KELAS H">KELAS H</option>
                        <option value="KELAS I">KELAS I</option>
                        <option value="KELAS J">KELAS J</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] text-slate-400 uppercase font-mono block mb-1 font-bold">Kategori Usia</label>
                      <select
                        value={formUsia}
                        onChange={(e) => setFormUsia(e.target.value)}
                        className="w-full bg-[#030107] border border-purple-500/20 rounded-xl px-2 py-2 text-xs font-black text-white outline-none transition-all"
                      >
                        <option value="PRA USIA DINI">PRA USIA DINI</option>
                        <option value="USIA DINI 1">USIA DINI 1</option>
                        <option value="USIA DINI 2">USIA DINI 2</option>
                        <option value="PRA REMAJA">PRA REMAJA</option>
                        <option value="REMAJA">REMAJA</option>
                        <option value="DEWASA">DEWASA</option>
                        <option value="MASTER 1">MASTER 1</option>
                        <option value="MASTER 2">MASTER 2</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 uppercase font-mono block mb-1 font-bold">Gender / Jenis Kelamin</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormGender('PUTRA')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          formGender === 'PUTRA' 
                            ? 'bg-gradient-to-r from-blue-900 to-indigo-900 text-white border-blue-500' 
                            : 'bg-[#030107] text-slate-400 border-purple-500/10 hover:border-purple-500/30'
                        }`}
                      >
                        PUTRA
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormGender('PUTRI')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          formGender === 'PUTRI' 
                            ? 'bg-gradient-to-r from-rose-900 to-pink-900 text-white border-pink-500' 
                            : 'bg-[#030107] text-slate-400 border-purple-500/10 hover:border-purple-500/30'
                        }`}
                      >
                        PUTRI
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    {formId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-extrabold uppercase text-[10px] tracking-wider rounded-xl border border-purple-500/10 transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold uppercase text-[10px] tracking-wider rounded-xl border border-purple-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/20"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {formId ? 'Simpan Perubahan' : 'Daftarkan Atlit'}
                    </button>
                  </div>
                </form>

                {/* Import & Bulk Actions Row */}
                <div className="border-t border-purple-500/10 pt-4 space-y-2">
                  <div className="text-[9px] text-slate-450 uppercase font-mono font-bold">Impor / Ekspor Excel Masal</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={downloadTemplateExcelAtlit}
                      className="p-2 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/20 rounded-xl text-[9px] font-black uppercase text-purple-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Template Excel
                    </button>
                    <label className="p-2 bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase text-indigo-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer text-center">
                      <Upload className="w-3 h-3" /> Impor Excel
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={importExcelAtlit}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={exportExcelAtlit}
                      className="p-2 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase text-emerald-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3" /> Ekspor Excel
                    </button>
                    <button
                      onClick={downloadPDFAthletes}
                      className="p-2 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase text-amber-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" /> Unduh PDF
                    </button>
                  </div>
                  <div className="pt-2 border-t border-purple-500/10">
                    <button
                      onClick={handleResetAllAthletes}
                      className="w-full p-2.5 bg-rose-950/35 hover:bg-rose-900/40 border border-rose-500/35 hover:border-rose-400 rounded-xl text-[9px] font-black uppercase text-rose-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-lg shadow-rose-950/20"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Reset / Hapus Semua Data
                    </button>
                  </div>
                </div>
              </div>

              {/* Athletes List Grid Panel (Auto filtered side) */}
              <div className="col-span-12 lg:col-span-8 bg-gradient-to-br from-[#1e083c] via-[#090416] to-[#03092b] border-2 border-purple-400/50 rounded-2xl p-5 shadow-xl shadow-purple-950/20 flex flex-col h-full min-h-[500px]">
                <div className="flex justify-between items-center border-b border-purple-500/20 pb-3 mb-4">
                  <div>
                    <h2 className="text-xs font-black text-indigo-400 tracking-wider flex items-center gap-2 uppercase font-mono">
                      <ListFilter className="w-4.5 h-4.5 text-indigo-400" />
                      {showAllInGrid ? 'SEMUA DATA ATLIT' : `Terfilter: ${formKelas} • ${formUsia} • ${formGender}`}
                    </h2>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">
                      {showAllInGrid ? 'Menampilkan seluruh pesilat yang terdaftar' : 'Grid Data Atlit Berdasarkan Abjad Kelas Tanding & Gender'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        playClickSound();
                        setShowAllInGrid(!showAllInGrid);
                      }}
                      className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 text-[10px] font-black uppercase text-purple-300 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {showAllInGrid ? 'Saring Sesuai Filter' : 'Tampilkan Semua Data'}
                    </button>
                    <span className="bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                      Total: {displayedAthletes.length} Pesilat
                    </span>
                  </div>
                </div>

                {displayedAthletes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border border-dashed border-purple-500/10 rounded-xl bg-purple-950/5">
                    <Users className="w-10 h-10 text-purple-500/30 mb-2.5" />
                    <h3 className="text-sm font-bold text-slate-300">Belum Ada Atlit Terdaftar</h3>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">Gunakan form di sebelah kiri untuk meregistrasikan atlit di kelas ini atau impor data secara massal.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[60vh] overflow-y-auto pr-1">
                    {displayedAthletes.map((ath) => (
                      <div 
                        key={ath.id}
                        className="bg-gradient-to-r from-[#170530]/90 to-[#040926]/90 border border-purple-400/35 rounded-xl p-3.5 flex justify-between items-center hover:border-purple-400/60 transition-all hover:bg-gradient-to-r hover:from-[#210943]/90 hover:to-[#081235]/90 shadow-md relative group"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1 pr-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full ${ath.gender === 'PUTRA' ? 'bg-indigo-500 shadow-md shadow-indigo-500/20' : 'bg-pink-500 shadow-md shadow-pink-500/20'}`} />
                            <h4 className="font-extrabold text-xs text-slate-100 truncate tracking-wide font-mono uppercase">{ath.nama}</h4>
                          </div>
                          <div className="text-[10px] font-bold text-indigo-300 tracking-wider uppercase truncate">{ath.kontingen}</div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[9px] font-black bg-purple-950/60 text-purple-400 px-1.5 py-0.5 rounded border border-purple-900/30 uppercase tracking-wide font-mono">{ath.kelasTanding}</span>
                            <span className="text-[9px] font-black bg-indigo-950/60 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-900/30 uppercase tracking-wide font-mono">{ath.kategoriUsia}</span>
                          </div>
                        </div>

                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => handleEditAthlete(ath)}
                            className="p-2 bg-purple-950/40 hover:bg-purple-900/40 text-purple-400 hover:text-white rounded-lg border border-purple-500/10 cursor-pointer transition-all active:scale-95"
                            title="Edit Data Atlit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAthlete(ath.id)}
                            className="p-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 hover:text-white rounded-lg border border-rose-500/10 cursor-pointer transition-all active:scale-95"
                            title="Hapus Data Atlit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB B: BAGAN PERTANDINGAN */}
          {activeTab === 'BAGAN' && (
            <motion.div
              key="tab-bagan"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-12 gap-5 h-full flex-1 min-h-0 items-stretch pb-2"
            >
              {/* Left Side: Class Buttons */}
              <div className="col-span-12 lg:col-span-3 bg-gradient-to-br from-[#1e083c] via-[#090416] to-[#03092b] border-2 border-purple-400/50 rounded-2xl p-4 space-y-3.5 shadow-xl shadow-purple-950/20 h-full flex flex-col justify-between overflow-hidden">
                <div className="flex flex-col flex-1 min-h-0 space-y-3.5">
                  <h2 className="text-xs font-black text-indigo-400 tracking-wider flex items-center gap-2 border-b border-purple-500/20 pb-2 uppercase font-mono shrink-0">
                    <ListFilter className="w-4 h-4 text-indigo-400" />
                    Kelas Terdaftar
                  </h2>

                  {uniqueClasses.length === 0 ? (
                    <p className="text-[10px] text-slate-500 uppercase leading-relaxed font-mono">Belum ada kelas pesilat yang terdaftar. Sila registrasikan pesilat terlebih dahulu.</p>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-0">
                      {uniqueClasses.map((item, index) => {
                        const isActive = activeClass && activeClass.kelas === item.kelas && activeClass.usia === item.usia && activeClass.gender === item.gender;
                        return (
                          <button
                            key={index}
                            onClick={() => { playClickSound(); setSelectedClassIndex(index); }}
                            className={`w-full p-3 text-left rounded-xl border text-xs font-bold transition-all uppercase flex justify-between items-center cursor-pointer ${
                              isActive 
                                ? 'bg-gradient-to-r from-[#7c3aed] to-[#1e3a8a] text-white border-purple-400 shadow-md shadow-purple-500/20' 
                                : 'bg-gradient-to-r from-[#130628] to-[#040a22] text-slate-300 border-purple-500/20 hover:border-purple-400/40 hover:text-white'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-mono text-[10px] font-black tracking-wide leading-none">{item.kelas}</div>
                              <div className="text-[9px] mt-1 opacity-85 leading-none">{item.usia} • {item.gender}</div>
                            </div>
                            <ChevronRight className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-600'}`} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* File Ops for Bagan */}
                <div className="border-t border-purple-500/10 pt-3.5 space-y-2 shrink-0">
                  <div className="text-[9px] text-slate-450 uppercase font-mono font-bold">Impor / Ekspor Excel Bagan</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={downloadTemplateExcelBagan}
                      className="p-2 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/20 rounded-xl text-[9px] font-black uppercase text-purple-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Template Excel
                    </button>
                    <label className="p-2 bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase text-indigo-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer text-center">
                      <Upload className="w-3 h-3" /> Impor Excel
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={importExcelBagan}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={exportExcelBagan}
                      className="p-2 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase text-emerald-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3" /> Ekspor Excel
                    </button>
                    <button
                      onClick={downloadPDFBagan}
                      className="p-2 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase text-amber-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" /> Unduh PDF
                    </button>
                  </div>
                  <button
                    onClick={downloadAllPDFBagan}
                    className="w-full p-2.5 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-900/60 hover:to-indigo-900/60 border border-purple-500/30 rounded-xl text-[9px] font-black uppercase text-purple-200 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-950/50"
                  >
                    <Files className="w-3 h-3 text-amber-400" /> Unduh Semua Bagan PDF
                  </button>
                </div>
              </div>

              {/* Right Side: Bracket Visualizer */}
              <div className={`col-span-12 lg:col-span-9 border-2 rounded-2xl p-5 shadow-xl transition-all duration-300 flex flex-col h-full min-h-0 overflow-hidden ${
                bracketLayout === 'DUAL_SIDED'
                  ? 'bg-gradient-to-br from-[#40050e] via-[#1c0206] to-[#0a0002] border-red-500/30 shadow-red-950/30'
                  : 'bg-gradient-to-br from-[#1e083c] via-[#090416] to-[#03092b] border-purple-400/50 shadow-purple-950/20'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-500/20 pb-3 mb-4 gap-2 shrink-0">
                  <div>
                    <h2 className="text-xs font-black text-amber-500 tracking-wider flex items-center gap-2 uppercase font-mono">
                      <Trophy className="w-4.5 h-4.5 text-amber-500" />
                      Visual Bagan: {activeClass ? `${activeClass.kelas} ${activeClass.usia} ${activeClass.gender}` : 'Belum Ada'}
                    </h2>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">Braket tanding sistem gugur adaptif berdasarkan kapasitas</p>
                  </div>
                  
                  {activeClass && bracketAthletes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Dual-Sided Layout Switcher */}
                      <div className="flex bg-[#0a0005]/80 border border-red-500/20 rounded-xl p-0.5 shrink-0">
                        <button
                          onClick={() => { playClickSound(); setBracketLayout('DUAL_SIDED'); }}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                            bracketLayout === 'DUAL_SIDED'
                              ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                              : 'text-rose-300 hover:text-white'
                          }`}
                        >
                          Dua Sisi (Nasional)
                        </button>
                        <button
                          onClick={() => { playClickSound(); setBracketLayout('STANDARD'); }}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                            bracketLayout === 'STANDARD'
                              ? 'bg-purple-600 text-white shadow font-extrabold'
                              : 'text-purple-300 hover:text-white'
                          }`}
                        >
                          Satu Sisi (Klasik)
                        </button>
                      </div>

                      <button
                        onClick={handleShuffleBracketSeeds}
                        className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-500/60 rounded-xl text-[9px] font-black uppercase text-purple-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Shuffle className="w-3 h-3 text-purple-400" /> Kocak Undian
                      </button>
                      <button
                        onClick={handleClearBracketClass}
                        className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 border border-rose-500/30 hover:border-rose-500/60 rounded-xl text-[9px] font-black uppercase text-rose-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" /> Kosongkan Kelas
                      </button>
                    </div>
                  )}
                </div>

                {bracketAthletes.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border border-dashed border-purple-500/10 rounded-xl bg-purple-950/5">
                    <Trophy className="w-10 h-10 text-purple-500/30 mb-2.5" />
                    <h3 className="text-sm font-bold text-slate-300">Belum Ada Atlit Terdaftar di Kelas ini</h3>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">Registrasikan minimal 2 atlit di kelas yang sama pada tab Input Atlit untuk melihat bagan turnamen gugur.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-x-auto overflow-y-auto pr-1 py-2 min-h-0">
                    {bracketLayout === 'DUAL_SIDED' ? (
                      <div ref={bracketContainerRef} className="flex gap-12 justify-around items-stretch min-w-[1100px] py-8 min-h-full relative">
                        {/* SVG Connectors Overlay */}
                        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
                          {svgLines.map((line) => (
                            <motion.path
                              key={line.id}
                              d={line.path}
                              fill="none"
                              stroke={
                                line.type === 'red'
                                  ? '#f87171'
                                  : line.type === 'blue'
                                  ? '#60a5fa'
                                  : '#f59e0b'
                              }
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 0.8 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            />
                          ))}
                        </svg>

                        {/* LEFT WING (Symmetrical left half of preceding rounds) */}
                        {Array.from({ length: bracketRounds.length - 1 }).map((_, colIdx) => {
                          const round = bracketRounds[colIdx];
                          const matches = round.matches;
                          const mid = Math.ceil(matches.length / 2);
                          const leftMatches = matches.slice(0, mid);

                          return (
                            <div key={`left-round-${colIdx}`} className="flex-1 flex flex-col items-center min-h-[450px] z-10">
                              <div className="bg-[#f59e0b] text-black font-extrabold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider text-center font-sans shadow-md border border-amber-400 w-full max-w-[210px] mb-6 shrink-0">
                                {round.roundName}
                              </div>
                              <div className="flex-1 w-full flex flex-col justify-around items-center min-h-[350px]">
                                {leftMatches.map((match: any) => renderMatchCard(match, round))}
                              </div>
                            </div>
                          );
                        })}

                        {/* CENTER PANEL: Ultimate Final match */}
                        {(() => {
                          const finalRound = bracketRounds[bracketRounds.length - 1];
                          const finalMatch = finalRound?.matches[0];
                          if (!finalMatch) return null;

                          return (
                            <div className="w-[240px] flex flex-col items-center justify-center z-10 shrink-0 self-center">
                              <div className="flex flex-col items-center mb-6">
                                <motion.div
                                  animate={{ y: [0, -5, 0] }}
                                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                  className="w-14 h-14 bg-gradient-to-b from-amber-300 to-amber-500 rounded-full flex items-center justify-center border-2 border-amber-200 shadow-lg shadow-amber-500/25 mb-2"
                                >
                                  <Trophy className="w-8 h-8 text-slate-950" />
                                </motion.div>
                                <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] px-4 py-1.5 rounded-full uppercase tracking-widest text-center shadow-lg border border-amber-300">
                                  {finalRound.roundName}
                                </div>
                              </div>
                              <div className="w-full relative group">
                                <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
                                <div className="relative">
                                  {renderMatchCard(finalMatch, finalRound)}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* RIGHT WING (Symmetrical right half of preceding rounds in reverse order) */}
                        {Array.from({ length: bracketRounds.length - 1 }).map((_, idx) => {
                          const colIdx = bracketRounds.length - 2 - idx;
                          const round = bracketRounds[colIdx];
                          const matches = round.matches;
                          const mid = Math.ceil(matches.length / 2);
                          const rightMatches = matches.slice(mid);

                          return (
                            <div key={`right-round-${colIdx}`} className="flex-1 flex flex-col items-center min-h-[450px] z-10">
                              <div className="bg-[#f59e0b] text-black font-extrabold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider text-center font-sans shadow-md border border-amber-400 w-full max-w-[210px] mb-6 shrink-0">
                                {round.roundName}
                              </div>
                              <div className="flex-1 w-full flex flex-col justify-around items-center min-h-[350px]">
                                {rightMatches.map((match: any) => renderMatchCard(match, round))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div ref={bracketContainerRef} className="flex gap-16 justify-around items-stretch min-w-[950px] py-8 min-h-full relative">
                        {/* SVG Connectors Overlay */}
                        <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
                          {svgLines.map((line) => (
                            <motion.path
                              key={line.id}
                              d={line.path}
                              fill="none"
                              stroke={
                                line.type === 'red'
                                  ? '#f87171'
                                  : line.type === 'blue'
                                  ? '#60a5fa'
                                  : '#f59e0b'
                              }
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: 0.8 }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            />
                          ))}
                        </svg>

                        {bracketRounds.map((round: any, roundIndex: number) => (
                          <div key={roundIndex} className="flex-1 flex flex-col items-center min-h-[450px] z-10">
                            <div className="bg-[#f59e0b] text-black font-extrabold text-[10px] px-3 py-1.5 rounded uppercase tracking-wider text-center font-sans shadow-md border border-amber-400 w-full max-w-[210px] mb-6 shrink-0">
                              {round.roundName}
                            </div>
                            <div className="flex-1 w-full flex flex-col justify-around items-center min-h-[350px]">
                              {round.matches.map((match: any) => renderMatchCard(match, round))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB C: KONTROL PARTAI */}
          {activeTab === 'KONTROL_PARTAI' && (
            <motion.div
              key="tab-kontrol-partai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full min-h-0 overflow-hidden pb-4 gap-4"
            >
              {/* Recaps and Tools Header Card */}
              <div className="grid grid-cols-12 gap-4 shrink-0">
                
                {/* Recaps Panel */}
                <div className="col-span-12 lg:col-span-8 bg-gradient-to-br from-[#1e083c] via-[#090416] to-[#03092b] border-2 border-purple-400/50 rounded-2xl p-4 shadow-xl shadow-purple-950/20 flex items-center justify-between overflow-x-auto">
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="p-2.5 bg-purple-950/40 rounded-xl border border-purple-500/30">
                      <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-100 uppercase font-mono">REKAP TOTAL PESILAT</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase leading-none font-mono">Total Pesilat Per Kelas Tanding</p>
                    </div>
                  </div>

                  <div className="flex gap-3 overflow-x-auto py-1 pl-4">
                    {getClassRecaps().map((rec, i) => (
                      <div key={i} className="bg-[#030107]/90 border border-purple-500/10 rounded-xl p-2.5 text-center min-w-[120px] shrink-0">
                        <div className="text-[9px] font-extrabold text-purple-400 uppercase truncate leading-none mb-1">{rec.kelasName}</div>
                        <div className="text-sm font-black text-white font-mono">{rec.total} <span className="text-[9px] font-bold text-slate-500">ATLIT</span></div>
                      </div>
                    ))}
                    {getClassRecaps().length === 0 && (
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Belum Ada Kelas Terdaftar</span>
                    )}
                  </div>
                </div>

                {/* Operations Panel */}
                <div className="col-span-12 lg:col-span-4 bg-gradient-to-br from-[#1e083c] via-[#090416] to-[#03092b] border-2 border-purple-400/50 rounded-2xl p-4 shadow-xl shadow-purple-950/20 flex flex-col justify-center space-y-2">
                  <div className="text-[9px] text-slate-400 uppercase font-mono font-bold leading-none mb-1">Peralatan Jadwal Kontrol Partai</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={downloadTemplateExcelKontrolPartai}
                      className="py-2 px-3 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/20 rounded-xl text-[9px] font-black uppercase text-purple-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Template
                    </button>
                    <label className="py-2 px-3 bg-indigo-950/20 hover:bg-indigo-950/40 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase text-indigo-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer text-center">
                      <Upload className="w-3 h-3" /> Impor
                      <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={importExcelKontrolPartai}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={exportExcelKontrolPartai}
                      className="py-2 px-3 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 rounded-xl text-[9px] font-black uppercase text-emerald-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3 h-3" /> Ekspor Excel
                    </button>
                    <button
                      onClick={downloadPDFKontrolPartai}
                      className="py-2 px-3 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/20 rounded-xl text-[9px] font-black uppercase text-amber-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3 h-3" /> Cetak Jadwal
                    </button>
                  </div>
                </div>
              </div>

              {/* Pairings Table list */}
              <div className="bg-gradient-to-br from-[#1e083c] via-[#090416] to-[#03092b] border-2 border-purple-400/50 rounded-2xl p-5 shadow-xl shadow-purple-950/20 flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-purple-500/20 pb-3 mb-4 gap-3 shrink-0">
                  <div>
                    <h2 className="text-xs font-black text-indigo-400 tracking-wider flex items-center gap-2 uppercase font-mono">
                      <Calendar className="w-4.5 h-4.5 text-indigo-400" />
                      Daftar Pasangan Tanding &amp; Kontrol Jadwal
                    </h2>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase">Centang partai untuk mengaktifkan dan mengurutkan jadwal tanding secara dinamis</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCancelAllSelections}
                      className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/70 border border-rose-500/30 hover:border-rose-400 text-[10px] font-black uppercase text-rose-300 hover:text-white transition-all rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 shadow"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      Batalkan Pilihan
                    </button>
                    <button
                      onClick={handleApplySelectedSchedule}
                      className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 border border-emerald-500/30 hover:border-emerald-500 text-[10px] font-black uppercase text-emerald-200 hover:text-white transition-all rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 shadow"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Terapkan Jadwal Terpilih
                    </button>
                    <button
                      onClick={handleAutoScheduleAndCheckAll}
                      className="px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-500/30 hover:border-indigo-500 text-[10px] font-black uppercase text-indigo-200 hover:text-white transition-all rounded-xl flex items-center gap-1.5 cursor-pointer active:scale-95 shadow"
                    >
                      <Trophy className="w-3.5 h-3.5 text-indigo-400" />
                      Atur &amp; Centang Otomatis (Mixed)
                    </button>
                    <span className="bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider font-mono">
                      Jadwal Terdaftar: {scheduledPartaiIds.length} Partai
                    </span>
                  </div>
                </div>

                {pairings.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border border-dashed border-purple-500/10 rounded-xl bg-purple-950/5">
                    <Calendar className="w-10 h-10 text-purple-500/30 mb-2.5" />
                    <h3 className="text-sm font-bold text-slate-300">Belum Ada Partai Terbentuk</h3>
                    <p className="text-xs text-slate-500 max-w-xs mt-1">Sistem akan otomatis menghasilkan pasangan tanding setelah Anda meregistrasikan minimal 2 atlit pada tab Input Atlit.</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-x-auto overflow-y-auto pr-1 min-h-0">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-purple-500/10 text-[9px] text-slate-400 font-bold uppercase font-mono">
                          <th className="py-2.5 px-3 text-center">JADWAL</th>
                          <th className="py-2.5 px-3">KELAS &amp; GENDER</th>
                          <th className="py-2.5 px-3">TAHAP LAGA</th>
                          <th className="py-2.5 px-3 text-blue-400">SUDUT BIRU</th>
                          <th className="py-2.5 px-3 text-center text-slate-500">VS</th>
                          <th className="py-2.5 px-3 text-red-400">SUDUT MERAH</th>
                          <th className="py-2.5 px-3 text-center">AKSI</th>
                          <th className="py-2.5 px-3 text-center text-purple-400">SKOR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pairings.map((pair, pIdx) => {
                          const isChecked = scheduledPartaiIds.includes(pair.id);
                          const orderNo = isChecked ? (scheduledPartaiIds.indexOf(pair.id) + 1) : null;
                          
                          // Check if this match is completed in matchHistory
                          const h = orderNo ? matchHistory.find(item => String(item.partai) === String(orderNo)) : null;
                          const isCompleted = !!(h && h.pemenang);
                          const winnerCorner = h ? h.pemenang : null;
                          
                          const isBlueLoser = isCompleted && (winnerCorner === 'MERAH' || winnerCorner === 'DISK_MERAH');
                          const isRedLoser = isCompleted && (winnerCorner === 'BIRU' || winnerCorner === 'DISK_BIRU');

                          return (
                            <tr 
                              key={pair.id}
                              className={`border-b border-purple-500/15 hover:bg-gradient-to-r hover:from-purple-950/40 hover:to-blue-950/40 transition-all text-xs font-mono font-bold ${
                                isCompleted ? 'bg-emerald-950/5 border-emerald-500/10' : isChecked ? 'bg-gradient-to-r from-purple-950/20 to-blue-950/20' : ''
                              }`}
                            >
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isCompleted}
                                    onChange={() => handleToggleSchedule(pair.id)}
                                    className={`w-4 h-4 rounded text-purple-600 border-purple-500/30 focus:ring-purple-500 focus:ring-opacity-25 bg-[#030107] ${
                                      isCompleted ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                  />
                                  {isChecked && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow ${
                                      isCompleted ? 'bg-emerald-600 text-white' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                                    }`}>
                                      Partai {orderNo}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="uppercase tracking-wide text-slate-200">{pair.kelasTanding}</div>
                                <div className="text-[9.5px] text-slate-400 uppercase mt-0.5">{pair.kategoriUsia} • {pair.gender}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-[10px] font-black bg-purple-950/80 text-purple-300 border border-purple-900/40 px-2 py-0.5 rounded tracking-wide uppercase">
                                  {pair.tahapPertandingan}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className={`font-extrabold uppercase truncate max-w-[150px] ${
                                  isBlueLoser ? 'line-through text-slate-500 opacity-45 font-normal' : 'text-white'
                                }`}>
                                  {pair.atlitBiru.nama}
                                </div>
                                <div className={`text-[9px] uppercase font-bold truncate max-w-[150px] ${
                                  isBlueLoser ? 'text-slate-600 opacity-40' : 'text-blue-400'
                                }`}>
                                  {pair.atlitBiru.kontingen}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center text-slate-500 text-[10px] font-black">VS</td>
                              <td className="py-3 px-3">
                                <div className={`font-extrabold uppercase truncate max-w-[150px] ${
                                  isRedLoser ? 'line-through text-slate-500 opacity-45 font-normal' : 'text-white'
                                }`}>
                                  {pair.atlitMerah.nama}
                                </div>
                                <div className={`text-[9px] uppercase font-bold truncate max-w-[150px] ${
                                  isRedLoser ? 'text-slate-600 opacity-40' : 'text-red-400'
                                }`}>
                                  {pair.atlitMerah.kontingen}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {isCompleted ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider font-mono flex items-center gap-1 shadow-sm">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Selesai
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleEditMatchPairing(pair.id)}
                                      className="p-1.5 bg-purple-950/40 hover:bg-purple-900/40 text-purple-400 hover:text-white rounded-lg border border-purple-500/10 cursor-pointer"
                                      title="Edit Parameter Partai"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMatchPairing(pair.id)}
                                      className="p-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 hover:text-white rounded-lg border border-rose-500/10 cursor-pointer"
                                      title="Hapus Partai"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {isCompleted && h ? (
                                  <div className="inline-flex flex-col items-center justify-center bg-purple-950/30 border border-purple-500/20 px-2.5 py-1 rounded-xl">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] text-blue-400 font-black">{h.skorAkhirBiru}</span>
                                      <span className="text-[10px] text-slate-500">:</span>
                                      <span className="text-[11px] text-red-400 font-black">{h.skorAkhirMerah}</span>
                                    </div>
                                    <div className="text-[8px] font-bold text-amber-400 uppercase tracking-widest leading-none mt-0.5 font-sans">
                                      {h.pemenang === 'BIRU' || h.pemenang === 'DISK_BIRU' ? 'BIRU WIN' : 'MERAH WIN'}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-600 font-sans text-[10px]">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-2xl shadow-xl border ${
              toast.type === 'error'
                ? 'bg-rose-950 border-rose-500/30 text-rose-200'
                : toast.type === 'info'
                ? 'bg-blue-950 border-blue-500/30 text-blue-200'
                : 'bg-emerald-950 border-emerald-500/30 text-emerald-200'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${toast.type === 'error' ? 'text-rose-400' : toast.type === 'info' ? 'text-blue-400' : 'text-emerald-400'}`} />
            <span className="text-xs font-black uppercase font-mono tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-gradient-to-b from-[#1b0c33] to-[#080211] border-2 border-purple-500/40 rounded-3xl p-6 shadow-2xl relative"
            >
              <h3 className="text-sm font-black text-amber-500 tracking-wider uppercase font-mono mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {confirmModal.title}
              </h3>
              <p className="text-xs text-slate-300 font-bold mb-6 font-sans leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    playClickSound();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-purple-950/40 hover:bg-purple-950/80 border border-purple-500/20 text-purple-300 hover:text-white rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white border border-rose-500/30 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer shadow-lg shadow-rose-900/30"
                >
                  Ya, Lanjutkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Prompt Modal */}
      <AnimatePresence>
        {promptModal && promptModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-gradient-to-b from-[#1b0c33] to-[#080211] border-2 border-purple-500/40 rounded-3xl p-6 shadow-2xl relative"
            >
              <h3 className="text-sm font-black text-indigo-400 tracking-wider uppercase font-mono mb-2 flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                {promptModal.title}
              </h3>
              <p className="text-xs text-slate-300 font-bold mb-4 font-sans">
                {promptModal.message}
              </p>
              <input
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder="misal: SEMIFINAL, FINAL"
                className="w-full bg-[#030107] border border-purple-500/30 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none mb-6 focus:border-purple-500 transition-all uppercase"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    playClickSound();
                    setPromptModal(null);
                  }}
                  className="px-4 py-2 bg-purple-950/40 hover:bg-purple-950/80 border border-purple-500/20 text-purple-300 hover:text-white rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    promptModal.onConfirm(promptValue);
                    setPromptModal(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer shadow-lg shadow-indigo-900/30"
                >
                  Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
