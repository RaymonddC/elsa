import { useState } from 'react';
import {
  Brain, Search, Database, CheckCircle2, ChevronRight, Clock,
  Terminal, AlertTriangle, XCircle, Zap, Wallet, Download, Shield,
  ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AgentResponse, ReasoningStep } from '../types/agent';

interface ReasoningPanelProps {
  agentResponse: AgentResponse | null;
  isLoading: boolean;
}

export default function ReasoningPanel({ agentResponse, isLoading }: ReasoningPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (step: number) => {
    const next = new Set(expandedSteps);
    next.has(step) ? next.delete(step) : next.add(step);
    setExpandedSteps(next);
  };

  if (agentResponse && expandedSteps.size === 0 && agentResponse.reasoning_steps.length > 0) {
    setExpandedSteps(new Set([agentResponse.reasoning_steps[0].step_number]));
  }

  if (!agentResponse && !isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-10">
        <Terminal className="w-10 h-10 text-emerald-500 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">No reasoning data yet</h3>
        <p className="text-sm text-gray-400 text-center max-w-md">
          Submit a wallet address to see the agent's step-by-step reasoning process.
        </p>
      </div>
    );
  }

  if (isLoading && !agentResponse) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-full border-3 border-transparent border-t-emerald-500 animate-spin mb-4" />
        <p className="text-base font-semibold text-white">Processing...</p>
        <p className="text-sm text-gray-400">Fetching blockchain data</p>
      </div>
    );
  }

  if (!agentResponse) return null;

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Status bar */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#262626]">
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded ${
          agentResponse.success ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
        }`}>
          {agentResponse.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          {agentResponse.success ? 'Complete' : 'Failed'}
        </span>
        <span className="text-xs text-gray-400">{agentResponse.reasoning_steps.length} steps</span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {agentResponse.total_duration_ms}ms
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {agentResponse.reasoning_steps.map((step, idx) => (
          <StepCard
            key={step.step_number}
            step={step}
            isExpanded={expandedSteps.has(step.step_number)}
            onToggle={() => toggleStep(step.step_number)}
            isLast={idx === agentResponse.reasoning_steps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function getStepIcon(step: ReasoningStep, isLast: boolean) {
  if (step.tool_call?.tool_name === 'fetch_wallet_data') return Download;
  if (step.tool_call?.tool_name === 'search_transactions') return Search;
  if (step.tool_call?.tool_name === 'get_wallet_summary') return Wallet;
  if (step.tool_call?.tool_name === 'detect_anomalies') return Shield;
  if (isLast) return CheckCircle2;
  return Brain;
}

function StepCard({ step, isExpanded, onToggle, isLast }: {
  step: ReasoningStep; isExpanded: boolean; onToggle: () => void; isLast: boolean;
}) {
  const hasTool = !!step.tool_call;
  const Icon = getStepIcon(step, isLast);

  return (
    <div className={`rounded-lg border overflow-hidden transition-colors ${
      isExpanded ? 'border-emerald-500/50 bg-[#1a1a1a]' : 'border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#383838]'
    }`}>
      {/* Header */}
      <Button
        variant="ghost"
        onClick={onToggle}
        className="w-full h-auto text-left p-4 flex items-center gap-3 hover:bg-[#222] rounded-none"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isLast ? 'bg-emerald-500' : hasTool ? 'bg-blue-500' : 'bg-[#333]'
        }`}>
          <Icon className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400 font-medium">Step {step.step_number}</span>
            {hasTool && (
              <span className="text-xs text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded font-medium">
                {step.tool_call?.tool_name}
              </span>
            )}
            {step.tool_result?.execution_time_ms && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Zap className="w-3 h-3" /> {step.tool_result.execution_time_ms}ms
              </span>
            )}
          </div>
          <p className="text-sm text-gray-300 line-clamp-1">{step.thought}</p>
        </div>

        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </Button>

      {/* Expanded */}
      {isExpanded && hasTool && (
        <div className="border-t border-[#2a2a2a] p-4 space-y-4 bg-[#141414]">
          <div>
            <Label icon={Terminal} color="text-emerald-500">Parameters</Label>
            <Pre color="text-emerald-400 border-emerald-500/20">
              {JSON.stringify(step.tool_call?.arguments ?? {}, null, 2)}
            </Pre>
          </div>

          {step.tool_result?.elasticsearch_query && (
            <div>
              <Label icon={Database} color="text-blue-500">Elasticsearch Query</Label>
              <Pre color="text-blue-400 border-blue-500/20">
                {JSON.stringify(step.tool_result.elasticsearch_query, null, 2)}
              </Pre>
            </div>
          )}

          {step.tool_result && (
            <div>
              <Label icon={Search} color="text-purple-500">Results</Label>
              <ResultPreview result={step.tool_result.result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Label({ icon: Icon, color, children }: { icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{children}</span>
    </div>
  );
}

function Pre({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <pre className={`bg-black/50 border rounded-lg p-3 overflow-x-auto max-h-48 text-xs font-mono leading-relaxed ${color}`}>
      {children}
    </pre>
  );
}

function ResultPreview({ result }: { result: unknown }): React.ReactElement {
  if (!result || typeof result !== 'object') {
    return <Pre color="text-gray-400 border-[#2a2a2a]">{JSON.stringify(result)}</Pre>;
  }

  const r = result as Record<string, unknown>;

  // Wallet summary
  if (r.address && (r.final_balance_btc !== undefined || r.final_balance_eth !== undefined)) {
    const isEth = r.chain === 'ethereum' || r.final_balance_eth !== undefined;
    const unit = isEth ? 'ETH' : 'BTC';
    const balance = isEth ? r.final_balance_eth : r.final_balance_btc;
    const received = isEth ? r.total_received_eth : r.total_received_btc;
    const sent = isEth ? r.total_sent_eth : r.total_sent_btc;
    return (
      <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 mb-2">
          <Wallet className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-semibold text-white">Wallet Summary ({isEth ? 'Ethereum' : 'Bitcoin'})</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-gray-500">Address:</span> <span className="text-gray-300 font-mono">{(r.address as string).slice(0, 16)}...</span></div>
          <div><span className="text-gray-500">Balance:</span> <span className="text-emerald-400 font-semibold">{balance as number} {unit}</span></div>
          {received !== undefined && <div><span className="text-gray-500">Received:</span> <span className="text-gray-300">{received as number} {unit}</span></div>}
          {sent !== undefined && <div><span className="text-gray-500">Sent:</span> <span className="text-gray-300">{sent as number} {unit}</span></div>}
          <div><span className="text-gray-500">Transactions:</span> <span className="text-gray-300">{r.n_tx as number}</span></div>
        </div>
      </div>
    );
  }

  // Transaction results
  if (r.transactions && Array.isArray(r.transactions)) {
    const txs = r.transactions as Array<Record<string, unknown>>;
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400">
          Found <span className="text-emerald-400 font-semibold">{r.total as number}</span> transactions (showing {Math.min(txs.length, 3)})
        </div>
        {txs.slice(0, 3).map((tx, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-xs">
            <div className="flex items-center gap-2 mb-1.5">
              <DirectionBadge direction={tx.direction as string} />
              <span className="text-emerald-400 font-semibold">{(tx.value_btc || tx.value_eth) as number} {tx.value_eth !== undefined ? 'ETH' : 'BTC'}</span>
              <span className="text-gray-500 ml-auto">{new Date(tx.time as string).toLocaleString()}</span>
            </div>
            <p className="text-gray-500 font-mono truncate">{tx.tx_hash as string}</p>
          </div>
        ))}
        {txs.length > 3 && <p className="text-xs text-gray-500 text-center">+ {txs.length - 3} more</p>}
      </div>
    );
  }

  // Anomalies
  if (r.anomalies && Array.isArray(r.anomalies)) {
    const anomalies = r.anomalies as Array<Record<string, unknown>>;
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400">
          Detected <span className="text-amber-400 font-semibold">{r.total_anomalies as number}</span> anomalies
        </div>
        {anomalies.slice(0, 4).map((a, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-xs">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              <span className="font-semibold text-amber-400">{a.type as string}</span>
            </div>
            <p className="text-gray-400">{a.description as string}</p>
          </div>
        ))}
      </div>
    );
  }

  // Fetch result
  if (r.indexed_count !== undefined && r.address) {
    return (
      <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-xs flex items-center gap-2">
        <Download className="w-3.5 h-3.5 text-emerald-500" />
        <span className="text-gray-300">
          Indexed <span className="text-emerald-400 font-semibold">{r.indexed_count as number}</span> transactions for <span className="font-mono text-gray-500">{(r.address as string).slice(0, 16)}...</span>
        </span>
      </div>
    );
  }

  // Fallback
  return <Pre color="text-gray-400 border-[#2a2a2a]">{JSON.stringify(result, null, 2)}</Pre>;
}

function DirectionBadge({ direction }: { direction: string }) {
  const isIn = direction === 'incoming';
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
      isIn ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
    }`}>
      <Icon className="w-3 h-3" /> {isIn ? 'IN' : 'OUT'}
    </span>
  );
}
