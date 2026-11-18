import { useCallback, useState } from 'react';

const KEY = 'jakim-2027-done';

function read(): Record<string, true> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, true>) : {};
  } catch {
    return {};
  }
}

/** Sessions marked as done, kept in this browser only. */
export function useDone() {
  const [done, setDone] = useState<Record<string, true>>(read);

  const toggle = useCallback((key: string) => {
    setDone((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable: keep in memory */
      }
      return next;
    });
  }, []);

  return { done, toggle };
}
