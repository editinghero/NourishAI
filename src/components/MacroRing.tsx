import { useEffect, useRef } from "react";
import gsap from "gsap";

type Props = {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
  size?: number;
  icon?: "leaf" | "drop" | "cube" | "flame";
};

function Icon({ kind, color }: { kind: Props["icon"]; color: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (kind === "drop")
    return (
      <svg {...common}>
        <path
          d="M12 3s6 6.5 6 11a6 6 0 11-12 0c0-4.5 6-11 6-11z"
          fill={color + "22"}
        />
      </svg>
    );
  if (kind === "cube")
    return (
      <svg {...common}>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" fill={color + "22"} />
        <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
      </svg>
    );
  if (kind === "flame")
    return (
      <svg {...common}>
        <path
          d="M12 2s4 4 4 8a4 4 0 11-8 0c0-2 1-3 1-5 2 1 3 0 3-3z"
          fill={color + "22"}
        />
      </svg>
    );
  return (
    <svg {...common}>
      <path
        d="M12 22s8-4 8-12V4h-6c-4 0-6 3-6 7 0 2 1 4 2 5"
        fill={color + "22"}
      />
      <path d="M6 22c0-6 4-10 8-12" />
    </svg>
  );
}

export function MacroRing({
  label,
  value,
  target,
  color,
  unit = "g",
  size = 96,
  icon = "leaf",
}: Props) {
  const circleRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? Math.max(0, Math.min(value / target, 1.2)) : 0;
  const over = value > target;
  const pct = target > 0 ? Math.round((value / target) * 100) : 0;

  useEffect(() => {
    if (!circleRef.current || !numRef.current) return;
    const dashOffset = circumference * (1 - ratio);
    gsap.fromTo(
      circleRef.current,
      { strokeDashoffset: circumference },
      { strokeDashoffset: dashOffset, duration: 1.1, ease: "power3.out" },
    );
    const obj = { v: 0 };
    gsap.to(obj, {
      v: pct,
      duration: 1,
      ease: "power2.out",
      onUpdate: () => {
        if (numRef.current)
          numRef.current.textContent = Math.round(obj.v).toString();
      },
    });
  }, [value, target, circumference, ratio, pct]);

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 pill">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="oklch(0.93 0.01 100)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            ref={circleRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={over ? "var(--danger)" : color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon kind={icon} color={over ? "var(--danger)" : color} />
          <span className="mt-0.5 font-display text-base font-bold tabular-nums text-foreground">
            <span ref={numRef}>0</span>%
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground tabular-nums">
          {value}
          {unit} / {target}
          {unit}
        </div>
      </div>
    </div>
  );
}
