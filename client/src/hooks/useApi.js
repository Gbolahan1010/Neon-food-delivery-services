import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

/**
 * Loads data from a GET endpoint and tracks loading and error state.
 * Pass null as the path to skip loading (for example while waiting for an id).
 * `reload()` fetches again; `{ quiet: true }` refreshes without showing the loading state.
 */
export function useApi(path) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!path) return;
      if (!quiet) setLoading(true);
      try {
        const result = await api.get(path);
        setData(result.data);
        setMeta(result.meta || null);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [path]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { data, meta, error, loading, reload: load, setData };
}

/** Calls fn every `ms` milliseconds while `active` is true (used for live order status). */
export function usePolling(fn, ms, active) {
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(fn, ms);
    return () => clearInterval(id);
  }, [fn, ms, active]);
}
