import type { SurveyRecord } from "./mockData";
import { byDistrict, byEnumerator, isAnomaly, peerAverage, summarize } from "./analytics";
import { inr } from "./mockData";

export interface ChatAnswer {
  text: string;
  link?: { label: string; to: string; search?: Record<string, string> } | undefined;
}

const GLOSSARY: { keys: string[]; title: string; body: string }[] = [
  {
    keys: ["z-score", "z score", "zscore", "standard deviation"],
    title: "Z-score",
    body:
      "A Z-score tells you how far a value sits from the average, measured in standard deviations. A Z-score of 0 is exactly average; anything beyond ±3 is very unusual. We use it on income and working hours within each district, so a record is only flagged if it is odd compared with its own neighbourhood — not compared with the whole country.",
  },
  {
    keys: ["iqr", "interquartile", "quartile", "box plot", "boxplot"],
    title: "IQR (interquartile range)",
    body:
      "The IQR is the middle 50% of the data — the gap between the 25th and 75th percentile. Anything more than 1.5 IQRs below or above that middle band is treated as an outlier. It is a robust check: unlike an average, a few extreme values cannot drag it around.",
  },
  {
    keys: ["isolation forest", "isolationforest"],
    title: "Isolation Forest",
    body:
      "Isolation Forest is a machine-learning method that repeatedly splits the data at random. Unusual records get separated from the rest after only a few splits, so 'easy to isolate' means 'likely anomalous'. It is good at spotting records that look fine on every single field but strange as a combination.",
  },
  {
    keys: ["lof", "local outlier factor"],
    title: "Local Outlier Factor (LOF)",
    body:
      "LOF compares a record with its nearest neighbours rather than with the whole dataset. If similar households around it report very different values, the record stands out locally even when it looks normal nationally. That makes it useful for catching one odd form inside an otherwise consistent cluster.",
  },
  {
    keys: ["autoencoder", "reconstruction error", "neural"],
    title: "Autoencoder",
    body:
      "An autoencoder learns to compress and then rebuild a typical survey record. When it rebuilds a record badly — a high reconstruction error — that record does not follow the usual patterns and is flagged for review.",
  },
  {
    keys: ["risk score", "risk scoring", "how is risk", "score calculated", "scoring"],
    title: "How the risk score works",
    body:
      "Every record gets a score from 0 to 100. It combines six signals: rule violations (impossible ages, negative income), statistical deviation (Z-score, IQR), machine-learning outliers (Isolation Forest, LOF, autoencoder), enumerator behaviour patterns, cluster similarity, and historical drift against past periods. The more signals that fire — and the stronger they are — the higher the score.",
  },
  {
    keys: ["risk band", "risk level", "critical mean", "bands", "what is high risk"],
    title: "Risk bands",
    body:
      "Low is 0–30 (no action needed), Medium is 31–60 (worth a look), High is 61–80 (should be verified), Critical is 81–100 (re-contact the household or re-survey). Anything above 30 is counted as an anomaly in the dashboard totals.",
  },
  {
    keys: ["plfs", "what is this platform", "what does this app", "how does surveyguard"],
    title: "About SurveyGuard AI",
    body:
      "SurveyGuard AI checks Periodic Labour Force Survey (PLFS) records for data-quality problems. It validates each record, scores it for risk, explains in plain language why it was flagged, and shows you where the problems concentrate — by district, by enumerator and over time.",
  },
  {
    keys: ["ocr", "scanned", "paper form"],
    title: "OCR extraction",
    body:
      "OCR (optical character recognition) reads text out of scanned PDFs and photographs of paper survey forms, so handwritten schedules can be digitised and checked with the same rules as electronic submissions.",
  },
];

export const SUGGESTIONS = [
  "Which district needs urgent review?",
  "Explain risk scoring",
  "Show today's summary",
  "Which enumerator is most concerning?",
];

const FALLBACK_EXAMPLES = [
  "What is the risk score of record REC-00234?",
  "Which district has the most anomalies?",
  "Show me enumerator E003's anomaly rate",
  "What does Z-score mean?",
  "How do I filter for critical records in Chennai?",
];

const num = (n: number) => n.toLocaleString("en-IN");

function findRecord(q: string, records: SurveyRecord[]) {
  const m = q.match(/rec[-\s_]?0*(\d{1,6})/i) ?? q.match(/record\s+#?0*(\d{1,6})/i);
  if (!m) return null;
  const n = Number(m[1]);
  const id = `REC-${String(n).padStart(5, "0")}`;
  return records.find((r) => r.id === id) ?? records.find((r) => r.id.endsWith(String(n))) ?? { missing: id };
}

function findEnumerator(q: string, records: SurveyRecord[]) {
  const m = q.match(/\be[-\s_]?0*(\d{1,4})\b/i);
  if (!m) return null;
  const id = `E${String(Number(m[1])).padStart(3, "0")}`;
  return records.some((r) => r.enumeratorId === id) ? id : `__missing__${id}`;
}

function findDistrict(q: string, records: SurveyRecord[]) {
  const lower = q.toLowerCase();
  const names = [...new Set(records.map((r) => r.district))];
  return names.find((d) => lower.includes(d.toLowerCase())) ?? null;
}

export function answerQuestion(raw: string, records: SurveyRecord[]): ChatAnswer {
  const q = raw.trim();
  const lower = q.toLowerCase();

  if (!records.length) {
    return { text: "I don't have a dataset loaded yet. Upload a survey file (or use the sample PLFS file) and I'll be able to answer with real numbers." };
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lower)) {
    return { text: "Hello! I can look up any record, district or enumerator in the current dataset, or explain how the checks work. What would you like to know?" };
  }

  const s = summarize(records);
  const districts = byDistrict(records);
  const enums = byEnumerator(records);

  // Specific record lookup
  const rec = findRecord(lower, records);
  if (rec) {
    if ("missing" in rec) {
      return { text: `I couldn't find ${rec.missing} in the current dataset. It holds ${num(records.length)} records, from ${records[0]?.id} onwards. Check the ID and try again.` };
    }
    const r = rec as SurveyRecord;
    const reasons = r.reasons.length ? r.reasons.slice(0, 3).map((x) => `• ${x}`).join("\n") : "• No specific issues were raised for this record.";
    return {
      text: `${r.id} has a risk score of ${r.riskScore}/100 — ${r.riskLevel} risk.\n\nWhere it came from: ${r.district}, ${r.state} (${r.area}), collected by enumerator ${r.enumeratorId} in ${r.period}.\nReported income ${inr(r.income)} with ${r.workingHours} working hours a week.\n\nWhy it was flagged:\n${reasons}`,
      link: { label: "Open in Anomaly Explorer", to: "/anomalies", search: { q: r.id } },
    };
  }

  // Enumerator lookup
  const en = findEnumerator(lower, records);
  if (en) {
    if (en.startsWith("__missing__")) {
      return { text: `I don't see enumerator ${en.replace("__missing__", "")} in this dataset. The enumerators currently in the data run from ${enums[0]?.key} upwards — try one of those.` };
    }
    const st = enums.find((x) => x.key === en)!;
    const avg = peerAverage(enums);
    const gap = +(st.rate - avg).toFixed(1);
    return {
      text: `Enumerator ${en} has an anomaly rate of ${st.rate}% — ${gap >= 0 ? `${gap} points above` : `${Math.abs(gap)} points below`} the peer average of ${avg}%.\n\nThey submitted ${num(st.records)} records, of which ${num(st.anomalies)} were flagged. Average risk score across their work is ${st.riskScore}/100.\n\nMost common reason: ${st.topReasons[0]?.reason ?? "none recorded"}.`,
      link: { label: "See enumerator analytics", to: "/enumerators" },
    };
  }

  // District questions
  const district = findDistrict(lower, records);
  if (district) {
    const st = districts.find((d) => d.key === district)!;
    if (/filter|how do i|how to|show me only|find/.test(lower)) {
      const level = /critical/.test(lower) ? "Critical" : /high/.test(lower) ? "High" : null;
      return {
        text: `Here's how: open the Anomaly Explorer, choose ${st.state} under State, then ${district} under District${level ? `, and set Risk level to ${level}` : ""}. The table re-sorts automatically with the highest risk at the top.\n\nI can take you there with those filters already applied.`,
        link: { label: `Open ${district}${level ? ` · ${level}` : ""}`, to: "/anomalies", search: { state: st.state ?? "", district, ...(level ? { level } : {}) } },
      };
    }
    return {
      text: `${district} (${st.state}) has ${num(st.anomalies)} flagged records out of ${num(st.records)} — an anomaly rate of ${st.rate}%, with an average risk score of ${st.riskScore}/100.\n\nMost common reason there: ${st.topReasons[0]?.reason ?? "none recorded"}.`,
      link: { label: `Review ${district}`, to: "/anomalies", search: { state: st.state ?? "", district } },
    };
  }

  // Worst district
  if (/(district|region|area).*(most|highest|worst|urgent|attention|review|risk)|(most|highest|worst|urgent).*(district|region)/.test(lower)) {
    const top = [...districts].sort((a, b) => b.anomalies - a.anomalies)[0];
    const riskiest = districts[0];
    if (!top || !riskiest) return { text: "I couldn't compute district figures for this dataset." };
    return {
      text: `${top.key} (${top.state}) has the most flagged records: ${num(top.anomalies)} out of ${num(top.records)}, a ${top.rate}% anomaly rate.\n\nBy average risk score, ${riskiest.key} is the most severe at ${riskiest.riskScore}/100. I'd start with ${top.key} — the volume is highest, and the leading reason is: ${top.topReasons[0]?.reason ?? "not recorded"}.`,
      link: { label: `Review ${top.key}`, to: "/anomalies", search: { state: top.state ?? "", district: top.key } },
    };
  }

  // Worst enumerator
  if (/(enumerator|field staff|surveyor).*(most|highest|worst|concern|problem|suspicious)|(worst|most concerning).*(enumerator|staff)/.test(lower)) {
    const top = enums[0];
    if (!top) return { text: "I couldn't compute enumerator figures for this dataset." };
    const avg = peerAverage(enums);
    return {
      text: `Enumerator ${top.key} stands out: a ${top.rate}% anomaly rate against a peer average of ${avg}%, across ${num(top.records)} records.\n\nLeading pattern: ${top.topReasons[0]?.reason ?? "not recorded"}. A short check-in call is usually enough to tell a training gap from a data-quality problem.`,
      link: { label: "See enumerator analytics", to: "/enumerators" },
    };
  }

  // Summary
  if (/summary|overview|today|status|how (are|is) (we|things)|health|snapshot|dashboard/.test(lower)) {
    const top = [...districts].sort((a, b) => b.anomalies - a.anomalies)[0];
    return {
      text: `Here's where the current dataset stands:\n\n• ${num(s.total)} records analysed\n• ${num(s.anomalies)} flagged for review (${s.rate.toFixed(1)}%)\n• ${num(s.critical)} critical, ${num(s.counts.High)} high, ${num(s.counts.Medium)} medium\n• ${num(s.valid)} records passed every check\n\nBiggest concentration: ${top?.key ?? "—"}${top ? ` with ${num(top.anomalies)} flagged records` : ""}.`,
      link: { label: "Open the dashboard", to: "/dashboard" },
    };
  }

  // Counts
  if (/how many (records|anomalies|critical|flagged)|total (records|anomalies)|count/.test(lower)) {
    if (/critical/.test(lower)) {
      return { text: `There are ${num(s.critical)} critical records (risk score above 80) in the current dataset of ${num(s.total)}.`, link: { label: "View critical records", to: "/anomalies", search: { level: "Critical" } } };
    }
    if (/anomal|flag/.test(lower)) {
      return { text: `${num(s.anomalies)} of ${num(s.total)} records are flagged — an anomaly rate of ${s.rate.toFixed(1)}%.`, link: { label: "Open Anomaly Explorer", to: "/anomalies" } };
    }
    return { text: `The current dataset contains ${num(s.total)} survey records, of which ${num(s.anomalies)} are flagged for review.` };
  }

  // Glossary
  for (const g of GLOSSARY) {
    if (g.keys.some((k) => lower.includes(k))) return { text: `${g.title}\n\n${g.body}` };
  }

  // Generic how-to
  if (/export|csv|report|download/.test(lower)) {
    return { text: "Go to Reports — it gives you a printable summary of the current dataset and an 'Export CSV' button that downloads every flagged record with its score and reasons.", link: { label: "Open Reports", to: "/reports" } };
  }
  if (/heatmap|map|geograph/.test(lower)) {
    return { text: "The Geographic Heatmap shades every district by its average risk score, so you can see at a glance where problems cluster. Click any district to drill into its records.", link: { label: "Open the heatmap", to: "/heatmap" } };
  }
  if (/trend|over time|historical|drift|quarter/.test(lower)) {
    return { text: `Historical Trends compares anomaly rates across the six survey periods in this dataset (${records[0]?.period ? "Q1 2025 through Q2 2026" : ""}), so you can see whether quality is improving or drifting.`, link: { label: "Open Historical Trends", to: "/trends" } };
  }
  if (/upload|import|file|format/.test(lower)) {
    return { text: "Upload Data accepts CSV, Excel, JSON, XML, TXT, PDF and image files. Drop a file in and the platform detects the format, runs OCR if it's a scan or photo, then validates and scores every record.", link: { label: "Go to Upload", to: "/upload" } };
  }
  if (/filter|how do i|how to/.test(lower)) {
    return { text: "In the Anomaly Explorer you can filter by state, district, enumerator, risk level, survey period and type of signal, and search by record ID or reason. Tell me the district and risk level you want and I'll open it with those filters applied.", link: { label: "Open Anomaly Explorer", to: "/anomalies" } };
  }

  return {
    text: `I'm not sure about that yet, but here's what I can help with:\n\n${FALLBACK_EXAMPLES.map((e) => `• "${e}"`).join("\n")}\n\nI can also open any page with filters already applied.`,
  };
}
