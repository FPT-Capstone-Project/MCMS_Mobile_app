import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useGetLatestEnvironmentQuery } from '../../data/environmentHistoryApi';
import { liveEnvironmentChart } from '../../domain/liveEnvironment';

/** Share one lightweight query; poll only while this screen and app are active. */
export function useLiveEnvironment(accountId: string, enabled: boolean) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  const running = enabled && focused && active;
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const query = useGetLatestEnvironmentQuery({ accountId }, {
    skip: !running,
    pollingInterval: running ? 5000 : 0,
    refetchOnMountOrArgChange: true,
  });
  // Do not present the last successful response as live when the connection fails.
  const data = !query.error && query.currentData && clock - (query.fulfilledTimeStamp || 0) < 15_000
    ? query.currentData : undefined;
  const serverNow = query.currentData
    ? query.currentData.fetchedAt + Math.max(0, clock - (query.fulfilledTimeStamp || clock)) : clock;
  return { ...query, data, chart: liveEnvironmentChart(query.currentData, serverNow) };
}
