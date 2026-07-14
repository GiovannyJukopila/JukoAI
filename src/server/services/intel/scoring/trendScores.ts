/**
 * Deterministic trend scoring (method "v1"). Every number is a function of REAL
 * collected metrics/timestamps — never produced by the LLM. All outputs 0-100.
 */
export type SignalForScore = {
  platform: string;
  metrics: Record<string, number> | null;
  observedAt: Date | null;
  fetchedAt: Date;
};

export type TrendScoreVector = {
  momentum: number;
  volume: number;
  crossPlatform: number;
  competition: number;
  evergreen: number;
  confidence: number;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const when = (s: SignalForScore) => (s.observedAt ?? s.fetchedAt).getTime();
const engagementOf = (s: SignalForScore) => {
  const m = s.metrics ?? {};
  // points/comments from forums; mentions = news coverage (one article each).
  return (m.points ?? 0) + (m.comments ?? 0) * 2 + (m.mentions ?? 0) * 8 + (m.volume ?? 0) + (m.views ?? 0) / 1000;
};

export function scoreTrend(signals: SignalForScore[]): TrendScoreVector {
  const n = Math.max(1, signals.length);
  const platforms = new Set(signals.map((s) => s.platform));
  const totalEngagement = signals.reduce((a, s) => a + engagementOf(s), 0);
  const now = Date.now();
  const fresh = signals.filter((s) => now - when(s) < 24 * 3600e3).length;

  // volume: log-normalized cross-source engagement (soft cap ~5000).
  const volume = clamp((100 * Math.log1p(totalEngagement)) / Math.log1p(5000));
  // crossPlatform: corroboration across distinct platforms.
  const crossPlatform = clamp(Math.min(100, 25 * platforms.size));
  // momentum: recency share blended with volume.
  const momentum = clamp((fresh / n) * 60 + volume * 0.4);
  // confidence: more signals + more platforms + some fresh evidence.
  const confidence = clamp(
    (Math.log1p(n) / Math.log1p(8)) * 50 + (platforms.size >= 2 ? 30 : 10) + (fresh > 0 ? 20 : 0),
  );
  // evergreen: observation span in days (spikes score low, steady spans high).
  const times = signals.map(when);
  const spanDays = (Math.max(...times) - Math.min(...times)) / 86400e3;
  const evergreen = clamp(Math.min(100, spanDays * 15));
  // competition: crude saturation proxy — more items on the same topic = more crowded.
  const competition = clamp(Math.min(100, n * 8));

  return { momentum, volume, crossPlatform, competition, evergreen, confidence };
}

/** Aggregate observation strength for the momentum time-series. */
export function observationOf(signals: SignalForScore[]) {
  return {
    volume: Math.round(signals.reduce((a, s) => a + engagementOf(s), 0)),
    engagement: Math.round(signals.reduce((a, s) => a + (s.metrics?.comments ?? 0), 0)),
    sourcesCount: new Set(signals.map((s) => s.platform)).size,
  };
}
