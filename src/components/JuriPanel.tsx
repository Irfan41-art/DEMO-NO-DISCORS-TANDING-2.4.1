/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MatchState } from '../types';
import { calculateJuriRawHits } from '../utils/storage';
import { Users, AlertCircle, HelpCircle, Trophy, CheckCircle2, Maximize2, Minimize2 } from 'lucide-react';
import { playClickSound } from '../utils/audio';
import { useJuriStatuses } from '../hooks/useJuriStatuses';

const getMaxRounds = (kategoriUsia?: string): number => {
  const norm = (kategoriUsia || '').toUpperCase().trim();
  const isTwoRounds = [
    "PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER 2", "MASTER A", "MASTER B"
  ].includes(norm);
  return isTwoRounds ? 2 : 3;
};

interface JuriPanelProps {
  matchState: MatchState;
  registerJuriPress: (juriId: 1 | 2 | 3, action: 'PUNCH' | 'KICK', corner: 'MERAH' | 'BIRU') => void;
  selectJuriVerificationVote: (juriId: 1 | 2 | 3, vote: 'MERAH' | 'BIRU' | 'TIDAK_SAH') => void;
  onBackToLanding?: () => void;
}

export const JuriPanel: React.FC<JuriPanelProps> = ({
  matchState,
  registerJuriPress,
  selectJuriVerificationVote,
  onBackToLanding,
}) => {
  const [selectedJuriId, setSelectedJuriId] = useState<1 | 2 | 3 | null>(null);
  const juriStatuses = useJuriStatuses();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track fullscreen changes to sync buttons across pages (with vendor prefix compatibility)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFull);
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
    playClickSound();
    
    const doc = document as any;
    const docEl = document.documentElement as any;
    
    const isFull = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isFull) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch((err: any) => {
          console.error('Error enabling fullscreen:', err);
        });
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.webkitRequestFullScreen) {
        docEl.webkitRequestFullScreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch((err: any) => {
          console.error('Error exiting fullscreen:', err);
        });
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.webkitCancelFullScreen) {
        doc.webkitCancelFullScreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };

  // Handle automatic online status heartbeats when a Juri selects their ID
  useEffect(() => {
    if (!selectedJuriId) return;

    const channel = new BroadcastChannel('silat_juri_pulse');

    const sendHeartbeat = () => {
      try {
        const raw = localStorage.getItem('silat_juri_heartbeats');
        const heartbeats = raw ? JSON.parse(raw) : {};
        heartbeats[selectedJuriId] = Date.now();
        localStorage.setItem('silat_juri_heartbeats', JSON.stringify(heartbeats));
        
        // Notify the Central Express Server so remote devices (PC) can register this Juri's connection
        fetch('/api/juri/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ juriId: selectedJuriId }),
        }).catch((err) => {
          // Fail silently if offline or standalone
        });

        window.dispatchEvent(new Event('storage_juri_heartbeat'));
        channel.postMessage('heartbeat_updated');
      } catch (e) {
        console.error('Error sending heartbeat:', e);
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 1500);

    // Listen to force sync probes from Secretary
    channel.onmessage = (event) => {
      if (event.data === 'probe_request') {
        sendHeartbeat();
      }
    };

    return () => {
      clearInterval(interval);
      channel.close();
      try {
        const raw = localStorage.getItem('silat_juri_heartbeats');
        if (raw) {
          const heartbeats = JSON.parse(raw);
          delete heartbeats[selectedJuriId];
          localStorage.setItem('silat_juri_heartbeats', JSON.stringify(heartbeats));
          window.dispatchEvent(new Event('storage_juri_heartbeat'));
          
          const channelClose = new BroadcastChannel('silat_juri_pulse');
          channelClose.postMessage('heartbeat_updated');
          channelClose.close();
        }
      } catch (e) {}
    };
  }, [selectedJuriId]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If juri ID is not selected yet, show selection screen
  if (!selectedJuriId) {
    return (
      <div className="min-h-screen min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 bg-[#03060f] text-slate-100 relative overflow-y-auto">
        
        {/* Floating Top Right Full Screen Controls */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3.5 py-2 bg-[#0a0f1d] hover:bg-[#121b2d] border border-blue-950/50 rounded-xl text-xs font-black text-[#fafafa] hover:text-white transition-all cursor-pointer active:scale-95 shadow-xl select-none"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4 text-amber-400" /> : <Maximize2 className="w-4 h-4 text-amber-400" />}
          {isFullscreen ? 'LAYAR NORMAL' : 'LAYAR PENUH'}
        </button>

        <div className="w-full max-w-md bg-[#0a0f1d] border border-blue-950/40 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
          
          <div className="inline-flex p-3 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-full mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white">PILIH IDENTITAS JURI</h2>
          <p className="text-xs text-slate-400 mt-2 mb-6 leading-relaxed">
            Pilihlah panel Juri sesuai dengan penomoran tempat duduk Anda di sisi gelanggang untuk menyinkronkan data ketukan secara sah.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map((id) => {
              const isOnline = juriStatuses[id as 1 | 2 | 3];
              return (
                <button
                  key={id}
                  id={`juri-select-btn-${id}`}
                  onClick={() => {
                    playClickSound();
                    setSelectedJuriId(id as 1 | 2 | 3);
                  }}
                  className={`py-4 bg-[#050914] border rounded-2xl font-black text-xl text-white shadow-md transition-all cursor-pointer active:scale-95 duration-75 flex flex-col items-center justify-center ${
                    isOnline 
                      ? 'border-emerald-500 bg-emerald-950/10 hover:border-emerald-400' 
                      : 'border-slate-800 hover:bg-[#121b2d] hover:border-blue-500'
                  }`}
                >
                  <span>JURI {id}</span>
                  <span className={`text-[9px] font-black uppercase mt-2 px-2 py-0.5 rounded tracking-wider ${
                    isOnline ? 'bg-emerald-500 text-slate-950 animate-pulse' : 'bg-slate-800 text-slate-400'
                  }`}>
                    ● {isOnline ? 'ONLINE' : 'LOGOUT'}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              playClickSound();
              if (onBackToLanding) onBackToLanding();
            }}
            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-4 cursor-pointer font-bold"
          >
            Kembali ke Beranda Utama
          </button>
        </div>
      </div>
    );
  }

  const myRawHitsMerah = (babak: number) => calculateJuriRawHits(matchState, selectedJuriId, 'MERAH', babak);
  const myRawHitsBiru = (babak: number) => calculateJuriRawHits(matchState, selectedJuriId, 'BIRU', babak);

  const isRoundOver = matchState.waktuTersisa <= 0;
  const isMatchOver = isRoundOver && matchState.babakAktif === getMaxRounds(matchState.kategoriUsia);
  
  // Checking if there is an active Verification process, and if this Juri hasn't voted yet
  const activeVerification = matchState.verificationRequest;
  const hasVotedForVerification = activeVerification ? activeVerification.votes[selectedJuriId] !== null : false;

  const handleAction = (corner: 'MERAH' | 'BIRU', action: 'PUNCH' | 'KICK') => {
    // Cannot register anything if timer is not running or babak completed
    if (!matchState.timerRunning || isRoundOver) return;
    registerJuriPress(selectedJuriId, action, corner);
  };  return (
    <div className="w-full h-screen h-[100dvh] flex flex-col select-none bg-[#03060f] text-slate-100 p-1 sm:p-2 md:p-4 overflow-hidden relative">
      
      {/* HEADER SECTION */}
      <header className="flex justify-between items-center border-b border-slate-900 pb-1 sm:pb-2 mb-1 sm:mb-2 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => {
              playClickSound();
              setSelectedJuriId(null);
            }}
            className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-[#121b2d] hover:bg-[#18263c] text-[8px] sm:text-[10px] text-slate-200 rounded border border-blue-955 transition font-bold cursor-pointer select-none"
          >
            ← GANTI JURI
          </button>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-[#0a0f1d] hover:bg-[#121b2d] text-[8px] sm:text-[10px] text-amber-400 font-black rounded border border-blue-950/40 transition-all cursor-pointer select-none active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" /> : <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />}
            {isFullscreen ? 'LAYAR NORMAL' : 'LAYAR PENUH'}
          </button>
          <div>
            <h1 className="text-[10px] sm:text-xs font-black tracking-wider text-blue-400 font-mono uppercase flex items-center gap-1 sm:gap-1.5">
              DECK {selectedJuriId}
              <span className="inline-flex items-center text-[7px] sm:text-[8px] font-black text-emerald-400 bg-emerald-950/20 px-1 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1 h-1 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                ON
              </span>
            </h1>
            <p className="text-[8px] sm:text-[9px] text-slate-500 max-w-[90px] sm:max-w-[150px] md:max-w-xs truncate leading-none font-bold">
              {matchState.settings.eventName}
            </p>
          </div>
        </div>

        {/* MIDDLE TICKER */}
        <div className="flex items-center gap-1.5 sm:gap-3 bg-[#0a0f1d] border border-blue-955 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-inner">
          <div className="text-right">
            <span className="text-[7px] sm:text-[8px] text-slate-505 block uppercase font-mono font-bold">Partai {matchState.settings.partai}</span>
            <span className="text-[8px] sm:text-[10px] font-black text-amber-505 block uppercase leading-none font-mono truncate max-w-[80px] sm:max-w-none">{matchState.settings.babakSeksi} | {matchState.settings.kelasNomor}</span>
          </div>
          <div className="w-px h-4 sm:h-5 bg-slate-900"></div>
          <div className="flex items-center gap-1 sm:gap-2">
            <span className={`px-1 sm:px-2 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black ${matchState.timerRunning ? 'bg-green-500 text-black animate-pulse' : 'bg-red-500/20 text-red-400'}`}>
              B{matchState.babakAktif}
            </span>
            <span className="text-xs sm:text-sm md:text-base font-black font-mono tracking-widest text-white leading-none">
              {formatTime(matchState.waktuTersisa)}
            </span>
          </div>
        </div>

        {/* STATUS STAMP */}
        <div className="hidden xl:block text-right">
          <span className="text-[8px] text-slate-555 uppercase block font-mono">Keluaran data</span>
          <span className="text-[10px] text-slate-355 font-black">TERINKRON REAKSI 1.5S</span>
        </div>
      </header>

      {/* ATHLETE BAR (INFO ONLY) */}
      <div className="grid grid-cols-2 gap-1 sm:gap-2 mb-1.5 sm:mb-2 shrink-0">
        <div className="bg-[#070d1a]/80 border border-blue-950/40 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl flex items-center justify-between">
          <span className="text-[8px] sm:text-[9px] font-black text-blue-400 uppercase tracking-wider font-mono">BIRU</span>
          <span className="text-[10px] sm:text-xs font-black text-white truncate max-w-[80px] sm:max-w-[150px]">{matchState.biru.atlit.nama || 'ATLIT BIRU'}</span>
          <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase truncate max-w-[50px] sm:max-w-none">{matchState.biru.atlit.kontingen}</span>
        </div>
        <div className="bg-[#0f070a]/80 border border-red-955/40 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl flex items-center justify-between">
          <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase truncate max-w-[50px] sm:max-w-none">{matchState.merah.atlit.kontingen}</span>
          <span className="text-[10px] sm:text-xs font-black text-white truncate max-w-[80px] sm:max-w-[150px]">{matchState.merah.atlit.nama || 'ATLIT MERAH'}</span>
          <span className="text-[8px] sm:text-[9px] font-black text-red-400 uppercase tracking-wider font-mono">MERAH</span>
        </div>
      </div>

      {/* CORE INPUT & REKAP AREA */}
      <div className="flex-1 grid grid-cols-12 gap-1.5 sm:gap-3 min-h-0 overflow-hidden mb-0.5 sm:mb-1">
        
        {/* LEFT COLUMN: BLUE CORNER (SISI KIRI) */}
        <section className="col-span-4 flex flex-col gap-1.5 sm:gap-2 min-h-0">
          {/* PUNCH BLUE BUTTON */}
          <button
            id={`juri-punch-biru-${selectedJuriId}`}
            disabled={!matchState.timerRunning || isRoundOver}
            onClick={() => handleAction('BIRU', 'PUNCH')}
            className={`flex-1 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer select-none active:scale-95 duration-75 p-1 sm:p-2 ${
              matchState.timerRunning && !isRoundOver
                ? 'bg-gradient-to-b from-blue-750 to-blue-950 border-blue-500 hover:from-blue-700 shadow-lg shadow-blue-500/20 text-white'
                : 'bg-slate-900/10 border-slate-950/50 opacity-20 cursor-not-allowed'
            }`}
          >
            <span className="text-sm sm:text-base md:text-2xl font-black tracking-widest uppercase text-blue-200 score-glow-blue sm:leading-tight">PUNCH</span>
            <span className="text-[8px] sm:text-[9px] md:text-[10px] text-blue-300 font-bold tracking-wider mt-0.5 sm:mt-1 uppercase font-mono leading-none">(Pukulan: +1 Poin)</span>
          </button>

          {/* KICK BLUE BUTTON */}
          <button
            id={`juri-kick-biru-${selectedJuriId}`}
            disabled={!matchState.timerRunning || isRoundOver}
            onClick={() => handleAction('BIRU', 'KICK')}
            className={`flex-1 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer select-none active:scale-95 duration-75 p-1 sm:p-2 ${
              matchState.timerRunning && !isRoundOver
                ? 'bg-gradient-to-b from-blue-800 to-blue-950 border-blue-600 hover:from-blue-750 shadow-lg shadow-blue-500/20 text-white'
                : 'bg-slate-900/10 border-slate-950/50 opacity-20 cursor-not-allowed'
            }`}
          >
            <span className="text-sm sm:text-base md:text-2xl font-black tracking-widest uppercase text-blue-200 score-glow-blue sm:leading-tight">KICK</span>
            <span className="text-[8px] sm:text-[9px] md:text-[10px] text-blue-300 font-bold tracking-wider mt-0.5 sm:mt-1 uppercase font-mono leading-none">(Tendangan: +2 Poin)</span>
          </button>
        </section>

        {/* MIDDLE COLUMN: OWN JURI RECAP BY BABAK */}
        <section className="col-span-4 bg-[#050914] border border-slate-900 rounded-xl sm:rounded-2xl p-1.5 sm:p-3 sm:pb-3 flex flex-col justify-between min-h-0 shadow-inner">
          <div className="min-h-0 flex flex-col">
            <h3 className="text-[9px] sm:text-[10px] md:text-[11px] font-black text-blue-400 text-center tracking-widest uppercase mb-1 sm:mb-1.5 border-b border-slate-900 pb-1 sm:pb-1.5 font-mono truncate leading-none">
              REKAP DECK {selectedJuriId}
            </h3>
            
            <p className="text-[8px] sm:text-[9px] text-slate-500 text-center mb-1.5 leading-tight hidden sm:block">
              Merekam seluruh ketukan mentah Anda secara real-time.
            </p>

            {/* Score by Babak list */}
            <div className="space-y-1 overflow-y-auto max-h-[85px] sm:max-h-[150px] min-h-0">
              {Array.from({ length: getMaxRounds(matchState.kategoriUsia) }, (_, i) => i + 1).map((b) => (
                <div
                  key={b}
                  className={`p-1 sm:p-1.5 rounded-lg border flex justify-between items-center text-[8.5px] sm:text-[10px] ${
                    b === matchState.babakAktif ? 'bg-blue-550/10 border-blue-500/30' : 'bg-slate-950/40 border-slate-950 opacity-70'
                  }`}
                >
                  <span className="font-extrabold text-slate-350">BABAK {b}</span>
                  <div className="flex items-center gap-1.5 sm:gap-3">
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-blue-500" />
                      <span className="font-mono text-[8px] sm:text-[9.5px]">B:<strong className="text-blue-400 font-black">{myRawHitsBiru(b)}</strong></span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-red-500" />
                      <span className="font-mono text-[8px] sm:text-[9.5px]">M:<strong className="text-red-400 font-black">{myRawHitsMerah(b)}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-900 pt-1 flex flex-col justify-center items-center text-center shrink-0">
            <span className="text-[7.5px] sm:text-[8.5px] text-slate-500 uppercase block font-mono font-bold tracking-wider leading-none">TOTAL MENTAH</span>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-3 w-full mt-1">
              <div className="bg-blue-950/20 py-0.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-blue-900/30">
                <div className="text-[7px] sm:text-[8px] text-blue-400 font-bold uppercase leading-none mb-0.5">BIRU</div>
                <span className="text-[10px] sm:text-xs md:text-sm font-black text-blue-400 font-mono leading-none">{myRawHitsBiru(1) + myRawHitsBiru(2) + myRawHitsBiru(3)} HITS</span>
              </div>
              <div className="bg-red-950/20 py-0.5 sm:py-1.5 rounded-lg sm:rounded-xl border border-red-955/30">
                <div className="text-[7px] sm:text-[8px] text-red-400 font-bold uppercase leading-none mb-0.5">MERAH</div>
                <span className="text-[10px] sm:text-xs md:text-sm font-black text-red-400 font-mono leading-none">{myRawHitsMerah(1) + myRawHitsMerah(2) + myRawHitsMerah(3)} HITS</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: RED CORNER (SISI KANAN) */}
        <section className="col-span-4 flex flex-col gap-1.5 sm:gap-2 min-h-0">
          {/* PUNCH RED BUTTON */}
          <button
            id={`juri-punch-merah-${selectedJuriId}`}
            disabled={!matchState.timerRunning || isRoundOver}
            onClick={() => handleAction('MERAH', 'PUNCH')}
            className={`flex-1 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer select-none active:scale-95 duration-75 p-1 sm:p-2 ${
              matchState.timerRunning && !isRoundOver
                ? 'bg-gradient-to-b from-red-750 to-red-950 border-red-500 hover:from-red-700 shadow-lg shadow-red-500/20 text-white'
                : 'bg-slate-900/10 border-slate-950/50 opacity-20 cursor-not-allowed'
            }`}
          >
            <span className="text-sm sm:text-base md:text-2xl font-black tracking-widest uppercase text-red-200 score-glow-red sm:leading-tight">PUNCH</span>
            <span className="text-[8px] sm:text-[9px] md:text-[10px] text-red-300 font-bold tracking-wider mt-0.5 sm:mt-1 uppercase font-mono leading-none">(Pukulan: +1 Poin)</span>
          </button>

          {/* KICK RED BUTTON */}
          <button
            id={`juri-kick-merah-${selectedJuriId}`}
            disabled={!matchState.timerRunning || isRoundOver}
            onClick={() => handleAction('MERAH', 'KICK')}
            className={`flex-1 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer select-none active:scale-95 duration-75 p-1 sm:p-2 ${
              matchState.timerRunning && !isRoundOver
                ? 'bg-gradient-to-b from-red-800 to-red-950 border-red-600 hover:from-red-750 shadow-lg shadow-red-500/20 text-white'
                : 'bg-slate-900/10 border-slate-950/50 opacity-20 cursor-not-allowed'
            }`}
          >
            <span className="text-sm sm:text-base md:text-2xl font-black tracking-widest uppercase text-red-200 score-glow-red sm:leading-tight">KICK</span>
            <span className="text-[8px] sm:text-[9px] md:text-[10px] text-red-300 font-bold tracking-wider mt-0.5 sm:mt-1 uppercase font-mono leading-none">(Tendangan: +2 Poin)</span>
          </button>
        </section>

      </div>      {/* POP-UP: NOTIFIKASI VERIFIKASI DEWAN */}
      {activeVerification && !hasVotedForVerification && (
        <div className="absolute inset-0 z-45 bg-[#02050b]/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0a0f1d] border-2 border-amber-500 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
            
            <div className="inline-flex p-3 bg-amber-500/10 text-amber-500 rounded-full mb-3.5 shadow-md">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <h3 className="text-base font-black uppercase text-slate-100 tracking-widest leading-tight">
              VERIFIKASI DEWAN PERTANDINGAN
            </h3>
            
            <p className="text-[10px] text-amber-400 uppercase tracking-widest font-black bg-amber-500/10 py-2 rounded-lg border border-amber-500/20 my-3.5 font-mono">
              FORM VERIFIKASI: {activeVerification.type}
            </p>
            
            <p className="text-xs text-slate-400 mb-6 leading-relaxed font-sans">
              Dewan Pertandingan meminta Anda melakukan verifikasi keputusan kejadian tersebut. Pilihlah salah satu sudut atau Tidak Sah:
            </p>

            <div className="grid grid-cols-3 gap-3">
              <button
                id={`juri-vote-biru-${selectedJuriId}`}
                onClick={() => selectJuriVerificationVote(selectedJuriId, 'BIRU')}
                className="py-3 bg-blue-650 hover:bg-blue-600 text-white font-black text-xs rounded-xl uppercase transition-all duration-150 active:scale-95 cursor-pointer shadow-md border border-blue-500"
              >
                Sudut Biru
              </button>
              <button
                id={`juri-vote-merah-${selectedJuriId}`}
                onClick={() => selectJuriVerificationVote(selectedJuriId, 'MERAH')}
                className="py-3 bg-red-650 hover:bg-red-600 text-white font-black text-xs rounded-xl uppercase transition-all duration-150 active:scale-95 cursor-pointer shadow-md border border-red-500"
              >
                Sudut Merah
              </button>
              <button
                id={`juri-vote-taksah-${selectedJuriId}`}
                onClick={() => selectJuriVerificationVote(selectedJuriId, 'TIDAK_SAH')}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs rounded-xl uppercase transition-all duration-150 active:scale-95 cursor-pointer shadow-md border border-slate-700"
              >
                Tidak Sah
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: BLOCKED WITH WAITING OVERLAYS WHEN NOT ACTIVE */}
      {isRoundOver && (
        <div className="absolute inset-0 z-30 bg-[#02050b]/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0a0f1d] border border-red-950/40 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
            
            {isMatchOver ? (
              <>
                <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3.5 animate-[spin_4s_linear_infinite]" />
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wider font-sans">PERTANDINGAN SELESAI</h3>
                <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed font-sans">
                  Pertandingan Partai {matchState.settings.partai} telah berakhir sepenuhnya. Rekap akhir sedang dihimpun oleh Dewan dan Monitor.
                </p>
                <div className="inline-flex px-3 py-1.5 bg-yellow-500/10 text-yellow-400 rounded-lg border border-yellow-500/25 text-[10px] font-black uppercase tracking-widest font-mono">
                  Menunggu instruksi Sekretaris
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3.5" />
                <h3 className="text-base font-black text-slate-100 uppercase tracking-wider font-sans">BABAK {matchState.babakAktif} SELESAI</h3>
                <p className="text-xs text-slate-400 mt-2 mb-4 leading-relaxed font-sans">
                  Waktu babak ini telah habis. Tombol penilaian dimatikan sementara agar tidak terjadi pemencetan tak sengaja selama istirahat.
                </p>
                <div className="inline-flex px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/25 text-[10px] font-black uppercase tracking-widest font-mono">
                  Menunggu tombol Lanjut dari Sekretaris
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* POP-UP: WAITING PANEL IN JURI FOR THE VERY FIRST START BEFORE PLAY IS PRESSED */}
      {!matchState.timerRunning && matchState.waktuTersisa === matchState.settings.durasiBabak && (
        <div className="absolute inset-0 z-20 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-[#050914]/95 border border-slate-900 px-5 py-2.5 rounded-full shadow-lg">
            <span className="text-[9px] font-black tracking-widest text-[#93c5fd] uppercase animate-pulse font-mono block">
              MENUNGGU TIMER DI-MULAI OLEH SEKRETARIS...
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
