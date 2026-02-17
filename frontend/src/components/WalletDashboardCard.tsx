import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Download, Check, Activity, AlertTriangle, Shield, Clock, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';
import { toBlob } from 'html-to-image';
import TokenActivity from './TokenActivity';

export interface WalletSummaryData {
  chain?: string;
  totalReceived?: number;
  totalSent?: number;
  totalReceivedUsd?: number;
  totalSentUsd?: number;
  balanceUsd?: number;
  firstSeen?: string;
  lastSeen?: string;
  tokenSummary?: Array<{
    symbol: string;
    name: string;
    total_in: number;
    total_out: number;
    tx_count: number;
    total_in_usd?: number;
    total_out_usd?: number;
    price_usd?: number;
  }>;
}

interface WalletStats {
  balance?: number;
  transactionCount?: number;
  riskScore?: 'Low' | 'Medium' | 'High';
  lastActivity?: string;
  currency?: string;
}

interface WalletDashboardCardProps {
  address: string;
  stats: WalletStats;
  summary?: WalletSummaryData;
  isLoading?: boolean;
  chart?: ReactNode;
  children?: ReactNode;
}

function getRiskColor(risk: WalletStats['riskScore']) {
  switch (risk) {
    case 'Low':
      return { text: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)' };
    case 'Medium':
      return { text: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.15)' };
    case 'High':
      return { text: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)' };
    default:
      return { text: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)' };
  }
}

function getRiskIcon(risk: WalletStats['riskScore']) {
  const size = { width: '13px', height: '13px' };
  switch (risk) {
    case 'Low':
      return <Shield style={size} strokeWidth={1.5} />;
    case 'Medium':
    case 'High':
      return <AlertTriangle style={size} strokeWidth={1.5} />;
    default:
      return <Shield style={size} strokeWidth={1.5} />;
  }
}

function formatBalance(balance?: number, currency: string = 'USD') {
  if (balance === undefined) return 'N/A';
  if (currency === 'BTC' || currency === 'ETH') {
    return `${balance.toFixed(balance < 0.01 ? 6 : 4)} ${currency}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
}

function formatNumber(num?: number) {
  if (num === undefined) return 'N/A';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return new Intl.NumberFormat('en-US').format(num);
}

function fmtCrypto(val: number, unit: string): string {
  if (val === 0) return `0 ${unit}`;
  return `${val.toFixed(val < 0.01 ? 6 : 4)} ${unit}`;
}

function fmtUsd(val?: number): string {
  if (val == null) return '';
  return `$${val.toFixed(2)}`;
}

function fmtDate(iso?: string): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function SummaryRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0' }}>
      <span style={{ color: 'rgba(255,255,255,0.15)', flexShrink: 0, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
    </div>
  );
}

export default function WalletDashboardCard({ address, stats, summary, isLoading, chart, children }: WalletDashboardCardProps) {
  const { balance, transactionCount, riskScore, lastActivity, currency = 'USD' } = stats;
  const risk = getRiskColor(riskScore);
  const unit = currency === 'USD' ? (summary?.chain === 'ethereum' ? 'ETH' : 'BTC') : currency;
  const cardRef = useRef<HTMLDivElement>(null);
  const [shared, setShared] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const opts = {
        backgroundColor: '#090909',
        pixelRatio: 2,
        skipFonts: true,
        filter: (node: HTMLElement) => !(node.dataset?.downloadBtn),
      };
      // First pass warms up images, second renders properly
      await toBlob(cardRef.current, opts).catch(() => null);
      const blob = await toBlob(cardRef.current, opts);
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wallet-${address.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [address]);

  if (isLoading) {
    return (
      <div style={{ borderRadius: '16px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '20px' }} className="animate-pulse">
        <div style={{ height: '10px', width: '80px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '4px', marginBottom: '12px' }} />
        <div style={{ height: '28px', width: '160px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '6px', marginBottom: '20px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ height: '48px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
          <div style={{ height: '48px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
          <div style={{ height: '48px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }} />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      style={{
        borderRadius: '16px',
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
    >
      {/* Stats section */}
      <div style={{ padding: '20px' }}>
        {/* Wallet Address */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(16,185,129,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Wallet Address</p>
          <p style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all', lineHeight: '1.5' }}>{address}</p>
        </div>

        {/* Balance row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Total Balance</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em', lineHeight: '1', margin: 0 }}>
              {formatBalance(balance, currency)}
            </p>
            {/* Show USD equivalent if displaying in crypto */}
            {currency !== 'USD' && summary?.balanceUsd != null && (
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>{fmtUsd(summary.balanceUsd)} USD</p>
            )}
          </div>
          <div
            data-download-btn="true"
            onClick={handleDownload}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: shared ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${shared ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.08)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.15)'; }}
            onMouseLeave={(e) => { if (!shared) { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; } }}
          >
            {shared ? (
              <Check style={{ width: '15px', height: '15px', color: '#10b981' }} strokeWidth={2} />
            ) : (
              <Download style={{ width: '15px', height: '15px', color: 'rgba(255,255,255,0.3)' }} strokeWidth={2} />
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)', marginBottom: '14px' }} />

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            {
              icon: <Activity style={{ width: '12px', height: '12px', color: 'rgba(16,185,129,0.4)' }} strokeWidth={1.5} />,
              label: 'Transactions',
              value: <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{formatNumber(transactionCount)}</span>,
            },
            {
              icon: <span style={{ color: risk.text }}>{getRiskIcon(riskScore)}</span>,
              label: 'Risk',
              value: (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 8px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  lineHeight: '18px',
                  color: risk.text,
                  backgroundColor: risk.bg,
                  border: `1px solid ${risk.border}`,
                }}>
                  {riskScore || 'Unknown'}
                </span>
              ),
            },
            {
              icon: <Clock style={{ width: '12px', height: '12px', color: 'rgba(255,255,255,0.2)' }} strokeWidth={1.5} />,
              label: 'Last Active',
              value: <span style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{lastActivity || 'N/A'}</span>,
            },
          ].map((stat, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {stat.icon}
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</span>
              </div>
              <div style={{ minHeight: '22px', display: 'flex', alignItems: 'center' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Structured wallet summary */}
        {summary && (summary.totalReceived != null || summary.firstSeen) && (
          <>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)', margin: '14px 0' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {summary.totalReceived != null && (
                <SummaryRow
                  icon={<ArrowDownLeft style={{ width: '11px', height: '11px' }} strokeWidth={1.5} />}
                  label="Received"
                  value={`${fmtCrypto(summary.totalReceived, unit)}${summary.totalReceivedUsd ? ` (${fmtUsd(summary.totalReceivedUsd)})` : ''}`}
                />
              )}
              {summary.totalSent != null && (
                <SummaryRow
                  icon={<ArrowUpRight style={{ width: '11px', height: '11px' }} strokeWidth={1.5} />}
                  label="Sent"
                  value={`${fmtCrypto(summary.totalSent, unit)}${summary.totalSentUsd ? ` (${fmtUsd(summary.totalSentUsd)})` : ''}`}
                />
              )}
              {(summary.firstSeen || summary.lastSeen) && (
                <SummaryRow
                  icon={<Calendar style={{ width: '11px', height: '11px' }} strokeWidth={1.5} />}
                  label="Active"
                  value={`${fmtDate(summary.firstSeen)} — ${fmtDate(summary.lastSeen)}`}
                />
              )}
            </div>
          </>
        )}

        {/* Transaction chart */}
        {chart && (
          <>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)', margin: '14px 0' }} />
            {chart}
          </>
        )}

        {/* Token activity */}
        {summary?.tokenSummary && summary.tokenSummary.length > 0 && (
          <>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04) 50%, transparent)', margin: '14px 0' }} />
            <TokenActivity tokens={summary.tokenSummary} />
          </>
        )}
      </div>

      {/* Analysis content (markdown) */}
      {children && (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.04)',
          padding: '14px 20px',
          backgroundColor: 'rgba(255,255,255,0.01)',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
