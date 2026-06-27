import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  Block, Building, Floor, InspectionSession, Project, Service, Unit,
  getActiveSession, getDatabase, getProject, startSession,
} from '@/db/database';

export interface CaptureNav {
  block: Block | null;
  building: Building | null;
  floor: Floor | null;
  unit: Unit | null;
  service: Service | null;
  sessionId: number | null;
  photoGroupId: number | null;
}

interface AppContextValue {
  project: Project | null;
  isReady: boolean;
  isSetupComplete: boolean;
  activeSession: InspectionSession | null;
  captureNav: CaptureNav;
  todayPhotoCount: number;
  loadProject: () => Promise<void>;
  setActiveSession: (s: InspectionSession | null) => void;
  beginSession: () => Promise<InspectionSession | null>;
  setCaptureNav: (nav: Partial<CaptureNav>) => void;
  resetCaptureNav: () => void;
  setPhotoGroupId: (id: number) => void;
  incrementTodayCount: () => void;
}

const defaultNav: CaptureNav = {
  block: null, building: null, floor: null, unit: null, service: null,
  sessionId: null, photoGroupId: null,
};

const AppContext = createContext<AppContextValue>({
  project: null, isReady: false, isSetupComplete: false,
  activeSession: null, captureNav: defaultNav, todayPhotoCount: 0,
  loadProject: async () => {}, setActiveSession: () => {}, beginSession: async () => null,
  setCaptureNav: () => {}, resetCaptureNav: () => {}, setPhotoGroupId: () => {},
  incrementTodayCount: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeSession, setActiveSession] = useState<InspectionSession | null>(null);
  const [captureNav, setCaptureNavState] = useState<CaptureNav>(defaultNav);
  const [todayPhotoCount, setTodayPhotoCount] = useState(0);

  const loadProject = useCallback(async () => {
    try {
      await Promise.race([
        getDatabase(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('db-init-timeout')), Platform.OS === 'web' ? 2000 : 15000),
        ),
      ]);
      const p = await getProject();
      setProject(p);
      if (p) {
        const session = await getActiveSession(p.id);
        setActiveSession(session);
        const { getTodayPhotoCount } = await import('@/db/database');
        const count = await getTodayPhotoCount();
        setTodayPhotoCount(count);
      }
    } catch (e) {
      console.error('loadProject error:', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => { loadProject(); }, [loadProject]);

  const beginSession = useCallback(async (): Promise<InspectionSession | null> => {
    if (!project) return null;
    const existing = await getActiveSession(project.id);
    if (existing) {
      setActiveSession(existing);
      setCaptureNavState(prev => ({ ...prev, sessionId: existing.id }));
      return existing;
    }
    const id = await startSession(project.id);
    const { getSessionById } = await import('@/db/database');
    const session = await getSessionById(id);
    setActiveSession(session);
    setCaptureNavState(prev => ({ ...prev, sessionId: session?.id ?? id }));
    return session;
  }, [project]);

  const setCaptureNav = useCallback((nav: Partial<CaptureNav>) => {
    setCaptureNavState(prev => ({ ...prev, ...nav }));
  }, []);

  const resetCaptureNav = useCallback(() => {
    setCaptureNavState(defaultNav);
  }, []);

  const setPhotoGroupId = useCallback((id: number) => {
    setCaptureNavState(prev => ({ ...prev, photoGroupId: id }));
  }, []);

  const incrementTodayCount = useCallback(() => {
    setTodayPhotoCount(c => c + 1);
  }, []);

  return (
    <AppContext.Provider value={{
      project, isReady, isSetupComplete: !!project,
      activeSession, captureNav, todayPhotoCount,
      loadProject, setActiveSession, beginSession,
      setCaptureNav, resetCaptureNav, setPhotoGroupId, incrementTodayCount,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
