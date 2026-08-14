import { useEffect, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

export function useCountUp(value: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

export function StatCard({
  label,
  value,
  suffix,
  decimals = 0,
  icon: Icon,
  accent,
  help,
}: {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  icon: ComponentType<{ className?: string }>;
  accent?: string;
  help?: string;
}) {
  const n = useCountUp(value);
  return (
    <div className="glass-card group relative overflow-hidden rounded-2xl p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight" style={accent ? { color: accent } : undefined}>
            {n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
            {suffix}
          </p>
          {help && <p className="mt-1 text-xs text-muted-foreground">{help}</p>}
        </div>
        <span
          className={cn("grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary")}
          style={accent ? { color: accent, backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)` } : undefined}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
