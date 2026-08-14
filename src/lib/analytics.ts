import { PERIODS, RISK_LEVELS, type RiskLevel, type SurveyRecord } from "./mockData";

export const isAnomaly = (r: SurveyRecord) => r.riskScore > 30;

export function summarize(records: SurveyRecord[]) {
  const total = records.length;
  const counts: Record<RiskLevel, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  for (const r of records) counts[r.riskLevel] += 1;
  const anomalies = records.filter(isAnomaly).length;
  return {
    total,
    counts,
    valid: counts.Low,
    warning: counts.Medium + counts.High,
    critical: counts.Critical,
    anomalies,
    rate: total ? (anomalies / total) * 100 : 0,
  };
}

export function riskDistribution(records: SurveyRecord[]) {
  const s = summarize(records);
  return RISK_LEVELS.map((level) => ({ level, value: s.counts[level] }));
}

export function periodTrend(records: SurveyRecord[]) {
  return PERIODS.map((period) => {
    const rs = records.filter((r) => r.period === period);
    const an = rs.filter(isAnomaly).length;
    return {
      period,
      records: rs.length,
      anomalies: an,
      rate: rs.length ? +((an / rs.length) * 100).toFixed(1) : 0,
      avgIncome: rs.length ? Math.round(rs.reduce((a, b) => a + b.income, 0) / rs.length) : 0,
      avgHours: rs.length ? +(rs.reduce((a, b) => a + b.workingHours, 0) / rs.length).toFixed(1) : 0,
    };
  });
}

export interface GroupStat {
  key: string;
  state?: string;
  records: number;
  anomalies: number;
  rate: number;
  riskScore: number;
  topReasons: { reason: string; count: number }[];
}

function buildStat(key: string, rs: SurveyRecord[], state?: string): GroupStat {
  const anomalies = rs.filter(isAnomaly).length;
  const reasonCount = new Map<string, number>();
  for (const r of rs) for (const reason of r.reasons) reasonCount.set(reason, (reasonCount.get(reason) ?? 0) + 1);
  return {
    key,
    state,
    records: rs.length,
    anomalies,
    rate: rs.length ? +((anomalies / rs.length) * 100).toFixed(1) : 0,
    riskScore: rs.length ? Math.round(rs.reduce((a, b) => a + b.riskScore, 0) / rs.length) : 0,
    topReasons: [...reasonCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([reason, count]) => ({ reason, count })),
  };
}

export function byDistrict(records: SurveyRecord[]): GroupStat[] {
  const map = new Map<string, SurveyRecord[]>();
  for (const r of records) {
    const k = `${r.state}||${r.district}`;
    const arr = map.get(k);
    if (arr) arr.push(r);
    else map.set(k, [r]);
  }
  return [...map.entries()]
    .map(([k, rs]) => buildStat(k.split("||")[1] ?? k, rs, k.split("||")[0]))
    .sort((a, b) => b.riskScore - a.riskScore);
}

export function byEnumerator(records: SurveyRecord[]): GroupStat[] {
  const map = new Map<string, SurveyRecord[]>();
  for (const r of records) {
    const arr = map.get(r.enumeratorId);
    if (arr) arr.push(r);
    else map.set(r.enumeratorId, [r]);
  }
  return [...map.entries()].map(([k, rs]) => buildStat(k, rs)).sort((a, b) => b.rate - a.rate);
}

export function peerAverage(stats: GroupStat[]) {
  if (!stats.length) return 0;
  return +(stats.reduce((a, b) => a + b.rate, 0) / stats.length).toFixed(1);
}

export const riskColor = (level: RiskLevel) =>
  ({
    Low: "var(--risk-low)",
    Medium: "var(--risk-medium)",
    High: "var(--risk-high)",
    Critical: "var(--risk-critical)",
  })[level];

export function scoreToLevel(score: number): RiskLevel {
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  if (score <= 80) return "High";
  return "Critical";
}
