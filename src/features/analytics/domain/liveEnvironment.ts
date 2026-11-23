import type { EnvironmentHistoryData, LatestEnvironmentData } from './entities/EnvironmentHistory';

export const LIVE_WINDOW_MS = 15 * 60_000;

/** Keep real samples across polls; repeated readings are not new measurements. */
export function appendLiveEnvironment(previous: LatestEnvironmentData | undefined, next: LatestEnvironmentData): LatestEnvironmentData {
  if (previous && next.fetchedAt < previous.fetchedAt) return previous;
  const cutoff = next.fetchedAt - LIVE_WINDOW_MS;
  const series = next.floors.map(floor => {
    const previousFloor = previous?.series?.find(item => item.floorId === floor.floorId);
    const sameSource = previousFloor?.masterId === floor.masterId && previousFloor?.nodeId === floor.nodeId;
    const points = (sameSource && previousFloor ? previousFloor.points : []).filter(point => point.timestamp >= cutoff);
    const sample = floor.points[0];
    const last = points[points.length - 1];
    if (sample && (!last || sample.timestamp >= last.timestamp)) {
      if (last && sample.timestamp === last.timestamp) points.pop();
      else if (last && sample.timestamp - last.timestamp > 60_000) {
        points.push({ timestamp: last.timestamp + 60_000, temperature: null, humidity: null });
      }
      points.push({ ...sample, isLive: true });
    } else if (!sample && (!last || last.temperature != null || last.humidity != null)) {
      points.push({ timestamp: next.fetchedAt, temperature: null, humidity: null });
    }
    return { ...floor, points: points.slice(-240) };
  });
  return { ...next, series };
}

export function liveEnvironmentChart(latest: LatestEnvironmentData | undefined, now: number): EnvironmentHistoryData | undefined {
  if (!latest) return undefined;
  const to = Math.max(now, latest.fetchedAt);
  const timestamps = (latest.series || []).flatMap(floor => floor.points.map(point => point.timestamp));
  const first = timestamps.length ? Math.min(...timestamps) : to;
  return {
    from: Math.max(to - LIVE_WINDOW_MS, Math.min(first, to - 60_000)), to, bucketMs: 5000, refreshAfterMs: 5000,
    floors: (latest.series || []).map(floor => ({
      ...floor, points: floor.points.filter(point => point.timestamp >= to - LIVE_WINDOW_MS),
    })),
  };
}
