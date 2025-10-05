import { useEffect, useState } from 'react';
import { liveQuery, type Observable } from 'dexie';

/**
 * React Hook für Dexie liveQuery mit automatischer Subscription
 * Debounced um Performance bei häufigen DB-Änderungen zu schützen
 *
 * @param querier - Funktion die Dexie Query zurückgibt
 * @param deps - Dependencies für Re-Subscription
 * @param defaultValue - Initialer Wert bis erste Daten geladen sind
 * @param debounceMs - Debounce-Zeit in Millisekunden (default 100ms)
 */
export function useLiveQuery<T>(
  querier: () => T | Promise<T>,
  deps: any[] = [],
  defaultValue?: T,
  debounceMs: number = 100
): T | undefined {
  const [data, setData] = useState<T | undefined>(defaultValue);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let timeoutId: number | null = null;
    let isSubscribed = true;
    let isFirstValue = true;

    const observable: Observable<T> = liveQuery(querier);

    const subscription = observable.subscribe({
      next: (value) => {
        if (!isSubscribed) return;

        // Erste Daten sofort setzen, danach debounced
        if (isFirstValue) {
          isFirstValue = false;
          setData(value);
          setError(null);

          // Debug logging für leere Arrays
          if (import.meta.env.DEV && Array.isArray(value) && value.length === 0) {
            console.log('📊 useLiveQuery: Erste Query lieferte leeres Array');
          }
        } else {
          // Debounce Updates um zu häufige Re-Renders zu vermeiden
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = window.setTimeout(() => {
            if (isSubscribed) {
              setData(value);
              setError(null);
            }
          }, debounceMs);
        }
      },
      error: (err) => {
        console.error('❌ useLiveQuery error:', err);
        if (isSubscribed) {
          setError(err);
        }
      }
    });

    return () => {
      isSubscribed = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, deps);

  if (error) {
    console.warn('useLiveQuery caught error:', error);
  }

  return data;
}
