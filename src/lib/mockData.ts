export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type AnomalyType = "rule" | "statistical" | "ml" | "enumerator" | "cluster" | "historical";

export interface SurveyRecord {
  id: string;
  state: string;
  district: string;
  clusterId: string;
  householdId: string;
  enumeratorId: string;
  period: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  householdSize: number;
  employment: "Employed" | "Unemployed" | "Not in Labour Force";
  income: number;
  workingHours: number;
  area: "Urban" | "Rural";
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
  types: AnomalyType[];
}

export const STATES: Record<string, string[]> = {
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"],
  Maharashtra: ["Mumbai Suburban", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  "Uttar Pradesh": ["Lucknow", "Kanpur Nagar", "Varanasi", "Agra", "Gorakhpur"],
  Karnataka: ["Bengaluru Urban", "Mysuru", "Belagavi", "Hubballi-Dharwad"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Murshidabad"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
  Kerala: ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  Odisha: ["Khordha", "Cuttack", "Sambalpur", "Ganjam"],
};

export const PERIODS = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"];

export const REASON_POOL: { text: string; type: AnomalyType }[] = [
  { text: "Age outside valid range (0–100)", type: "rule" },
  { text: "Negative income value recorded", type: "rule" },
  { text: "Working hours exceed the physically possible weekly maximum", type: "rule" },
  { text: "Household size inconsistent with the number of listed members", type: "rule" },
  { text: "Income reported despite 'Not in Labour Force' status", type: "rule" },
  { text: "Income is 4.2 standard deviations above the local distribution", type: "statistical" },
  { text: "Working hours fall in the top 0.3% of the district distribution", type: "statistical" },
  { text: "Value lies far outside the interquartile range for this cluster", type: "statistical" },
  { text: "Isolation Forest identifies this record as anomalous", type: "ml" },
  { text: "Local Outlier Factor indicates this record differs from its cluster neighborhood", type: "ml" },
  { text: "Autoencoder reconstruction error is unusually high for this record", type: "ml" },
  { text: "Enumerator's anomaly rate is significantly above the peer-group average", type: "enumerator" },
  { text: "Enumerator submitted an unusually high number of records in a single day", type: "enumerator" },
  { text: "Repeated identical response patterns detected across this enumerator's records", type: "enumerator" },
  { text: "Cluster shows an unusual concentration of similar household profiles", type: "cluster" },
  { text: "Neighbouring households in this cluster report near-identical incomes", type: "cluster" },
  { text: "Historical data shows a deviation from the expected pattern for this district", type: "historical" },
  { text: "District anomaly rate has doubled compared with the previous survey period", type: "historical" },
  { text: "Significant temporal drift detected versus the last four quarters", type: "historical" },
];

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function riskLevelFor(score: number): RiskLevel {
  if (score <= 30) return "Low";
  if (score <= 60) return "Medium";
  if (score <= 80) return "High";
  return "Critical";
}

export const RISK_LEVELS: RiskLevel[] = ["Low", "Medium", "High", "Critical"];

export function generateDataset(seed = Date.now() % 100000, count = 780): SurveyRecord[] {
  const rand = mulberry32(seed);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  const stateNames = Object.keys(STATES);
  const enumerators = Array.from({ length: 80 }, (_, i) => `E${String(i + 1).padStart(3, "0")}`);
  // uneven distribution weights
  const weights = enumerators.map(() => 0.3 + rand() * 2);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const pickEnumerator = () => {
    let r = rand() * totalWeight;
    for (let i = 0; i < enumerators.length; i++) {
      r -= weights[i]!;
      if (r <= 0) return enumerators[i]!;
    }
    return enumerators[0]!;
  };

  const reasonsOfType = (types: AnomalyType[], n: number) => {
    const pool = REASON_POOL.filter((r) => types.includes(r.type));
    const out: { text: string; type: AnomalyType }[] = [];
    while (out.length < Math.min(n, pool.length)) {
      const c = pick(pool);
      if (!out.some((o) => o.text === c.text)) out.push(c);
    }
    return out;
  };

  const records: SurveyRecord[] = [];
  for (let i = 0; i < count; i++) {
    const state = pick(stateNames);
    const district = pick(STATES[state]!);
    const area: "Urban" | "Rural" = rand() < 0.4 ? "Urban" : "Rural";
    const employment =
      rand() < 0.62 ? "Employed" : rand() < 0.55 ? "Unemployed" : "Not in Labour Force";
    let age = Math.round(15 + Math.abs(rand() + rand() + rand() - 1.5) * 33);
    age = Math.min(85, Math.max(15, age));
    let workingHours =
      employment === "Employed" ? Math.round(28 + rand() * 26) : rand() < 0.2 ? int(1, 10) : 0;
    const base = area === "Urban" ? 24000 : 12000;
    let income =
      employment === "Employed"
        ? Math.round((base + rand() * base * 1.6) / 100) * 100
        : employment === "Unemployed"
          ? Math.round(rand() * 2500)
          : 0;

    const roll = rand();
    let riskScore: number;
    let types: AnomalyType[] = [];
    let reasons: string[] = [];

    if (roll < 0.03) {
      // obvious rule-breaking anomaly
      const kind = int(0, 2);
      if (kind === 0) age = int(101, 145);
      else if (kind === 1) income = -int(5000, 90000);
      else workingHours = int(95, 140);
      riskScore = int(84, 99);
      types = ["rule", "statistical"];
      const rs = reasonsOfType(["rule"], 1).concat(reasonsOfType(["statistical", "ml"], int(1, 2)));
      reasons = rs.map((r) => r.text);
      types = Array.from(new Set(rs.map((r) => r.type)));
    } else if (roll < 0.1) {
      // subtle contextual anomaly
      if (rand() < 0.5) income = int(900000, 2900000);
      else workingHours = int(82, 96);
      riskScore = int(62, 93);
      const rs = reasonsOfType(["statistical", "ml", "enumerator", "cluster", "historical"], int(2, 4));
      reasons = rs.map((r) => r.text);
      types = Array.from(new Set(rs.map((r) => r.type)));
    } else {
      riskScore = Math.round(Math.pow(rand(), 1.6) * 42);
      if (riskScore > 30) {
        const rs = reasonsOfType(["statistical", "enumerator", "historical"], 1);
        reasons = rs.map((r) => r.text);
        types = rs.map((r) => r.type);
      }
    }

    records.push({
      id: `REC-${String(i + 1).padStart(5, "0")}`,
      state,
      district,
      clusterId: `CL-${String(int(1, 240)).padStart(4, "0")}`,
      householdId: `HH-${String(int(1, 9999)).padStart(5, "0")}`,
      enumeratorId: pickEnumerator(),
      period: PERIODS[Math.min(PERIODS.length - 1, Math.floor(Math.pow(rand(), 0.7) * PERIODS.length))]!,
      age,
      gender: rand() < 0.49 ? "Male" : rand() < 0.98 ? "Female" : "Other",
      householdSize: Math.max(1, Math.min(8, Math.round(2 + Math.abs(rand() + rand() - 1) * 5))),
      employment,
      income,
      workingHours,
      area,
      riskScore,
      riskLevel: riskLevelFor(riskScore),
      reasons,
      types,
    });
  }
  return records;
}

export const inr = (n: number) =>
  `${n < 0 ? "-" : ""}₹${Math.abs(n).toLocaleString("en-IN")}`;

export function recommendation(rec: SurveyRecord): string {
  if (rec.riskLevel === "Critical")
    return `Record ${rec.id} shows strong signals that require review. We recommend contacting enumerator ${rec.enumeratorId} and re-verifying this household in ${rec.district}, ${rec.state} before the data is finalised.`;
  if (rec.riskLevel === "High")
    return `This record differs meaningfully from similar households in ${rec.district}. A quick call-back to confirm the reported figures would resolve most of the uncertainty.`;
  if (rec.riskLevel === "Medium")
    return `Signals here are moderate. Include ${rec.id} in the next routine sample check for ${rec.district}; no immediate action is needed.`;
  return `No meaningful signals were detected for ${rec.id}. It matches the expected pattern for its district and can be treated as normal.`;
}
