# Survey Guard AI

Build a full web app called SurveyGuard AI — an intelligent survey data validation and investigation platform for government survey supervisors (initially for PLFS - Periodic Labour Force Survey data). This is a hackathon MVP, so focus on a polished, fully working frontend experience with realistic simulated data and logic (no real backend/ML infra needed — simulate everything in-app using JavaScript/mock data so it works end-to-end without external services).

DATA SOURCE — SYNTHETIC MOCK DATA (IMPORTANT)

This is a hackathon demo, so there is NO real backend, database, or real PLFS dataset connected. All data must be synthetically generated on the frontend in JavaScript, but it must look and behave like real PLFS (Periodic Labour Force Survey) data so the demo feels authentic. Build a mock-data generator module that runs when the app loads (or when the user "uploads" a file) and produces an array of ~500–1000 realistic fake survey records with this schema:

Record ID (e.g. REC-00001)

State and District — use a realistic list of real Indian state names and 3–5 plausible district names per state (doesn't need to be exhaustive, just realistic-looking, e.g. Tamil Nadu → Chennai, Coimbatore, Madurai)

Cluster ID, Household ID

Enumerator ID (e.g. E001–E080, ~80 enumerators total, unevenly distributed across records)

Survey Period (e.g. Q1 2026, Q2 2026, etc. — a few recent quarters so historical trend charts have something to compare)

Age (realistic distribution, mostly 15–65)

Gender

Household Size (1–8, realistic distribution)

Employment Status (Employed / Unemployed / Not in Labour Force)

Income (₹) — realistic distribution based on employment status and urban/rural

Working Hours (0–70, realistic distribution)

Urban/Rural flag

Risk Score (0–100) and Risk Level (Low/Medium/High/Critical, derived from the score using the 0-30/31-60/61-80/81-100 bands)

Detection Reasons — an array of 1–4 short reasons picked from a realistic pool (see below)

Seed intentional anomalies: When generating records, make ~90% completely "normal" (low risk, plausible values) and deliberately seed ~10% as anomalies of two kinds, so the demo can show off both the rule engine and the ML/statistical engine:

Obvious anomalies (~3%) — values that break simple rules, e.g. Age = 132, Income = -₹25,000, Working Hours = 120. These should get CRITICAL risk and reasons like "Age outside valid range (0–100)" or "Negative income value."

Subtle/contextual anomalies (~7%) — values that are individually "valid" but statistically unusual for their context, e.g. Income = ₹25,00,000 with normal age/hours, or Working Hours = 95 with everything else normal. These should get HIGH/CRITICAL risk with reasons like "Income is 4.2 standard deviations above the local distribution," "Isolation Forest identifies this record as anomalous," "Local Outlier Factor indicates this record differs from its cluster neighborhood," "Enumerator's anomaly rate is significantly above the peer-group average," "Historical data shows a deviation from the expected pattern for this district."

Keep a fixed pool of ~15–20 realistic reason strings (matching the categories: rule violation, statistical deviation, ML anomaly, enumerator pattern, cluster pattern, historical drift) and assign 1–4 of them to each flagged record based on its risk level, so explanations feel varied but consistent.

Consistency rule: Generate this dataset ONCE per session (e.g. on app load or on "upload"), store it in shared app state/context, and reuse it everywhere — Dashboard stats, Anomaly Explorer table, Heatmap, Enumerator Analytics, and the AI Investigation modal must all derive their numbers from this same underlying dataset so everything lines up (e.g. the district shown as "critical" on the heatmap should match the anomaly count in the Anomaly Explorer for that district).

On the Upload screen, whatever file the user actually drags in should be visually accepted (show the filename, a progress bar, etc.) but the underlying data powering the rest of the app is this generated synthetic dataset — treat the "upload" as the trigger that generates/regenerates the dataset, not as something that's actually parsed.

VIBE & DESIGN DIRECTION

Make it look like a premium enterprise SaaS analytics product (think Linear, Vercel dashboards, or a modern fintech admin panel) — NOT a generic template.

Dark, professional theme by default (deep navy/slate background) with a toggle for light mode.

Accent colors tied to risk levels: green (low), yellow (medium), orange (high), red (critical) — used consistently across charts, badges, and the map.

Smooth micro-interactions everywhere: animated page transitions, hover states, skeleton loaders while "data loads," count-up number animations on stat cards, smooth chart animations.

Rounded cards with soft shadows/glassmorphism, generous whitespace, clean sans-serif typography (Inter or similar), subtle grid/dot background texture.

Fully responsive — must work well on tablet and mobile too.

IMPORTANT: This tool will be used by non-technical government supervisors, so the UI must be extremely intuitive — clear labels (no jargon without a tooltip explanation), obvious next steps, empty states with helpful guidance, and a simple onboarding/welcome screen explaining what the platform does in plain language.

CORE PAGES / FLOW

1. Landing / Login Screen

Clean landing page explaining "SurveyGuard AI" in one line: an AI system that flags suspicious or unusual survey records and explains why, so supervisors know exactly what to review first.

Simple login (mock auth is fine — a name + role selector like "Supervisor" is enough, no real backend auth needed).

2. Upload / Data Ingestion Screen

Drag-and-drop CSV/Excel upload area with a friendly illustration and instructions.

After "upload," show an animated processing flow with labeled steps lighting up one by one: Profiling → Preprocessing → Rule Validation → Statistical Analysis → ML Anomaly Detection → Historical Comparison → Risk Scoring → Done.

Once done, auto-navigate to the Dashboard populated by the synthetic dataset described in the "DATA SOURCE" section above.

3. Overview Dashboard

Top stat cards with animated counters: Total Records, Valid, Warning, Critical, Total Anomalies, Overall Anomaly Rate.

A risk distribution donut/bar chart (Low/Medium/High/Critical).

A trend line chart showing anomalies over recent survey periods.

Quick-access cards linking to Anomaly Explorer, Geographic Heatmap, Enumerator Analytics, and AI Investigation.

4. Anomaly Explorer

A searchable, filterable, sortable data table of flagged records: Record ID, State, District, Enumerator, Risk Score (0-100 with a colored badge), Risk Level, Primary Detection Reason, and an "Investigate" button.

Filters sidebar: State, District, Enumerator, Risk Level, Date range, Anomaly type (rule/statistical/ML/historical).

Smooth row hover highlighting and pagination.

5. Geographic Risk Heatmap

An interactive map (or a clean stylized grid/SVG map if a real geo-map library is too heavy) showing India states/districts shaded green→yellow→orange→red by risk score.

Clicking a region shows a side panel with: Total Records, Anomalies, Anomaly Rate, Risk Score, and top contributing issues.

6. Enumerator Analytics

A ranked table/leaderboard of enumerators with Records, Anomaly Rate %, and Risk badge, sortable by risk.

A bar chart comparing enumerators against the peer-group average anomaly rate.

Clicking an enumerator shows their detailed profile with trend over time.

7. AI Investigation Assistant (the standout feature)

When a user clicks "Investigate" on any flagged record, open a detailed modal/panel styled like an AI chat/report card.

Show: Risk Score, Risk Level badge, and a clearly bulleted "Why was this flagged?" section (e.g. "Income is 4.2 standard deviations above the local distribution," "Isolation Forest identifies this as anomalous," "Enumerator's anomaly rate is above peer average," etc. — generate these dynamically/randomly per record from a pool of realistic reasons).

End with a plain-language "Recommended Investigation" summary sentence.

Make this feel intelligent and trustworthy — use a subtle typing/reveal animation when the explanation appears, like an AI is "thinking" then answering. Always phrase things as probabilities/signals needing review, never as accusations (e.g. "requires review" not "this is fraud").

8. Historical Trends

Simple line/area charts comparing current period vs previous periods for key indicators, with a callout when "Significant Temporal Drift" is detected.

9. Reports / Export

A clean summary report view that can be "exported" (trigger a CSV or print-to-PDF download of the visible mock data/summary).

TECH PREFERENCES

React + Tailwind CSS.

Use Recharts or similar for charts, and a lightweight icon set (lucide-react).

Keep all data mock/simulated in frontend state using the shared synthetic dataset generator described above — no real backend, database, or ML models for this MVP. Generate once, store in context/state, and reuse everywhere so all pages stay consistent with each other.

Add loading skeletons and smooth transitions between all views so nothing feels jarring or instant/fake.

Include a persistent left sidebar nav with icons + labels for: Dashboard, Upload, Anomaly Explorer, Heatmap, Enumerators, Historical Trends, Reports.

Build this as a cohesive, demo-ready product that feels trustworthy, intelligent, and easy enough for a first-time, non-technical government official to use without training.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/03125aad-5ecd-4ff4-ac7d-71f42632c22a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
