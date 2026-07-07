/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useMatchState } from '../hooks/useMatchState';
import { DewanPanel } from './DewanPanel';
import { JuriPanel } from './JuriPanel';
import { SekretarisPanel } from './SekretarisPanel';
import { MonitorPanel } from './MonitorPanel';
import { Eye, Settings, Shield, Users, Layers, Play, Pause, RefreshCw } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface DashboardSimulatorProps {
  onBackToLanding: () => void;
}

export const DashboardSimulator: React.FC<DashboardSimulatorProps> = ({ onBackToLanding }) => {
  // Use independent React state management inside the sandbox for instantaneous split sync
  const matchStateHook = useMatchState(false);
  const {
    matchState,
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
  } = matchStateHook;

  const [simActiveTab, setSimActiveTab] = useState<'SEKRETARIS' | 'DEWAN' | 'JURIS'>('SEKRETARIS');

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      
      {/* SIMULATOR TOP MENU CONTROL */}
      <div className="bg-slate-900 border-b border-indigo-950 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClickSound();
              onBackToLanding();
            }}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded border border-slate-705 text-gray-300 font-bold transition cursor-pointer"
          >
            ← MENU PERAN
          </button>
          <div>
            <h1 className="text-sm font-black text-indigo-400 font-mono tracking-widest uppercase">
              SANDBOX SIMULATOR KOMPLET
            </h1>
            <p className="text-[10px] text-gray-400 leading-none">
              Uji Coba Sinkronisasi Juri 1.5 Detik & Sistem Scoring Silat secara Live
            </p>
          </div>
        </div>

        {/* Quick control info */}
        <div className="flex items-center gap-3 bg-black/60 border border-slate-800 px-3 py-1 rounded-full text-xs font-mono">
          <span className="text-[10px] text-yellow-500 font-bold uppercase leading-none">Status:</span>
          <span>PTY {matchState.settings.partai}</span>
          <span className="text-gray-600">|</span>
          <span className="text-slate-300">BABAK {matchState.babakAktif}</span>
          <span className="text-gray-600">|</span>
          <span className="text-emerald-400 font-black">{formatTime(matchState.waktuTersisa)}</span>
        </div>

        <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => { playClickSound(); setSimActiveTab('SEKRETARIS'); }}
            className={`px-3 py-1 rounded font-bold cursor-pointer transition flex items-center gap-1 ${
              simActiveTab === 'SEKRETARIS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Sekretaris Deck
          </button>
          <button
            onClick={() => { playClickSound(); setSimActiveTab('DEWAN'); }}
            className={`px-3 py-1 rounded font-bold cursor-pointer transition flex items-center gap-1 ${
              simActiveTab === 'DEWAN' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Dewan Deck
          </button>
          <button
            onClick={() => { playClickSound(); setSimActiveTab('JURIS'); }}
            className={`px-3 py-1 rounded font-bold cursor-pointer transition flex items-center gap-1 ${
              simActiveTab === 'JURIS' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Juri 1, 2, 3 Deck
          </button>
        </div>
      </div>

      {/* CORE SPLIT SCREEN LAYOUT */}
      <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: ACTIVE CONTROL TERMINAL (TAB DRIVEN) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col border-r border-indigo-950 min-h-0 bg-slate-955 overflow-hidden">
          
          <div className="bg-indigo-900/[0.05] border-b border-indigo-950/20 px-3 py-1.5 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
              TERMINAL INTERAKTIF STAF {simActiveTab}
            </span>
            <span className="text-[9px] text-gray-500 font-mono">Panel Pengendali Lokasi</span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {simActiveTab === 'SEKRETARIS' && (
              <SekretarisPanel
                matchState={matchState}
                toggleTimer={toggleTimer}
                resetTimer={resetTimer}
                setBabak={setBabak}
                resetMatchState={resetMatchState}
                updateSettings={updateSettings}
                updateAthletes={updateAthletes}
                forceSync={forceSync}
              />
            )}

            {simActiveTab === 'DEWAN' && (
              <DewanPanel
                matchState={matchState}
                toggleDewanPenalty={toggleDewanPenalty}
                applyDewanJatuhan={applyDewanJatuhan}
                setDisqualifiedState={setDisqualifiedState}
                initiateVerification={initiateVerification}
                clearVerificationRequest={clearVerificationRequest}
              />
            )}

            {simActiveTab === 'JURIS' && (
              <div className="h-full flex flex-col p-2 space-y-4">
                
                {/* Information Header on how to test coincidence */}
                <div className="bg-slate-900 border border-yellow-500/10 p-2.5 rounded-xl">
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase block font-mono">Petunjuk Uji Coba Sinkronisasi Juri:</span>
                  <p className="text-[10px] text-gray-300 leading-tight mt-1">
                    Aktifkan timer / klik <strong>INDUK PLAY</strong> di tab Sekretaris terlebih dahulu. Lalu cobalah mengetuk tombol punch/kick untuk sudut yang sama (misal: <strong>Punch Biru</strong> atau <strong>Kick Merah</strong>) pada <strong>Dua Juri yang berbeda</strong> (misal Juri 1 & Juri 2) dalam jeda kurang dari 1.5 detik. Anda akan melihat flash kuning di monitor sebelah kanan dan poin akan bertambah!
                  </p>
                </div>

                {/* Grid layout for 3 Jurists running live concurrently! */}
                <div className="flex-1 grid grid-cols-3 gap-2 min-h-0 overflow-y-auto">
                  {[1, 2, 3].map((jId) => (
                    <div key={jId} className="border border-slate-800 rounded-xl bg-slate-900/40 p-2 flex flex-col justify-between">
                      <div className="border-b border-slate-800 pb-1 mb-2 text-center">
                        <span className="text-[10px] font-black text-indigo-400 font-mono block">JURI {jId} TERMINAL</span>
                        <span className="text-[9px] text-gray-500 italic block leading-none">Ketuk input langsung</span>
                      </div>

                      {/* Blue side punch/kick */}
                      <div className="space-y-1 bg-blue-900/10 p-1.5 rounded-lg border border-blue-950">
                        <span className="text-[8px] font-bold text-blue-400 block tracking-wider uppercase font-mono">SUDUT BIRU</span>
                        <button
                          id={`sim-punch-biru-${jId}`}
                          onClick={() => {
                            if (!matchState.timerRunning) {
                              alert('Nyalakan timer terlebih dahulu (Buka tab Sekretaris dan ketuk INDUK PLAY)');
                              return;
                            }
                            registerJuriPress(jId as 1 | 2 | 3, 'PUNCH', 'BIRU');
                          }}
                          className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 rounded font-black text-[10px] text-white uppercase cursor-pointer"
                        >
                          PUNCH (+1)
                        </button>
                        <button
                          id={`sim-kick-biru-${jId}`}
                          onClick={() => {
                            if (!matchState.timerRunning) {
                              alert('Nyalakan timer terlebih dahulu (Buka tab Sekretaris dan ketuk INDUK PLAY)');
                              return;
                            }
                            registerJuriPress(jId as 1 | 2 | 3, 'KICK', 'BIRU');
                          }}
                          className="w-full py-1.5 bg-blue-700 hover:bg-blue-600 rounded font-black text-[10px] text-white uppercase cursor-pointer"
                        >
                          KICK (+2)
                        </button>
                      </div>

                      {/* Red side punch/kick */}
                      <div className="space-y-1 bg-red-900/10 p-1.5 rounded-lg border border-red-950 mt-2">
                        <span className="text-[8px] font-bold text-red-00 block tracking-wider uppercase font-mono">SUDUT MERAH</span>
                        <button
                          id={`sim-punch-merah-${jId}`}
                          onClick={() => {
                            if (!matchState.timerRunning) {
                              alert('Nyalakan timer terlebih dahulu (Buka tab Sekretaris dan ketuk INDUK PLAY)');
                              return;
                            }
                            registerJuriPress(jId as 1 | 2 | 3, 'PUNCH', 'MERAH');
                          }}
                          className="w-full py-1.5 bg-red-600 hover:bg-red-500 rounded font-black text-[10px] text-white uppercase cursor-pointer"
                        >
                          PUNCH (+1)
                        </button>
                        <button
                          id={`sim-kick-merah-${jId}`}
                          onClick={() => {
                            if (!matchState.timerRunning) {
                              alert('Nyalakan timer terlebih dahulu (Buka tab Sekretaris dan ketuk INDUK PLAY)');
                              return;
                            }
                            registerJuriPress(jId as 1 | 2 | 3, 'KICK', 'MERAH');
                          }}
                          className="w-full py-1.5 bg-red-700 hover:bg-red-600 rounded font-black text-[10px] text-white uppercase cursor-pointer"
                        >
                          KICK (+2)
                        </button>
                      </div>

                      {/* Vote panel for verification requests */}
                      {matchState.verificationRequest && matchState.verificationRequest.votes[jId as 1 | 2 | 3] === null && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-1 text-[8px] space-y-1 mt-2 text-center animate-pulse">
                          <span className="text-yellow-500 font-bold block">VERIF DEWAN!</span>
                          <div className="flex gap-1 justify-center shrink-0">
                            <button
                              onClick={() => selectJuriVerificationVote(jId as 1 | 2 | 3, 'BIRU')}
                              className="bg-blue-650 text-white font-bold p-1 rounded font-mono cursor-pointer"
                              title="Vote Biru"
                            >
                              BIRU
                            </button>
                            <button
                              onClick={() => selectJuriVerificationVote(jId as 1 | 2 | 3, 'MERAH')}
                              className="bg-red-650 text-white font-bold p-1 rounded font-mono cursor-pointer"
                              title="Vote Merah"
                            >
                              MERAH
                            </button>
                            <button
                              onClick={() => selectJuriVerificationVote(jId as 1 | 2 | 3, 'TIDAK_SAH')}
                              className="bg-slate-800 text-slate-300 font-bold p-1 rounded font-mono cursor-pointer"
                              title="Vote Tidak Sah"
                            >
                              TS
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Short notes */}
                <p className="text-[10px] text-slate-500 text-center uppercase font-mono">
                  MULTIPLE SIMULATOR PENILAIAN JURI AKTIF SEKALIGUS
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: BROADCAST AUDIENCE MONITOR WORKSPACE */}
        <div className="col-span-12 lg:col-span-6 flex flex-col bg-slate-950 min-h-0 overflow-hidden relative">
          
          <div className="bg-slate-900 border-b border-indigo-950 px-3 py-2 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold text-gray-400 tracking-widest font-mono uppercase">
              TAMPILAN MONITOR UTAMA PENONTON (LIVE FEED)
            </span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-[9px] text-emerald-400 font-bold font-mono uppercase">TRANSMISI SINKRON</span>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <MonitorPanel matchState={matchState} />
          </div>

        </div>

      </div>
    </div>
  );
};
