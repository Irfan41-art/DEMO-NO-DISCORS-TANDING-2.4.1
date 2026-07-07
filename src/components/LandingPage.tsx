/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Users, FileText, Monitor as MonitorIcon, Play, Flame } from 'lucide-react';
import { SilatFighterStance, IPSISilhouette } from './SilatSilhouettes';
import { playClickSound } from '../utils/audio';

interface LandingPageProps {
  onSelectRole: (role: 'DEWAN' | 'JURI' | 'SEKRETARIS' | 'MONITOR' | 'SIMULATOR') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  const handleSelect = (role: 'DEWAN' | 'JURI' | 'SEKRETARIS' | 'MONITOR' | 'SIMULATOR') => {
    playClickSound();
    onSelectRole(role);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[#02050a] text-slate-150 overflow-hidden">
      {/* Background Decorative Silhouettes & Ambient radial lights */}
      <div className="silhouette-bg opacity-30"></div>
      
      <div className="absolute top-1/4 left-10 opacity-[0.03] pointer-events-none transform -rotate-12">
        <SilatFighterStance className="w-96 h-96 text-blue-500" />
      </div>
      <div className="absolute bottom-10 right-10 opacity-[0.03] pointer-events-none transform rotate-12">
        <IPSISilhouette className="w-96 h-96 text-blue-400" />
      </div>

      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center text-center">
        {/* Header Icon logo */}
        <div className="mb-6 p-4 rounded-full bg-blue-950/40 border border-blue-500/20 shadow-neon-blue animate-pulse">
          <Flame className="w-8 h-8 text-blue-400" />
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2 uppercase drop-shadow font-sans">
          SKORING DIGITAL PENCAK SILAT
        </h1>
        <p className="text-xs md:text-sm text-blue-400/90 font-mono tracking-widest mb-10 uppercase">
          ✦ SISTEM PENILAIAN ELEKTRONIK RESMI TERINTEGRASI REAL-TIME ✦
        </p>

        {/* Roles Main Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full mb-8">
          
          {/* DEWAN */}
          <button
            id="role-btn-dewan"
            onClick={() => handleSelect('DEWAN')}
            className="group relative flex items-start gap-4 p-6 rounded-2xl bg-[#09111e]/40 hover:bg-[#0f172a]/70 border border-slate-900 hover:border-red-500/30 transition-all hover:shadow-neon-red duration-300 text-left cursor-pointer"
          >
            <div className="p-3 bg-red-950/50 border border-red-500/20 text-red-400 rounded-xl group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-wide text-white group-hover:text-red-400 transition-colors font-sans">DEWAN</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                Kontrol pelanggaran (Binaan, Teguran, Peringatan), nilai Jatuhan (+3), Diskualifikasi, dan verifikasi sah/tidak sah.
              </p>
            </div>
          </button>

          {/* JURI */}
          <button
            id="role-btn-juri"
            onClick={() => handleSelect('JURI')}
            className="group relative flex items-start gap-4 p-6 rounded-2xl bg-[#09111e]/40 hover:bg-[#0f172a]/70 border border-slate-900 hover:border-blue-500/30 transition-all hover:shadow-neon-blue duration-300 text-left cursor-pointer"
          >
            <div className="p-3 bg-blue-950/50 border border-blue-500/20 text-blue-400 rounded-xl group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-wide text-white group-hover:text-blue-400 transition-colors font-sans">JURI (1, 2, 3)</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                Pilih Juri 1, 2, atau 3. Input pukulan (PUNCH, +1) dan tendangan (KICK, +2) dengan logika sinkronisasi multi-juri 1.5 detik.
              </p>
            </div>
          </button>

          {/* SEKRETARIS */}
          <button
            id="role-btn-sekretaris"
            onClick={() => handleSelect('SEKRETARIS')}
            className="group relative flex items-start gap-4 p-6 rounded-2xl bg-[#09111e]/40 hover:bg-[#0f172a]/70 border border-slate-900 hover:border-yellow-500/30 transition-all duration-300 text-left cursor-pointer"
          >
            <div className="p-3 bg-yellow-950/50 border border-yellow-500/20 text-yellow-500 rounded-xl group-hover:scale-105 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-wide text-white group-hover:text-yellow-400 transition-colors font-sans">SEKRETARIS</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                Setup data event, atlit (nama & kontingen), ganti ronde/babak, control timer pertarungan, ekspor/impor excel massal, dan unduh rekaman history.
              </p>
            </div>
          </button>

          {/* MONITOR */}
          <button
            id="role-btn-monitor"
            onClick={() => handleSelect('MONITOR')}
            className="group relative flex items-start gap-4 p-6 rounded-2xl bg-[#09111e]/40 hover:bg-[#0f172a]/70 border border-slate-900 hover:border-emerald-500/30 transition-all duration-300 text-left cursor-pointer"
          >
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-105 transition-transform">
              <MonitorIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold tracking-wide text-white group-hover:text-emerald-400 transition-colors font-sans">MONITOR</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                Layar utama penonton. Menampilkan skor akumulatif paling besar saling berhadapan (mirror), status penalti, timer, dan efek kilat kuning saat skor sah.
              </p>
            </div>
          </button>

        </div>

        {/* Master Control Suite / Interactive Multi-Panel Sandbox */}
        <div className="w-full">
          <button
            id="role-btn-simulator"
            onClick={() => handleSelect('SIMULATOR')}
            className="group w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-950/40 border border-blue-900/40 hover:border-blue-500/40 hover:shadow-neon-blue transition-all duration-500 text-center sm:text-left cursor-pointer"
          >
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 mb-1 font-mono">
                DEMO & SIMULASI MANDIRI
              </span>
              <h3 className="text-xl font-black text-white font-sans">SPLIT-SCREEN ALL-IN-ONE SIMULATOR</h3>
              <p className="text-xs text-slate-400 max-w-xl">
                Buka layout uji coba langsung! Mengontrol Sekretaris, Dewan, Juri, dan memantau Layar Monitor sekaligus dalam satu monitor PC tanpa repot membuka banyak browser.
              </p>
            </div>
            <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shrink-0 transition-all duration-300 group-hover:translate-x-1">
              <Play className="w-3.5 h-3.5 fill-current text-white" />
              Mulai Simulasi
            </div>
          </button>
        </div>

        {/* Footer Credit line */}
        <div className="mt-12 text-[9px] text-slate-600 font-mono tracking-widest uppercase">
          PERATURAN PERTANDINGAN IPSI @ 2026. ALL RIGHTS RESERVED
        </div>
      </div>
    </div>
  );
};
