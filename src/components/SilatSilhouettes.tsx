/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SilhouetteProps {
  className?: string;
  color?: string;
}

/**
 * Fighter stance silhouette 1 - Guard Stance (Sikap Pasang)
 */
export const SilatFighterStance: React.FC<SilhouetteProps> = ({
  className = 'w-32 h-32',
  color = 'currentColor'
}) => (
  <svg
    viewBox="0 0 200 200"
    className={className}
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M100 25c5.52 0 10-4.48 10-10S105.52 5 100 5s-10 4.48-10 10 4.48 10 10 10zm-15 35c2.1 0 7.8 1.1 11.2-.5 4.1-1.9 4.3-7.5 8.8-9 4.2-1.4 7.4-4.8 11.8-6.1 4.5-1.3 9.3-.9 13.2 1.8 1.9 1.3 3.5 3.3 3.5 5.7 0 2.2-1.4 4.1-3 5.7-1.7 1.7-4.1 2.5-6.5 2.5H110v10l35 15c3.2 1.4 5.9 3.8 7.5 7 1.5 3.3 2.5 6.9 3.5 10.4 1 3.5 3 6.9 6 9.1l22 17c2.4 1.8 3.5 4.8 2.7 7.7-.8 2.9-3.2 4.9-6.2 5.1s-5.9-1-7.7-3.4l-11-14.4h-30l3 42c.2 3.3-1.6 6.4-4.6 7.8-3 1.4-6.6.6-8.7-2l-18-22h-10l-12 18-5 35c-.4 3.3-2.9 5.9-6.2 6.4s-6.6-1.1-7.9-4.2l-10-24c-1.3-3.1.2-6.6 3.2-8l12-5.6V100L55 83c-2.3-1.5-3.3-4.4-2.5-7 .8-2.6 3.1-4.4 5.8-4.4H85V60z"
      opacity="0.85"
    />
  </svg>
);

/**
 * Fighter stance silhouette 2 - Flying Kick Stance (Tendangan Belakang / T)
 */
export const SilatKickStance: React.FC<SilhouetteProps> = ({
  className = 'w-32 h-32',
  color = 'currentColor'
}) => (
  <svg
    viewBox="0 0 200 200"
    className={className}
    fill={color}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M45 42c4.42 0 8-3.58 8-8s-3.58-8-8-8-8 3.58-8 8 3.58 8 8 8zm9 10H38l-12 25c-1.3 2.7-.4 5.9 2.1 7.6 2.5 1.7 5.9 1.4 8-.7l9-9v36l-18 20c-2.2 2.4-2.6 5.9-1 8.8s4.7 4.2 7.8 3.2c3.1-1 4.7-4.1 4.7-4.1L88 100l32-1c20-1 46.2-1.5 60-3s22-4.5 14-8c-7-3-28.2 1.5-46.2.5l-31-4V54l36-12c2.8-.9 4.3-3.9 3.4-6.7-.9-2.8-3.9-4.3-6.7-3.4l-42 14c-2 1-3.2 3-3.2 5.2v16H54z"
      opacity="0.8"
    />
  </svg>
);

/**
 * IPSI symbol silhouette (Pencak Silat symbol concept)
 */
export const IPSISilhouette: React.FC<SilhouetteProps> = ({
  className = 'w-32 h-32',
  color = 'currentColor'
}) => (
  <svg
    viewBox="0 0 120 120"
    className={className}
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <polygon points="60,10 110,40 100,90 60,110 20,90 10,40" />
    <circle cx="60" cy="55" r="18" fill="none" />
    <path d="M60,10 L60,110" strokeDasharray="3,3" />
    <path d="M10,40 L110,40" strokeDasharray="3,3" />
    <path d="M20,90 L100,90" strokeDasharray="3,3" />
    <path d="M40,55 Q60,35 80,55" />
    <path d="M40,55 Q60,75 80,55" />
  </svg>
);
