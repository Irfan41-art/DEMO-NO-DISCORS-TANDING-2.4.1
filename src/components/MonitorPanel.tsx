/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { MatchState } from '../types';
import { calculateCornerScores, calculateJuriRawHits } from '../utils/storage';
import { SilatFighterStance, IPSISilhouette } from './SilatSilhouettes';
import { Trophy, ShieldAlert, Award, Star, StarOff, HelpCircle, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { useJuriStatuses } from '../hooks/useJuriStatuses';

const IPSIColoredLogo = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Shield Background */}
    <polygon points="60,10 110,40 100,90 60,110 20,90 10,40" fill="#1b5e20" stroke="#ffeb3b" strokeWidth="3" />
    {/* Red Circle in the center */}
    <circle cx="60" cy="55" r="22" fill="#d50000" stroke="#ffffff" strokeWidth="2" />
    {/* White contour lines or details inside */}
    <path d="M60,10 L60,110" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" className="opacity-40" />
    <path d="M10,40 L110,40" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" className="opacity-40" />
    <path d="M20,90 L100,90" stroke="#ffffff" strokeWidth="1" strokeDasharray="3,3" className="opacity-40" />
    {/* Concentric crescent paths */}
    <path d="M42,55 Q60,32 78,55" fill="none" stroke="#ffeb3b" strokeWidth="2.5" />
    <path d="M42,55 Q60,78 78,55" fill="none" stroke="#ffeb3b" strokeWidth="2.5" />
    {/* Two crossed white silat blades (represented cleanly) */}
    <path d="M48,48 L72,72" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    <path d="M72,48 L48,72" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const PERSILATColoredLogo = ({ className = "w-16 h-16" }: { className?: string }) => (
  <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Outer Gold Circle */}
    <circle cx="60" cy="60" r="50" fill="#030612" stroke="#ffeb3b" strokeWidth="3.5" />
    <circle cx="60" cy="60" r="44" fill="#0d5c22" stroke="#ffffff" strokeWidth="1.5" />
    {/* Stylized Globe Latitude/Longitude */}
    <path d="M60,16 Q45,60 60,104" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
    <path d="M60,16 Q75,60 60,104" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
    <line x1="16" y1="60" x2="104" y2="60" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
    {/* Rising Sun Glow */}
    <circle cx="60" cy="60" r="14" fill="#d50000" stroke="#ffffff" strokeWidth="1.5" />
    {/* Crossed Golden Kris / Blades */}
    <path d="M45,75 Q60,60 75,45" fill="none" stroke="#ffeb3b" strokeWidth="3" strokeLinecap="round" />
    <path d="M75,75 Q60,60 45,45" fill="none" stroke="#ffeb3b" strokeWidth="3" strokeLinecap="round" />
    {/* Dynamic Laurels/Leaves framing */}
    <path d="M30,80 Q20,60 30,40" fill="none" stroke="#ffeb3b" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M90,80 Q100,60 90,40" fill="none" stroke="#ffeb3b" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const NoDiscorsLogo = () => (
  <div className="flex flex-col items-center justify-center mt-auto pt-3 pb-1 border-t border-slate-900/50 w-full shrink-0">
    {/* Styled Badge */}
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500/10 via-orange-500/15 to-yellow-500/10 border border-orange-500/35 rounded-xl shadow-[0_0_12px_rgba(249,115,22,0.1)]">
      {/* Icon portion: stylized shield */}
      <svg viewBox="0 0 24 24" className="w-4 h-4 text-orange-400 font-extrabold" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      {/* Text Brand */}
      <div className="flex flex-col leading-none text-left">
        <span className="text-[7px] font-black tracking-[0.25em] text-slate-400">BOARD SYSTEM</span>
        <span className="text-xs font-black tracking-wider italic text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]">
          NO DISCORS
        </span>
      </div>
    </div>
  </div>
);

const getMaxRounds = (kategoriUsia?: string): number => {
  const norm = (kategoriUsia || '').toUpperCase().trim();
  const isTwoRounds = [
    "PRA USIA DINI", "USIA DINI 1", "USIA DINI 2", "MASTER 1", "MASTER 2", "MASTER A", "MASTER B"
  ].includes(norm);
  return isTwoRounds ? 2 : 3;
};

interface MonitorPanelProps {
  matchState: MatchState;
}

export const MonitorPanel: React.FC<MonitorPanelProps> = ({ matchState }) => {
  const merahScores = calculateCornerScores(matchState, 'MERAH');
  const biruScores = calculateCornerScores(matchState, 'BIRU');
  const juriStatuses = useJuriStatuses();

  const getJuriStats = (corner: 'MERAH' | 'BIRU', juriIndex: number) => {
    let punches = 0;
    let kicks = 0;
    if (matchState.verifiedHits) {
      matchState.verifiedHits.forEach((hit) => {
        if (hit.corner === corner && hit.juriIndices?.includes(juriIndex)) {
          if (hit.action === 'PUNCH') punches++;
          if (hit.action === 'KICK') kicks++;
        }
      });
    }
    return { punches, kicks };
  };

  // Flash state for score changes
  const [flashMerah, setFlashMerah] = useState(false);
  const [flashBiru, setFlashBiru] = useState(false);
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

  const prevVerifiedHitsCount = React.useRef(matchState.verifiedHits.length);

  // Monitor the latest verified hits to trigger instant yellow glowing highlights
  useEffect(() => {
    const currentHitsCount = matchState.verifiedHits.length;
    if (currentHitsCount > prevVerifiedHitsCount.current) {
      const latestHit = matchState.verifiedHits[currentHitsCount - 1];
      if (latestHit) {
        if (latestHit.corner === 'MERAH') {
          setFlashMerah(true);
          const timer = setTimeout(() => setFlashMerah(false), 1200);
          return () => clearTimeout(timer);
        } else {
          setFlashBiru(true);
          const timer = setTimeout(() => setFlashBiru(false), 1200);
          return () => clearTimeout(timer);
        }
      }
    }
    prevVerifiedHitsCount.current = currentHitsCount;
  }, [matchState.verifiedHits]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isMatchFinished = matchState.matchEnded || (matchState.waktuTersisa === 0 && matchState.babakAktif === getMaxRounds(matchState.kategoriUsia));

  // Get Winner data
  let winnerCorner: 'MERAH' | 'BIRU' | null = null;
  let winnerName = '';
  let winnerKontingen = '';
  let winReason = '';

  if (isMatchFinished) {
    if (matchState.merah.disqualified) {
      winnerCorner = 'BIRU';
      winnerName = matchState.biru.atlit.nama;
      winnerKontingen = matchState.biru.atlit.kontingen;
      winReason = 'KEMENANGAN DISKUALIFIKASI SUDUT LAWAN';
    } else if (matchState.biru.disqualified) {
      winnerCorner = 'MERAH';
      winnerName = matchState.merah.atlit.nama;
      winnerKontingen = matchState.merah.atlit.kontingen;
      winReason = 'KEMENANGAN DISKUALIFIKASI SUDUT LAWAN';
    } else {
      const isRedWin = merahScores.totalScore > biruScores.totalScore;
      winnerCorner = isRedWin ? 'MERAH' : 'BIRU';
      winnerName = isRedWin ? matchState.merah.atlit.nama : matchState.biru.atlit.nama;
      winnerKontingen = isRedWin ? matchState.merah.atlit.kontingen : matchState.biru.atlit.kontingen;
      winReason = 'Kemenangan ANGKA';
    }
  }

  return (
    <div className="w-full flex flex-col h-screen select-none bg-gradient-to-b from-[#090b22] via-[#040411] to-[#010103] text-slate-100 p-2 md:p-4 overflow-hidden relative font-sans">
      
      {/* BACKGROUND GRAPHIC & LUMINOUS LIGHT CASTS */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(88,28,135,0.22)_0%,_rgba(15,23,42,0)_60%)] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/[0.04] rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/[0.04] rounded-full blur-[140px] pointer-events-none z-0" />
      
      <div className="absolute inset-x-0 bottom-0 top-1/4 opacity-[0.035] pointer-events-none flex justify-between px-20 z-0">
        <SilatFighterStance className="w-96 h-96 text-cyan-400 self-center" />
        <SilatFighterStance className="w-96 h-96 text-red-400 self-center transform scale-x-[-1]" />
      </div>

      {/* TOP HEADER BROADCAST BAR */}
      <header className="relative flex items-center justify-between bg-[#040714]/90 border border-amber-500/25 rounded-2xl p-4 shrink-0 mb-3 z-10 shadow-[0_0_25px_rgba(245,158,11,0.2)] overflow-hidden">
        {/* Glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ffd54f] to-transparent"></div>
        
        {/* Left corner spacer (Logo removed as requested) */}
        <div className="w-1/4 shrink-0" />

        {/* Center: Golden Neon Main Header */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
          <h1 className="text-base md:text-lg lg:text-xl xl:text-2xl font-black tracking-wide text-amber-200 uppercase drop-shadow-[0_0_15px_rgba(245,158,11,1)] drop-shadow-[0_0_35px_rgba(251,191,36,0.8)] filter drop-shadow-[0_0_3px_rgba(255,255,255,0.4)]">
            {matchState.settings.eventName || "KEJUARAAN NASIONAL PENCAK SILAT 2026"}
          </h1>
          <div className="text-xs md:text-sm font-extrabold text-[#ffd54f] mt-2.5 uppercase font-mono tracking-widest bg-amber-500/10 border border-amber-500/25 px-5 py-1.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.15)] select-none">
            PARTAI <span className="text-white font-black drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]">{String(matchState.settings.partai || matchState.partai || '4').toUpperCase().replace(/^PARTAI\s+/i, '').trim()}</span>
            <span className="mx-3 text-amber-500/40">|</span>
            KELAS <span className="text-white font-black drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]">{String(matchState.settings.kelasNomor || matchState.kelas || 'A').toUpperCase().replace(/^KELAS\s+/i, '').trim()}</span> 
            <span className="text-white font-bold"> ({String(matchState.settings.gender || matchState.gender || 'PUTRA').toUpperCase().trim()})</span> <span className="text-white font-black drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]">{String(matchState.kategoriUsia || matchState.settings.kategoriUsia || 'REMAJA').toUpperCase().trim()}</span>
            <span className="mx-3 text-amber-500/40">|</span>
            <span className="text-white font-black drop-shadow-[0_0_6px_rgba(255,255,255,0.85)]">{String(matchState.tahapPertandingan || matchState.settings.tahapPertandingan || 'PENYISIHAN').toUpperCase().trim()}</span>
          </div>
        </div>

        {/* Right corner: Small Fullscreen Expansion Button only */}
        <div className="flex items-center justify-end w-1/4 shrink-0 relative">
          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-[#02050c]/85 hover:bg-slate-800/80 border border-slate-700/80 hover:border-slate-500 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer active:scale-90 shadow-md"
            title={isFullscreen ? 'Layar Normal' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ATHLETE MATCH DETAILS & SCORE CORE */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 overflow-hidden relative z-10">

        {/* BLUE SIDE (SUDUT BIRU - LEFT SIDE) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col bg-[#050b18]/90 border-2 border-cyan-400/25 rounded-3xl p-4 justify-between overflow-hidden relative shadow-[0_0_25px_rgba(0,240,255,0.15)]">
          {/* Header SUDUT BIRU with glowing neon blue bg */}
          <div className="bg-[#0c3156] text-white py-2.5 px-4 rounded-xl shadow-[0_0_25px_rgba(6,182,212,0.95)] border-2 border-[#00f3ff] text-center uppercase tracking-[0.25em] font-black shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-cyan-400/25 blur opacity-90 animate-pulse"></div>
            <span className="relative z-10 text-white text-base drop-shadow-[0_0_12px_rgba(0,243,255,1)] font-sans">
              SUDUT BIRU
            </span>
          </div>

          {/* Giant Scoreboard Custom Glowing numbers */}
          <div className="flex-1 flex flex-col items-center justify-center my-2 relative">
            {/* Luminous cyan bloom light cast spreading into surroundings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/20 rounded-full blur-[90px] pointer-events-none -z-10 animate-pulse" />
            
            <div
              id="monitor-score-biru"
              className={`relative z-10 text-[12rem] lg:text-[15rem] font-mono leading-none select-none font-black transition-all duration-300 w-full text-center flex items-center justify-center h-64 md:h-80 shadow-[0_0_50px_rgba(0,243,255,0.2)] rounded-3xl ${
                flashBiru
                  ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-[0_0_80px_rgba(245,158,11,1)] scale-105'
                  : 'bg-[#02050c]/90 border-2 border-[#00f3ff]/40 text-[#00f3ff] drop-shadow-[0_0_35px_rgba(0,243,255,1)] drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] score-glow-blue'
              }`}
            >
              {biruScores.totalScore}
            </div>
          </div>

          {/* Athlete Info: Name & Asal at the bottom of the column */}
          <div className="bg-[#02050c]/90 border border-cyan-500/15 rounded-2xl p-3 mb-3 shadow-[inset_0_0_15px_rgba(6,182,212,0.08)] text-center shrink-0">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase truncate leading-none mb-1.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]">
              {matchState.biru.atlit.nama || 'LADUSING'}
            </h2>
            <span className="text-xs font-black text-[#00f3ff] block tracking-widest uppercase font-mono leading-none drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]">
              {matchState.biru.atlit.kontingen || 'IPSI ISILOP'}
            </span>
          </div>

          {/* REKAP TABLES ROW at the bottom */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* Table 1: PELANGGARAN (BIRU) */}
            <div className="bg-[#02050c]/95 border border-[#00f3ff]/25 rounded-xl p-2.5 font-mono text-xs shadow-[inset_0_0_12px_rgba(6,182,212,0.08)]">
              <div className="text-[9.5px] font-black text-[#00f3ff] mb-2 uppercase tracking-wider text-center drop-shadow-[0_0_8px_rgba(0,243,255,0.85)]">
                PELANGGARAN (BIRU)
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#00f3ff]/20 text-[8px] text-slate-400">
                    <th className="py-0.5 font-extrabold">HUKUMAN</th>
                    <th className="py-0.5 text-center font-extrabold">T. 1</th>
                    <th className="py-0.5 text-center font-extrabold">T. 2</th>
                  </tr>
                </thead>
                <tbody className="text-[9.5px]">
                  <tr className="border-b border-slate-900/60">
                    <td className="py-1 font-extrabold text-[#00f3ff]/90 uppercase text-[9px]">BINAAN</td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.biru.penalties.binaan1 ? 'bg-[#00f3ff] shadow-[0_0_12px_rgba(0,243,255,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.biru.penalties.binaan2 ? 'bg-[#00f3ff] shadow-[0_0_12px_rgba(0,243,255,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                  </tr>
                  <tr className="border-b border-slate-900/60">
                    <td className="py-1 font-extrabold text-[#00f3ff]/90 uppercase text-[9px]">TEGURAN</td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.biru.penalties.teguran1 ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.biru.penalties.teguran2 ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 font-extrabold text-[#00f3ff]/90 uppercase text-[9px]">PERINGATAN</td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.biru.penalties.peringatan1 ? 'bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.biru.penalties.peringatan2 ? 'bg-indigo-400 shadow-[0_0_12px_rgba(129,140,248,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table 2: REKAP JURI (BIRU) */}
            <div className="bg-[#02050c]/95 border border-[#00f3ff]/25 rounded-xl p-2.5 font-mono text-xs shadow-[inset_0_0_12px_rgba(6,182,212,0.08)]">
              <div className="text-[9.5px] font-black text-[#00f3ff] mb-2 uppercase tracking-wider text-center drop-shadow-[0_0_8px_rgba(0,243,255,0.85)]">
                REKAP JURI (BIRU)
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#00f3ff]/20 text-[8px] text-slate-400">
                    <th className="py-0.5 font-extrabold">JURI</th>
                    <th className="py-0.5 text-center font-extrabold">PUNCH</th>
                    <th className="py-0.5 text-center font-extrabold">KICK</th>
                  </tr>
                </thead>
                <tbody className="text-[9.5px]">
                  {([1, 2, 3] as const).map((jId) => {
                    const stats = getJuriStats('BIRU', jId);
                    return (
                      <tr key={jId} className="border-b border-slate-900/40 last:border-b-0">
                        <td className="py-1 font-extrabold text-slate-300 uppercase">JURI {jId}</td>
                        <td className="py-1 text-center text-[#00f3ff] text-base font-black drop-shadow-[0_0_8px_rgba(0,243,255,0.95)]">{stats.punches}</td>
                        <td className="py-1 text-center text-[#00f3ff] text-base font-black drop-shadow-[0_0_8px_rgba(0,243,255,0.95)]">{stats.kicks}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* MIDDLE SECTION: CENTRAL PANEL WITH SCOREBOARD CLOCK & BRANDING */}
        <section className="col-span-12 lg:col-span-2 flex flex-col items-center justify-between bg-[#040816]/70 border border-slate-800/80 rounded-3xl p-3 shadow-inner overflow-hidden">
          {/* Colored Dynamically Selected Central Logo */}
          <div className="flex justify-center items-center h-16 w-16 shrink-0 mb-3 mt-1">
            {(!matchState.settings.logoCentral || matchState.settings.logoCentral === 'IPSI') ? (
              <IPSIColoredLogo className="w-16 h-16 filter drop-shadow-[0_0_10px_rgba(255,235,59,0.55)]" />
            ) : matchState.settings.logoCentral === 'PERSILAT' ? (
              <PERSILATColoredLogo className="w-16 h-16 filter drop-shadow-[0_0_10px_rgba(255,193,7,0.55)]" />
            ) : (
              <img
                src={matchState.settings.logoCentral}
                alt="Central Logo"
                className="w-16 h-16 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {/* TIMER Label */}
          <span className="text-[11px] tracking-[0.25em] font-black text-amber-500/90 uppercase text-center block font-mono leading-none shrink-0 mb-1 lg:mb-2 drop-shadow-[0_0_5px_rgba(245,158,11,0.35)]">
            TIMER
          </span>

          {/* Huge vibrant molten gold timer with overwhelming neon glow */}
          <div className="text-center font-mono font-black text-4xl lg:text-5xl tracking-[0.12em] text-[#ffea00] drop-shadow-[0_0_22px_rgba(245,158,11,1)] drop-shadow-[0_0_8px_rgba(253,224,71,0.95)] select-none shrink-0 mb-6 py-3 border-y border-amber-500/25 w-full bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
            {formatTime(matchState.waktuTersisa)}
          </div>

          {/* ACTIVE ROUND Label */}
          <span className="text-[11px] tracking-[0.25em] font-black text-slate-400 uppercase text-center block font-mono leading-none shrink-0 mb-2">
            BABAK AKTIF
          </span>

          {/* Style vertical round chooser with high magenta-purple neon effects */}
          <div className="flex flex-col gap-2.5 w-full mb-4 shrink-0 px-1 font-mono">
            {Array.from({ length: getMaxRounds(matchState.kategoriUsia) }, (_, i) => i + 1).map((b) => {
              const isCurrent = b === matchState.babakAktif;
              return (
                <div
                  key={b}
                  className={`py-2.5 rounded-xl text-center text-xs font-black tracking-widest transition-all uppercase leading-none border-2 duration-300 ${
                    isCurrent
                      ? 'bg-[#400e2a] border-[#f43f5e] text-[#fdf4ff] shadow-[0_0_20px_rgba(244,63,94,0.75)] drop-shadow-[0_0_10px_rgba(217,70,239,0.85)] scale-[1.05]'
                      : 'bg-[#090b14]/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-600'
                  }`}
                >
                  BABAK {b}
                </div>
              );
            })}
          </div>

          {/* VERIFIKASI MONITOR SCREEN */}
          {matchState.verificationRequest && (
            <div className="bg-amber-500/10 border border-amber-500/60 rounded-xl p-1.5 text-center animate-bounce shadow-[0_0_12px_rgba(245,158,11,0.2)] shrink-0 w-full mb-2">
              <span className="text-[7.5px] text-amber-500 font-extrabold tracking-widest block font-mono uppercase animate-pulse leading-none mb-0.5">VERIFIKASI</span>
              <span className="inline-block px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[8px] font-black rounded uppercase font-mono leading-none">
                {matchState.verificationRequest.type}
              </span>
            </div>
          )}

          {/* NO DISCORS Logo Branding */}
          <NoDiscorsLogo />
        </section>

        {/* RED SIDE (SUDUT MERAH - RIGHT SIDE) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col bg-[#14050a]/90 border-2 border-red-500/25 rounded-3xl p-4 justify-between overflow-hidden relative shadow-[0_0_25px_rgba(239,68,68,0.15)]">
          {/* Header SUDUT MERAH with glowing neon red bg */}
          <div className="bg-[#560c18] text-white py-2.5 px-4 rounded-xl shadow-[0_0_25px_rgba(239,68,68,0.95)] border-2 border-[#ff2a51] text-center uppercase tracking-[0.25em] font-black shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-red-400/25 blur opacity-90 animate-pulse"></div>
            <span className="relative z-10 text-white text-base drop-shadow-[0_0_12px_rgba(255,42,81,1)] font-sans">
              SUDUT MERAH
            </span>
          </div>

          {/* Giant Scoreboard Custom Glowing numbers */}
          <div className="flex-1 flex flex-col items-center justify-center my-2 relative">
            {/* Crimson laser bloom light cast spreading into surroundings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-red-500/20 rounded-full blur-[90px] pointer-events-none -z-10 animate-pulse" />
            
            <div
              id="monitor-score-merah"
              className={`relative z-10 text-[12rem] lg:text-[15rem] font-mono leading-none select-none font-black transition-all duration-300 w-full text-center flex items-center justify-center h-64 md:h-80 shadow-[0_0_50px_rgba(239,68,68,0.2)] rounded-3xl ${
                flashMerah
                  ? 'bg-amber-400 border-amber-300 text-slate-950 shadow-[0_0_80px_rgba(245,158,11,1)] scale-105'
                  : 'bg-[#02050c]/95 border-2 border-[#ff2a51]/40 text-[#ff2a51] drop-shadow-[0_0_35px_rgba(255,42,81,1)] drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] score-glow-red'
              }`}
            >
              {merahScores.totalScore}
            </div>
          </div>

          {/* Athlete Info: Name & Asal at the bottom of the column */}
          <div className="bg-[#02050c]/90 border border-red-500/15 rounded-2xl p-3 mb-3 shadow-[inset_0_0_15px_rgba(239,68,68,0.08)] text-center shrink-0">
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase truncate leading-none mb-1.5 drop-shadow-[0_0_10px_rgba(255,255,255,0.15)]">
              {matchState.merah.atlit.nama || 'LAPESO'}
            </h2>
            <span className="text-xs font-black text-[#ff2a51] block tracking-widest uppercase font-mono leading-none drop-shadow-[0_0_8px_rgba(255,42,81,0.6)]">
              {matchState.merah.atlit.kontingen || 'IPSI HUNTER'}
            </span>
          </div>

          {/* REKAP TABLES ROW at the bottom (Berpola Mirror) */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* Table 1: REKAP JURI (MERAH) */}
            <div className="bg-[#02050c]/95 border border-[#ff2a51]/25 rounded-xl p-2.5 font-mono text-xs shadow-[inset_0_0_12px_rgba(239,68,68,0.08)]">
              <div className="text-[9.5px] font-black text-[#ff2a51] mb-2 uppercase tracking-wider text-center drop-shadow-[0_0_8px_rgba(255,42,81,0.85)]">
                REKAP JURI (MERAH)
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#ff2a51]/20 text-[8px] text-slate-400">
                    <th className="py-0.5 font-extrabold">JURI</th>
                    <th className="py-0.5 text-center font-extrabold">PUNCH</th>
                    <th className="py-0.5 text-center font-extrabold">KICK</th>
                  </tr>
                </thead>
                <tbody className="text-[9.5px]">
                  {([1, 2, 3] as const).map((jId) => {
                    const stats = getJuriStats('MERAH', jId);
                    return (
                      <tr key={jId} className="border-b border-slate-900/40 last:border-b-0">
                        <td className="py-1 font-extrabold text-slate-300 uppercase">JURI {jId}</td>
                        <td className="py-1 text-center text-[#ff2a51] text-base font-black drop-shadow-[0_0_8px_rgba(255,42,81,0.95)]">{stats.punches}</td>
                        <td className="py-1 text-center text-[#ff2a51] text-base font-black drop-shadow-[0_0_8px_rgba(255,42,81,0.95)]">{stats.kicks}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table 2: PELANGGARAN (MERAH) */}
            <div className="bg-[#02050c]/95 border border-[#ff2a51]/25 rounded-xl p-2.5 font-mono text-xs shadow-[inset_0_0_12px_rgba(239,68,68,0.08)]">
              <div className="text-[9.5px] font-black text-[#ff2a51] mb-2 uppercase tracking-wider text-center drop-shadow-[0_0_8px_rgba(255,42,81,0.85)]">
                PELANGGARAN (MERAH)
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#ff2a51]/20 text-[8px] text-slate-400">
                    <th className="py-0.5 font-extrabold">HUKUMAN</th>
                    <th className="py-0.5 text-center font-extrabold">T. 1</th>
                    <th className="py-0.5 text-center font-extrabold">T. 2</th>
                  </tr>
                </thead>
                <tbody className="text-[9.5px]">
                  <tr className="border-b border-slate-900/60">
                    <td className="py-1 font-extrabold text-[#ff2a51]/90 uppercase text-[9px]">BINAAN</td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.merah.penalties.binaan1 ? 'bg-[#ff2a51] shadow-[0_0_12px_rgba(255,42,81,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.merah.penalties.binaan2 ? 'bg-[#ff2a51] shadow-[0_0_12px_rgba(255,42,81,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                  </tr>
                  <tr className="border-b border-slate-900/60">
                    <td className="py-1 font-extrabold text-[#ff2a51]/90 uppercase text-[9px]">TEGURAN</td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.merah.penalties.teguran1 ? 'bg-red-400 shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.merah.penalties.teguran2 ? 'bg-red-400 shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 font-extrabold text-[#ff2a51]/90 uppercase text-[9px]">PERINGATAN</td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.merah.penalties.peringatan1 ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                    <td className="py-1 text-center">
                      <span className={`inline-block w-3 h-3 rounded-full ${matchState.merah.penalties.peringatan2 ? 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,1)] animate-pulse' : 'bg-slate-800'}`} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>

      {/* STUNNING VICTORY OVERLAY CHAMPION POPUP */}
      {isMatchFinished && (
        <div className="absolute inset-0 z-50 bg-[#03060f]/95 backdrop-blur flex flex-col justify-center items-center p-4">
          <div className="text-center space-y-6 max-w-xl bg-[#0a0f1d] p-8 rounded-3xl border-2 border-[#f59e0b] shadow-2xl shadow-yellow-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent animate-pulse"></div>
            
            <div className="flex justify-center">
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/40 rounded-full animate-bounce shadow-neon">
                <Trophy className="w-16 h-16 text-yellow-500" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black tracking-widest bg-amber-500 text-slate-950 px-3 py-1 rounded-full uppercase font-mono">
                PERTANDINGAN SELESAI
              </span>
              <h3 className="text-2xl font-black text-slate-100 uppercase tracking-widest mt-2">HASIL KEPUTUSAN JUARA</h3>
            </div>

            <div className={`p-6 rounded-2xl border-2 text-center shadow-lg ${
              winnerCorner === 'MERAH' ? 'bg-[#0f070a] border-red-500/30 text-red-400' : 'bg-[#070d1a] border-blue-500/30 text-blue-400'
            }`}>
              <span className="text-[10px] font-mono block uppercase tracking-wider mb-2 text-slate-400 font-bold">PEMENANG SUDUT {winnerCorner}</span>
              <h4 className="text-3xl font-black tracking-wide uppercase leading-none">{winnerName}</h4>
              <p className="text-sm font-bold text-slate-300 mt-2 tracking-wide truncate">{winnerKontingen}</p>
            </div>

            <p className="text-xs font-black text-amber-400 uppercase tracking-widest font-mono">
              {winReason}
            </p>

            <p className="text-[10px] text-slate-400 leading-relaxed max-w-sm mx-auto font-bold">
              Sistem digital score sheet secara sah merekam keputusan ini dalam database sekretaris juri. Anda diperkenankan menutup dan mereset layar gelanggang pertandingan.
            </p>
          </div>
        </div>
      )}

    </div>
  );
};
