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

  const keys = Array.from(map.keys()).sort();
  if (keys.length === 0) return [];

  const [firstY, firstM] = keys[0].split('-').map(Number);
  const [lastY, lastM] = keys[keys.length - 1].split('-').map(Number);

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
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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
      <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', animationDelay: `${i * 200}ms` }}
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

  const svgWidth = 500;
  const { inPoints, outPoints } = buildLinePoints(months, maxTotal, svgWidth);
  const inArea = buildAreaPath(months, 'incoming', maxTotal, svgWidth);
  const outArea = buildAreaPath(months, 'outgoing', maxTotal, svgWidth);
  const labelStep = 1;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.03em' }}>Transaction Activity</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>{totalTx} txns</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* In/Out filter */}
          <span
            onClick={() => setFilter(filter === 'in' ? 'all' : 'in')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', opacity: filter === 'all' || filter === 'in' ? 1 : 0.3, transition: 'opacity 0.15s' }}
          >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(52,211,153,0.7)' }} />
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>In</span>
          </span>
          <span
            onClick={() => setFilter(filter === 'out' ? 'all' : 'out')}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', opacity: filter === 'all' || filter === 'out' ? 1 : 0.3, transition: 'opacity 0.15s' }}
          >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'rgba(251,146,60,0.7)' }} />
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>Out</span>
          </span>

          {/* Chart type toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)', padding: '2px' }}>
            <span
              onClick={() => setChartType('bar')}
              style={{
                padding: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: chartType === 'bar' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: chartType === 'bar' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                display: 'flex',
              }}
            >
              <BarChart3 style={{ width: '12px', height: '12px' }} strokeWidth={1.5} />
            </span>
            <span
              onClick={() => setChartType('line')}
              style={{
                padding: '4px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.15s',
                backgroundColor: chartType === 'line' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: chartType === 'line' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                display: 'flex',
              }}
            >
              <TrendingUp style={{ width: '12px', height: '12px' }} strokeWidth={1.5} />
            </span>
          </div>
        </div>
      </div>

      {chartType === 'bar' ? (
        <>
          <div
            style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`, gap: '4px', height: `${CHART_HEIGHT}px`, alignItems: 'end' }}
          >
            {months.map((month, idx) => {
              const inPx = Math.max(Math.round((month.incoming / maxTotal) * 70), 2);
              const outPx = Math.max(Math.round((month.outgoing / maxTotal) * 70), 2);
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer', gap: '1px' }}
                >
                  {(filter === 'all' || filter === 'in') && month.incoming > 0 && (
                    <div style={{ height: `${inPx}px`, backgroundColor: `rgba(52,211,153,${isHovered ? 1 : 0.45})`, borderRadius: '2px 2px 0 0', transition: 'all 0.15s ease' }} />
                  )}
                  {(filter === 'all' || filter === 'out') && month.outgoing > 0 && (
                    <div style={{ height: `${outPx}px`, backgroundColor: `rgba(251,146,60,${isHovered ? 1 : 0.45})`, borderRadius: (filter === 'all' || filter === 'in') && month.incoming > 0 ? '0' : '2px 2px 0 0', transition: 'all 0.15s ease' }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Labels */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`, gap: '4px', marginTop: '6px' }}>
            {months.map((month, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                {idx % labelStep === 0 && (
                  <span style={{ fontSize: '9px', color: hoveredIdx === idx ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.18)', transition: 'color 0.15s' }}>{month.label}</span>
                )}
              </div>
            ))}
          </div>

          {/* Detail panel - persists last hovered bar */}
          {hoveredIdx !== null && (() => {
            const m = months[hoveredIdx];
            const hasValue = m.value_in > 0 || m.value_out > 0 || m.token_value_in > 0 || m.token_value_out > 0;
            return (
              <div style={{
                marginTop: '12px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '12px 14px',
                animation: 'fadeIn 0.15s ease-out',
              }}>
                {/* Top row: date + total */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{m.label}</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace" }}>{m.total} transactions</span>
                </div>

                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {/* Incoming */}
                  <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'rgba(52,211,153,0.8)' }} />
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Incoming</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(52,211,153,0.85)' }}>{m.incoming}</div>
                    {hasValue && (
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt(m.value_in)} {unit}
                        {m.token_value_in > 0 && <span style={{ color: 'rgba(52,211,153,0.3)' }}> + {fmt(m.token_value_in)} {m.top_token || 'tok'}</span>}
                      </div>
                    )}
                  </div>

                  {/* Outgoing */}
                  <div style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: 'rgba(251,146,60,0.04)', border: '1px solid rgba(251,146,60,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'rgba(251,146,60,0.8)' }} />
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Outgoing</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(251,146,60,0.85)' }}>{m.outgoing}</div>
                    {hasValue && (
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px', fontFamily: "'JetBrains Mono', monospace" }}>
                        {fmt(m.value_out)} {unit}
                        {m.token_value_out > 0 && <span style={{ color: 'rgba(251,146,60,0.3)' }}> + {fmt(m.token_value_out)} {m.top_token || 'tok'}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Spam/dust note */}
                {m.total > 0 && !hasValue && (
                  <div style={{ marginTop: '6px', fontSize: '10px', color: 'rgba(255,255,255,0.12)', fontStyle: 'italic' }}>0-value transactions (spam/dust)</div>
                )}
              </div>
            );
          })()}
        </>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${svgWidth} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: `${CHART_HEIGHT}px` }}
          >
            {(filter === 'all' || filter === 'in') && <path d={inArea} fill="rgb(52, 211, 153)" opacity="0.15" />}
            {(filter === 'all' || filter === 'out') && <path d={outArea} fill="rgb(251, 146, 60)" opacity="0.12" />}
            {(filter === 'all' || filter === 'in') && (
              <polyline
                points={inPoints}
                fill="none"
                stroke="rgb(52, 211, 153)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {(filter === 'all' || filter === 'out') && (
              <polyline
                points={outPoints}
                fill="none"
                stroke="rgb(251, 146, 60)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {months.map((month, i) => {
              const stepX = svgWidth / Math.max(months.length - 1, 1);
              const x = i * stepX;
              const inY = CHART_HEIGHT - (month.incoming / maxTotal) * (CHART_HEIGHT - 4);
              const outY = CHART_HEIGHT - (month.outgoing / maxTotal) * (CHART_HEIGHT - 4);
              return (
                <g key={i}>
                  {(filter === 'all' || filter === 'in') && month.incoming > 0 && <circle cx={x} cy={inY} r="2" fill="rgb(52, 211, 153)" />}
                  {(filter === 'all' || filter === 'out') && month.outgoing > 0 && <circle cx={x} cy={outY} r="2" fill="rgb(251, 146, 60)" />}
                </g>
              );
            })}
          </svg>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)`, marginTop: '6px' }}>
            {months.map((month, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                {idx % labelStep === 0 && (
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.18)' }}>{month.label}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
