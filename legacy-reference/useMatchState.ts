/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MatchState, JuriPressLog, VerifiedHit, VerificationRequest, DewanPenaltyState } from '../types';
import { getStoredMatchState, saveStoredMatchState, processSynchronizedHits, calculatePenaltyDeduction, DEFAULT_STATE } from '../utils/storage';
import { playClickSound, playSuccessSound, playWarningSound, playGongSound } from '../utils/audio';

const STATE_CHANGE_EVENT = 'silat_state_updated_internally';

// Create a persistent state-sync channel at module level to avoid close() on every fast state update (e.g. every second of timer tick)
let persistentStateChannel: BroadcastChannel | null = null;
const getPersistentStateChannel = () => {
  if (typeof window === 'undefined') return null;
  if (!persistentStateChannel) {
    persistentStateChannel = new BroadcastChannel('silat_match_state_pulse');
  }
  return persistentStateChannel;
};

export function useMatchState(syncAcrossTabs: boolean = true, currentRole: string | null = null) {
  const [matchState, setMatchState] = useState<MatchState>(() => getStoredMatchState());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Unique Instance ID for this hook to prevent loopback messages/events
  const [hookInstanceId] = useState(() => Math.random().toString(36).substring(2, 11));

  // Refs for tracking clock synchronization offset relative to the Backend server
  // and throttling polling updates to avoid race conditions with local updates
  const clockOffsetRef = useRef<number>(0);
  const lastLocalUpdateRef = useRef<number>(0);

  // Sync state between open tabs (same device/browser) and with backend API (across multiple physical devices)
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'silat_scoring_match_state' && e.newValue) {
        // Skip syncing if we just performed a local update recently
        if (Date.now() - lastLocalUpdateRef.current < 1200) return;
        try {
          const parsed = JSON.parse(e.newValue);
          setMatchState(parsed);
        } catch (err) {
          console.error('Error listening to storage sync', err);
        }
      }
    };

    const handleInternalChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.senderId === hookInstanceId) {
        return;
      }
      if (Date.now() - lastLocalUpdateRef.current < 1200) return;
      setMatchState(getStoredMatchState());
    };

    // BroadcastChannel for instant inter-tab state sync on the same computer
    const channel = new BroadcastChannel('silat_match_state_pulse');
    channel.onmessage = (event) => {
      if (event.data && typeof event.data === 'object' && event.data.type === 'state_updated') {
        if (event.data.senderId === hookInstanceId) {
          return; // Ignore loopback from same hook instance
        }
        if (Date.now() - lastLocalUpdateRef.current < 1200) return;
        if (event.data.state) {
          setMatchState(event.data.state);
        } else {
          setMatchState(getStoredMatchState());
        }
      }
    };

    // Background HTTP polling mechanism to synchronize state across MULTIPLE PHYSICAL DEVICES (PCs and Phones)
    const pollBackend = async () => {
      try {
        const response = await fetch('/api/state');
        if (response.ok) {
          const data = await response.json();
          
          if (data.serverTime) {
            clockOffsetRef.current = data.serverTime - Date.now();
          }

          // Apply state only if we haven't done a local update in the last 1.2 seconds to prevent race conditions
          if (Date.now() - lastLocalUpdateRef.current > 1200) {
            setMatchState(data.matchState);
            saveStoredMatchState(data.matchState);
          }
        }
      } catch (err) {
        // Silent block during network dropouts or backend restart
      }
    };

    // First fetch immediately on load
    pollBackend();

    // Fetch state every 500ms
    const intervalRef = setInterval(pollBackend, 500);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(STATE_CHANGE_EVENT, handleInternalChange);

    return () => {
      channel.close();
      clearInterval(intervalRef);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(STATE_CHANGE_EVENT, handleInternalChange);
    };
  }, [syncAcrossTabs, hookInstanceId]);

  // Unified updater function - immediately pushes local update to backend too
  const updateState = useCallback((updater: (prev: MatchState) => MatchState) => {
    setMatchState((prev) => {
      const next = updater(prev);
      
      // Update our local modifications timestamp immediately
      lastLocalUpdateRef.current = Date.now();
      saveStoredMatchState(next);

      // Defer all side-effects (file saving, POSTing, and local broadcasting) to a setTimeout
      // to avoid triggering synchronous render-phase side effects in other components
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          // Instantly send updated state to central Express server
          fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matchState: next }),
          }).catch(() => {
            // Standalone or offline-first backup support
          });

          const event = new CustomEvent(STATE_CHANGE_EVENT, { detail: { senderId: hookInstanceId } });
          window.dispatchEvent(event);
          try {
            const channel = getPersistentStateChannel();
            if (channel) {
              channel.postMessage({ type: 'state_updated', state: next, senderId: hookInstanceId });
            }
          } catch (e) {}
        }
      }, 0);

      return next;
    });
  }, [hookInstanceId]);

  // Local high-frequency ticker to drive smooth real-time timer calculations
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    if (!matchState.timerRunning || matchState.matchEnded) return;

    const interval = setInterval(() => {
      setTicker((t) => t + 1);
    }, 200); // Ticks every 200ms to keep the derived time completely up-to-date in real-time

    return () => clearInterval(interval);
  }, [matchState.timerRunning, matchState.matchEnded]);

  // Compute remaining time dynamically based on start timestamp, incorporating clock sync offset for multi-device matches
  const syncedNow = Date.now() + clockOffsetRef.current;
  const derivedWaktuTersisa = matchState.timerRunning && matchState.timerStartedAt
    ? Math.max(0, (matchState.waktuTersisaAtStart ?? matchState.waktuTersisa) - Math.floor((syncedNow - matchState.timerStartedAt) / 1000))
    : matchState.waktuTersisa;

  // Auto transition when the timer runs down to 0
  useEffect(() => {
    if (derivedWaktuTersisa <= 0 && matchState.timerRunning && !matchState.matchEnded) {
      playGongSound();
      updateState((prev) => ({
        ...prev,
        timerRunning: false,
        waktuTersisa: 0,
        timerStartedAt: null,
        waktuTersisaAtStart: undefined,
      }));
    }
  }, [derivedWaktuTersisa, matchState.timerRunning, matchState.matchEnded, updateState]);

  const derivedMatchState = {
    ...matchState,
    waktuTersisa: derivedWaktuTersisa,
  };

  // Play/Pause timer (Sekretaris Control)
  const toggleTimer = useCallback(() => {
    playClickSound();
    updateState((prev) => {
      const bRunning = !prev.timerRunning;
      
      const syncedNow = Date.now() + clockOffsetRef.current;
      const currentRemaining = prev.timerRunning && prev.timerStartedAt
        ? Math.max(0, (prev.waktuTersisaAtStart ?? prev.waktuTersisa) - Math.floor((syncedNow - prev.timerStartedAt) / 1000))
        : prev.waktuTersisa;

      if (currentRemaining <= 0) return prev; // Cannot play if time is up
      
      // Proactively request Juri status check-in when starting or pausing the match
      try {
        const juriChannel = new BroadcastChannel('silat_juri_pulse');
        juriChannel.postMessage('probe_request');
        juriChannel.close();
      } catch (e) {}

      return {
        ...prev,
        timerRunning: bRunning,
        timerStartedAt: bRunning ? syncedNow : null,
        waktuTersisaAtStart: bRunning ? currentRemaining : undefined,
        waktuTersisa: currentRemaining,
      };
    });
  }, [updateState]);

  // Reset timer (Sekretaris Control)
  const resetTimer = useCallback(() => {
    playClickSound();
    updateState((prev) => {
      return {
        ...prev,
        timerRunning: false,
        timerStartedAt: null,
        waktuTersisaAtStart: undefined,
        waktuTersisa: prev.settings.durasiBabak,
      };
    });
  }, [updateState]);

  // Set the babakAktif (Sekretaris Control)
  const setBabak = useCallback((babak: number) => {
    playClickSound();
    updateState((prev) => {
      return {
        ...prev,
        babakAktif: babak,
        waktuTersisa: prev.settings.durasiBabak,
        timerRunning: false, // Stop timer on babak changes
        timerStartedAt: null,
        waktuTersisaAtStart: undefined,
      };
    });
  }, [updateState]);

  // Reset/Reset match to default or new tournament details (Sekretaris Control)
  const resetMatchState = useCallback((customState?: Partial<MatchState>) => {
    playClickSound();
    updateState((prev) => {
      const merged = {
        ...DEFAULT_STATE,
        ...customState,
        merah: {
          ...DEFAULT_STATE.merah,
          atlit: customState?.merah?.atlit || DEFAULT_STATE.merah.atlit,
        },
        biru: {
          ...DEFAULT_STATE.biru,
          atlit: customState?.biru?.atlit || DEFAULT_STATE.biru.atlit,
        },
        settings: {
          ...DEFAULT_STATE.settings,
          ...customState?.settings,
        }
      };
      return merged;
    });
  }, [updateState]);

  // Change settings directly (Sekretaris Setup)
  const updateSettings = useCallback((settings: Partial<MatchState['settings']>) => {
    updateState((prev) => {
      const nextSettings = { ...prev.settings, ...settings };
      return {
        ...prev,
        settings: nextSettings,
        // Also sync timer time if it hasn't started running
        waktuTersisa: nextSettings.durasiBabak,
      };
    });
  }, [updateState]);

  // Update athlete details
  const updateAthletes = useCallback((merahAtlit: Partial<MatchState['merah']['atlit']>, biruAtlit: Partial<MatchState['biru']['atlit']>) => {
    updateState((prev) => {
      return {
        ...prev,
        merah: {
          ...prev.merah,
          atlit: { ...prev.merah.atlit, ...merahAtlit },
        },
        biru: {
          ...prev.biru,
          atlit: { ...prev.biru.atlit, ...biruAtlit },
        }
      };
    });
  }, [updateState]);

  // Record a Juri's button press (PUNCH / KICK)
  const registerJuriPress = useCallback((juriId: 1 | 2 | 3, action: 'PUNCH' | 'KICK', corner: 'MERAH' | 'BIRU') => {
    playClickSound();

    updateState((prev) => {
      const syncedNow = Date.now() + clockOffsetRef.current;
      const currentRemaining = prev.timerRunning && prev.timerStartedAt
        ? Math.max(0, (prev.waktuTersisaAtStart ?? prev.waktuTersisa) - Math.floor((syncedNow - prev.timerStartedAt) / 1000))
        : prev.waktuTersisa;

      // Guard: do not allow inputs if timer is not running, or match ended, or a verification is active, or time is up
      if (!prev.timerRunning || prev.matchEnded || currentRemaining <= 0) {
        return prev;
      }

      const newLogVal: JuriPressLog = {
        id: `juri_press_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        juriId,
        action,
        corner,
        timestamp: Date.now(),
        babak: prev.babakAktif,
      };

      const updatedHistory = [...prev.juriPressHistory, newLogVal];

      // Run our 1.5s tolerance check logic
      const syncResult = processSynchronizedHits(updatedHistory, prev.verifiedHits, newLogVal);

      if (syncResult.didVerify) {
        playSuccessSound();
      }

      return {
        ...prev,
        juriPressHistory: updatedHistory,
        verifiedHits: syncResult.verifiedHits,
      };
    });
  }, [updateState]);

  // Dewan Penalty toggler
  const toggleDewanPenalty = useCallback((corner: 'MERAH' | 'BIRU', penaltyKey: keyof DewanPenaltyState) => {
    updateState((prev) => {
      const isMerah = corner === 'MERAH';
      const cornerKey = isMerah ? 'merah' : 'biru';
      const currentCorner = prev[cornerKey];

      const updatedPenalties = {
        ...currentCorner.penalties,
        [penaltyKey]: !currentCorner.penalties[penaltyKey],
      };

      // Sound play - click vs warning gong
      if (updatedPenalties[penaltyKey]) {
        playWarningSound();
      } else {
        playClickSound();
      }

      // Re-calculate the penalty deduction
      const penaltyScore = calculatePenaltyDeduction(updatedPenalties);

      return {
        ...prev,
        [cornerKey]: {
          ...currentCorner,
          penalties: updatedPenalties,
          penaltyScore,
        },
      };
    });
  }, [updateState]);

  // Dewan Jatuhan point register (+3 points)
  const applyDewanJatuhan = useCallback((corner: 'MERAH' | 'BIRU', changeType: 'ADD' | 'SUBTRACT') => {
    updateState((prev) => {
      const isMerah = corner === 'MERAH';
      const cornerKey = isMerah ? 'merah' : 'biru';
      const currentCorner = prev[cornerKey];

      let newScore = currentCorner.jatuhanScore;
      if (changeType === 'ADD') {
        newScore += 3;
        playSuccessSound();
      } else {
        newScore = Math.max(0, newScore - 3);
        playClickSound();
      }

      return {
        ...prev,
        [cornerKey]: {
          ...currentCorner,
          jatuhanScore: newScore,
        },
      };
    });
  }, [updateState]);

  // Dewan Disqualification
  const setDisqualifiedState = useCallback((corner: 'MERAH' | 'BIRU', active: boolean) => {
    playWarningSound();
    updateState((prev) => {
      const isMerah = corner === 'MERAH';
      const cornerKey = isMerah ? 'merah' : 'biru';
      
      return {
        ...prev,
        matchEnded: active,
        endedAt: active ? new Date().toISOString() : null,
        [cornerKey]: {
          ...prev[cornerKey],
          disqualified: active,
        },
      };
    });
  }, [updateState]);

  // Dewan initiate a Verification request
  const initiateVerification = useCallback((type: 'JATUHAN' | 'PELANGGARAN') => {
    playWarningSound();
    updateState((prev) => {
      const req: VerificationRequest = {
        id: `verif_req_${Date.now()}`,
        type,
        status: 'PENDING',
        chosenCorner: null,
        votes: {
          1: null,
          2: null,
          3: null,
        },
      };
      return {
        ...prev,
        verificationRequest: req,
      };
    });
  }, [updateState]);

  // Juri casts verification vote
  const selectJuriVerificationVote = useCallback((juriId: 1 | 2 | 3, vote: 'MERAH' | 'BIRU' | 'TIDAK_SAH') => {
    playClickSound();
    updateState((prev) => {
      if (!prev.verificationRequest) return prev;

      const votes = {
        ...prev.verificationRequest.votes,
        [juriId]: vote,
      };

      // Check if all jurists voted
      const voterCount = Object.values(votes).filter((v) => v !== null).length;
      let status = prev.verificationRequest.status;
      let chosenCorner = prev.verificationRequest.chosenCorner;

      if (voterCount === 3) {
        // Tally votes
        const tallies = { MERAH: 0, BIRU: 0, TIDAK_SAH: 0 };
        Object.values(votes).forEach((v) => {
          if (v === 'MERAH' || v === 'BIRU' || v === 'TIDAK_SAH') {
            tallies[v]++;
          }
        });

        // Which vote won?
        if (tallies.MERAH >= 2) {
          status = 'SAH';
          chosenCorner = 'MERAH';
          playSuccessSound();
        } else if (tallies.BIRU >= 2) {
          status = 'SAH';
          chosenCorner = 'BIRU';
          playSuccessSound();
        } else {
          status = 'TIDAK_SAH';
          chosenCorner = null;
          playWarningSound();
        }
      }

      return {
        ...prev,
        verificationRequest: {
          ...prev.verificationRequest,
          votes,
          status,
          chosenCorner,
        },
      };
    });
  }, [updateState]);

  // Clear or close verification request panel (Dewan control)
  const clearVerificationRequest = useCallback(() => {
    playClickSound();
    updateState((prev) => {
      return {
        ...prev,
        verificationRequest: null,
      };
    });
  }, [updateState]);

  // Force match data & connections re-sync (Sekretaris Control)
  const forceSync = useCallback(() => {
    // 1. Re-broadcast match state to all tabs
    try {
      const currentState = getStoredMatchState();
      const channel = getPersistentStateChannel();
      if (channel) {
        channel.postMessage({ type: 'state_updated', state: currentState });
      }
    } catch (e) {}

    // 2. Active-probe all Juri panels to check-in/reply immediately
    try {
      const juriChannel = new BroadcastChannel('silat_juri_pulse');
      juriChannel.postMessage('probe_request');
      juriChannel.close();
    } catch (e) {}

    // 3. Trigger local sync event notifications
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('storage_juri_heartbeat'));
      window.dispatchEvent(new Event(STATE_CHANGE_EVENT));
    }
  }, []);

  return {
    matchState: derivedMatchState,
    toggleTimer,
    resetTimer,
    setBabak,
    resetMatchState,
    updateSettings,
    updateAthletes,
    registerJuriPress,
    toggleDewanPenalty,
    applyDewanJatuhan,
    setDisqualifiedState,
    initiateVerification,
    selectJuriVerificationVote,
    clearVerificationRequest,
    forceSync,
  };
}
