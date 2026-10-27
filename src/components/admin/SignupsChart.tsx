"use client";

import React, { useMemo, useState } from "react";

interface SignupsChartProps {
  /** Account creation times of every user */
  createdAt: Array<string | Date>;
  days?: number;
}

const BAR_COLOR = "#4A1A45";
const BAR_HOVER = "#2D0F2A";

const W = 640;
const H = 170;
const PAD = { top: 12, right: 8, bottom: 24, left: 30 };

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Daily new-account counts for the last N days. A single series, so the title names it and there is no legend. */
export function SignupsChart({ createdAt, days = 30 }: SignupsChartProps) {
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(() => {
    const counts = new Map<string, number>();
    for (const value of createdAt) {
      const key = dayKey(new Date(value));
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - i));
      return { date, count: counts.get(dayKey(date)) || 0 };
    });
  }, [createdAt, days]);

  const total = series.reduce((sum, d) => sum + d.count, 0);
  const peak = Math.max(0, ...series.map((d) => d.count));
  const niceMax = Math.max(4, Math.ceil(peak / 4) * 4);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = plotW / days;
  const barW = Math.max(4, slot - 4); // 2px surface gap each side
  const y = (value: number) => PAD.top + plotH - (value / niceMax) * plotH;

  const ticks = [0, niceMax / 2, niceMax];
  const hovered = hover !== null ? series[hover] : null;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg text-black tracking-tight">New Accounts, Last {days} Days</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Daily sign-ups across students, tutors and admins.</p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold text-black tracking-tight">{total}</span>
          <span className="text-xs text-neutral-500 ml-1.5">
            {total === 1 ? "account" : "accounts"} · peak {peak}/day
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Bar chart of new accounts per day over the last ${days} days. ${total} in total, with a peak of ${peak} in one day.`}
          onMouseLeave={() => setHover(null)}
        >
          {/* Recessive grid and value axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#E5E5E5" strokeWidth={1} />
              <text x={PAD.left - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#737373">
                {t}
              </text>
            </g>
          ))}

          {/* Bars: rounded data end, flat baseline */}
          {series.map((d, i) => {
            if (d.count === 0) return null;
            const x = PAD.left + i * slot + (slot - barW) / 2;
            const top = y(d.count);
            const r = Math.min(4, barW / 2, plotH - (top - PAD.top));
            const base = PAD.top + plotH;
            return (
              <path
                key={i}
                d={`M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${base} Z`}
                fill={hover === i ? BAR_HOVER : BAR_COLOR}
              />
            );
          })}

          {/* X-axis dates: first, middle, last */}
          {[0, Math.floor((days - 1) / 2), days - 1].map((i) => (
            <text
              key={i}
              x={PAD.left + i * slot + slot / 2}
              y={H - 6}
              textAnchor={i === 0 ? "start" : i === days - 1 ? "end" : "middle"}
              fontSize={10}
              fill="#737373"
            >
              {shortDate(series[i].date)}
            </text>
          ))}

          {/* Full-height hit targets, larger than the bars themselves */}
          {series.map((_, i) => (
            <rect
              key={i}
              x={PAD.left + i * slot}
              y={PAD.top}
              width={slot}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            />
          ))}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute -top-1 px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-[11px] font-semibold shadow-lg whitespace-nowrap"
            style={{
              left: `${((PAD.left + (hover as number) * slot + slot / 2) / W) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {shortDate(hovered.date)} · {hovered.count} {hovered.count === 1 ? "account" : "accounts"}
          </div>
        )}
      </div>

      <details className="text-xs text-neutral-600">
        <summary className="cursor-pointer font-semibold text-[#4A1A45]">View as table</summary>
        {total === 0 ? (
          <p className="mt-2">No new accounts in this period.</p>
        ) : (
          <table className="mt-2 w-full max-w-xs text-left">
            <thead>
              <tr className="text-neutral-500">
                <th className="py-1 font-bold">Date</th>
                <th className="py-1 font-bold">New accounts</th>
              </tr>
            </thead>
            <tbody>
              {series
                .filter((d) => d.count > 0)
                .map((d) => (
                  <tr key={dayKey(d.date)} className="border-t border-neutral-100">
                    <td className="py-1">{shortDate(d.date)}</td>
                    <td className="py-1 font-semibold text-black">{d.count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </details>
    </div>
  );
}
