import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getShowServices, setShowServices } from '@/db/database';

export function useShowServices() {
  const [showServices, setShow] = useState(true);

  useFocusEffect(useCallback(() => {
    void getShowServices().then(setShow);
  }, []));

  const setShowServicesPref = useCallback(async (value: boolean) => {
    setShow(value);
    await setShowServices(value);
  }, []);

  return { showServices, setShowServicesPref };
}
