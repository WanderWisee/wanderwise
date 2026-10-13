import {
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { useApp } from '../context/AppContext';
import { startLiveSync } from '../utils/liveSync';

export function useLiveSync(
  load,
  {
    resourceKey = '',
    enabled = true,
    interval = 5000,
  } = {}
) {
  const { token } = useApp();
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !token) return;

      let active =
        AppState.currentState !== 'background' &&
        AppState.currentState !== 'inactive';

      return startLiveSync(
        (isCurrent) => loadRef.current(isCurrent),
        {
          interval,

          isActive: () => active,

          subscribe: (wake) => {
            const subscription =
              AppState.addEventListener(
                'change',
                (state) => {
                  active = state === 'active';
                  wake();
                }
              );

            return () => subscription.remove();
          },
        }
      );
    }, [enabled, interval, resourceKey, token])
  );
}