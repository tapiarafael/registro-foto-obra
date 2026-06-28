import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';

export function useRegistrarHome() {
  const router = useRouter();
  const { resetCaptureNav } = useApp();

  return useCallback(() => {
    resetCaptureNav();
    router.replace('/(tabs)');
  }, [router, resetCaptureNav]);
}
