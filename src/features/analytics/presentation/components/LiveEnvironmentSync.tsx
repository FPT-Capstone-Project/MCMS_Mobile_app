import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../../auth';
import { environmentHistoryApi } from '../../data/environmentHistoryApi';

/** Keep the shared live history collecting across routes while the app is active. */
export function LiveEnvironmentSync() {
  const { user, status, isAdmin, isFarmOperator } = useAuth();
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);

  const running = active && status === 'authenticated' && !!user && (isAdmin || isFarmOperator);
  environmentHistoryApi.endpoints.getLatestEnvironment.useQuerySubscription(
    { accountId: user?.id || '' },
    {
      skip: !running,
      pollingInterval: running ? 5000 : 0,
      refetchOnMountOrArgChange: true,
    },
  );

  return null;
}
