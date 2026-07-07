/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MatchState } from '../types';
import { calculateCornerScores, calculateJuriRawHits } from '../utils/storage';
import { Gavel, Play, Pause, RefreshCw, CheckCircle, XCircle, AlertTriangle, HelpCircle, Maximize2, Minimize2, Tv } from 'lucide-react';
import { playClickSound } from '../utils/audio';
import { useJuriStatuses } from '../hooks/useJuriStatuses';

interface DewanPanelProps {
  matchState: MatchState;
  toggleDewanPenalty: (corner: 'MERAH' | 'BIRU', penaltyKey: 'binaan1' | 'binaan2' | 'teguran1' | 'teguran2' | 'peringatan1' | 'peringatan2') => void;
  applyDewanJatuhan: (corner: 'MERAH' | 'BIRU', changeType: 'ADD' | 'SUBTRACT') => void;
  setDisqualifiedState: (corner: 'MERAH' | 'BIRU', active: boolean) => void;
  initiateVerification: (type: 'JATUHAN' | 'PELANGGARAN') => void;
  clearVerificationRequest: () => void;
  onBackToLanding?: () => void;
}

// Bespoke Hand Gesture Silhouettes drawn as high-fidelity SVGs 
const Binaan1Icon = () => (
  <svg viewBox="0 0 48 48" className="w-[18px] h-[18px] fill-current">
    {/* Side pointing 1 finger */}
    <path d="M12 20h10a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2zm14 2h14v4H26v-4zM8 12c-2.2 0-4 1.8-4 4s1.8 4 4 4h4v-8H8z" />
    <path d="M4 32h40v4H4z" opacity="0.3" />
  </svg>
);

const Binaan2Icon = () => (
  <svg viewBox="0 0 48 48" className="w-[18px] h-[18px] fill-current">
    {/* Side pointing 2 fingers */}
    <path d="M10 16h8a2 2 0 0 1 2 2v2h4v-2h8a2 2 0 0 1 2 2v6H10v-10zm24 6h10v4H34v-4zm-24 6h28v4H10v-4z" />
    <path d="M4 36h40v3H4z" opacity="0.3" />
  </svg>
);

const Teguran1Icon = () => (
  <svg viewBox="0 0 48 48" className="w-[18px] h-[18px] fill-current">
    {/* Upward pointing 1 finger */}
    <path d="M22 10h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V12a2 2 0 0 1 2-2zm-6 16h16v4H16v-4zm-4 10h24v4H12v-4z" />
    <circle cx="24" cy="6" r="3" />
  </svg>
);

const Teguran2Icon = () => (
  <svg viewBox="0 0 48 48" className="w-[18px] h-[18px] fill-current">
    {/* Upward pointing 2 fingers */}
    <path d="M18 8h3a1 1 0 0 1 1 1v12h4V9a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v16H18V8zm-6 20h24v4H12v-4zm4 8h16v4H16v-4z" />
  </svg>
);

const Peringatan1Icon = () => (
  <svg viewBox="0 0 48 48" className="w-[18px] h-[18px] fill-current">
    {/* Holding wrist with number 1 */}
    <path d="M12 28h12v12H12V28zm14 4h4v4h-4v-4zM24 16h6v12h-6V16zm-10-6h18v4H14v-4z" />
    <rect x="14" y="30" width="8" height="8" rx="1" opacity="0.4" />
    <text x="18" y="37" fontSize="10" fontWeight="bold" fill="currentColor" textAnchor="middle">1</text>
  </svg>
);

const Peringatan2Icon = () => (
  <svg viewBox="0 0 48 48" className="w-[18px] h-[18px] fill-current">
    {/* Holding wrist with number 2 */}
    <path d="M10 24h28v18H10V24zm4 4v10h12V28H14zm16-16h4v10h-4V12zm-12-6h8v4h-8V6z" />
    <text x="20" y="36" fontSize="10" fontWeight="bold" fill="black" textAnchor="middle">2</text>
  </svg>
);

const DiskIcon = () => (
  <svg viewBox="0 0 48 48" className="w-[18px] h-[18px] fill-current">
    <path d="M24 4C12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20S35.05 4 24 4zm10 22H14v-4h20v4z" />
    <text x="24" y="18" fontSize="6" fontWeight="extrabold" fill="currentColor" textAnchor="middle">DISK</text>
  </svg>
);

export const DewanPanel: React.FC<DewanPanelProps> = ({
  matchState,
  toggleDewanPenalty,
  applyDewanJatuhan,
  setDisqualifiedState,
  initiateVerification,
  clearVerificationRequest,
  onBackToLanding,
}) => {
  const [activeVerifType, setActiveVerifType] = useState<'JATUHAN' | 'PELANGGARAN' | null>(null);
  const juriStatuses = useJuriStatuses();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVarChecking, setIsVarChecking] = useState(false);

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

  // Calculate detailed scores
  const merahScores = calculateCornerScores(matchState, 'MERAH');
  const biruScores = calculateCornerScores(matchState, 'BIRU');

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyRequest = (type: 'JATUHAN' | 'PELANGGARAN') => {
    setActiveVerifType(type);
    initiateVerification(type);
  };

  // Helper to extract a Juri's latest press in the last 1.5s for the real-time display
  const getJuriLatestPress = (juriId: 1 | 2 | 3) => {
    const logs = matchState.juriPressHistory.filter((l) => l.juriId === juriId);
    if (logs.length === 0) return null;
    const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
    const latest = sorted[0];
    const isRecent = Date.now() - latest.timestamp < 1500;
    if (isRecent) {
      return latest;
    }
    return null;
  };

  // Inline table components for transparent scoreboard ledger
  const TableLabel = ({ children }: { children: React.ReactNode }) => (
    <th className="px-1.5 py-1 text-center font-mono text-[8px] font-black text-slate-400 border border-slate-900/65 bg-black/45">
      {children}
    </th>
  );

  const TableCell = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <td className={`px-1.5 py-0.5 text-center font-mono text-[9px] border border-slate-900/65 font-semibold ${className}`}>
      {children}
    </td>
  );

  return (
    <div className="w-full flex flex-col h-screen select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1B113B] via-[#090514] to-[#030207] text-[#f1f5f9] p-3 overflow-hidden relative font-sans">
      
      {/* Immersive Cyber-Noir Radial Light Casts */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-indigo-500/10 rounded-full filter blur-[150px] pointer-events-none select-none z-0"></div>
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[300px] bg-[#7F00FF]/5 rounded-full filter blur-[130px] pointer-events-none select-none z-0"></div>
      <div className="absolute -bottom-20 left-10 w-[300px] h-[300px] bg-[#FF1E27]/4 rounded-full filter blur-[120px] pointer-events-none select-none z-0"></div>
      <div className="absolute -bottom-20 right-10 w-[300px] h-[300px] bg-[#00E5FF]/4 rounded-full filter blur-[120px] pointer-events-none select-none z-0"></div>

      {/* Immersive VAR Checking Overlay */}
      {isVarChecking && (
        <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-6 select-none border-4 border-[#7A4A00]/50 shadow-[0_0_50px_rgba(122,74,0,0.25)]">
          <div className="max-w-xl text-center space-y-6">
            <div className="inline-block p-4 rounded-full bg-[#7A4A00]/25 border-2 border-[#7A4A00] shadow-[0_0_30px_rgba(122,74,0,0.5)] animate-bounce">
              <Tv className="w-14 h-14 text-amber-500" />
            </div>
            <h2 className="text-3xl font-black text-amber-500 uppercase tracking-widest font-orbitron">TINJAUAN RECOK VAR</h2>
            <p className="text-sm text-slate-300 font-extrabold tracking-wide leading-relaxed uppercase">
              Sistem dewan sedang memutar ulang rekaman video dari beberapa sudut kamera (multi-angle) untuk peninjauan bukti kejadian juri.
            </p>
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF1E27] animate-pulse"></span>
                <span className="text-xs font-black text-slate-400 font-mono tracking-widest">LIVE PLAYBACK DEWAN JURI</span>
              </div>
              <div className="px-6 py-2 border border-slate-800 bg-[#1C1C24] rounded-xl text-xs font-mono font-black text-[#00E5FF] tracking-wider uppercase mt-4">
                Status: Dewan Hakim Sedang Menganalisis VAR
              </div>
            </div>
            <button
              onClick={() => {
                playClickSound();
                setIsVarChecking(false);
              }}
              className="px-8 py-3 rounded-xl bg-[#7A4A00] hover:bg-[#995c00] text-white font-extrabold text-xs tracking-widest cursor-pointer uppercase transition-all"
            >
              SELESAI TINJAUAN / KEMBALI
            </button>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="flex items-center justify-between border-b border-purple-500/15 pb-2 mb-2 shrink-0 relative z-10 bg-black/30 px-3 py-2 rounded-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playClickSound();
              if (onBackToLanding) onBackToLanding();
            }}
            className="px-3 py-1.5 bg-[#13141F] hover:bg-purple-950/40 text-[10px] font-black text-purple-300 tracking-wider hover:text-white rounded border border-purple-900/30 transition cursor-pointer"
          >
            ← BERANDA
          </button>
          <div>
            <h1 className="text-xs font-black text-amber-500 font-mono tracking-widest uppercase drop-shadow-[0_0_10px_rgba(245,158,11,0.2)]">PANEL UTAMA DEWAN HAKIM</h1>
            <p className="text-[9px] text-purple-300 font-mono tracking-wider uppercase truncate max-w-xs">{matchState.settings.eventName || "KEJUARAAN SILAT"}</p>
          </div>
        </div>

        {/* METADATA SUMMARY */}
        <div className="hidden md:flex items-center gap-3 bg-black/40 px-4 py-1.5 rounded-xl border border-purple-900/30 shadow-[0_0_15px_rgba(110,0,255,0.05)]">
          <div className="text-right">
            <span className="text-[8px] text-slate-400 font-mono block tracking-wider uppercase font-black">PARTAI {matchState.settings.partai}</span>
            <span className="text-[10px] font-black text-[#00E5FF] uppercase tracking-wide font-mono leading-none drop-shadow-[0_0_5px_rgba(0,229,255,0.3)]">{matchState.settings.babakSeksi} | {matchState.settings.kelasNomor}</span>
          </div>
          <div className="w-px h-5 bg-purple-950/50"></div>
          <div className="text-[10px] font-black text-purple-200 font-mono uppercase tracking-widest">
            {matchState.settings.gender}
          </div>
        </div>

        {/* FULLSCREEN BUTTON */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1BB55C]/10 hover:bg-[#1BB55C]/20 text-[10px] font-black text-[#1BB55C] tracking-wider rounded border border-[#1BB55C]/20 transition cursor-pointer select-none active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isFullscreen ? 'LAYAR NORMAL' : 'LAYAR PENUH'}
          </button>
          <Gavel className="w-4 h-4 text-amber-500 animate-pulse drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
          <span className="text-xs font-black text-slate-350 font-mono tracking-wider uppercase underline decoration-amber-500/50">DEWAN</span>
        </div>
      </header>

      {/* THREE SYMMETRICAL COLUMNS (38% Kiri : 24% Tengah : 38% Kanan) */}
      <div className="flex-1 grid gap-3 min-h-0 overflow-hidden relative z-10" style={{ gridTemplateColumns: '38% 24% 38%' }}>
        
        {/* ================= COLUMN 1 (LEFT): SUDUT MERAH (38%) ================= */}
        <section className="flex flex-col bg-[#05040B]/85 backdrop-blur-md border border-[#FF1E27]/30 rounded-2xl p-2.5 overflow-hidden shadow-[0_0_20px_rgba(255,30,39,0.12)] justify-between min-h-0 relative">
          
          <div className="flex flex-col min-h-0">
            {/* Header Sudut Merah */}
            <div className="flex justify-between items-baseline shrink-0 border-b border-[#FF1E27]/20 pb-1 mb-1.5">
              <span className="text-[10px] font-black tracking-widest text-[#FF1E27] font-mono drop-shadow-[0_0_4px_rgba(255,30,39,0.4)]">SUDUT MERAH</span>
              <div className="text-right">
                <h2 className="text-sm md:text-base font-black text-white leading-tight uppercase tracking-wider">
                  {matchState.merah.atlit.nama || 'ATLIT MERAH'}
                </h2>
                <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase">({matchState.merah.atlit.kontingen})</span>
              </div>
            </div>

            {/* Display Skor Utama Merah (120pt-150pt layout glow on dark with watermark) */}
            <div className="relative flex items-center justify-center py-3 bg-black/60 border border-[#FF1E27]/30 rounded-xl overflow-hidden min-h-[120px] md:min-h-[150px] shrink-0 select-none shadow-[inset_0_0_20px_rgba(255,30,39,0.15)]">
              {/* Soft background red glow */}
              <div className="absolute w-[200px] h-[200px] bg-[#FF1E27]/8 filter blur-3xl rounded-full"></div>
              {/* Opacity 5-10% watermark */}
              <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                <span className="text-4xl md:text-5xl font-black text-[#FF1E27] tracking-widest opacity-[0.06] uppercase font-orbitron">MERAH</span>
              </div>
              {/* Giant Score digit with neon text glow */}
              <span className="relative text-7xl md:text-8xl font-black text-[#FF1E27] tracking-tighter leading-none font-orbitron drop-shadow-[0_0_20px_rgba(255,18,34,0.7)]">
                {merahScores.totalScore}
              </span>
            </div>

            {/* Symmetrical Mirrored 3x3 Grid (Red K-K: Jatuhan +3 -> Binaan 2 -> Binaan 1) */}
            <div className="grid grid-cols-3 gap-2 my-2 shrink-0">
              {/* Column 1: Jatuhan controls & Diskualifikasi */}
              <div className="flex flex-col gap-1.5 justify-between">
                {/* Jatuhan +3 (Hijau #008744) */}
                <button
                  onClick={() => {
                    playClickSound();
                    applyDewanJatuhan('MERAH', 'ADD');
                  }}
                  className="flex-1 min-h-[46px] rounded-xl bg-[#008744] hover:bg-[#009e4f] text-white font-black text-xs flex flex-col items-center justify-center cursor-pointer transition border border-emerald-500/30 shadow-[0_0_12px_rgba(0,135,68,0.25)] active:scale-95"
                >
                  <span className="text-[8px] font-bold opacity-90 leading-none">JATUHAN</span>
                  <span className="text-base leading-none font-extrabold font-orbitron mt-0.5">+3</span>
                </button>
                {/* Batal Jatuhan (Cokelat #7A4A00) */}
                <button
                  disabled={matchState.merah.jatuhanScore === 0}
                  onClick={() => {
                    playClickSound();
                    applyDewanJatuhan('MERAH', 'SUBTRACT');
                  }}
                  className={`min-h-[34px] rounded-xl text-[9px] font-black uppercase border flex items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.merah.jatuhanScore === 0
                      ? 'bg-black/20 border-slate-900 text-slate-600 cursor-not-allowed opacity-30'
                      : 'bg-[#7A4A00] hover:bg-[#8f5600] border-amber-800/40 text-amber-100 shadow-[0_0_10px_rgba(122,74,0,0.2)]'
                  }`}
                >
                  BATAL JTH
                </button>
                {/* Diskualifikasi (Maroon / Magenta #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    setDisqualifiedState('MERAH', !matchState.merah.disqualified);
                  }}
                  className={`min-h-[34px] rounded-xl text-[9px] font-black uppercase border flex items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.merah.disqualified
                      ? 'bg-[#FF1E27] border-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100 shadow-sm'
                  }`}
                >
                  DISK
                </button>
              </div>

              {/* Column 2: Level II Penalties */}
              <div className="flex flex-col gap-1.5 justify-between">
                {/* Binaan II (Abu-abu Gelap #1C1C24 / Active: Kuning-Amber #D97706) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('MERAH', 'binaan2');
                  }}
                  className={`flex-1 min-h-[46px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.merah.penalties.binaan2
                      ? 'bg-[#D97706] border-amber-400 text-black font-black shadow-[0_0_12px_rgba(217,119,6,0.4)]'
                      : 'bg-[#191924] border-slate-800/50 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <Binaan2Icon />
                  <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">BINAAN II</span>
                </button>
                {/* Teguran II (Maroon #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('MERAH', 'teguran2');
                  }}
                  className={`min-h-[34px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.merah.penalties.teguran2
                      ? 'bg-[#FF1E27] border-red-400 text-white font-black shadow-[0_0_12px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider">TEGURAN II (-2)</span>
                </button>
                {/* Peringatan II (Maroon #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('MERAH', 'peringatan2');
                  }}
                  className={`min-h-[34px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.merah.penalties.peringatan2
                      ? 'bg-[#FF1E27] border-red-400 text-white font-black shadow-[0_0_12px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wide">PERINGATAN II (-10)</span>
                </button>
              </div>

              {/* Column 3: Level 1 Penalties */}
              <div className="flex flex-col gap-1.5 justify-between">
                {/* Binaan I (Abu-abu Gelap #1C1C24 / Active: Kuning-Amber #D97706) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('MERAH', 'binaan1');
                  }}
                  className={`flex-1 min-h-[46px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.merah.penalties.binaan1
                      ? 'bg-[#D97706] border-amber-400 text-black font-black shadow-[0_0_12px_rgba(217,119,6,0.4)]'
                      : 'bg-[#191924] border-slate-800/50 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <Binaan1Icon />
                  <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">BINAAN I</span>
                </button>
                {/* Teguran I (Maroon #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('MERAH', 'teguran1');
                  }}
                  className={`min-h-[34px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.merah.penalties.teguran1
                      ? 'bg-[#FF1E27] border-red-400 text-white font-black shadow-[0_0_12px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider">TEGURAN I (-1)</span>
                </button>
                {/* Peringatan I (Maroon #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('MERAH', 'peringatan1');
                  }}
                  className={`min-h-[34px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.merah.penalties.peringatan1
                      ? 'bg-[#FF1E27] border-red-400 text-white font-black shadow-[0_0_12px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider">PERINGATAN I (-5)</span>
                </button>
              </div>
            </div>

            {/* Tombol Horizontal Cek VAR (Cokelat/Oranye #7A4A00) */}
            <button
              onClick={() => {
                playClickSound();
                setIsVarChecking(true);
              }}
              className="w-full py-1.5 md:py-2 rounded-xl bg-[#7A4A00] hover:bg-[#8f5600] text-amber-100 border border-amber-800/40 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 mb-2 shrink-0 select-none shadow-[0_0_15px_rgba(122,74,0,0.15)]"
            >
              <Tv className="w-4 h-4 text-amber-400" />
              <span>CEK VAR</span>
            </button>
          </div>

          {/* Transparent Log Tabel Rekap (Bottom Section) */}
          <div className="flex-1 flex flex-col min-h-0 bg-black/40 backdrop-blur-sm rounded-xl p-2 border border-[#FF1E27]/15 overflow-hidden shadow-[inset_0_0_15px_rgba(255,30,39,0.05)]">
            <h3 className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-1 shrink-0 font-mono">REKAP DETAIL POIN (RED)</h3>
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
              <table className="w-full border-collapse border border-slate-900/20 text-center">
                <thead>
                  <tr className="bg-black/35 text-[8px] font-black text-slate-400 font-mono tracking-wider">
                    <th className="px-1.5 py-1 text-left font-sans text-[8px]">REKAP POIN</th>
                    <TableLabel>B1</TableLabel>
                    <TableLabel>B2</TableLabel>
                    <TableLabel>B3</TableLabel>
                    <TableLabel>TOTAL</TableLabel>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-slate-950/20">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-300 font-mono border border-slate-900/40">JURI 1</td>
                    <TableCell>{calculateJuriRawHits(matchState, 1, 'MERAH', 1)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 1, 'MERAH', 2)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 1, 'MERAH', 3)}</TableCell>
                    <TableCell className="font-extrabold text-[#00E5FF]">{calculateJuriRawHits(matchState, 1, 'MERAH', 1) + calculateJuriRawHits(matchState, 1, 'MERAH', 2) + calculateJuriRawHits(matchState, 1, 'MERAH', 3)}</TableCell>
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-305 font-mono border border-slate-900/40">JURI 2</td>
                    <TableCell>{calculateJuriRawHits(matchState, 2, 'MERAH', 1)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 2, 'MERAH', 2)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 2, 'MERAH', 3)}</TableCell>
                    <TableCell className="font-extrabold text-[#00E5FF]">{calculateJuriRawHits(matchState, 2, 'MERAH', 1) + calculateJuriRawHits(matchState, 2, 'MERAH', 2) + calculateJuriRawHits(matchState, 2, 'MERAH', 3)}</TableCell>
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-305 font-mono border border-slate-900/40">JURI 3</td>
                    <TableCell>{calculateJuriRawHits(matchState, 3, 'MERAH', 1)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 3, 'MERAH', 2)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 3, 'MERAH', 3)}</TableCell>
                    <TableCell className="font-extrabold text-[#00E5FF]">{calculateJuriRawHits(matchState, 3, 'MERAH', 1) + calculateJuriRawHits(matchState, 3, 'MERAH', 2) + calculateJuriRawHits(matchState, 3, 'MERAH', 3)}</TableCell>
                  </tr>
                  <tr className="hover:bg-slate-950/10">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-305 font-mono border border-slate-900/40">NILAI DEWAN</td>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="font-extrabold text-emerald-400">+{matchState.merah.jatuhanScore}</TableCell>
                  </tr>
                  <tr className="hover:bg-slate-950/10">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-300 font-mono border border-slate-900/40">HUKUMAN</td>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="font-extrabold text-[#FF1E27] drop-shadow-[0_0_3px_rgba(255,30,39,0.5)]">-{merahScores.penaltyDeduction}</TableCell>
                  </tr>
                  <tr className="bg-black/35 font-mono text-[9px]">
                    <td className="px-1.5 py-1 text-left text-[9.5px] uppercase font-black text-white border border-slate-900/50">AKUMULASI</td>
                    <TableCell className="font-extrabold text-slate-350">{calculateJuriRawHits(matchState, 1, 'MERAH', 1) + calculateJuriRawHits(matchState, 2, 'MERAH', 1) + calculateJuriRawHits(matchState, 3, 'MERAH', 1)}</TableCell>
                    <TableCell className="font-extrabold text-slate-350">{calculateJuriRawHits(matchState, 1, 'MERAH', 2) + calculateJuriRawHits(matchState, 2, 'MERAH', 2) + calculateJuriRawHits(matchState, 3, 'MERAH', 2)}</TableCell>
                    <TableCell className="font-extrabold text-slate-350">{calculateJuriRawHits(matchState, 1, 'MERAH', 3) + calculateJuriRawHits(matchState, 2, 'MERAH', 3) + calculateJuriRawHits(matchState, 3, 'MERAH', 3)}</TableCell>
                    <TableCell className="font-black text-[12px] text-[#FF1E27] font-orbitron drop-shadow-[0_0_8px_rgba(255,18,34,0.6)]">{merahScores.totalScore}</TableCell>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>        {/* ================= COLUMN 2 (CENTER): PUSAT KONTROL MATCH (24%) ================= */}
        <section className="flex flex-col bg-[#05040B]/85 backdrop-blur-md border border-purple-500/15 rounded-2xl p-2.5 justify-between overflow-y-auto select-none space-y-2 min-h-0 shadow-[0_0_20px_rgba(110,0,255,0.06)]">
          
          <div className="space-y-2 shrink-0">
            <h2 className="text-[10px] font-black tracking-widest text-[#00E5FF] text-center uppercase border-b border-purple-950/40 pb-1 font-mono drop-shadow-[0_0_5px_rgba(0,229,255,0.3)]">
              INFO PERTANDINGAN
            </h2>

            {/* Kotak Timer (Waktu): Bingkai emas tipis dengan teks penanda BABAK - STATUS, font digital Orbitron putih cerah */}
            <div className="border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.12)] bg-black/60 rounded-2xl p-2.5 text-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
              <div className="text-[9px] uppercase font-black tracking-widest text-amber-500 font-mono mb-0.5">
                BABAK {matchState.babakAktif} - {matchState.timerRunning ? 'AKTIF' : 'BERHENTI'}
              </div>
              <div className="text-2xl md:text-3xl font-extrabold text-amber-100 tracking-widest font-orbitron drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                {formatTime(matchState.waktuTersisa)}
              </div>
            </div>

            {/* Monitor Juri Real-time: Kotak transparant menampilkan status input real-time */}
            <div className="bg-black/45 border border-purple-950/40 rounded-xl p-2 shadow-inner">
              <span className="text-[8.5px] font-black text-purple-300 font-mono tracking-widest block text-center uppercase mb-1 drop-shadow-[0_0_4px_rgba(168,85,247,0.2)]">
                MONITOR LOG JURI
              </span>
              <div className="grid grid-cols-3 gap-1">
                {([1, 2, 3] as const).map((jId) => {
                  const latestPress = getJuriLatestPress(jId);
                  const isOnline = juriStatuses[jId];
                  return (
                    <div
                      key={jId}
                      className={`flex flex-col items-center justify-center p-1 rounded-lg border transition-all ${
                        latestPress
                          ? latestPress.corner === 'MERAH'
                            ? 'bg-[#FF1E27]/10 border-[#FF1E27]/40 text-[#FF1E27] animate-pulse font-bold shadow-[0_0_8px_rgba(255,30,39,0.2)]'
                            : 'bg-[#00E5FF]/10 border-[#00E5FF]/40 text-[#00E5FF] animate-pulse font-bold shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                          : 'bg-black/15 border-purple-950/30 text-purple-400/40'
                      }`}
                    >
                      <span className="text-[8px] font-bold font-mono">JURI {jId}</span>
                      <div className="text-xs font-black font-orbitron my-0.5">
                        {latestPress ? (latestPress.action === 'PUNCH' ? 'P' : 'K') : '-'}
                      </div>
                      <span className="text-[7px] text-purple-400 font-mono uppercase leading-none">
                        {latestPress ? latestPress.corner : isOnline ? 'READY' : 'OFF'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ACTIVE VERIFICATION CONSOLE IF ACTIVE */}
          {matchState.verificationRequest ? (
            <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/25 text-center space-y-1.5 shrink-0 my-1 shadow-inner">
              <div className="flex items-center justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                <span className="text-[9px] font-black text-amber-500 font-mono tracking-widest">VERIFIKASI VAR...</span>
              </div>
              <div className="text-[9px] bg-slate-900 py-1 rounded text-orange-400 border border-slate-850 uppercase font-mono font-black font-orbitron">
                {matchState.verificationRequest.type}
              </div>

              {/* Real-time votes ledger */}
              <div className="space-y-1 text-left bg-black/25 p-1 rounded">
                {[1, 2, 3].map((jId) => {
                  const vote = matchState.verificationRequest?.votes[jId as 1 | 2 | 3];
                  return (
                    <div key={jId} className="flex justify-between items-center text-[9px] border-b border-slate-900 pb-0.5 font-mono">
                      <span className="text-slate-500 font-bold">JURI {jId}:</span>
                      <span
                        className={`font-black ${
                          vote === 'MERAH'
                            ? 'text-[#FF1E27] drop-shadow-[0_0_3px_rgba(255,30,39,0.5)]'
                            : vote === 'BIRU'
                            ? 'text-[#00E5FF] drop-shadow-[0_0_3px_rgba(0,229,255,0.5)]'
                            : vote === 'TIDAK_SAH'
                            ? 'text-slate-400'
                            : 'text-slate-600 italic animate-pulse'
                        }`}
                      >
                        {vote || 'WAITING...'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {matchState.verificationRequest.status !== 'PENDING' && (
                <div className="space-y-0.5 bg-slate-900 p-1 rounded border border-slate-800">
                  <div className="text-[8px] text-slate-500 uppercase font-extrabold tracking-widest">HASIL POLLING:</div>
                  <div className={`text-[10px] font-black uppercase ${matchState.verificationRequest.status === 'SAH' ? 'text-green-400' : 'text-red-400'}`}>
                    {matchState.verificationRequest.status === 'SAH' ? `SAH (${matchState.verificationRequest.chosenCorner})` : 'TIDAK SAH'}
                  </div>
                </div>
              )}

              <button
                onClick={clearVerificationRequest}
                className="w-full bg-[#1C1D26] hover:bg-slate-850 text-red-400 text-[9px] py-1 rounded-lg font-bold cursor-pointer border border-[#FF1E27]/10"
              >
                CLEAR REQUEST
              </button>
            </div>
          ) : (
            <p className="text-[8px] text-purple-400/60 text-center leading-tight uppercase font-mono px-1">
              Silahkan gunakan panel verifikasi jika terjadi keraguan jatuhan/pelanggaran.
            </p>
          )}

          {/* Kendali Verifikasi: Dua tombol ungu besar border ungu menyala di bagian paling bawah tengah */}
          <div className="space-y-1 mt-auto shrink-0">
            <span className="text-[9px] font-black text-[#00E5FF]/85 font-mono tracking-widest block text-center uppercase mb-0.5">
              KONVERSI VERIFIKASI VAR
            </span>
            <div className="flex flex-col gap-1">
              {/* VERIFIKASI JATUHAN (Purple bg #8B0046, neon purple border) */}
              <button
                disabled={matchState.verificationRequest !== null}
                onClick={(() => {
                  playClickSound();
                  handleVerifyRequest('JATUHAN');
                })}
                className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer border-2 transition-all flex flex-col items-center justify-center ${
                  matchState.verificationRequest?.type === 'JATUHAN'
                    ? 'bg-[#8B0046] border-[#FF00FF] text-white shadow-[0_0_15px_rgba(255,0,255,0.4)]'
                    : 'bg-[#8B0046]/10 border-[#8B0046]/60 text-[#FF007F] hover:bg-[#8B0046]/25 hover:border-pink-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <span className="font-orbitron font-extrabold text-white text-[11px] tracking-wider">VERIFIKASI JATUHAN</span>
                <span className="text-[8px] text-pink-300 font-mono tracking-widest uppercase mt-0.5">MINTA VOTE JURI</span>
              </button>

              {/* VERIFIKASI PELANGGARAN (Purple bg #8B0046, neon purple border) */}
              <button
                disabled={matchState.verificationRequest !== null}
                onClick={(() => {
                  playClickSound();
                  handleVerifyRequest('PELANGGARAN');
                })}
                className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer border-2 transition-all flex flex-col items-center justify-center ${
                  matchState.verificationRequest?.type === 'PELANGGARAN'
                    ? 'bg-[#8B0046] border-[#FF00FF] text-white shadow-[0_0_15px_rgba(255,0,255,0.4)]'
                    : 'bg-[#8B0046]/10 border-[#8B0046]/60 text-[#FF007F] hover:bg-[#8B0046]/25 hover:border-pink-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <span className="font-orbitron font-extrabold text-white text-[11px] tracking-wider">VERIFIKASI PELANGGARAN</span>
                <span className="text-[8px] text-pink-300 font-mono tracking-widest uppercase mt-0.5">MINTA VOTE JURI</span>
              </button>
            </div>
          </div>
        </section>

        {/* ================= COLUMN 3 (RIGHT): SUDUT BIRU (38%) ================= */}
        <section className="flex flex-col bg-[#05040B]/85 backdrop-blur-md border border-[#00E5FF]/30 rounded-2xl p-2.5 overflow-hidden shadow-[0_0_20px_rgba(0,229,255,0.12)] justify-between min-h-0 relative">
          
          <div className="flex flex-col min-h-0">
            {/* Header Sudut Biru */}
            <div className="flex justify-between items-baseline shrink-0 border-b border-[#00E5FF]/20 pb-1 mb-1.5">
              <div className="text-left">
                <h2 className="text-sm md:text-base font-black text-white leading-tight uppercase tracking-wider">
                  {matchState.biru.atlit.nama || 'ATLIT BIRU'}
                </h2>
                <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase">({matchState.biru.atlit.kontingen})</span>
              </div>
              <span className="text-[10px] font-black tracking-widest text-[#00E5FF] font-mono drop-shadow-[0_0_4px_rgba(0,229,255,0.4)]">SUDUT BIRU</span>
            </div>

            {/* Display Skor Utama Biru (120pt-150pt layout glow on dark with watermark) */}
            <div className="relative flex items-center justify-center py-3 bg-black/60 border border-[#00E5FF]/30 rounded-xl overflow-hidden min-h-[120px] md:min-h-[150px] shrink-0 select-none shadow-[inset_0_0_20px_rgba(0,229,255,0.15)]">
              {/* Soft background blue glow */}
              <div className="absolute w-[200px] h-[200px] bg-[#00E5FF]/8 filter blur-3xl rounded-full"></div>
              {/* Opacity 5-10% watermark */}
              <div className="absolute inset-0 flex items-center justify-center select-none pointer-events-none">
                <span className="text-4xl md:text-5xl font-black text-[#00E5FF] tracking-widest opacity-[0.06] uppercase font-orbitron">BIRU</span>
              </div>
              {/* Giant Score digit with neon text glow */}
              <span className="relative text-7xl md:text-8xl font-black text-[#00E5FF] tracking-tighter leading-none font-orbitron drop-shadow-[0_0_20px_rgba(0,229,255,0.7)]">
                {biruScores.totalScore}
              </span>
            </div>

            {/* Symmetrical Mirrored 3x3 Grid (Blue K-K: Binaan 1 -> Binaan 2 -> Jatuhan +3) */}
            <div className="grid grid-cols-3 gap-2 my-2 shrink-0">
              {/* Column 1: Level 1 Penalties */}
              <div className="flex flex-col gap-1.5 justify-between">
                {/* Binaan I (Abu-abu Gelap #1C1C24 / Active: Kuning-Amber #D97706) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('BIRU', 'binaan1');
                  }}
                  className={`flex-1 min-h-[46px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.biru.penalties.binaan1
                      ? 'bg-[#D97706] border-amber-400 text-black font-black shadow-[0_0_12px_rgba(217,119,6,0.4)]'
                      : 'bg-[#191924] border-slate-800/50 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <Binaan1Icon />
                  <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">BINAAN I</span>
                </button>
                {/* Teguran I (Maroon #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('BIRU', 'teguran1');
                  }}
                  className={`min-h-[34px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.biru.penalties.teguran1
                      ? 'bg-[#FF1E27] border-red-400 text-white font-black shadow-[0_0_12px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider">TEGURAN I (-1)</span>
                </button>
                {/* Peringatan I (Maroon #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('BIRU', 'peringatan1');
                  }}
                  className={`min-h-[34px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.biru.penalties.peringatan1
                      ? 'bg-[#FF1E27] border-red-400 text-white font-black shadow-[0_0_12px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider">PERINGATAN I (-5)</span>
                </button>
              </div>

              {/* Column 2: Level II Penalties */}
              <div className="flex flex-col gap-1.5 justify-between">
                {/* Binaan II (Abu-abu Gelap #1C1C24 / Active: Kuning-Amber #D97706) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('BIRU', 'binaan2');
                  }}
                  className={`flex-1 min-h-[46px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.biru.penalties.binaan2
                      ? 'bg-[#D97706] border-amber-400 text-black font-black shadow-[0_0_12px_rgba(217,119,6,0.4)]'
                      : 'bg-[#191924] border-slate-800/50 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <Binaan2Icon />
                  <span className="text-[8px] font-black uppercase tracking-wider mt-0.5">BINAAN II</span>
                </button>
                {/* Teguran II (Maroon #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('BIRU', 'teguran2');
                  }}
                  className={`min-h-[34px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.biru.penalties.teguran2
                      ? 'bg-[#FF1E27] border-red-400 text-white font-black shadow-[0_0_12px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wider">TEGURAN II (-2)</span>
                </button>
                {/* Peringatan II (Maroon #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    toggleDewanPenalty('BIRU', 'peringatan2');
                  }}
                  className={`min-h-[34px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.biru.penalties.peringatan2
                      ? 'bg-[#FF1E27] border-red-400 text-white font-black shadow-[0_0_12px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase tracking-wide">PERINGATAN II (-10)</span>
                </button>
              </div>

              {/* Column 3: Jatuhan controls & Diskualifikasi */}
              <div className="flex flex-col gap-1.5 justify-between">
                {/* Jatuhan +3 (Hijau #008744) */}
                <button
                  onClick={() => {
                    playClickSound();
                    applyDewanJatuhan('BIRU', 'ADD');
                  }}
                  className="flex-1 min-h-[46px] rounded-xl bg-[#008744] hover:bg-[#009e4f] text-white font-black text-xs flex flex-col items-center justify-center cursor-pointer transition border border-emerald-500/30 shadow-[0_0_12px_rgba(0,135,68,0.25)] active:scale-95"
                >
                  <span className="text-[8px] font-bold opacity-90 leading-none">JATUHAN</span>
                  <span className="text-base leading-none font-extrabold font-orbitron mt-0.5">+3</span>
                </button>
                {/* Batal Jatuhan (Cokelat #7A4A00) */}
                <button
                  disabled={matchState.biru.jatuhanScore === 0}
                  onClick={() => {
                    playClickSound();
                    applyDewanJatuhan('BIRU', 'SUBTRACT');
                  }}
                  className={`min-h-[34px] rounded-xl text-[9px] font-black uppercase border flex items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.biru.jatuhanScore === 0
                      ? 'bg-black/20 border-slate-900 text-slate-655 cursor-not-allowed opacity-30'
                      : 'bg-[#7A4A00] hover:bg-[#8f5600] border-amber-800/40 text-amber-100 shadow-[0_0_10px_rgba(122,74,0,0.2)]'
                  }`}
                >
                  BATAL JTH
                </button>
                {/* Diskualifikasi (Maroon / Magenta #8B0046) */}
                <button
                  onClick={() => {
                    playClickSound();
                    setDisqualifiedState('BIRU', !matchState.biru.disqualified);
                  }}
                  className={`min-h-[34px] rounded-xl text-[9px] font-black uppercase border flex items-center justify-center cursor-pointer transition active:scale-95 ${
                    matchState.biru.disqualified
                      ? 'bg-[#FF1E27] border-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(255,30,39,0.5)]'
                      : 'bg-[#8B0046] hover:bg-[#a60054] border-rose-950/40 text-rose-100 shadow-sm'
                  }`}
                >
                  DISK
                </button>
              </div>
            </div>

            {/* Tombol Horizontal Cek VAR (Cokelat/Oranye #7A4A00) */}
            <button
              onClick={() => {
                playClickSound();
                setIsVarChecking(true);
              }}
              className="w-full py-1.5 md:py-2 rounded-xl bg-[#7A4A00] hover:bg-[#8f5600] text-amber-100 border border-amber-800/40 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 mb-2 shrink-0 select-none shadow-[0_0_15px_rgba(122,74,0,0.15)]"
            >
              <Tv className="w-4 h-4 text-amber-400" />
              <span>CEK VAR</span>
            </button>
          </div>

          {/* Transparent Log Tabel Rekap (Bottom Section) */}
          <div className="flex-1 flex flex-col min-h-0 bg-black/40 backdrop-blur-sm rounded-xl p-2 border border-[#00E5FF]/15 overflow-hidden shadow-[inset_0_0_15px_rgba(0,229,255,0.05)]">
            <h3 className="text-[9px] font-black text-slate-400 tracking-widest uppercase mb-1 shrink-0 font-mono text-right">REKAP DETAIL POIN (BLUE)</h3>
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
              <table className="w-full border-collapse border border-slate-900/20 text-center">
                <thead>
                  <tr className="bg-black/35 text-[8px] font-black text-slate-400 font-mono tracking-wider">
                    <th className="px-1.5 py-1 text-left font-sans text-[8px]">REKAP POIN</th>
                    <TableLabel>B1</TableLabel>
                    <TableLabel>B2</TableLabel>
                    <TableLabel>B3</TableLabel>
                    <TableLabel>TOTAL</TableLabel>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-slate-950/20">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-300 font-mono border border-slate-900/40">JURI 1</td>
                    <TableCell>{calculateJuriRawHits(matchState, 1, 'BIRU', 1)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 1, 'BIRU', 2)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 1, 'BIRU', 3)}</TableCell>
                    <TableCell className="font-extrabold text-[#00E5FF]">{calculateJuriRawHits(matchState, 1, 'BIRU', 1) + calculateJuriRawHits(matchState, 1, 'BIRU', 2) + calculateJuriRawHits(matchState, 1, 'BIRU', 3)}</TableCell>
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-305 font-mono border border-slate-900/40">JURI 2</td>
                    <TableCell>{calculateJuriRawHits(matchState, 2, 'BIRU', 1)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 2, 'BIRU', 2)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 2, 'BIRU', 3)}</TableCell>
                    <TableCell className="font-extrabold text-[#00E5FF]">{calculateJuriRawHits(matchState, 2, 'BIRU', 1) + calculateJuriRawHits(matchState, 2, 'BIRU', 2) + calculateJuriRawHits(matchState, 2, 'BIRU', 3)}</TableCell>
                  </tr>
                  <tr className="hover:bg-slate-950/20">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-305 font-mono border border-slate-900/40">JURI 3</td>
                    <TableCell>{calculateJuriRawHits(matchState, 3, 'BIRU', 1)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 3, 'BIRU', 2)}</TableCell>
                    <TableCell>{calculateJuriRawHits(matchState, 3, 'BIRU', 3)}</TableCell>
                    <TableCell className="font-extrabold text-[#00E5FF]">{calculateJuriRawHits(matchState, 3, 'BIRU', 1) + calculateJuriRawHits(matchState, 3, 'BIRU', 2) + calculateJuriRawHits(matchState, 3, 'BIRU', 3)}</TableCell>
                  </tr>
                  <tr className="hover:bg-slate-950/10">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-305 font-mono border border-slate-900/40">NILAI DEWAN</td>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="font-extrabold text-emerald-400">+{matchState.biru.jatuhanScore}</TableCell>
                  </tr>
                  <tr className="hover:bg-slate-950/10">
                    <td className="px-1.5 py-1 text-left text-[9px] uppercase font-black text-slate-300 font-mono border border-[#00E5FF]/20">HUKUMAN</td>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="text-slate-600">-</TableCell>
                    <TableCell className="font-extrabold text-[#FF1E27] drop-shadow-[0_0_3px_rgba(255,30,39,0.5)]">-{biruScores.penaltyDeduction}</TableCell>
                  </tr>
                  <tr className="bg-black/35 font-mono text-[9px]">
                    <td className="px-1.5 py-1 text-left text-[9.5px] uppercase font-black text-white border border-[#00E5FF]/20">AKUMULASI</td>
                    <TableCell className="font-extrabold text-slate-350">{calculateJuriRawHits(matchState, 1, 'BIRU', 1) + calculateJuriRawHits(matchState, 2, 'BIRU', 1) + calculateJuriRawHits(matchState, 3, 'BIRU', 1)}</TableCell>
                    <TableCell className="font-extrabold text-slate-350">{calculateJuriRawHits(matchState, 1, 'BIRU', 2) + calculateJuriRawHits(matchState, 2, 'BIRU', 2) + calculateJuriRawHits(matchState, 3, 'BIRU', 2)}</TableCell>
                    <TableCell className="font-extrabold text-slate-350">{calculateJuriRawHits(matchState, 1, 'BIRU', 3) + calculateJuriRawHits(matchState, 2, 'BIRU', 3) + calculateJuriRawHits(matchState, 3, 'BIRU', 3)}</TableCell>
                    <TableCell className="font-black text-[12px] text-[#00E5FF] font-orbitron drop-shadow-[0_0_8px_rgba(0,229,255,0.6)]">{biruScores.totalScore}</TableCell>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
