import { Athlete, MatchState, ScoreEntry, ValidatedScore, PastMatch, VerifikasiState } from './types';
import { playPointSound, playWarningSound, playBuzzer } from './sound';

// Fallback UUID generator
function uuid() {
  return Math.random().toString(36).substring(2, 9);
}

const safeLocalStorage = (() => {
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

const DEFAULT_MATCH_STATE: MatchState = {
  eventName: "KEJUARAAN NASIONAL PENCAK SILAT 2026",
  tempatPelaksanaan: "PADEPOKAN PENCAK SILAT TMII, JAKARTA",
  waktuPelaksanaan: "12 - 15 JUNI 2026",
  partai: "01",
  kelas: "A",
  kategoriUsia: "REMAJA",
  tahapPertandingan: "PENYISIHAN",
  gender: "PUTRA",
  atlitMerah: { nama: "ALDI SETIAWAN", kontingen: "DKI JAKARTA" },
  atlitBiru: { nama: "BUDI RAHARJO", kontingen: "JAWA BARAT" },
  
  babakAktif: 1,
  durasiBabak: 120, // 2 minutes
  sisaWaktu: 120,
  timerBerjalan: false,

  rawScores: [],
  validatedScores: [],

  penaltiesMerah: {
    binaan1: false,
    binaan2: false,
    teguran1: false,
    teguran2: false,
    peringatan1: false,
    peringatan2: false,
  },
  penaltiesBiru: {
    binaan1: false,
    binaan2: false,
    teguran1: false,
    teguran2: false,
    peringatan1: false,
    peringatan2: false,
  },
  accumulatedPenaltyMerah: 0,
  accumulatedPenaltyBiru: 0,
  historyPenaltiesMerah: {},
  historyPenaltiesBiru: {},
  diskualifikasi: null,

  verifikasi: {
    id: "",
    status: "IDLE",
    jenis: "JATUHAN",
    juriVotes: {},
    result: null,
  },

  varChecking: {
    status: "IDLE",
    sudut: null,
    result: null,
  },

  showRoundEndPopUp: false,
  showMatchEndPopUp: false,
  juriTerkunci: false,
  umumkanPemenang: false,
  pemenang: null,
  victoryType: undefined,
  statusPertandingan: "BELUM_MULAI",
  logoKiri: "",
  logoKanan: "",
  version: 0,
  wmpTriggered: false,
  wmpBypassed: false,
  wmpBypassedScoreDiff: 0,
  wmpWon: false,
  wmpBabak1Occurred: false,
};

// Local storage key & BroadcastChannel
const STORAGE_KEY = 'silat_match_state';
const HISTORY_KEY = 'silat_match_history';
const CHANNEL_NAME = 'silat_scoring_sync';

let broadcastChannel: BroadcastChannel | null = null;
try {
  broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
} catch (e) {
  console.warn("BroadcastChannel not supported", e);
}

// Initial retrieval
export function getSavedMatchState(): MatchState {
  try {
    const saved = safeLocalStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure essential fields exist
      return { ...DEFAULT_MATCH_STATE, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_MATCH_STATE };
}

export function saveMatchState(state: MatchState) {
  // 1. Try local storage sync
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Storage quota exceeded or local storage failed, syncing in memory & network", err);
  }

  // 2. Try broadcast channel sync to other tabs/workers
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'UPDATE_STATE', state });
    }
  } catch (err) {
    console.debug("Broadcast sync skipped", err);
  }

  // 3. Sync to Express server for Juri / Dewan / Monitor LAN sync
  try {
    fetch('/api/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    }).catch((err) => {
      console.debug("Offline or local-only sync catch", err);
    });
  } catch (err) {
    console.debug("Fetch sync skipped", err);
  }
}

export function getMatchHistory(): PastMatch[] {
  try {
    const saved = safeLocalStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

export function saveMatchHistory(history: PastMatch[]) {
  try {
    safeLocalStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'UPDATE_HISTORY', history });
    }
    // Async background update to Express server for Juri / Dewan / Monitor sync on LAN
    fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(history),
    }).catch(() => {
      // Gracefully catch offline or local-only issues
    });
  } catch {}
}

export function clearMatchHistory() {
  saveMatchHistory([]);
}

export function calculateScoreForRound(corner: 'MERAH' | 'BIRU', state: MatchState, b: number): number {
  const getPenaltiesForRound = (roundNumber: number) => {
    if (roundNumber === state.babakAktif) {
      return corner === 'MERAH' ? state.penaltiesMerah : state.penaltiesBiru;
    }
    const history = corner === 'MERAH' ? state.historyPenaltiesMerah : state.historyPenaltiesBiru;
    return history ? history[roundNumber] : undefined;
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

  let roundPenaltyDeduction = 0;
  if (penalties) {
    if (penalties.teguran1) roundPenaltyDeduction += 1;
    if (penalties.teguran2) roundPenaltyDeduction += 2;
    if (checkPeringatanFirstTime(b, 'peringatan1')) roundPenaltyDeduction += 5;
    if (checkPeringatanFirstTime(b, 'peringatan2')) roundPenaltyDeduction += 10;
  }

  const totalPoints = (state.validatedScores || [])
    .filter((v: any) => v.sudut === corner && v.babak === b)
    .reduce((acc: number, curr: any) => acc + curr.points, 0);

  return totalPoints - roundPenaltyDeduction;
}

export function runWmpCheck(state: MatchState): MatchState {
  if (state.wmpWon || state.statusPertandingan === 'SELESAI' || state.showMatchEndPopUp) {
    if (state.wmpTriggered) {
      return {
        ...state,
        wmpTriggered: false
      };
    }
    return state;
  }

  const kUsia = (state.kategoriUsia || '').toUpperCase().trim();
  const isPraRemaja = kUsia === 'PRA REMAJA' || kUsia === 'PRA-REMAJA';
  const isRemajaDewasa = kUsia === 'REMAJA' || kUsia === 'DEWASA';

  let threshold: number | null = null;
  if (isPraRemaja) {
    threshold = 20;
  } else if (isRemajaDewasa) {
    threshold = 30;
  } else {
    threshold = 30; // default safe fallback
  }

  const scoreBiru = calculateFinalScore('BIRU', state);
  const scoreMerah = calculateFinalScore('MERAH', state);
  const diff = Math.abs(scoreBiru - scoreMerah);

  // 1. Check if difference is met in Babak 1
  if (state.babakAktif === 1) {
    if (diff >= threshold) {
      if (!state.wmpBabak1Occurred) {
        return {
          ...state,
          wmpBabak1Occurred: true
        };
      }
    } else {
      if (state.wmpBabak1Occurred) {
        return {
          ...state,
          wmpBabak1Occurred: false
        };
      }
    }
    return state;
  }

  // 2. Check in Babak 2 or Babak 3
  if (state.babakAktif === 2 || state.babakAktif === 3) {
    if (diff >= threshold) {
      const lastBypassedDiff = state.wmpBypassedScoreDiff || 0;
      
      // If we are in Babak 2 and Babak 1 WMP occurred, we must wait for 60s countdown
      if (state.babakAktif === 2 && state.wmpBabak1Occurred) {
        const elapsed = state.durasiBabak - state.sisaWaktu;
        if (elapsed < 60) {
          // Do not trigger yet, wait for elapsed >= 60
          return state;
        }
      }

      // Trigger condition
      if (!state.wmpTriggered && !state.wmpBypassed) {
        const wmpPemenang = scoreBiru > scoreMerah ? 'BIRU' : 'MERAH';
        return {
          ...state,
          wmpTriggered: true,
          timerBerjalan: false, // Automatically stop the timer (Pause)
          wmpPemenang,
          wmpBypassed: false
        };
      }
    } else {
      if (state.wmpTriggered) {
        return {
          ...state,
          wmpTriggered: false,
          wmpBypassed: false,
          wmpBypassedScoreDiff: 0
        };
      }
    }
  }

  return state;
}

// Dynamic score evaluation based on rules
export function calculateFinalScore(corner: 'MERAH' | 'BIRU', state: MatchState): number {
  let score = 0;
  
  // 1. Add up punches and kicks from validated entries
  state.validatedScores.forEach((s) => {
    if (s.sudut === corner) {
      score += s.points;
    }
  });

  // 2. Subtract active Dewan penalties
  const penalties = corner === 'MERAH' ? state.penaltiesMerah : state.penaltiesBiru;
  if (penalties.teguran1) score -= 1;
  if (penalties.teguran2) score -= 2;
  if (penalties.peringatan1) score -= 5;
  if (penalties.peringatan2) score -= 10;

  // 3. Subtract accumulated penalties from previous rounds
  const accumulated = corner === 'MERAH' ? (state.accumulatedPenaltyMerah || 0) : (state.accumulatedPenaltyBiru || 0);
  score -= accumulated;

  return score;
}

// Check 1.5s dual-judge validation rules
export function processRawScore(
  juriId: 1 | 2 | 3,
  sudut: 'MERAH' | 'BIRU',
  jenis: 'PUNCH' | 'KICK',
  state: MatchState
): { newState: MatchState; isSah: boolean } {
  const now = Date.now();
  const babak = state.babakAktif;
  const matchWindow = 2500; // Consistent 2.5s window with server to robustly support 3-juri consensus
  
  const newRaw: ScoreEntry = {
    id: uuid(),
    juriId,
    sudut,
    jenis,
    timestamp: now,
    babak,
    validated: false,
    validatedGroupId: undefined,
  };

  const updatedRawScores = [...state.rawScores, newRaw];
  let isSah = false;
  let updatedValidatedScores = [...state.validatedScores];

  // 1. Look for unvalidated partner from another Juri
  const unvalidatedPartner = updatedRawScores.find(s => 
    s.sudut === sudut &&
    s.jenis === jenis &&
    s.babak === babak &&
    s.juriId !== juriId &&
    !s.validated &&
    Math.abs(s.timestamp - now) <= matchWindow
  );

  if (unvalidatedPartner) {
    const groupId = uuid();
    newRaw.validated = true;
    newRaw.validatedGroupId = groupId;
    unvalidatedPartner.validated = true;
    unvalidatedPartner.validatedGroupId = groupId;

    const pts = jenis === 'PUNCH' ? 1 : 2;
    const vScore: ValidatedScore = {
      id: groupId,
      sudut,
      points: pts,
      jenis,
      babak,
      timestamp: now,
    };
    
    updatedValidatedScores.push(vScore);
    isSah = true;
    playPointSound();
  } else {
    // 2. Look for an existing validated group within matchWindow that does not already have a score from this juriId
    const validatedPartner = updatedRawScores.find(s => {
      if (
        s.sudut === sudut &&
        s.jenis === jenis &&
        s.babak === babak &&
        s.juriId !== juriId &&
        s.validated &&
        s.validatedGroupId &&
        Math.abs(s.timestamp - now) <= matchWindow
      ) {
        const groupHasCurrentJuri = updatedRawScores.some(r => 
          r.validatedGroupId === s.validatedGroupId && r.juriId === juriId
        );
        return !groupHasCurrentJuri;
      }
      return false;
    });

    if (validatedPartner && validatedPartner.validatedGroupId) {
      newRaw.validated = true;
      newRaw.validatedGroupId = validatedPartner.validatedGroupId;
    }
  }

  const finalState = {
    ...state,
    rawScores: updatedRawScores,
    validatedScores: updatedValidatedScores,
  };

  return { newState: finalState, isSah };
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'SILAT-ZIP-UNKNOWN';
  let id = safeLocalStorage.getItem('silat_device_id');
  if (!id) {
    const userAgent = navigator.userAgent || '';
    const screenWidth = window.screen.width || 1920;
    const screenHeight = window.screen.height || 1080;
    const cores = navigator.hardwareConcurrency || 4;
    const lang = navigator.language || 'id';
    
    const str = `${userAgent}-${screenWidth}x${screenHeight}-${cores}-${lang}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const positiveHash = Math.abs(hash);
    const hex = positiveHash.toString(16).toUpperCase().padStart(8, '0');
    const part1 = hex.substring(0, 4);
    const part2 = hex.substring(4, 8);
    const lenSum = str.length.toString(16).toUpperCase().padStart(4, '0');
    id = `SILAT-${part1}-${part2}-${lenSum}`;
    safeLocalStorage.setItem('silat_device_id', id);
  }
  return id;
}

export function generateActivationKey(deviceId: string): string {
  let sum = 0;
  for (let i = 0; i < deviceId.length; i++) {
    const code = deviceId.charCodeAt(i);
    sum += code * (i + 1);
  }
  
  const mult = sum * 23 + 1997;
  const hashStr = mult.toString(16).toUpperCase();
  const revHash = hashStr.split('').reverse().join('');
  
  let checksum = 0;
  for (let i = 0; i < hashStr.length; i++) {
    checksum += hashStr.charCodeAt(i);
  }
  const checkHex = (checksum % 256).toString(16).toUpperCase().padStart(2, '0');
  
  return `ACT-${hashStr}-${revHash}-${checkHex}`;
}

export function verifyActivationKey(deviceId: string, providedKey: string): boolean {
  if (!providedKey) return false;
  const cleanKey = providedKey.trim().toUpperCase();
  const expectedKey = generateActivationKey(deviceId).toUpperCase();
  return cleanKey === expectedKey;
}

export function isOutsideSandbox(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  
  // Safe developer sandbox domains
  const isDevSandbox = 
    hostname.endsWith('.run.app') || 
    hostname.endsWith('.googleusercontent.com') || 
    hostname.endsWith('.google.com') ||
    hostname.endsWith('.aistudio.google');
    
  return !isDevSandbox;
}
