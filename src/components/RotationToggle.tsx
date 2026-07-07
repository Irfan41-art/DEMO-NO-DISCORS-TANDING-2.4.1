/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface RotationContainerProps {
  children: React.ReactNode;
}

export const RotationContainer: React.FC<RotationContainerProps> = ({ children }) => {
  const [rotated, setRotated] = useState(false);

  const handleToggle = () => {
    playClickSound();
    setRotated(!rotated);
  };

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden">
      {/* Rotated layout vs normal layout wrapper */}
      <div
        className={`transition-all duration-500 ease-in-out ${
          rotated
            ? 'fixed inset-0 w-[100vh] h-[100vw] min-w-[568px] min-h-[320px] origin-top-left translate-x-[100vw] rotate-90 overflow-auto bg-gradient-to-br from-slate-950 via-blue-950 to-black'
            : 'w-full min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-black'
        }`}
        style={rotated ? { width: '100vh', height: '100vw' } : undefined}
      >
        {children}
      </div>

      {/* Floating Rotation Trigger Button in Bottom Corner */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          id="btn-rotate-aspect"
          onClick={handleToggle}
          className="flex items-center justify-center gap-2 px-3 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-xs font-semibold cursor-pointer border border-blue-400"
          title="Force Landscape Rotation"
        >
          <RotateCw className={`w-5 h-5 ${rotated ? 'rotate-180' : ''} transition-transform duration-300`} />
          <span className="max-w-0 hidden md:inline-block md:max-w-32 overflow-hidden transition-all duration-300">
            {rotated ? 'Normal' : 'Rotasi Landscape'}
          </span>
        </button>
      </div>
    </div>
  );
};
