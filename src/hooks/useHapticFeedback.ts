import { useCallback } from 'react';

type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Hook para feedback háptico em dispositivos que suportam
 * Usa a Vibration API quando disponível
 */
export function useHapticFeedback() {
  const vibrate = useCallback((pattern: number | number[]) => {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Silently fail - haptic is enhancement, not requirement
      }
    }
  }, []);

  const trigger = useCallback((style: HapticStyle = 'light') => {
    const patterns: Record<HapticStyle, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: 50,
      success: [10, 50, 10],
      warning: [25, 25, 25],
      error: [50, 25, 50],
    };

    vibrate(patterns[style]);
  }, [vibrate]);

  const impact = useCallback(() => trigger('medium'), [trigger]);
  const selection = useCallback(() => trigger('light'), [trigger]);
  const notification = useCallback((type: 'success' | 'warning' | 'error' = 'success') => {
    trigger(type);
  }, [trigger]);

  return {
    trigger,
    impact,
    selection,
    notification,
  };
}
