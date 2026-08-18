import type { SurveyRecord } from "./mockData";
import { byDistrict, byEnumerator, peerAverage, summarize, type GroupStat } from "./analytics";
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
const pct = (n: number) => `${n.toFixed(1)}%`;

interface Entities {
  recordIds: string[];
  missingRecordIds: string[];
  enumerators: string[];
  missingEnumerators: string[];
  districts: string[];
  states: string[];
  levels: string[];
}

function extractEntities(lower: string, records: SurveyRecord[]): Entities {
  const recordIds: string[] = [];
  const missingRecordIds: string[] = [];
  for (const m of lower.matchAll(/(?:rec|record)[-\s_#]*0*(\d{1,6})/gi)) {
    const id = `REC-${String(Number(m[1])).padStart(5, "0")}`;
    if (records.some((r) => r.id === id)) recordIds.push(id);
    else missingRecordIds.push(id);
  }
  const enumerators: string[] = [];
  const missingEnumerators: string[] = [];
  for (const m of lower.matchAll(/\b(?:e|enum|enumerator|surveyor)[-\s_#]*0*(\d{1,4})\b/gi)) {
    const id = `E${String(Number(m[1])).padStart(3, "0")}`;
    if (records.some((r) => r.enumeratorId === id)) {
      if (!enumerators.includes(id)) enumerators.push(id);
    } else if (!missingEnumerators.includes(id)) missingEnumerators.push(id);
  }
  const districtNames = [...new Set(records.map((r) => r.district))];
  const stateNames = [...new Set(records.map((r) => r.state))];
  const levels = ["Critical", "High", "Medium", "Low"].filter((l) =>
    new RegExp(`\\b${l.toLowerCase()}\\b`).test(lower),
  );
  return {
    recordIds,
    missingRecordIds,
    enumerators,
    missingEnumerators,
    districts: districtNames.filter((d) => lower.includes(d.toLowerCase())),
    states: stateNames.filter((st) => lower.includes(st.toLowerCase())),
    levels,
  };
}

function verdict(rate: number, peer: number) {
  const gap = rate - peer;
  if (gap > peer * 0.5)
    return "That is well above the peer average, so this looks like an elevated pattern that may need review — it is a signal to check, not proof of a problem.";
  if (gap > 0) return "That sits somewhat above the peer average — worth keeping an eye on, but nothing conclusive on its own.";
  return "That is at or below the peer average, so nothing here suggests a concern right now.";
}

function describeEnumerator(id: string, records: SurveyRecord[], enums: GroupStat[]): ChatAnswer {
  const st = enums.find((x) => x.key === id)!;
  const avg = peerAverage(enums);
  const rank = enums.findIndex((x) => x.key === id) + 1;
  const own = records.filter((r) => r.enumeratorId === id);
  const areas = [...new Set(own.map((r) => r.district))];
  const worst = [...own].sort((a, b) => b.riskScore - a.riskScore)[0];
  const gap = +(st.rate - avg).toFixed(1);
  return {
    text: `Surveyor ${id}\n\n• ${num(st.records)} records collected, ${num(st.anomalies)} flagged (${st.rate}% anomaly rate)\n• Peer average is ${avg}% — ${gap >= 0 ? `${gap} points above` : `${Math.abs(gap)} points below`}, ranked ${rank} of ${enums.length} by anomaly rate\n• Average risk score across their work: ${st.riskScore}/100\n• Works across ${areas.slice(0, 3).join(", ")}${areas.length > 3 ? ` and ${areas.length - 3} more districts` : ""}\n• Most common flag: ${st.topReasons[0]?.reason ?? "none recorded"}\n• Highest-risk record: ${worst ? `${worst.id} at ${worst.riskScore}/100` : "none"}\n\n${verdict(st.rate, avg)}\n\nWant me to show you all of ${id}'s flagged records?`,
    link: { label: `Show ${id}'s records`, to: "/anomalies", search: { q: id } },
  };
}

function listRecords(filtered: SurveyRecord[], label: string, search: Record<string, string>): ChatAnswer {
  if (!filtered.length) {
    return { text: `I couldn't find any records matching ${label} in the current dataset. Try a wider risk level or another district and I'll pull the list.` };
  }
  const top = [...filtered].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6);
  return {
    text: `There are ${num(filtered.length)} records matching ${label}. The highest-risk ones:\n\n${top
      .map((r) => `• ${r.id} — ${r.riskScore}/100 (${r.riskLevel}), ${r.district}, enumerator ${r.enumeratorId}`)
      .join("\n")}${filtered.length > top.length ? `\n\n…and ${num(filtered.length - top.length)} more.` : ""}\n\nWant me to open these in the Anomaly Explorer with the filters applied?`,
    link: { label: "Open filtered list", to: "/anomalies", search },
  };
}

export function answerQuestion(raw: string, records: SurveyRecord[]): ChatAnswer {
  const q = raw.trim();
  const lower = q.toLowerCase();

  if (!records.length) {
    return { text: "I don't have a dataset loaded yet. Upload a survey file (or use the sample PLFS file) and I'll be able to answer with real numbers." };
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you)\b/.test(lower)) {
    return { text: "Hello! I can look up any record, district, state or surveyor in the current dataset, compare them, list flagged records, or explain how the checks work. What would you like to know?" };
  }

  const s = summarize(records);
  const districts = byDistrict(records);
  const enums = byEnumerator(records);
  const peer = peerAverage(enums);
  const e = extractEntities(lower, records);

  const stateStats = (() => {
    const map = new Map<string, SurveyRecord[]>();
    for (const r of records) {
      const arr = map.get(r.state);
      if (arr) arr.push(r);
      else map.set(r.state, [r]);
    }
    return [...map.entries()]
      .map(([key, rs]) => {
        const an = rs.filter((r) => r.riskScore > 30).length;
        return {
          key,
          records: rs.length,
          anomalies: an,
          rate: +((an / rs.length) * 100).toFixed(1),
          riskScore: Math.round(rs.reduce((a, b) => a + b.riskScore, 0) / rs.length),
        };
      })
      .sort((a, b) => b.rate - a.rate);
  })();

  const wantsList = /\b(list|show|give me|which records|all )\b/.test(lower);

  // ---- Record lookups ----
  if (e.recordIds.length) {
    const rs = e.recordIds.map((id) => records.find((r) => r.id === id)!);
    if (rs.length > 1) {
      const worst = [...rs].sort((a, b) => b.riskScore - a.riskScore)[0]!;
      return {
        text: `Comparing those records:\n\n${rs
          .map((r) => `• ${r.id} — ${r.riskScore}/100 (${r.riskLevel}), ${r.district}, ${inr(r.income)}, ${r.workingHours} hrs/week, enumerator ${r.enumeratorId}`)
          .join("\n")}\n\n${worst.id} carries the higher risk and is the one I'd verify first.`,
        link: { label: "Open Anomaly Explorer", to: "/anomalies" },
      };
    }
    const r = rs[0]!;
    const reasons = r.reasons.length ? r.reasons.slice(0, 3).map((x) => `• ${x}`).join("\n") : "• No specific issues were raised for this record.";
    return {
      text: `${r.id} has a risk score of ${r.riskScore}/100 — ${r.riskLevel} risk.\n\nWhere it came from: ${r.district}, ${r.state} (${r.area}), collected by enumerator ${r.enumeratorId} in ${r.period}.\nReported income ${inr(r.income)} with ${r.workingHours} working hours a week.\n\nWhy it was flagged:\n${reasons}\n\nWant me to show the rest of ${r.enumeratorId}'s records, or the other flags in ${r.district}?`,
      link: { label: "Open in Anomaly Explorer", to: "/anomalies", search: { q: r.id } },
    };
  }
  if (e.missingRecordIds.length && !e.enumerators.length) {
    const id = e.missingRecordIds[0]!;
    const worst = [...records].sort((a, b) => b.riskScore - a.riskScore)[0]!;
    return {
      text: `I couldn't find ${id} in the current dataset — it holds ${num(records.length)} records, from ${records[0]?.id} to ${records[records.length - 1]?.id}.\n\nIn the meantime, the highest-risk record loaded right now is ${worst.id} at ${worst.riskScore}/100 in ${worst.district}.`,
      link: { label: "Open Anomaly Explorer", to: "/anomalies" },
    };
  }

  // ---- Surveyors / enumerators ----
  if (e.enumerators.length > 1) {
    const picked = e.enumerators.slice(0, 3).map((id) => enums.find((x) => x.key === id)!);
    const best = [...picked].sort((a, b) => a.rate - b.rate)[0]!;
    const worst = [...picked].sort((a, b) => b.rate - a.rate)[0]!;
    return {
      text: `Comparing surveyors (peer average ${peer}%):\n\n${picked
        .map((p) => `• ${p.key} — ${p.rate}% anomaly rate, ${num(p.anomalies)} of ${num(p.records)} records flagged, avg risk ${p.riskScore}/100`)
        .join("\n")}\n\n${worst.key} has the higher anomaly rate (${worst.rate}%) and ${best.key} the lower (${best.rate}%). ${verdict(worst.rate, peer)}\n\nWant a full profile for ${worst.key}?`,
      link: { label: "See enumerator analytics", to: "/enumerators" },
    };
  }
  if (e.enumerators.length === 1) {
    const id = e.enumerators[0]!;
    const own = records.filter((r) => r.enumeratorId === id);
    if (wantsList && /record|flag|anomal|critical|high|medium|low/.test(lower)) {
      const filtered = e.levels.length ? own.filter((r) => e.levels.includes(r.riskLevel)) : own.filter((r) => r.riskScore > 30);
      return listRecords(filtered, `enumerator ${id}${e.levels.length ? ` at ${e.levels[0]} risk` : " (flagged)"}`, {
        q: id,
        ...(e.levels.length ? { level: e.levels[0]! } : {}),
      });
    }
    if (/how many|count|number of/.test(lower)) {
      const st = enums.find((x) => x.key === id)!;
      return {
        text: `Enumerator ${id} collected ${num(st.records)} records in this dataset, and ${num(st.anomalies)} of them are flagged (${st.rate}% anomaly rate, against a peer average of ${peer}%).\n\nWant me to show you all of ${id}'s flagged records?`,
        link: { label: `Show ${id}'s records`, to: "/anomalies", search: { q: id } },
      };
    }
    return describeEnumerator(id, records, enums);
  }
  if (e.missingEnumerators.length) {
    const id = e.missingEnumerators[0]!;
    const sorted = enums.map((x) => x.key).sort();
    return {
      text: `I don't see surveyor ${id} in this dataset. It covers ${enums.length} enumerators, from ${sorted[0]} to ${sorted[sorted.length - 1]}.\n\nThe one standing out most right now is ${enums[0]?.key} at a ${enums[0]?.rate}% anomaly rate.`,
      link: { label: "See enumerator analytics", to: "/enumerators" },
    };
  }

  const staffWord = /(enumerator|surveyor|field staff|staff)/.test(lower);

  // surveyors in a place
  if (staffWord && (e.states.length || e.districts.length)) {
    const place = e.districts[0] ?? e.states[0]!;
    const inPlace = records.filter((r) => (e.districts.length ? r.district === place : r.state === place));
    const ids = [...new Set(inPlace.map((r) => r.enumeratorId))];
    const ranked = ids.map((id) => enums.find((x) => x.key === id)!).sort((a, b) => b.rate - a.rate);
    return {
      text: `${ranked.length} surveyors have records in ${place}:\n\n${ranked
        .slice(0, 8)
        .map((r) => `• ${r.key} — ${r.rate}% anomaly rate over ${num(r.records)} records`)
        .join("\n")}${ranked.length > 8 ? `\n\n…and ${ranked.length - 8} more.` : ""}${ranked[0] ? `\n\n${ranked[0].key} has the highest anomaly rate of the group. Want their full profile?` : ""}`,
      link: { label: "See enumerator analytics", to: "/enumerators" },
    };
  }

  // threshold questions
  const thresh = lower.match(/(?:above|over|more than|greater than|higher than)\s*(\d{1,3})\s*%?/);
  if (thresh && staffWord) {
    const t = Number(thresh[1]);
    const hits = enums.filter((x) => x.rate > t);
    return {
      text: `${hits.length} surveyors have an anomaly rate above ${t}% (peer average is ${peer}%):\n\n${
        hits
          .slice(0, 10)
          .map((x) => `• ${x.key} — ${x.rate}% (${num(x.anomalies)} of ${num(x.records)} flagged)`)
          .join("\n") || "• none"
      }${hits.length > 10 ? `\n\n…and ${hits.length - 10} more.` : ""}\n\nWant a full profile for any of them?`,
      link: { label: "See enumerator analytics", to: "/enumerators" },
    };
  }

  if (staffWord && /(most|highest|worst|concern|problem|suspicious|top|risky|review|investigate|trust)/.test(lower)) {
    const top = enums[0]!;
    return {
      text: `Surveyor ${top.key} stands out most: a ${top.rate}% anomaly rate against a peer average of ${peer}%, across ${num(top.records)} records (${num(top.anomalies)} flagged, average risk ${top.riskScore}/100).\n\nLeading pattern: ${top.topReasons[0]?.reason ?? "not recorded"}. Next after them: ${enums[1]?.key} at ${enums[1]?.rate}% and ${enums[2]?.key} at ${enums[2]?.rate}%.\n\nWant me to show all of ${top.key}'s flagged records?`,
      link: { label: `Show ${top.key}'s records`, to: "/anomalies", search: { q: top.key } },
    };
  }

  // ---- States ----
  if (e.states.length > 1) {
    const picked = e.states.slice(0, 3).map((k) => stateStats.find((x) => x.key === k)!);
    const worst = [...picked].sort((a, b) => b.rate - a.rate)[0]!;
    return {
      text: `Comparing states:\n\n${picked
        .map((p) => `• ${p.key} — ${p.rate}% anomaly rate, ${num(p.anomalies)} of ${num(p.records)} flagged, avg risk ${p.riskScore}/100`)
        .join("\n")}\n\n${worst.key} is the more concerning of these at ${worst.rate}%. Want its district breakdown?`,
      link: { label: `Review ${worst.key}`, to: "/anomalies", search: { state: worst.key } },
    };
  }
  if (e.states.length === 1 && !e.districts.length) {
    const st = stateStats.find((x) => x.key === e.states[0])!;
    const inState = records.filter((r) => r.state === st.key);
    if (wantsList || e.levels.length) {
      const filtered = e.levels.length ? inState.filter((r) => e.levels.includes(r.riskLevel)) : inState.filter((r) => r.riskScore > 30);
      return listRecords(filtered, `${e.levels[0] ?? "flagged"} records in ${st.key}`, {
        state: st.key,
        ...(e.levels.length ? { level: e.levels[0]! } : {}),
      });
    }
    const topD = districts.filter((d) => d.state === st.key).sort((a, b) => b.rate - a.rate)[0];
    return {
      text: `${st.key} has ${num(st.anomalies)} flagged records out of ${num(st.records)} — a ${st.rate}% anomaly rate, average risk score ${st.riskScore}/100.\n\nWorst district inside it: ${topD?.key ?? "—"}${topD ? ` at ${topD.rate}%` : ""}.\n\nWant the list of critical records in ${st.key}?`,
      link: { label: `Review ${st.key}`, to: "/anomalies", search: { state: st.key } },
    };
  }

  // ---- Districts ----
  if (e.districts.length > 1) {
    const picked = e.districts.slice(0, 3).map((k) => districts.find((d) => d.key === k)!);
    const worst = [...picked].sort((a, b) => b.rate - a.rate)[0]!;
    return {
      text: `Comparing districts:\n\n${picked
        .map((p) => `• ${p.key} (${p.state}) — ${p.rate}% anomaly rate, ${num(p.anomalies)} of ${num(p.records)} flagged, avg risk ${p.riskScore}/100`)
        .join("\n")}\n\n${worst.key} looks more concerning at ${worst.rate}% and would be my first stop. Want its flagged records?`,
      link: { label: `Review ${worst.key}`, to: "/anomalies", search: { state: worst.state ?? "", district: worst.key } },
    };
  }
  if (e.districts.length === 1) {
    const district = e.districts[0]!;
    const st = districts.find((d) => d.key === district)!;
    const inDistrict = records.filter((r) => r.district === district);
    if (wantsList || e.levels.length) {
      const filtered = e.levels.length ? inDistrict.filter((r) => e.levels.includes(r.riskLevel)) : inDistrict.filter((r) => r.riskScore > 30);
      return listRecords(filtered, `${e.levels[0] ?? "flagged"} records in ${district}`, {
        state: st.state ?? "",
        district,
        ...(e.levels.length ? { level: e.levels[0]! } : {}),
      });
    }
    if (/should i|worth|investigate|trust|worry|concern|risky|priority|problem/.test(lower)) {
      return {
        text: `${district} (${st.state}) has a ${st.rate}% anomaly rate against a dataset-wide ${pct(s.rate)}, with ${num(st.anomalies)} flagged of ${num(st.records)} records and an average risk score of ${st.riskScore}/100.\n\n${st.rate > s.rate ? `That is above the overall rate, so ${district} shows an elevated pattern and may be worth reviewing — start with its critical records.` : `That is at or below the overall rate, so ${district} doesn't stand out as urgent right now.`}\n\nLeading reason there: ${st.topReasons[0]?.reason ?? "none recorded"}.`,
        link: { label: `Review ${district}`, to: "/anomalies", search: { state: st.state ?? "", district } },
      };
    }
    if (/filter|how do i|how to/.test(lower)) {
      return {
        text: `Open the Anomaly Explorer, choose ${st.state} under State, then ${district} under District. The table re-sorts automatically with the highest risk at the top.\n\nI can take you there with those filters already applied.`,
        link: { label: `Open ${district}`, to: "/anomalies", search: { state: st.state ?? "", district } },
      };
    }
    return {
      text: `${district} (${st.state}) has ${num(st.anomalies)} flagged records out of ${num(st.records)} — an anomaly rate of ${st.rate}%, with an average risk score of ${st.riskScore}/100.\n\nMost common reason there: ${st.topReasons[0]?.reason ?? "none recorded"}.\n\nWant the list of its critical records?`,
      link: { label: `Review ${district}`, to: "/anomalies", search: { state: st.state ?? "", district } },
    };
  }

  // ---- Highest state / district ----
  if (/state/.test(lower) && /(most|highest|worst|top|urgent|rate|anomal)/.test(lower)) {
    const top = stateStats[0]!;
    return {
      text: `${top.key} has the highest anomaly rate at ${top.rate}% (${num(top.anomalies)} flagged of ${num(top.records)} records, average risk ${top.riskScore}/100).\n\nNext: ${stateStats[1]?.key} at ${stateStats[1]?.rate}% and ${stateStats[2]?.key} at ${stateStats[2]?.rate}%.\n\nWant the district breakdown for ${top.key}?`,
      link: { label: `Review ${top.key}`, to: "/anomalies", search: { state: top.key } },
    };
  }
  if (/(district|region|area|place|location)/.test(lower) && /(most|highest|worst|urgent|attention|review|risk|top|anomal)/.test(lower)) {
    const top = [...districts].sort((a, b) => b.anomalies - a.anomalies)[0]!;
    const riskiest = districts[0]!;
    return {
      text: `${top.key} (${top.state}) has the most flagged records: ${num(top.anomalies)} out of ${num(top.records)}, a ${top.rate}% anomaly rate.\n\nBy average risk score, ${riskiest.key} is the most severe at ${riskiest.riskScore}/100. I'd start with ${top.key} — the volume is highest, and the leading reason is: ${top.topReasons[0]?.reason ?? "not recorded"}.\n\nWant its flagged records?`,
      link: { label: `Review ${top.key}`, to: "/anomalies", search: { state: top.state ?? "", district: top.key } },
    };
  }

  // ---- Risk levels without a place ----
  if (e.levels.length) {
    const level = e.levels[0]!;
    const filtered = records.filter((r) => r.riskLevel === level);
    if (/how many|count|number of|total/.test(lower)) {
      return {
        text: `There are ${num(filtered.length)} ${level.toLowerCase()}-risk records in the current dataset of ${num(s.total)} (${pct((filtered.length / s.total) * 100)}).\n\nWant me to list the top ones?`,
        link: { label: `View ${level} records`, to: "/anomalies", search: { level } },
      };
    }
    return listRecords(filtered, `${level} risk`, { level });
  }

  // ---- Riskiest records ----
  if (/(highest|worst|top|most)\s+(risk|score|dangerous)|riskiest/.test(lower)) {
    const worst = [...records].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
    return {
      text: `The highest-risk records right now:\n\n${worst.map((r) => `• ${r.id} — ${r.riskScore}/100 (${r.riskLevel}), ${r.district}, enumerator ${r.enumeratorId}`).join("\n")}\n\nWant the full detail on ${worst[0]?.id}?`,
      link: { label: "Open Anomaly Explorer", to: "/anomalies" },
    };
  }

  // ---- Summary ----
  if (/summary|overview|today|status|how (are|is) (we|things)|health|snapshot|dashboard|brief/.test(lower)) {
    const top = [...districts].sort((a, b) => b.anomalies - a.anomalies)[0];
    return {
      text: `Here's where the current dataset stands:\n\n• ${num(s.total)} records analysed\n• ${num(s.anomalies)} flagged for review (${pct(s.rate)})\n• ${num(s.critical)} critical, ${num(s.counts.High)} high, ${num(s.counts.Medium)} medium\n• ${num(s.valid)} records passed every check\n\nBiggest concentration: ${top?.key ?? "—"}${top ? ` with ${num(top.anomalies)} flagged records` : ""}. Most concerning surveyor: ${enums[0]?.key} at ${enums[0]?.rate}%.`,
      link: { label: "Open the dashboard", to: "/dashboard" },
    };
  }

  // ---- Counts ----
  if (/how many|total|count|number of/.test(lower)) {
    if (/anomal|flag/.test(lower)) {
      return {
        text: `${num(s.anomalies)} of ${num(s.total)} records are flagged — an anomaly rate of ${pct(s.rate)}. Of those, ${num(s.critical)} are critical and ${num(s.counts.High)} are high risk.`,
        link: { label: "Open Anomaly Explorer", to: "/anomalies" },
      };
    }
    if (staffWord) {
      return {
        text: `There are ${enums.length} enumerators in the current dataset, collecting ${num(s.total)} records between them. The peer-average anomaly rate is ${peer}%, and ${enums[0]?.key} is highest at ${enums[0]?.rate}%.`,
        link: { label: "See enumerator analytics", to: "/enumerators" },
      };
    }
    if (/district|state|region/.test(lower)) {
      const topRate = [...districts].sort((a, b) => b.rate - a.rate)[0];
      return {
        text: `The dataset covers ${districts.length} districts across ${stateStats.length} states. The highest anomaly rate is in ${topRate?.key} at ${topRate?.rate}%.`,
        link: { label: "Open the heatmap", to: "/heatmap" },
      };
    }
    return { text: `The current dataset contains ${num(s.total)} survey records, of which ${num(s.anomalies)} are flagged for review (${pct(s.rate)}), across ${districts.length} districts and ${enums.length} enumerators.` };
  }

  // ---- Glossary ----
  for (const g of GLOSSARY) {
    if (g.keys.some((k) => lower.includes(k))) return { text: `${g.title}\n\n${g.body}` };
  }

  // ---- How-to ----
  if (/export|csv|report|download/.test(lower)) {
    return { text: "Go to Reports — it gives you a printable summary of the current dataset and an 'Export CSV' button that downloads every flagged record with its score and reasons.", link: { label: "Open Reports", to: "/reports" } };
  }
  if (/heatmap|map|geograph/.test(lower)) {
    return { text: "The Geographic Heatmap shades every district by its average risk score, so you can see at a glance where problems cluster. Click any district to drill into its records.", link: { label: "Open the heatmap", to: "/heatmap" } };
  }
  if (/trend|over time|historical|drift|quarter|period/.test(lower)) {
    return { text: `Historical Trends compares anomaly rates across the survey periods in this dataset, so you can see whether quality is improving or drifting. Overall the dataset currently sits at ${pct(s.rate)} flagged.`, link: { label: "Open Historical Trends", to: "/trends" } };
  }
  if (/upload|import|file|format/.test(lower)) {
    return { text: "Upload Data accepts CSV, Excel, JSON, XML, TXT, PDF and image files. Drop a file in and the platform detects the format, runs OCR if it's a scan or photo, then validates and scores every record.", link: { label: "Go to Upload", to: "/upload" } };
  }
  if (/filter|how do i|how to/.test(lower)) {
    return { text: "In the Anomaly Explorer you can filter by state, district, enumerator, risk level, survey period and type of signal, and search by record ID or reason. Tell me the district and risk level you want and I'll open it with those filters applied.", link: { label: "Open Anomaly Explorer", to: "/anomalies" } };
  }

  // ---- Soft fallback with real numbers ----
  const topD = [...districts].sort((a, b) => b.anomalies - a.anomalies)[0];
  return {
    text: `I'm not certain what you're after there, so here's the closest picture I have: ${num(s.total)} records loaded, ${num(s.anomalies)} flagged (${pct(s.rate)}), ${num(s.critical)} of them critical. ${topD ? `${topD.key} carries the most flags (${num(topD.anomalies)}), ` : ""}and surveyor ${enums[0]?.key} has the highest anomaly rate at ${enums[0]?.rate}%.\n\nYou can also ask me things like:\n${FALLBACK_EXAMPLES.map((x) => `• "${x}"`).join("\n")}`,
    link: { label: "Open the dashboard", to: "/dashboard" },
  };
}
