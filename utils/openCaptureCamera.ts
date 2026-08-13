import type { Router } from 'expo-router';
import type { CaptureNav } from '@/context/AppContext';
import {
  getOrCreatePhotoGroup,
  type PhotoLocation,
  type Service,
} from '@/db/database';

export async function openCaptureCamera(opts: {
  sessionId: number;
  location: PhotoLocation;
  service: Service | null;
  navPatch: Partial<CaptureNav>;
  setCaptureNav: (nav: Partial<CaptureNav>) => void;
  setPhotoGroupId: (id: number) => void;
  router: Pick<Router, 'push'>;
}): Promise<void> {
  const groupId = await getOrCreatePhotoGroup(opts.sessionId, opts.location, opts.service?.id ?? null);
  opts.setCaptureNav({ ...opts.navPatch, service: opts.service });
  opts.setPhotoGroupId(groupId);
  opts.router.push('/registrar/camera');
}
