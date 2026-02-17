import { useState } from 'react';
import { ChevronDown, ChevronUp, Coins } from 'lucide-react';

interface TokenInfo {
  symbol: string;
  name: string;
  total_in: number;
  total_out: number;
  tx_count: number;
  total_in_usd?: number;
  total_out_usd?: number;
  price_usd?: number;
}

interface TokenActivityProps {
  tokens: TokenInfo[];
  collapsed?: number;
}

function fmtNum(n: number, decimals = 4): string {
  if (n === 0) return '0';
  if (n < 0.0001) return n.toExponential(2);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toFixed(decimals);
}

function fmtUsd(n?: number): string {
  if (n == null || n === 0) return '';
  return `$${n.toFixed(2)}`;
}

export default function TokenActivity({ tokens, collapsed = 8 }: TokenActivityProps) {
  const [expanded, setExpanded] = useState(false);

  if (!tokens || tokens.length === 0) return null;

  const sorted = [...tokens].sort((a, b) => b.tx_count - a.tx_count);
  const visible = expanded ? sorted : sorted.slice(0, collapsed);
  const hiddenCount = sorted.length - collapsed;

  return (
    <div style={{ marginTop: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <Coins style={{ width: '12px', height: '12px', color: 'rgba(16,185,129,0.4)' }} strokeWidth={1.5} />
        <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(16,185,129,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
          Token Activity ({tokens.length})
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visible.map((t, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              padding: '5px 8px',
              borderRadius: '6px',
              backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>{t.symbol}</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', color: 'rgba(52,211,153,0.6)' }}>
                {fmtNum(t.total_in)} in
                {t.total_in_usd ? <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: '2px' }}>({fmtUsd(t.total_in_usd)})</span> : null}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(251,146,60,0.6)' }}>
                {fmtNum(t.total_out)} out
                {t.total_out_usd ? <span style={{ color: 'rgba(255,255,255,0.2)', marginLeft: '2px' }}>({fmtUsd(t.total_out_usd)})</span> : null}
              </span>
              <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.15)', minWidth: '32px', textAlign: 'right' }}>
                {t.tx_count} tx
              </span>
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <span
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            color: 'rgba(16,185,129,0.5)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: 'rgba(255,255,255,0.02)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(16,185,129,0.8)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(16,185,129,0.5)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'; }}
        >
          {expanded ? (
            <>Show less <ChevronUp style={{ width: '10px', height: '10px' }} /></>
          ) : (
            <>Show {hiddenCount} more tokens <ChevronDown style={{ width: '10px', height: '10px' }} /></>
          )}
        </span>
      )}
    </div>
  );
}
