import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

export interface CountdownState {
  running: boolean;
  remainingSec: number;
  finished: boolean;
}

export function useCountdown(durationSec: number, onComplete: () => void) {
  const [remainingSec, setRemainingSec] = useState(durationSec);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const endsAtRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      if (endsAtRef.current === null) return;
      const remaining = Math.ceil((endsAtRef.current - Date.now()) / 1000);
      if (remaining <= 0) {
        setRemainingSec(0);
        setRunning(false);
        setFinished(true);
        endsAtRef.current = null;
        setNowMs(Date.now());
        onCompleteRef.current();
      } else {
        setRemainingSec(remaining);
        setNowMs(Date.now());
      }
    }, 250);
    return () => clearInterval(interval);
  }, [running]);

  const start = useCallback(() => {
    setFinished(false);
    endsAtRef.current = Date.now() + remainingSec * 1000;
    setRunning(true);
  }, [remainingSec]);

  const pause = useCallback(() => {
    if (endsAtRef.current === null) return;
    const remaining = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
    setRemainingSec(remaining);
    endsAtRef.current = null;
    setRunning(false);
    setNowMs(Date.now());
  }, []);

  const reset = useCallback(
    (seconds?: number) => {
      endsAtRef.current = null;
      setRunning(false);
      setFinished(false);
      setRemainingSec(seconds ?? durationSec);
    },
    [durationSec],
  );

  const addTime = useCallback((sec: number) => {
    if (endsAtRef.current !== null) {
      endsAtRef.current += sec * 1000;
      setRemainingSec(Math.ceil((endsAtRef.current - Date.now()) / 1000));
    } else {
      setRemainingSec((prev) => Math.max(0, prev + sec));
    }
    setFinished(false);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && running && endsAtRef.current !== null) {
        const remaining = Math.ceil((endsAtRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          setRemainingSec(0);
          setRunning(false);
          setFinished(true);
          endsAtRef.current = null;
          setNowMs(Date.now());
          onCompleteRef.current();
        } else {
          setRemainingSec(remaining);
          setNowMs(Date.now());
        }
      }
    });
    return () => sub.remove();
  }, [running]);

  return { remainingSec, running, finished, nowMs, start, pause, reset, addTime };
}
