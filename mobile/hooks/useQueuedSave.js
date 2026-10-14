import { useCallback, useEffect, useRef, useState } from 'react';
import { createSaveQueue } from '../utils/saveQueue';

export function useQueuedSave(write) {
  const writeRef = useRef(write);
  const mounted = useRef(true);
  useEffect(() => { writeRef.current = write; }, [write]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [state, setState] = useState({ status: 'saved', error: '', savedBody: '' });
  const queueRef = useRef(null);
  const save = useCallback((body) => {
    if (!queueRef.current) queueRef.current = createSaveQueue(
      (next) => writeRef.current(next),
      (change) => { if (mounted.current) setState((previous) => ({ ...previous, ...change })); }
    );
    return queueRef.current.save(body);
  }, []);
  const accept = useCallback((body) => {
    setState({ status: 'saved', error: '', savedBody: JSON.stringify(body) });
  }, []);
  return { save, ...state, accept };
}
