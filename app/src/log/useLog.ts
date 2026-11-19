import { useCallback, useState } from 'react';
import { fromDoneFlags, sanitize, type LogBook, type RunLog } from './log';

const KEY = 'jakim-2027-log';
const OLD_DONE_KEY = 'jakim-2027-done';

function read(): LogBook {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
    const old = localStorage.getItem(OLD_DONE_KEY);
    if (old) return fromDoneFlags(JSON.parse(old));
  } catch {
    /* storage unavailable or corrupt */
  }
  return {};
}

function write(logs: LogBook) {
  try {
    localStorage.setItem(KEY, JSON.stringify(logs));
  } catch {
    /* storage unavailable: keep in memory */
  }
}

/** Logged runs, kept in this browser only. */
export function useLog() {
  const [logs, setLogs] = useState<LogBook>(read);

  const update = useCallback((fn: (prev: LogBook) => LogBook) => {
    setLogs((prev) => {
      const next = fn(prev);
      write(next);
      return next;
    });
  }, []);

  const save = useCallback((key: string, entry: RunLog) => update((p) => ({ ...p, [key]: entry })), [update]);

  const remove = useCallback(
    (key: string) =>
      update((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      }),
    [update],
  );

  /** Merge a restored backup. Entries in the backup win. Returns how many were restored. */
  const restore = useCallback(
    (raw: unknown) => {
      const incoming = sanitize(raw);
      update((p) => ({ ...p, ...incoming }));
      return Object.keys(incoming).length;
    },
    [update],
  );

  return { logs, save, remove, restore };
}
