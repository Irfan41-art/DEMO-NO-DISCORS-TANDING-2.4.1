/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MatchState, MatchHistoryEntry, VerifiedHit } from '../types';

const STORAGE_KEYS = {
  MATCH_STATE: 'silat_scoring_match_state',
  HISTORY: 'silat_scoring_history',
};

export const DEFAULT_STATE: MatchState = {
  settings: {
    eventName: 'KEJUARAAN NASIONAL IPSI 2026',
    logoLeft: '', // Will fall back to dynamic silat illustration if empty
    logoRight: '',
    logoCentral: 'IPSI',
    partai: '12',
    babakSeksi: 'Penyisihan',
    kelasNomor: 'Kelas C (55 - 60 kg)',
    gender: 'PUTRA',
    durasiBabak: 120, // 2 Minutes
  },
  merah: {
    atlit: {
      nama: 'WIRA SENTOSA',
      kontingen: 'DKI JAKARTA',
    },
    jatuhanScore: 0,
    penaltyScore: 0,
    penalties: {
      binaan1: false,
      binaan2: false,
      teguran1: false,
      teguran2: false,
      peringatan1: false,
      peringatan2: false,
    },
    disqualified: false,
  },
  biru: {
    atlit: {
      nama: 'ARYA BRAWIJAYA',
      kontingen: 'JAWA BARAT',
    },
    jatuhanScore: 0,
    penaltyScore: 0,
    penalties: {
      binaan1: false,
      binaan2: false,
      teguran1: false,
      teguran2: false,
      peringatan1: false,
      peringatan2: false,
    },
    disqualified: false,
  },
  babakAktif: 1,
  waktuTersisa: 120,
  timerRunning: false,
  verificationRequest: null,
  juriPressHistory: [],
  verifiedHits: [],
  matchEnded: false,
  endedAt: null,
};

export function getStoredMatchState(): MatchState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MATCH_STATE);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Ensure safety checks
      if (parsed.settings && parsed.merah && parsed.biru) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse match state', e);
  }
  return { ...DEFAULT_STATE };
}

export function saveStoredMatchState(state: MatchState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MATCH_STATE, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save match state', e);
  }
}

export function getStoredHistory(): MatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse history', e);
    return [];
  }
}

export function saveStoredHistory(history: MatchHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history', e);
  }
}

/**
 * Calculates current penalty score reduction for a player corner
 */
export function calculatePenaltyDeduction(penalties: MatchState['merah']['penalties']): number {
  let deduction = 0;
  if (penalties.teguran1) deduction += 1;
  if (penalties.teguran2) deduction += 2;
  if (penalties.peringatan1) deduction += 5;
  if (penalties.peringatan2) deduction += 10;
  return deduction; // Note: returns a positive number to represent total subtraction points
}

/**
 * Calculates scores by Babak and overall total for each corner
 */
export function calculateCornerScores(state: MatchState, corner: 'MERAH' | 'BIRU') {
  const isMerah = corner === 'MERAH';
  const cornerKey = isMerah ? 'merah' : 'biru';
  const cornerData = state[cornerKey];

  // Verified hits totals by Babak
  const hitsByBabak: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  state.verifiedHits.forEach((hit) => {
    if (hit.corner === corner) {
      hitsByBabak[hit.babak] = (hitsByBabak[hit.babak] || 0) + hit.points;
    }
  });

  // Jatuhan score (+3 per jatuhan)
  const jatuhanValue = cornerData.jatuhanScore; 

  // Direct deduction from penalties
  const penaltyDeduction = calculatePenaltyDeduction(cornerData.penalties);

  // Total points
  const totalHits = Object.values(hitsByBabak).reduce((sum, v) => sum + v, 0);
  const totalScore = totalHits + jatuhanValue - penaltyDeduction;

  return {
    hitsByBabak,
    totalHits,
    jatuhanValue,
    penaltyDeduction,
    totalScore,
  };
}

/**
 * Calculate RAW hits registered by an individual Juri for a specific corner and babak
 */
export function calculateJuriRawHits(state: MatchState, juriId: 1 | 2 | 3, corner: 'MERAH' | 'BIRU', babak: number): number {
  return state.juriPressHistory
    .filter((log) => log.juriId === juriId && log.corner === corner && log.babak === babak)
    .reduce((sum, log) => sum + (log.action === 'PUNCH' ? 1 : 2), 0);
}

/**
 * Check and process coincident press logs in state.
 * Returns a tuple of [updatedVerifiedHitsList, updatedJuriHistoryLogList, didJustVerify]
 */
export function processSynchronizedHits(
  juriHistory: MatchState['juriPressHistory'],
  existingVerifiedHits: MatchState['verifiedHits'],
  newLog: MatchState['juriPressHistory'][0]
): {
  verifiedHits: VerifiedHit[];
  didVerify: boolean;
  matchingIds: string[];
} {
  const TOLERANCE_MS = 1500; // 1.5 seconds

  // Find all logs for the SAME corner, SAME action, SAME babak, and from DIFFERENT jurists
  // that happened within TOLERANCE_MS of our new log.
  const potentials = juriHistory.filter((log) => {
    if (log.id === newLog.id) return false;
    if (log.corner !== newLog.corner) return false;
    if (log.action !== newLog.action) return false;
    if (log.babak !== newLog.babak) return false;
    if (log.juriId === newLog.juriId) return false; // Must be a different jurist

    const timeDiff = Math.abs(log.timestamp - newLog.timestamp);
    return timeDiff <= TOLERANCE_MS;
  });

  if (potentials.length === 0) {
    return { verifiedHits: existingVerifiedHits, didVerify: false, matchingIds: [] };
  }

  // We found matching presses!
  // To avoid double verifying the exact same hit combination:
  // Check if either the current newLog OR any of the matching potentials are already referenced in 'existingVerifiedHits'
  // Actually, we can check if there's any verified hit that has a timestamp overlapping this.
  // Instead, we can tag logs with "processed" or simply check if we already have a verified hit
  // for the same pair in the exact same timing window.
  // Let's check:
  const isAlreadyVerified = existingVerifiedHits.some((hit) => {
    const isSameBabakActionCorner = hit.babak === newLog.babak && hit.action === newLog.action && hit.corner === newLog.corner;
    if (!isSameBabakActionCorner) return false;

    // Is the timestamp very close to this newLog? 
    // If it's within tolerance, is it already validated? Yes
    return Math.abs(hit.timestamp - newLog.timestamp) <= TOLERANCE_MS;
  });

  if (isAlreadyVerified) {
    return { verifiedHits: existingVerifiedHits, didVerify: false, matchingIds: [] };
  }

  // Generate dynamic ID for new verified hit
  const hitId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const points = newLog.action === 'PUNCH' ? 1 : 2;

  // We pair the newLog with the closest potential hit Juri
  const bestPotential = potentials.sort((a, b) => Math.abs(a.timestamp - newLog.timestamp) - Math.abs(b.timestamp - newLog.timestamp))[0];

  const newVerifiedHit: VerifiedHit = {
    id: hitId,
    action: newLog.action,
    corner: newLog.corner,
    timestamp: newLog.timestamp,
    babak: newLog.babak,
    points,
    juriIndices: [newLog.juriId, bestPotential.juriId],
  };

  return {
    verifiedHits: [...existingVerifiedHits, newVerifiedHit],
    didVerify: true,
    matchingIds: [newLog.id, bestPotential.id],
  };
}
