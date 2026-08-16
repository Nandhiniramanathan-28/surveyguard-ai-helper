import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Check,
  Loader2,
  FileJson,
  FileCode2,
  FileText,
  FileImage,
  FileType2,
  ScanText,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload Survey Data — SurveyGuard AI" },
      { name: "description", content: "Upload PLFS survey data in any format — CSV, Excel, JSON, XML, TXT, PDF or scanned images — and watch SurveyGuard AI validate and risk-score every record." },
      { property: "og:title", content: "Upload Survey Data — SurveyGuard AI" },
      { property: "og:description", content: "Drop in a survey file in any common format and get a ranked list of records that need review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

const BASE_STEPS = [
  "Profiling the file",
  "Preprocessing & cleaning",
  "Rule validation",
  "Statistical analysis",
  "ML anomaly detection",
  "Historical comparison",
  "Risk scoring",
  "Done",
];

interface Format {
  id: string;
  label: string;
  ext: string[];
  icon: LucideIcon;
  ocr?: boolean;
  detected: (name: string, count: number) => string;
}

const FORMATS: Format[] = [
  { id: "csv", label: "CSV", ext: ["csv"], icon: FileSpreadsheet, detected: (_n, c) => `Detected: CSV survey export — ${c.toLocaleString("en-IN")} records found` },
  { id: "excel", label: "Excel", ext: ["xlsx", "xls"], icon: FileSpreadsheet, detected: (_n, c) => `Detected: Excel workbook — ${c.toLocaleString("en-IN")} records across 1 sheet` },
  { id: "json", label: "JSON", ext: ["json"], icon: FileJson, detected: (_n, c) => `Detected: JSON survey export — ${c.toLocaleString("en-IN")} records found` },
  { id: "xml", label: "XML", ext: ["xml"], icon: FileCode2, detected: (_n, c) => `Detected: XML schedule file — ${c.toLocaleString("en-IN")} record nodes parsed` },
  { id: "txt", label: "TXT", ext: ["txt", "dat", "tsv"], icon: FileText, detected: (_n, c) => `Detected: delimited text file — ${c.toLocaleString("en-IN")} rows read` },
  { id: "pdf", label: "PDF", ext: ["pdf"], icon: FileType2, ocr: true, detected: () => "Detected: scanned PDF survey form — running OCR extraction…" },
  { id: "image", label: "Images", ext: ["jpg", "jpeg", "png", "webp", "heic", "tif", "tiff"], icon: FileImage, ocr: true, detected: () => "Detected: photographed paper survey form — running OCR extraction…" },
];

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const matchFormat = (name: string) => FORMATS.find((f) => f.ext.includes(extOf(name))) ?? null;

function UploadPage() {
  const { regenerate, records } = useStore();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<string | null>(null);
  const [format, setFormat] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const steps = format?.ocr ? ["OCR Text Extraction", ...BASE_STEPS] : BASE_STEPS;

  useEffect(() => {
    if (step < 0) return;
    if (step >= steps.length) {
      const t = window.setTimeout(() => void navigate({ to: "/dashboard" }), 700);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), 600);
    return () => window.clearTimeout(t);
  }, [step, steps.length, navigate]);

  const start = (name: string) => {
    const fmt = matchFormat(name);
    if (!fmt) {
      setFile(name);
      setFormat(null);
      setStep(-1);
      setError(name);
      return;
    }
    setError(null);
    setFile(name);
    setFormat(fmt);
    regenerate(name);
    setStep(0);
  };

  const retry = () => {
    setError(null);
    setFile(null);
    setFormat(null);
    setStep(-1);
  };

  const progress = step < 0 ? 0 : Math.min(100, Math.round((step / steps.length) * 100));
  const detectedCount = records.length || 1204;

  return (
    <AppShell
      title="Upload survey data"
      subtitle="Step 1 of 2 — add the file you want SurveyGuard AI to check"
    >
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              start(f?.name ?? "plfs_sample.csv");
            }}
            className={cn(
              "glass-card flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition-colors",
              dragging ? "border-primary bg-primary/8" : "border-border",
            )}
          >
            <span className="grid size-16 place-items-center rounded-2xl bg-primary/12 text-primary">
              <UploadCloud className="size-8" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Drag your survey file here</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Any common survey format works — spreadsheets, data exports, or even a photo of a filled paper
              form. Nothing leaves your browser.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json,.xml,.txt,.tsv,.dat,.pdf,.jpg,.jpeg,.png,.webp,.tif,.tiff"
              className="hidden"
              onChange={(e) => start(e.target.files?.[0]?.name ?? "plfs_sample.csv")}
            />
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => inputRef.current?.click()}>Choose a file</Button>
              <Button variant="outline" onClick={() => start("plfs_q2_2026_sample.csv")}>
                Use the sample PLFS file
              </Button>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Supported formats
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <li
                  key={f.id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-xs font-medium transition-colors",
                    format?.id === f.id ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground",
                  )}
                >
                  <f.icon className="size-4" />
                  {f.label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Scanned PDFs and photos of paper forms are read automatically with OCR before checking.
            </p>
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6">
          {error ? (
            <div className="flex h-full flex-col justify-center text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[color-mix(in_oklab,var(--risk-high)_16%,transparent)] text-[var(--risk-high)]">
                <AlertTriangle className="size-7" />
              </span>
              <h3 className="mt-4 text-base font-semibold">We couldn't read this file</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{error}</span> isn't a format we recognise. Try
                CSV, Excel, JSON, XML, TXT, PDF, or an image of a survey form.
              </p>
              <Button variant="outline" className="mx-auto mt-5" onClick={retry}>
                <RotateCcw className="size-4" /> Try another file
              </Button>
            </div>
          ) : file && format ? (
            <>
              <div className="flex items-center gap-3">
                <format.icon className="size-5 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file}</p>
                  <p className="text-xs text-muted-foreground">Analysing your records</p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/8 px-3 py-2.5 text-xs leading-relaxed text-foreground">
                {format.ocr ? <ScanText className="mt-0.5 size-4 shrink-0 text-primary" /> : <Check className="mt-0.5 size-4 shrink-0 text-primary" />}
                <span>{format.detected(file, detectedCount)}</span>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ol className="mt-6 space-y-3">
                {steps.map((label, i) => {
                  const state = step > i ? "done" : step === i ? "active" : "idle";
                  return (
                    <li key={label} className="flex items-center gap-3 text-sm">
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full border text-[11px] transition-colors",
                          state === "done" && "border-[var(--risk-low)] bg-[color-mix(in_oklab,var(--risk-low)_18%,transparent)] text-[var(--risk-low)]",
                          state === "active" && "border-primary text-primary",
                          state === "idle" && "border-border text-muted-foreground",
                        )}
                      >
                        {state === "done" ? <Check className="size-3.5" /> : state === "active" ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                      </span>
                      <span className={state === "idle" ? "text-muted-foreground" : "font-medium"}>{label}</span>
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <div className="flex h-full flex-col justify-center">
              <h3 className="text-sm font-semibold">What happens next?</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Once your file is added, SurveyGuard AI detects the format, digitises it if it is a scan or
                photo, then runs eight checks — from simple validation rules to statistical and machine-learning
                models — and gives every record a risk score out of 100.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                You will then be taken to your dashboard, where the records that most need your attention appear
                at the top.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
