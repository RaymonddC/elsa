import { TrendingUp, TrendingDown, Activity, AlertTriangle, Shield } from 'lucide-react';

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
  isLoading?: boolean;
}

function getRiskColor(risk: WalletStats['riskScore']) {
  switch (risk) {
    case 'Low':
      return 'text-emerald-400 bg-emerald-500/10';
    case 'Medium':
      return 'text-amber-400 bg-amber-500/10';
    case 'High':
      return 'text-red-400 bg-red-500/10';
    default:
      return 'text-white/30 bg-white/5';
  }
}

function getRiskIcon(risk: WalletStats['riskScore']) {
  switch (risk) {
    case 'Low':
      return <Shield className="w-4 h-4" />;
    case 'Medium':
      return <AlertTriangle className="w-4 h-4" />;
    case 'High':
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Shield className="w-4 h-4" />;
  }
}

function formatBalance(balance?: number, currency: string = 'USD') {
  if (balance === undefined) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
}

function formatNumber(num?: number) {
  if (num === undefined) return 'N/A';

  // Format large numbers with abbreviations for better readability
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }

  return new Intl.NumberFormat('en-US').format(num);
}

export default function WalletDashboardCard({ address, stats, isLoading }: WalletDashboardCardProps) {
  const { balance, transactionCount, riskScore, lastActivity, currency = 'USD' } = stats;

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-[20px] bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] p-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded w-32 mb-2"></div>
        <div className="h-10 bg-white/5 rounded w-48 mb-6"></div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
          <div className="h-16 bg-white/5 rounded"></div>
          <div className="h-16 bg-white/5 rounded"></div>
          <div className="h-16 bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-[20px] bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-emerald-500/20 hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.15)] cursor-default">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="relative z-10">
        {/* Header: Wallet Address */}
        <div className="mb-6">
          <p className="text-emerald-400 text-[11px] uppercase tracking-widest font-bold mb-2.5 border-b border-emerald-500/20 pb-2">Wallet Address</p>
          <p className="text-white/80 text-[13px] font-mono break-words leading-relaxed">{address}</p>
        </div>

        {/* Main Balance */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/40 text-[11px] uppercase tracking-widest font-bold mb-2">Total Balance</p>
            <h2 className="text-[36px] font-bold text-white/95 tracking-tight leading-none">
              {formatBalance(balance, currency)}
            </h2>
          </div>

          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#F59E0B]/20 to-[#8B5CF6]/20 border border-[#F59E0B]/30 group-hover:scale-110 transition-transform duration-300">
            {balance !== undefined && balance > 0 ? (
              <TrendingUp className="w-5 h-5 text-[#F59E0B]" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="w-5 h-5 text-white/30" strokeWidth={2.5} />
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/[0.06]">
          {/* Transactions */}
          <div className="group/stat">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400/60" strokeWidth={2} />
              <p className="text-white/50 text-[11px] uppercase tracking-wider font-bold">Transactions</p>
            </div>
            <p className="text-white/90 text-[18px] font-semibold">{formatNumber(transactionCount)}</p>
          </div>

          {/* Risk Score */}
          <div className="group/stat">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white/50">{getRiskIcon(riskScore)}</span>
              <p className="text-white/50 text-[11px] uppercase tracking-wider font-bold">Risk Score</p>
            </div>
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-semibold ${getRiskColor(riskScore)}`}>
              {riskScore || 'Unknown'}
            </div>
          </div>

          {/* Last Activity */}
          <div className="group/stat">
            <p className="text-white/50 text-[11px] uppercase tracking-wider font-bold mb-2">Last Activity</p>
            <p className="text-white/90 text-[14px] font-medium">{lastActivity || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Subtle glow effect */}
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-gradient-to-tl from-[#8B5CF6]/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
    </div>
  );
}
