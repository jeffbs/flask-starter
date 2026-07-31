import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

/** Einfacher Daten-Hook: Laden/Fehler/Refresh — Screens bleiben schlank. */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async () => {
    const current = pathRef.current;
    if (!current) return;
    setError(null);
    try {
      const result = await api<T>(current);
      if (pathRef.current === current) setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) return;
    setLoading(true);
    void load();
  }, [path, load]);

  return { data, loading, error, reload: load, setData };
}

export function useDebounced<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
