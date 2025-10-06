/**
 * Hook for automatic KM status detection and setting
 * Monitors clients and automatically sets status to 'KM' when notes contain 'KM' or 'ELS'
 */

import { useEffect } from 'react';
import { shouldSetKMStatus } from '../utils/kmDetection';
import { db } from '../../../data/db';

/**
 * Hook that runs on mount to check all clients and set KM status where appropriate
 * Also watches for note changes to apply KM status automatically
 */
export function useKMAutoStatus(clients: any[]) {
  useEffect(() => {
    if (!clients || clients.length === 0) return;

    const checkAndUpdateKMStatus = async () => {
      const updates: Array<{ id: string; status: string }> = [];

      for (const client of clients) {
        const note = client.note || client.notes?.text || '';
        const needsKM = shouldSetKMStatus(note);

        if (needsKM && client.status !== 'KM') {
          updates.push({ id: client.id, status: 'KM' });
        }
      }

      if (updates.length > 0) {
        try {
          await db.transaction('rw', db.clients, async () => {
            for (const update of updates) {
              await db.clients.update(update.id, { status: update.status });
            }
          });

          console.log(`✅ Automatically set KM status for ${updates.length} client(s)`);
        } catch (error) {
          console.error('❌ Failed to auto-update KM status:', error);
        }
      }
    };

    checkAndUpdateKMStatus();
  }, [clients]);
}
