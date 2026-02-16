import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface DayBucket {
  date: string;
  total: number;
  incoming: number;
  outgoing: number;
  value_in: number;
  value_out: number;
  token_value_in: number;
  token_value_out: number;
  top_token: string | null;
}

interface MonthBucket {
  label: string;
  total: number;
  incoming: number;
  outgoing: number;
  value_in: number;
  value_out: number;
  token_value_in: number;
  token_value_out: number;
  top_token: string | null;
}

interface TransactionChartProps {
  address: string;
}

const CHART_HEIGHT = 80;

/** Aggregate daily buckets into months, padded 6 months before and after data */
function aggregateByMonth(days: DayBucket[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();

  for (const day of days) {
    const d = new Date(day.date);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });

    if (!map.has(key)) {
      map.set(key, { label, total: 0, incoming: 0, outgoing: 0, value_in: 0, value_out: 0, token_value_in: 0, token_value_out: 0, top_token: null });
    }
    const bucket = map.get(key)!;
    bucket.total += day.total;
    bucket.incoming += day.incoming;
    bucket.outgoing += day.outgoing;
    bucket.value_in += day.value_in || 0;
    bucket.value_out += day.value_out || 0;
    bucket.token_value_in += day.token_value_in || 0;
    bucket.token_value_out += day.token_value_out || 0;
    if (day.top_token && !bucket.top_token) bucket.top_token = day.top_token;
  }

  // Find earliest and latest months from data
  const keys = Array.from(map.keys()).sort();
  if (keys.length === 0) return [];

  const [firstY, firstM] = keys[0].split('-').map(Number);
  const [lastY, lastM] = keys[keys.length - 1].split('-').map(Number);

  // Only pad 6 months if the span between first and last month is 10 or fewer
  const totalSpan = (lastY - firstY) * 12 + (lastM - firstM) + 1;
  const pad = totalSpan > 10 ? 0 : 6;

  const startDate = new Date(Date.UTC(firstY, firstM - 1 - pad, 1));
  const endDate = new Date(Date.UTC(lastY, lastM - 1 + pad, 1));

  const result: MonthBucket[] = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = cursor.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    result.push(map.get(key) || { label, total: 0, incoming: 0, outgoing: 0, value_in: 0, value_out: 0, token_value_in: 0, token_value_out: 0, top_token: null });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return result;
}

/** Build an SVG polyline points string */
function buildLinePoints(months: MonthBucket[], maxTotal: number, width: number): { inPoints: string; outPoints: string } {
  const len = months.length;
  if (len === 0) return { inPoints: '', outPoints: '' };

  const stepX = width / Math.max(len - 1, 1);

  const inPts: string[] = [];
  const outPts: string[] = [];

  for (let i = 0; i < len; i++) {
    const x = i * stepX;
    const inY = CHART_HEIGHT - (months[i].incoming / maxTotal) * (CHART_HEIGHT - 4);
    const outY = CHART_HEIGHT - (months[i].outgoing / maxTotal) * (CHART_HEIGHT - 4);
    inPts.push(`${x},${inY}`);
    outPts.push(`${x},${outY}`);
  }

  return { inPoints: inPts.join(' '), outPoints: outPts.join(' ') };
}

/** Build an SVG area path (filled region under the line) */
function buildAreaPath(months: MonthBucket[], field: 'incoming' | 'outgoing', maxTotal: number, width: number): string {
  const len = months.length;
  if (len === 0) return '';

  const stepX = width / Math.max(len - 1, 1);
  let d = `M 0,${CHART_HEIGHT}`;

  for (let i = 0; i < len; i++) {
    const x = i * stepX;
    const y = CHART_HEIGHT - (months[i][field] / maxTotal) * (CHART_HEIGHT - 4);
    d += ` L ${x},${y}`;
  }

  d += ` L ${width},${CHART_HEIGHT} Z`;
  return d;
}

export default function TransactionChart({ address }: TransactionChartProps) {
  const { token } = useAuth();
  const [activity, setActivity] = useState<DayBucket[]>([]);
  const [chain, setChain] = useState<'bitcoin' | 'ethereum'>('bitcoin');
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [showIn, setShowIn] = useState(true);
  const [showOut, setShowOut] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch(`${API_URL}/wallet-activity/${address}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setActivity(data.activity || []);
          if (data.chain) setChain(data.chain);
        }
      } catch {
        // chart is optional
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, [address, token]);

  if (loading) {
    return (
      <div className="my-4 rounded-xl bg-white/[0.03] border border-white/[0.04] p-4 h-[120px] flex items-center justify-center">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 rounded-full bg-white/20 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const months = aggregateByMonth(activity);

  if (months.length === 0) return null;

  const maxTotal = Math.max(...months.map((m) => m.total), 1);
  const totalTx = months.reduce((sum, m) => sum + m.total, 0);
  const unit = chain === 'ethereum' ? 'ETH' : 'BTC';
  const fmt = (v: number) => {
    if (v === 0) return '0';
    return v.toFixed(5);
  };

  // SVG dimensions for line chart
  const svgWidth = 500;
  const { inPoints, outPoints } = buildLinePoints(months, maxTotal, svgWidth);
  const inArea = buildAreaPath(months, 'incoming', maxTotal, svgWidth);
  const outArea = buildAreaPath(months, 'outgoing', maxTotal, svgWidth);

  // Show every Nth label so they don't overlap
  const labelStep = 1;

  return (
    <div className="my-4 rounded-xl bg-white/[0.03] border border-white/[0.04] p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-medium text-white/40 tracking-wide">
            Transaction Activity
          </span>
          <span className="text-[11px] text-white/20">{totalTx} txns</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowIn(!showIn)} className="flex items-center gap-1.5 transition-opacity duration-150" style={{ opacity: showIn ? 1 : 0.3 }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
            <span className="text-[10px] text-white/30">In</span>
          </button>
          <button onClick={() => setShowOut(!showOut)} className="flex items-center gap-1.5 transition-opacity duration-150" style={{ opacity: showOut ? 1 : 0.3 }}>
            <div className="w-1.5 h-1.5 rounded-full bg-orange-400/70" />
            <span className="text-[10px] text-white/30">Out</span>
          </button>
          {/* Chart type toggle */}
          <div className="flex items-center gap-0.5 ml-2 rounded-md bg-white/[0.04] p-0.5">
            <button
              onClick={() => setChartType('bar')}
              className={`p-1 rounded transition-colors duration-150 ${
                chartType === 'bar' ? 'bg-white/[0.1] text-white/60' : 'text-white/20 hover:text-white/40'
              }`}
            >
              <BarChart3 className="w-3 h-3" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-1 rounded transition-colors duration-150 ${
                chartType === 'line' ? 'bg-white/[0.1] text-white/60' : 'text-white/20 hover:text-white/40'
              }`}
            >
              <TrendingUp className="w-3 h-3" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {chartType === 'bar' ? (
        /* ── Bar Chart ── */
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`, gap: '6px', height: `${CHART_HEIGHT}px`, alignItems: 'end' }}>
            {months.map((month, idx) => {
              const inPx = Math.max(Math.round((month.incoming / maxTotal) * 70), 3);
              const outPx = Math.max(Math.round((month.outgoing / maxTotal) * 70), 3);

              return (
                <div key={idx} className="group relative" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10">
                    <div className="bg-[#1a1a1a] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[10px] whitespace-nowrap shadow-xl">
                      <p className="text-white/60 font-medium mb-0.5">{month.label}</p>
                      <p className="text-emerald-400/80">
                        {month.incoming} in · {fmt(month.value_in)} {unit}
                        {month.token_value_in > 0 && <span className="text-emerald-400/50"> + {fmt(month.token_value_in)} {month.top_token || 'tokens'}</span>}
                      </p>
                      <p className="text-orange-400/80">
                        {month.outgoing} out · {fmt(month.value_out)} {unit}
                        {month.token_value_out > 0 && <span className="text-orange-400/50"> + {fmt(month.token_value_out)} {month.top_token || 'tokens'}</span>}
                      </p>
                      <p className="text-white/30 mt-0.5">{month.total} txns · {fmt(month.value_in + month.value_out)} {unit}</p>
                      {month.total > 0 && month.value_in === 0 && month.value_out === 0 && month.token_value_in === 0 && month.token_value_out === 0 && (
                        <p className="text-white/20 text-[9px] mt-0.5 italic">0-value txns (spam/dust)</p>
                      )}
                    </div>
                  </div>

                  {/* Stacked bar */}
                  {showIn && month.incoming > 0 && (
                    <div
                      className="group-hover:opacity-90 transition-opacity duration-150"
                      style={{ height: `${inPx}px`, backgroundColor: 'rgb(52, 211, 153)' }}
                    />
                  )}
                  {showOut && month.outgoing > 0 && (
                    <div
                      className="group-hover:opacity-90 transition-opacity duration-150"
                      style={{ height: `${outPx}px`, backgroundColor: 'rgb(251, 146, 60)' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {/* Month labels for bar chart */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`, gap: '6px' }} className="mt-1.5">
            {months.map((month, idx) => (
              <div key={idx} className="text-center">
                {idx % labelStep === 0 && (
                  <span className="text-[9px] text-white/25">{month.label}</span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        /* ── Line Chart ── */
        <>
          <svg
            viewBox={`0 0 ${svgWidth} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: `${CHART_HEIGHT}px` }}
          >
            {/* Area fills */}
            {showIn && <path d={inArea} fill="rgb(52, 211, 153)" opacity="0.15" />}
            {showOut && <path d={outArea} fill="rgb(251, 146, 60)" opacity="0.12" />}
            {/* Lines */}
            {showIn && (
              <polyline
                points={inPoints}
                fill="none"
                stroke="rgb(52, 211, 153)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {showOut && (
              <polyline
                points={outPoints}
                fill="none"
                stroke="rgb(251, 146, 60)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {/* Data point dots */}
            {months.map((month, i) => {
              const stepX = svgWidth / Math.max(months.length - 1, 1);
              const x = i * stepX;
              const inY = CHART_HEIGHT - (month.incoming / maxTotal) * (CHART_HEIGHT - 4);
              const outY = CHART_HEIGHT - (month.outgoing / maxTotal) * (CHART_HEIGHT - 4);
              return (
                <g key={i}>
                  {showIn && month.incoming > 0 && <circle cx={x} cy={inY} r="2" fill="rgb(52, 211, 153)" />}
                  {showOut && month.outgoing > 0 && <circle cx={x} cy={outY} r="2" fill="rgb(251, 146, 60)" />}
                </g>
              );
            })}
          </svg>
          {/* Month labels for line chart */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)` }} className="mt-1.5">
            {months.map((month, idx) => (
              <div key={idx} className="text-center">
                {idx % labelStep === 0 && (
                  <span className="text-[9px] text-white/25">{month.label}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
