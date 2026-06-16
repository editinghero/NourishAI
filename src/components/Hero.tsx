import { useEffect, useRef } from "react";
import gsap from "gsap";

export function Hero({
  count,
  onOpenSettings,
}: {
  count: number;
  onOpenSettings: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const blobRef = useRef<SVGSVGElement>(null);
  const particlesRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (titleRef.current) {
      const letters = titleRef.current.querySelectorAll(".letter");
      gsap.fromTo(
        letters,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.03, duration: 0.7, ease: "power3.out" },
      );
    }
    if (blobRef.current) {
      gsap.to(blobRef.current, {
        rotate: 360,
        duration: 60,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 50%",
      });
    }
    if (particlesRef.current) {
      const dots = particlesRef.current.querySelectorAll("circle");
      dots.forEach((d, i) => {
        gsap.to(d, {
          y: `+=${10 + (i % 3) * 8}`,
          x: `+=${(i % 2 === 0 ? 1 : -1) * 6}`,
          duration: 3 + (i % 4),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.15,
        });
      });
    }
  }, []);

  return (
    <header className="relative overflow-hidden px-1 pb-2 pt-8">
      {/* floating background blob */}
      <svg
        ref={blobRef}
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-10 -z-10 h-56 w-56 opacity-50"
        viewBox="0 0 200 200"
      >
        <defs>
          <linearGradient id="hb" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.25" />
          </linearGradient>
        </defs>
        <path
          fill="url(#hb)"
          d="M44.3,-58.6C56.6,-49.1,64.6,-34.2,68.6,-18.4C72.6,-2.5,72.7,14.2,65.5,27.2C58.3,40.2,43.9,49.4,28.7,57.6C13.5,65.7,-2.5,72.8,-17.4,70.3C-32.3,67.8,-46.1,55.7,-55.2,41.4C-64.3,27.1,-68.7,10.6,-67.3,-5.4C-65.9,-21.5,-58.6,-37.1,-46.9,-46.9C-35.1,-56.7,-19,-60.7,-1.4,-59C16.2,-57.3,32,-68.1,44.3,-58.6Z"
          transform="translate(100 100)"
        />
      </svg>

      {/* sparkle particles */}
      <svg
        ref={particlesRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <circle
            key={i}
            cx={`${(i * 31) % 100}%`}
            cy={`${((i * 17) % 80) + 10}%`}
            r={i % 3 === 0 ? 2.5 : 1.5}
            fill="var(--primary)"
            opacity={0.25 + (i % 3) * 0.1}
          />
        ))}
      </svg>

      <div className="flex items-center justify-between">
        <button
          onClick={onOpenSettings}
          className="grid h-11 w-11 place-items-center rounded-full bg-card shadow-[var(--shadow-pill)] border border-border transition hover:scale-105"
          aria-label="Settings"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
          </svg>
        </button>
        <div className="flex items-center gap-2 rounded-full bg-card px-3 py-1.5 pill">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {count} {count === 1 ? "day" : "days"}
          </span>
        </div>
      </div>

      <h1
        ref={titleRef}
        className="mt-6 break-words text-[2.2rem] font-bold leading-[1.05] tracking-tight sm:text-5xl"
      >
        {"Let's Check\nYour Meal".split("").map((c, i) =>
          c === "\n" ? (
            <br key={i} />
          ) : (
            <span key={i} className="letter inline-block">
              {c === " " ? "\u00A0" : c}
            </span>
          ),
        )}
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Paste a meal, drop a markdown analysis, or feed an entire week — AI
        reads it, scores it, and tells you what to eat tonight.
      </p>
    </header>
  );
}
