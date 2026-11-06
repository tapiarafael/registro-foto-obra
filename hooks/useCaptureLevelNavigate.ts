import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import {
  CAPTURE_LEVEL_ROUTE,
  captureNavPatchForLevel,
  type CaptureScreen,
} from '@/utils/captureBreadcrumbs';

export function useCaptureLevelNavigate() {
  const router = useRouter();
  const { setCaptureNav } = useApp();

  return useCallback((target: CaptureScreen) => {
    setCaptureNav(captureNavPatchForLevel(target));
    router.dismissTo(CAPTURE_LEVEL_ROUTE[target]);
  }, [router, setCaptureNav]);
}
