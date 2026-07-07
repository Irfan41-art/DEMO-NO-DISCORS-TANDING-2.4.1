import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const getFilename = () => {
  if (typeof module !== "undefined" && module.filename) {
    return module.filename;
  }
  try {
    const metaUrl = typeof import.meta !== "undefined" ? import.meta.url : undefined;
    if (metaUrl) {
      return fileURLToPath(metaUrl);
    }
  } catch (e) {}
  return "";
};

const __filename = getFilename();
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

// Initial default state (matches the structure in appState.ts and types.ts)
const DEFAULT_MATCH_STATE = {
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
  durasiBabak: 120,
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
  pemenang: null,
  statusPertandingan: "BELUM_MULAI",
  logoKiri: "",
  logoKanan: "",
  activeJuriIds: [],
  version: 0,
  wmpTriggered: false,
  wmpBypassed: false,
  wmpBypassedScoreDiff: 0,
  wmpWon: false,
  wmpBabak1Occurred: false,
};

let matchState: any = { ...DEFAULT_MATCH_STATE, activeJuriIds: [] as number[] };
let matchHistory: any[] = [];
let clients: { id: number; res: express.Response }[] = [];
let timerInterval: NodeJS.Timeout | null = null;
let timerStartTime: number | null = null;
let sisaWaktuAtStart: number = 120;

let logoKiriData = "";
let logoKananData = "";
let customIconsData: Record<string, string> = {};
let serverActivationKey = "";
let serverDeviceId = "";

const ICONS_FILE_PATH = path.join(process.cwd(), "custom_icons.json");

function generateServerDeviceId(): string {
  const osType = os.type() || "Linux";
  const osRelease = os.release() || "1.0";
  const osHostname = os.hostname() || "localhost";
  const cpus = os.cpus()?.length || 4;
  
  const str = `${osType}-${osRelease}-${osHostname}-${cpus}`;
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
  return `SILAT-${part1}-${part2}-${lenSum}`;
}

function generateActivationKey(deviceId: string): string {
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

function verifyActivationKey(deviceId: string, providedKey: string): boolean {
  if (!providedKey) return false;
  const cleanKey = providedKey.trim().toUpperCase();
  const expectedKey = generateActivationKey(deviceId).toUpperCase();
  return cleanKey === expectedKey;
}

function loadPersistentIcons() {
  try {
    if (!serverDeviceId) {
      serverDeviceId = generateServerDeviceId();
    }
    if (fs.existsSync(ICONS_FILE_PATH)) {
      const dataStr = fs.readFileSync(ICONS_FILE_PATH, "utf8");
      const parsed = JSON.parse(dataStr);
      if (parsed.customIconsData) {
        customIconsData = parsed.customIconsData;
        if (!matchState.customIcons) {
          matchState.customIcons = {};
        }
        for (const key of Object.keys(customIconsData)) {
          matchState.customIcons[key] = `/api/custom-icon/${key}?t=${Date.now()}`;
        }
      }
      if (parsed.logoKiriData) {
        logoKiriData = parsed.logoKiriData;
        matchState.logoKiri = `/api/logo/kiri?t=${Date.now()}`;
      }
      if (parsed.logoKananData) {
        logoKananData = parsed.logoKananData;
        matchState.logoKanan = `/api/logo/kanan?t=${Date.now()}`;
      }
      if (parsed.serverActivationKey) {
        serverActivationKey = parsed.serverActivationKey;
      }
      if (parsed.serverDeviceId) {
        serverDeviceId = parsed.serverDeviceId;
      }
      matchState.version = Date.now();
      console.log("Loaded persistent icons, logos, and licensing keys from disk.");
    }
  } catch (err) {
    console.error("Failed to load persistent icons:", err);
  }
}

function savePersistentIcons() {
  try {
    const dataToSave = {
      customIconsData,
      logoKiriData,
      logoKananData,
      serverActivationKey,
      serverDeviceId: serverDeviceId || generateServerDeviceId()
    };
    fs.writeFileSync(ICONS_FILE_PATH, JSON.stringify(dataToSave, null, 2), "utf8");
    console.log("Saved persistent icons, logos, and licensing keys to disk.");
  } catch (err) {
    console.error("Failed to save persistent icons:", err);
  }
}

function trySendMultipleFiles(res: express.Response, filePaths: string[], filenameForMime: string) {
  const ext = path.extname(filenameForMime).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ttf": "font/ttf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };
  const contentType = mimeTypes[ext] || "application/octet-stream";

  const errors: string[] = [];

  for (const rawPath of filePaths) {
    const pathsToTry = [rawPath];
    
    // If it's a virtual snapshot path or has backslashes, also verify with forward slashes
    // since PKG expects '/' internally on Windows for snapshot assets
    const normalized = rawPath.replace(/\\/g, "/");
    if (normalized !== rawPath) {
      pathsToTry.push(normalized);
    }

    // Strip drive letters (e.g., C:/snapshot... -> /snapshot...)
    // PKG VFS is mounted globally in the virtual tree, and some environments
    // require stripping drive letters to successfully hit the VFS interceptor.
    const hasDriveLetter = /^[a-zA-Z]:/.test(normalized);
    if (hasDriveLetter) {
      const strippedDrive = normalized.replace(/^[a-zA-Z]:/, "");
      pathsToTry.push(strippedDrive);
      pathsToTry.push(strippedDrive.replace(/\//g, "\\"));
    }

    for (const currentPath of pathsToTry) {
      try {
        // Direct read bypasses existsSync/statSync PKG bugs on Windows!
        const data = fs.readFileSync(currentPath);
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        return res.send(data);
      } catch (err: any) {
        errors.push(`${currentPath} => ${err.message}`);
      }
    }
  }

  console.error(`[ERROR-SERVE] Gagal menyajikan berkas '${filenameForMime}' dari semua alternatif jalur.`);
  errors.forEach(err => console.error(`  - ${err}`));
  if (!res.headersSent) {
    return res.status(404).send(`File not found: ${filenameForMime}`);
  }
}

function sendFileSecurely(res: express.Response, filePath: string) {
  return trySendMultipleFiles(res, [filePath], path.basename(filePath));
}

let activeJuries: { [juriId: number]: number } = {}; // juriId -> lastSeen timestamp

function updateActiveJuriesInState() {
  const currentActive = Object.keys(activeJuries).map(Number);
  const prevActive = matchState.activeJuriIds || [];
  const isSame = currentActive.length === prevActive.length && currentActive.every(v => prevActive.includes(v));
  if (!isSame) {
    matchState.activeJuriIds = currentActive;
    matchState.version = Date.now();
    broadcastToClients({ type: "UPDATE_STATE", state: matchState });
  }
}

// Clean stale juries who missed heartbeats (9 seconds)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const jId in activeJuries) {
    if (now - activeJuries[jId] > 9000) {
      delete activeJuries[jId];
      changed = true;
    }
  }
  if (changed) {
    updateActiveJuriesInState();
  }
}, 3000);

function generateId() {
  return "id_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

function calculateFinalScore(corner: 'MERAH' | 'BIRU', state: any): number {
  let score = 0;
  if (!state.validatedScores) return 0;
  state.validatedScores.forEach((s: any) => {
    if (s.sudut === corner) {
      score += s.points;
    }
  });

  const penalties = corner === 'MERAH' ? state.penaltiesMerah : state.penaltiesBiru;
  if (penalties) {
    if (penalties.teguran1) score -= 1;
    if (penalties.teguran2) score -= 2;
    if (penalties.peringatan1) score -= 5;
    if (penalties.peringatan2) score -= 10;
  }

  const accumulated = corner === 'MERAH' ? (state.accumulatedPenaltyMerah || 0) : (state.accumulatedPenaltyBiru || 0);
  score -= accumulated;

  return score;
}

function calculateScoreForRoundOnServer(corner: 'MERAH' | 'BIRU', state: any, b: number): number {
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

function runWmpCheckOnServer(state: any): any {
  if (state.wmpWon || state.statusPertandingan === 'SELESAI' || state.showMatchEndPopUp) {
    if (state.wmpTriggered) {
      state.wmpTriggered = false;
    }
    return state;
  }

  const kUsia = (state.kategoriUsia || '').toUpperCase().trim();
  const isPraRemaja = kUsia === 'PRA REMAJA' || kUsia === 'PRA-REMAJA';
  const isRemajaDewasa = kUsia === 'REMAJA' || kUsia === 'DEWASA';

  let threshold = null;
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
      state.wmpBabak1Occurred = true;
    } else {
      state.wmpBabak1Occurred = false;
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
        state.wmpTriggered = true;
        state.timerBerjalan = false; // pause timer automatically
        state.wmpPemenang = scoreBiru > scoreMerah ? 'BIRU' : 'MERAH';
        state.wmpBypassed = false;
      }
    } else {
      if (state.wmpTriggered) {
        state.wmpTriggered = false;
        state.wmpBypassed = false;
        state.wmpBypassedScoreDiff = 0;
      }
    }
  }

  return state;
}

function determineWinner(state: any): 'MERAH' | 'BIRU' | null {
  if (state.diskualifikasi === 'MERAH') return 'BIRU';
  if (state.diskualifikasi === 'BIRU') return 'MERAH';

  const merahTotal = calculateFinalScore('MERAH', state);
  const biruTotal = calculateFinalScore('BIRU', state);

  // a) KETIKA JUMLAH POIN/NILAI LEBIH DARI YANG LAIN
  if (merahTotal > biruTotal) return 'MERAH';
  if (biruTotal > merahTotal) return 'BIRU';

  // b) BILA TERJADI HASIL NILAI YANG SAMA (DRAW/SERI)
  // Helper to calculate total penalty points
  const getPenaltyPoints = (corner: 'MERAH' | 'BIRU', sState: any): number => {
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
  const getPenaltyCount = (corner: 'MERAH' | 'BIRU', sState: any): number => {
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
  const getTechnicalScores = (corner: 'MERAH' | 'BIRU', sState: any) => {
    let count3 = 0; // JATUHAN
    let count2 = 0; // KICK
    let count1 = 0; // PUNCH
    if (sState.validatedScores) {
      sState.validatedScores.forEach((s: any) => {
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

function broadcastToClients(data: any) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  const disconnectedIds: number[] = [];
  clients.forEach(c => {
    try {
      c.res.write(payload);
    } catch (err) {
      console.error("Error writing to SSE stream", err);
      disconnectedIds.push(c.id);
    }
  });
  if (disconnectedIds.length > 0) {
    clients = clients.filter(c => !disconnectedIds.includes(c.id));
  }
}

function getMaxRounds(kategoriUsia?: string, babakAktif?: number): number {
  const norm = (kategoriUsia || '').toUpperCase().trim();
  const isTwoRounds = [
    "PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER 2", "MASTER A", "MASTER B"
  ].includes(norm);
  const normalMax = isTwoRounds ? 2 : 3;
  const currentBabak = babakAktif !== undefined ? babakAktif : (matchState ? matchState.babakAktif : 1);
  return Math.max(normalMax, currentBabak);
}

function syncServerTimer() {
  if (matchState.timerBerjalan) {
    if (timerStartTime === null) {
      timerStartTime = Date.now();
      sisaWaktuAtStart = matchState.sisaWaktu;
    }

    if (!timerInterval) {
      timerInterval = setInterval(() => {
        if (!matchState.timerBerjalan || timerStartTime === null) {
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }
          timerStartTime = null;
          return;
        }

        const elapsedMs = Date.now() - timerStartTime;
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const calcRemaining = Math.max(0, sisaWaktuAtStart - elapsedSeconds);

        if (calcRemaining <= 0) {
          matchState.sisaWaktu = 0;
          matchState.timerBerjalan = false;
          timerStartTime = null;
          broadcastToClients({ type: "UPDATE_STATE", state: matchState });
          if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
          }

          // Delay the appearance of the Round End Popup by 1300ms (to let the buzzer/bell finish playing)
          setTimeout(() => {
            // Check to ensure the round wasn't restarted or reset in the meantime
            if (matchState.sisaWaktu === 0 && !matchState.timerBerjalan && !matchState.showRoundEndPopUp) {
              matchState.showRoundEndPopUp = true;
              const maxRounds = getMaxRounds(matchState.kategoriUsia);
              matchState.showMatchEndPopUp = matchState.babakAktif === maxRounds;
              if (matchState.babakAktif === maxRounds) {
                matchState.statusPertandingan = "SELESAI";
                matchState.pemenang = determineWinner(matchState);
              }
              matchState.version = Date.now();
              broadcastToClients({ type: "UPDATE_STATE", state: matchState });
            }
          }, 1300);
        } else if (calcRemaining !== matchState.sisaWaktu) {
          matchState.sisaWaktu = calcRemaining;

          // Run server-side WMP check for Babak 1 delay triggering!
          const kUsia = (matchState.kategoriUsia || '').toUpperCase().trim();
          const isPraRemaja = kUsia === 'PRA REMAJA' || kUsia === 'PRA-REMAJA';
          const isRemajaDewasa = kUsia === 'REMAJA' || kUsia === 'DEWASA';
          let threshold = isPraRemaja ? 20 : 30;
          const scoreB = calculateFinalScore('BIRU', matchState);
          const scoreR = calculateFinalScore('MERAH', matchState);
          const diff = Math.abs(scoreB - scoreR);
          const elapsed = matchState.durasiBabak - calcRemaining;

          if (matchState.babakAktif === 2 && matchState.wmpBabak1Occurred && elapsed >= 60 && diff >= threshold && !matchState.wmpTriggered && !matchState.wmpWon && !matchState.wmpBypassed) {
            matchState.timerBerjalan = false;
            matchState.wmpTriggered = true;
            matchState.wmpPemenang = scoreB > scoreR ? 'BIRU' : 'MERAH';
            matchState.wmpBypassed = false;

            // Stop the clock ticker locally on the server on trigger
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
            timerStartTime = null;
          }

          broadcastToClients({ type: "UPDATE_STATE", state: matchState });
        }
      }, 200); // Check 5 times per second for high precision and immediate visual feedback
    }
  } else {
    timerStartTime = null;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }
}

function processRawScoreOnServer(
  juriId: number,
  sudut: "MERAH" | "BIRU",
  jenis: "PUNCH" | "KICK",
  babak: number
): boolean {
  const timestamp = Date.now();
  const MATCH_WINDOW = 2500; // sweet spot tolerance window of 2.5s to robustly support 3-juri consensus

  // Initialize rawScores if undefined
  if (!matchState.rawScores) matchState.rawScores = [];
  if (!matchState.validatedScores) matchState.validatedScores = [];

  const newRaw: any = {
    id: generateId(),
    juriId,
    sudut,
    jenis,
    timestamp,
    babak,
    validated: false,
    validatedGroupId: undefined,
  };

  matchState.rawScores.push(newRaw);

  const unvalidatedPartner = matchState.rawScores.find(s => 
    s.sudut === sudut &&
    s.jenis === jenis &&
    s.babak === babak &&
    s.juriId !== juriId &&
    !s.validated &&
    Math.abs(s.timestamp - timestamp) <= MATCH_WINDOW
  );

  if (unvalidatedPartner) {
    const groupId = generateId();
    newRaw.validated = true;
    newRaw.validatedGroupId = groupId;
    unvalidatedPartner.validated = true;
    unvalidatedPartner.validatedGroupId = groupId;

    const pts = jenis === "PUNCH" ? 1 : 2;
    const vScore = {
      id: groupId,
      sudut,
      points: pts,
      jenis,
      babak,
      timestamp,
    };
    matchState.validatedScores.push(vScore);
  } else {
    // Look for an existing validated group within MATCH_WINDOW that does not already have a score from this juriId
    const validatedPartner = matchState.rawScores.find(s => {
      if (
        s.sudut === sudut &&
        s.jenis === jenis &&
        s.babak === babak &&
        s.juriId !== juriId &&
        s.validated &&
        s.validatedGroupId &&
        Math.abs(s.timestamp - timestamp) <= MATCH_WINDOW
      ) {
        const groupHasCurrentJuri = matchState.rawScores.some(r => 
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

  return !!newRaw.validated;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  loadPersistentIcons();

  app.use(express.json({ limit: "50mb" })); // supporting base64 image uploads

  // Simple CORS Support
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Virtual static logo endpoints for high performance overlay / monitor display
  app.get("/api/logo/kiri", (req, res) => {
    if (!logoKiriData) {
      return res.status(404).send("Logo Kiri not found");
    }
    try {
      const matches = logoKiriData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(buffer);
      }
    } catch (err) {}
    res.status(400).send("Invalid format");
  });

  app.get("/api/logo/kanan", (req, res) => {
    if (!logoKananData) {
      return res.status(404).send("Logo Kanan not found");
    }
    try {
      const matches = logoKananData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(buffer);
      }
    } catch (err) {}
    res.status(400).send("Invalid format");
  });

  app.post("/api/logo/kiri", (req, res) => {
    const { logo } = req.body;
    if (logo && logo.startsWith("data:image/")) {
      logoKiriData = logo;
      const url = `/api/logo/kiri?t=${Date.now()}`;
      matchState.logoKiri = url;
      broadcastToClients({ type: "UPDATE_STATE", state: matchState });
      savePersistentIcons();
      return res.json({ success: true, url });
    }
    res.status(400).json({ error: "Invalid image format" });
  });

  app.post("/api/logo/kanan", (req, res) => {
    const { logo } = req.body;
    if (logo && logo.startsWith("data:image/")) {
      logoKananData = logo;
      const url = `/api/logo/kanan?t=${Date.now()}`;
      matchState.logoKanan = url;
      broadcastToClients({ type: "UPDATE_STATE", state: matchState });
      savePersistentIcons();
      return res.json({ success: true, url });
    }
    res.status(400).json({ error: "Invalid image format" });
  });

  // Dynamic Route for serving assets either from root or from assets directory safely
  app.get("/assets/:filename", (req, res) => {
    const filename = req.params.filename;
    // Security check: prevent directory traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).send("Access denied");
    }
    
    const alternatives = [
      path.join(__dirname, "assets", filename),             // 1. virtual snapshot dist/assets/
      path.join(__dirname, "..", "assets", filename),       // 2. virtual snapshot assets/
      path.join(process.cwd(), "dist", "assets", filename),   // 3. physical local dist/assets/
      path.join(process.cwd(), "assets", filename),         // 4. physical local assets/
      path.join(process.cwd(), filename),                   // 5. fallback: physical local root/
      path.join(__dirname, "..", filename),                 // 6. fallback: virtual snapshot root/
      path.join(__dirname, filename),                       // 7. fallback: virtual snapshot dist/
      path.join(process.cwd(), "dist", filename),           // 8. fallback: physical local dist/
    ];
    return trySendMultipleFiles(res, alternatives, filename);
  });

  // Serve root-level vector/image assets for direct access compatibility (e.g. /pesilatkiri.svg)
  app.get("/:filename(\\w+\\.(svg|png|jpg|jpeg|gif|ico))", (req, res) => {
    const filename = req.params.filename;
    // Security check: prevent directory traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).send("Access denied");
    }
    
    const targetFile = filename === "favicon.ico" ? "app_icon.ico" : filename;
    const alternatives = [
      path.join(process.cwd(), targetFile),                   // 1. physical local root/
      path.join(__dirname, "..", targetFile),                 // 2. virtual snapshot root/
      path.join(__dirname, targetFile),                       // 3. virtual snapshot dist/
      path.join(process.cwd(), "dist", targetFile),           // 4. physical local dist/
    ];
    return trySendMultipleFiles(res, alternatives, targetFile);
  });

  // GET Custom Icon
  app.get("/api/custom-icon/:key", (req, res) => {
    const key = req.params.key;
    const data = customIconsData[key];
    if (!data) {
      return res.status(404).send("Custom Icon not found");
    }
    try {
      const matches = data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const contentType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        return res.send(buffer);
      }
    } catch (err) {}
    res.status(400).send("Invalid format");
  });

  // POST Custom Icon
  app.post("/api/custom-icon/:key", (req, res) => {
    const key = req.params.key;
    const { image } = req.body;
    if (image && image.startsWith("data:image/")) {
      customIconsData[key] = image;
      const url = `/api/custom-icon/${key}?t=${Date.now()}`;
      if (!matchState.customIcons) {
        matchState.customIcons = {};
      }
      matchState.customIcons[key] = url;
      matchState.version = Date.now();
      broadcastToClients({ type: "UPDATE_STATE", state: matchState });
      savePersistentIcons();
      return res.json({ success: true, url });
    }
    res.status(400).json({ error: "Invalid image format" });
  });

  // DELETE Custom Icon
  app.delete("/api/custom-icon/:key", (req, res) => {
    const key = req.params.key;
    delete customIconsData[key];
    if (matchState.customIcons) {
      delete matchState.customIcons[key];
    }
    matchState.version = Date.now();
    broadcastToClients({ type: "UPDATE_STATE", state: matchState });
    savePersistentIcons();
    return res.json({ success: true });
  });

  // REST endpoints for Custom licensing
  app.get("/api/license/status", (req, res) => {
    const isLicensed = verifyActivationKey(serverDeviceId, serverActivationKey);
    res.json({
      isLicensed,
      deviceId: serverDeviceId,
    });
  });

  app.post("/api/license/activate", (req, res) => {
    const { activationKey } = req.body;
    if (!activationKey) {
      return res.status(400).json({ error: "Kunci Aktivasi wajib diisi" });
    }
    const cleanKey = activationKey.trim().toUpperCase();
    if (verifyActivationKey(serverDeviceId, cleanKey)) {
      serverActivationKey = cleanKey;
      savePersistentIcons();
      broadcastToClients({ type: "LICENSE_UPDATE", isLicensed: true, deviceId: serverDeviceId });
      return res.json({ success: true, message: "Sistem scoring berhasil diaktifkan!" });
    } else {
      return res.status(400).json({ success: false, error: "Kunci Aktivasi tidak valid!" });
    }
  });

  app.post("/api/license/reset", (req, res) => {
    serverActivationKey = "";
    savePersistentIcons();
    broadcastToClients({ type: "LICENSE_UPDATE", isLicensed: false, deviceId: serverDeviceId });
    res.json({ success: true });
  });

  // REST endpoints for Match State
  app.get("/api/state", (req, res) => {
    res.json(matchState);
  });

  app.post("/api/state", (req, res) => {
    const incoming = req.body;
    
    // Safety guard: discard stale incoming state updates due to network latency
    if (incoming.version !== undefined && matchState.version !== undefined && incoming.version < matchState.version) {
      return res.json({ success: false, error: "Stale state discarded" });
    }
    
    // Check if client explicitly toggles running state or changes round
    const playPauseToggled = incoming.timerBerjalan !== matchState.timerBerjalan;
    const isReset = incoming.sisaWaktu === incoming.durasiBabak && !incoming.timerBerjalan;
    const isRoundChanged = incoming.babakAktif !== matchState.babakAktif;
    
    // Smooth countdown: keep the server's sisaWaktu if it's currently running,
    // and the client's request is a background/field update (not an explicit play, pause, reset, or round change)
    let finalSisaWaktu = incoming.sisaWaktu;
    if (matchState.timerBerjalan && !playPauseToggled && !isReset && !isRoundChanged) {
      finalSisaWaktu = matchState.sisaWaktu;
    }
    
    // Retain active Juri IDs currently checked in
    const finalActiveJuriIds = matchState.activeJuriIds || [];
    
    const isTimeOverridden = finalSisaWaktu !== matchState.sisaWaktu;
    
    let logoKiri = incoming.logoKiri || "";
    let logoKanan = incoming.logoKanan || "";
    
    if (logoKiri.startsWith("data:image/")) {
      logoKiriData = logoKiri;
      logoKiri = `/api/logo/kiri?t=${Date.now()}`;
    }
    if (logoKanan.startsWith("data:image/")) {
      logoKananData = logoKanan;
      logoKanan = `/api/logo/kanan?t=${Date.now()}`;
    }

    matchState = {
      ...incoming,
      customIcons: incoming.customIcons !== undefined ? incoming.customIcons : matchState.customIcons,
      logoKiri: logoKiri,
      logoKanan: logoKanan,
      sisaWaktu: finalSisaWaktu,
      activeJuriIds: finalActiveJuriIds,
    };
    
    matchState = runWmpCheckOnServer(matchState);
    
    if (isTimeOverridden || playPauseToggled) {
      timerStartTime = Date.now();
      sisaWaktuAtStart = matchState.sisaWaktu;
    }
    
    res.json({ success: true });
    
    syncServerTimer();
    
    // Broadcast the state update to all SSE clients
    broadcastToClients({ type: "UPDATE_STATE", state: matchState });
  });

  // REST Juri Individual Click Endpoint
  app.post("/api/click", (req, res) => {
    const { juriId, sudut, jenis, babak } = req.body;
    if (!juriId || !sudut || !jenis || !babak) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const validated = processRawScoreOnServer(Number(juriId), sudut, jenis, Number(babak));

    matchState = runWmpCheckOnServer(matchState);

    res.json({ success: true, validated });

    // Broadcast the updated state to all SSE clients
    matchState.version = Date.now();
    broadcastToClients({ type: "UPDATE_STATE", state: matchState });
  });

  // REST Juri Delete Click Endpoint
  app.post("/api/delete-click", (req, res) => {
    const { juriId, sudut, babak } = req.body;
    if (!juriId || !sudut || !babak) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!matchState.rawScores) matchState.rawScores = [];
    if (!matchState.validatedScores) matchState.validatedScores = [];

    const juriIdNum = Number(juriId);
    const babakNum = Number(babak);

    // Find the last raw score by this juri, for this corner, in this round
    const lastRawIndex = matchState.rawScores
      .map((s, idx) => ({ s, idx }))
      .filter(x => x.s.juriId === juriIdNum && x.s.sudut === sudut && x.s.babak === babakNum)
      .sort((a, b) => b.s.timestamp - a.s.timestamp)[0]?.idx;

    if (lastRawIndex !== undefined) {
      const [lastRaw] = matchState.rawScores.splice(lastRawIndex, 1);

      if (lastRaw.validated && lastRaw.validatedGroupId) {
        const groupMembers = matchState.rawScores.filter(r => r.validatedGroupId === lastRaw.validatedGroupId);
        const uniqueJuries = new Set(groupMembers.map(r => r.juriId));
        if (uniqueJuries.size < 2) {
          // Invalidate remaining members of that consensus group
          groupMembers.forEach(r => {
            r.validated = false;
            r.validatedGroupId = undefined;
          });
          // Remove from validated scores list
          matchState.validatedScores = matchState.validatedScores.filter(v => v.id !== lastRaw.validatedGroupId);
        }
      }
    }

    matchState = runWmpCheckOnServer(matchState);

    res.json({ success: true });

    // Broadcast updated state
    matchState.version = Date.now();
    broadcastToClients({ type: "UPDATE_STATE", state: matchState });
  });

  // REST Juri Heartbeat Endpoint
  app.post("/api/juri/heartbeat", (req, res) => {
    const { juriId } = req.body;
    if (juriId) {
      activeJuries[Number(juriId)] = Date.now();
      updateActiveJuriesInState();
    }
    res.json({ success: true, activeJuriIds: matchState.activeJuriIds || [] });
  });

  // REST endpoints for Match History
  app.get("/api/history", (req, res) => {
    res.json(matchHistory);
  });

  app.post("/api/history", (req, res) => {
    matchHistory = req.body;
    res.json({ success: true });
    
    // Broadcast the history update to all SSE clients
    broadcastToClients({ type: "UPDATE_HISTORY", history: matchHistory });
  });

  // Server-Sent Events for real-time synchronization
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Establish link message
    res.write(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`);

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // Initial sync directly upon connection
    res.write(`data: ${JSON.stringify({ type: "UPDATE_STATE", state: matchState })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "UPDATE_HISTORY", history: matchHistory })}\n\n`);

    req.on("close", () => {
      clients = clients.filter(c => c.id !== clientId);
    });
  });

  // Diagnostics endpoint for packaged/local files
  app.get("/api/diagnose", (req, res) => {
    try {
      const paths: any = {
        _dirname: __dirname,
        cwd: process.cwd(),
        isPackaged: typeof (process as any).pkg !== "undefined",
      };

      // Safe readdir helper
      const safeReaddir = (p: string) => {
        try {
          if (fs.existsSync(p)) {
            return fs.readdirSync(p);
          }
          return `Does not exist`;
        } catch (e: any) {
          return `Error: ${e.message}`;
        }
      };

      paths.dir_content_dirname = safeReaddir(__dirname);
      paths.dir_content_cwd = safeReaddir(process.cwd());
      paths.dir_content_cwd_dist = safeReaddir(path.join(process.cwd(), "dist"));
      paths.dir_content_snapshot_root = safeReaddir(path.join(__dirname, ".."));

      res.json(paths);
    } catch (err: any) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  const isPackagedValue = typeof (process as any).pkg !== "undefined";

  // Vite development middleware vs production static files
  if (process.env.NODE_ENV !== "production" && !isPackagedValue) {
    const viteMod = "vite";
    const { createServer: createViteServer } = await import(viteMod);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Check if running inside a packaged pkg binary to resolve dist path correctly
    const distPath = isPackagedValue
      ? __dirname // inside pkg, server.cjs and index.html are compiled together inside /dist
      : path.join(process.cwd(), "dist");

    const indexHtmlPath = path.join(distPath, "index.html");

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      console.log(`[REQUEST] Mengakses rute fallback: ${req.url}`);
      const alternatives = [
        path.join(__dirname, "index.html"),              // 1. virtual snapshot dist/index.html
        path.join(__dirname, "..", "index.html"),        // 2. virtual snapshot index.html (parent)
        path.join(process.cwd(), "dist", "index.html"),    // 3. physical local dist/index.html
        path.join(process.cwd(), "index.html"),          // 4. physical local index.html
      ];
      return trySendMultipleFiles(res, alternatives, "index.html");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    // Auto-detect and print local IP addresses
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];
    
    for (const ifaceName of Object.keys(interfaces)) {
      const iface = interfaces[ifaceName];
      if (iface) {
        for (const alias of iface) {
          if (alias.family === "IPv4" && !alias.internal) {
            ips.push(alias.address);
          }
        }
      }
    }

    console.log("=======================================================================");
    console.log("          SISTEM SKORING DIGITAL PENCAK SILAT - SERVER AKTIF");
    console.log("=======================================================================");
    console.log("Aplikasi berhasil dijalankan!\n");
    console.log("1. Akses dari Komputer Server ini:");
    console.log(`   👉  http://localhost:${PORT}`);
    console.log(`   👉  http://127.0.0.1:${PORT}\n`);
    console.log("2. Akses dari Perangkat Lain (HP Juri, HP Dewan, Laptop Monitor, dll):");
    console.log("   Pastikan semua perangkat terhubung ke Jaringan Wi-Fi/LAN yang SAMA.");
    console.log("   Buka browser di perangkat lain tersebut dan ketik salah satu alamat ini:");
    if (ips.length > 0) {
      ips.forEach(ip => {
        console.log(`   👉  http://${ip}:${PORT}`);
      });
    } else {
      console.log(`   👉  http://<IP_KOMPUTER>:${PORT}`);
    }
    console.log("=======================================================================");
  });
}

startServer();

// Hook to force PKG's static analyzer to successfully detect and bundle all relative vector and icon assets.
// Do not delete this! The PKG static parser scans physical JavaScript files for hardcoded path.join calls
// to compile the dependencies into the executable, bypassing .gitignore configurations dynamically.
if (typeof (process as any).pkg !== "undefined") {
  path.join(__dirname, "binaan1.svg");
  path.join(__dirname, "binaan2.svg");
  path.join(__dirname, "kick.svg");
  path.join(__dirname, "peringatan1.svg");
  path.join(__dirname, "peringatan2.svg");
  path.join(__dirname, "pesilat1.png");
  path.join(__dirname, "pesilat2.png");
  path.join(__dirname, "pesilatkanan.svg");
  path.join(__dirname, "pesilatkiri.svg");
  path.join(__dirname, "punch.svg");
  path.join(__dirname, "teguran1.svg");
  path.join(__dirname, "teguran2.svg");
  path.join(__dirname, "temadiscors.png");
  path.join(__dirname, "app_icon.ico");
  path.join(__dirname, "assets/binaan1.svg");
  path.join(__dirname, "assets/binaan2.svg");
  path.join(__dirname, "assets/kick.svg");
  path.join(__dirname, "assets/peringatan1.svg");
  path.join(__dirname, "assets/peringatan2.svg");
  path.join(__dirname, "assets/pesilat1.png");
  path.join(__dirname, "assets/pesilat2.png");
  path.join(__dirname, "assets/pesilatkanan.svg");
  path.join(__dirname, "assets/pesilatkiri.svg");
  path.join(__dirname, "assets/punch.svg");
  path.join(__dirname, "assets/teguran1.svg");
  path.join(__dirname, "assets/teguran2.svg");
  path.join(__dirname, "assets/temadiscors.png");
}
