/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

export function useJuriStatuses() {
  const [statuses, setStatuses] = useState<Record<1 | 2 | 3, boolean>>({
    1: false,
    2: false,
    3: false,
  });

  useEffect(() => {
    const checkStatuses = async () => {
      // First try fetching the central status from our Backend
      try {
        const response = await fetch('/api/juri/statuses');
        if (response.ok) {
          const data = await response.json();
          setStatuses({
            1: !!data[1],
            2: !!data[2],
            3: !!data[3],
          });
          return; // Success, skip localStorage fallback
        }
      } catch (err) {
        // Silent fallback for standalone / offline operations
      }

      // Fallback to local storage (works only inline on the same browser)
      try {
        const raw = localStorage.getItem('silat_juri_heartbeats');
        if (raw) {
          const heartbeats = JSON.parse(raw);
          const now = Date.now();
          const tolerance = 4000; // 4 seconds threshold for online status
          setStatuses({
            1: heartbeats[1] ? (now - Number(heartbeats[1]) < tolerance) : false,
            2: heartbeats[2] ? (now - Number(heartbeats[2]) < tolerance) : false,
            3: heartbeats[3] ? (now - Number(heartbeats[3]) < tolerance) : false,
          });
        } else {
          setStatuses({ 1: false, 2: false, 3: false });
        }
      } catch (e) {
        console.error('Error parsing heartbeats', e);
      }
    };

    // Check immediately
    checkStatuses();

    // Check periodically
    const interval = setInterval(checkStatuses, 1000);

    // BroadcastChannel for instant inter-tab connection sync
    const channel = new BroadcastChannel('silat_juri_pulse');
    channel.onmessage = (event) => {
      if (event.data === 'heartbeat_updated' || event.data === 'force_sync' || event.data === 'probe_request') {
        checkStatuses();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'silat_juri_heartbeats') {
        checkStatuses();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('storage_juri_heartbeat', checkStatuses);

    return () => {
      clearInterval(interval);
      channel.close();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('storage_juri_heartbeat', checkStatuses);
    };
  }, []);

  return statuses;
}
