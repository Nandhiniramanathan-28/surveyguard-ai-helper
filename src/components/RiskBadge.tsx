import type { RiskLevel } from "@/lib/mockData";
import { riskColor } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        color: riskColor(level),
        borderColor: `color-mix(in oklab, ${riskColor(level)} 45%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${riskColor(level)} 14%, transparent)`,
      }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: riskColor(level) }} />
      {level}
    </span>
  );
}

export function ScorePill({ score }: { score: number }) {
  const level = score <= 30 ? "Low" : score <= 60 ? "Medium" : score <= 80 ? "High" : "Critical";
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: riskColor(level as RiskLevel) }}
        />
      </span>
      <span className="tabular-nums text-sm font-medium">{score}</span>
    </span>
  );
}
