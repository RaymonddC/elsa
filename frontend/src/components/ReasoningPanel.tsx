import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Search,
  Database,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  Terminal,
  AlertTriangle,
  XCircle,
  Zap,
  Wallet,
  Download,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AgentResponse, ReasoningStep } from '../types/agent';

interface ReasoningPanelProps {
  agentResponse: AgentResponse | null;
  isLoading: boolean;
}

export default function ReasoningPanel({ agentResponse, isLoading }: ReasoningPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  // Auto-expand first step when new response arrives
  if (agentResponse && expandedSteps.size === 0 && agentResponse.reasoning_steps.length > 0) {
    setExpandedSteps(new Set([agentResponse.reasoning_steps[0].step_number]));
  }

  return (
    <div className="h-full flex flex-col bg-[#111111]">
      {/* Content */}
      <div className="h-full overflow-y-auto" style={{ paddingLeft: '40px', paddingRight: '40px', paddingTop: '40px', paddingBottom: '40px' }}>
        <AnimatePresence mode="wait">
          {!agentResponse && !isLoading ? (
            <EmptyState />
          ) : isLoading && !agentResponse ? (
            <LoadingState />
          ) : agentResponse ? (
            <div>
              {/* Metadata */}
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-[#262626]">
                <Badge
                  variant={agentResponse.success ? "default" : "destructive"}
                  className={`
                    flex items-center gap-2 px-4 py-2 text-[13px] font-bold shadow-sm
                    ${agentResponse.success
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                    }
                  `}
                >
                  {agentResponse.success
                    ? <><CheckCircle2 className="w-4 h-4" strokeWidth={2.5} /> Complete</>
                    : <><XCircle className="w-4 h-4" strokeWidth={2.5} /> Failed</>
                  }
                </Badge>
                <span className="text-[13px] text-gray-400 font-semibold">
                  {agentResponse.reasoning_steps.length} steps
                </span>
                <span className="text-[13px] text-gray-400 font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" strokeWidth={2.5} />
                  {agentResponse.total_duration_ms}ms
                </span>
              </div>

              {/* Steps */}
              <motion.div
                key="steps"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {agentResponse.reasoning_steps.map((step, idx) => (
                  <StepCard
                    key={step.step_number}
                    step={step}
                    index={idx}
                    isExpanded={expandedSteps.has(step.step_number)}
                    onToggle={() => toggleStep(step.step_number)}
                    isLast={idx === agentResponse.reasoning_steps.length - 1}
                  />
                ))}
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center py-20"
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mb-8 shadow-2xl shadow-emerald-500/20">
        <Terminal className="w-10 h-10 text-white" strokeWidth={2.5} />
      </div>
      <h3 className="text-2xl font-bold text-white mb-4">No reasoning data yet</h3>
      <p className="text-[14px] text-gray-400 text-center max-w-lg leading-relaxed font-medium">
        Submit a Bitcoin wallet address to see the agent's step-by-step reasoning process, including blockchain queries, anomaly detection, and analysis.
      </p>

      <div className="mt-12 grid grid-cols-3 gap-5 max-w-xl">
        {[
          { icon: Wallet, label: 'Fetch Wallet', color: 'text-emerald-500' },
          { icon: Search, label: 'Search Txns', color: 'text-blue-500' },
          { icon: Shield, label: 'Detect Anomalies', color: 'text-purple-500' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="flex flex-col items-center gap-4 p-6 rounded-xl bg-[#262626] border border-[#383838]"
          >
            <item.icon className={`w-7 h-7 ${item.color}`} strokeWidth={2.5} />
            <span className="text-[12px] text-gray-300 font-bold text-center">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col items-center justify-center"
    >
      <div className="relative w-20 h-20 mb-8">
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-emerald-500/20"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 rounded-full border-4 border-transparent border-t-emerald-500"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain className="w-7 h-7 text-emerald-500" strokeWidth={2.5} />
        </div>
      </div>
      <p className="text-lg font-bold text-white mb-2">Processing query...</p>
      <p className="text-[14px] text-gray-400 font-medium">Fetching blockchain data and analyzing wallet</p>
    </motion.div>
  );
}

interface StepCardProps {
  step: ReasoningStep;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}

function StepCard({ step, index, isExpanded, onToggle, isLast }: StepCardProps) {
  const hasToolCall = !!step.tool_call;

  const getStepIcon = () => {
    if (step.tool_call?.tool_name === 'fetch_wallet_data') return Download;
    if (step.tool_call?.tool_name === 'search_transactions') return Search;
    if (step.tool_call?.tool_name === 'get_wallet_summary') return Wallet;
    if (step.tool_call?.tool_name === 'detect_anomalies') return Shield;
    if (isLast) return CheckCircle2;
    return Brain;
  };

  const StepIcon = getStepIcon();
  const isSuccess = isLast;
  const isTool = hasToolCall;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="relative"
    >
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-7 top-20 bottom-0 w-0.5 bg-gradient-to-b from-[#383838] via-[#2a2a2a] to-transparent" />
      )}

      <Card className={`
        border-2 overflow-hidden transition-all duration-300 bg-[#262626]
        ${isExpanded ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-[#383838] hover:border-emerald-500/50'}
      `}>
        <CardContent className="p-0">
          {/* Header */}
          <Button
            variant="ghost"
            onClick={onToggle}
            className="w-full h-auto text-left p-5 flex items-start gap-4 hover:bg-[#383838]/50 transition-colors rounded-none"
          >
          {/* Step indicator */}
          <div className={`
            w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border-2 shadow-lg transition-all
            ${isSuccess ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400 shadow-emerald-500/30' : ''}
            ${isTool && !isSuccess ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400 shadow-blue-500/30' : ''}
            ${!isTool && !isSuccess ? 'bg-gradient-to-br from-gray-100 to-gray-200 border-gray-300' : ''}
          `}>
            <StepIcon className={`w-6 h-6 ${
              isSuccess ? 'text-white' :
              isTool ? 'text-white' : 'text-gray-600'
            }`} strokeWidth={2.5} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              <Badge variant="secondary" className="text-[12px] font-bold text-gray-300 bg-[#383838] px-3 py-1 border border-[#4a4a4a] hover:bg-[#383838]">
                Step {step.step_number}
              </Badge>
              {hasToolCall && (
                <Badge variant="default" className="text-[12px] font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 border border-emerald-500/30 hover:bg-emerald-500/20">
                  {step.tool_call?.tool_name}
                </Badge>
              )}
              {step.tool_result?.execution_time_ms && (
                <span className="text-[12px] text-gray-400 font-semibold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {step.tool_result.execution_time_ms}ms
                </span>
              )}
            </div>
            <p className="text-[14px] text-gray-200 line-clamp-2 leading-relaxed font-medium">{step.thought}</p>
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400 mt-1"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
          </motion.div>
        </Button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && hasToolCall && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t-2 border-[#383838] overflow-hidden"
            >
              <div className="p-6 space-y-5 bg-[#111111]">
                {/* Tool Arguments */}
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <Terminal className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
                    <h4 className="text-[13px] font-bold text-white uppercase tracking-wide">
                      Parameters
                    </h4>
                  </div>
                  <pre className="bg-black border-2 border-emerald-500/30 rounded-lg p-4 overflow-x-auto text-[12px] text-emerald-400 font-mono leading-relaxed">
                    {JSON.stringify(step.tool_call?.arguments ?? {}, null, 2)}
                  </pre>
                </div>

                {/* Elasticsearch Query */}
                {step.tool_result?.elasticsearch_query && (
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <Database className="w-4 h-4 text-blue-500" strokeWidth={2.5} />
                      <h4 className="text-[13px] font-bold text-white uppercase tracking-wide">
                        Elasticsearch Query
                      </h4>
                    </div>
                    <pre className="bg-black border-2 border-blue-500/30 rounded-lg p-4 overflow-x-auto max-h-64 text-[12px] text-blue-400 font-mono leading-relaxed">
                      {JSON.stringify(step.tool_result.elasticsearch_query, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Results */}
                {step.tool_result && (
                  <div>
                    <div className="flex items-center gap-2.5 mb-3">
                      <Layers className="w-4 h-4 text-purple-500" strokeWidth={2.5} />
                      <h4 className="text-[13px] font-bold text-white uppercase tracking-wide">
                        Results
                      </h4>
                    </div>
                    <ResultPreview result={step.tool_result.result} />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ResultPreview({ result }: { result: unknown }): React.ReactElement {
  if (!result || typeof result !== 'object') {
    return <pre className="bg-black border-2 border-[#383838] rounded-lg p-4 text-sm text-gray-400 font-mono">{JSON.stringify(result)}</pre>;
  }

  const resultObj = result as Record<string, unknown>;

  // Handle wallet summary (both BTC and ETH)
  if (resultObj.address && (resultObj.final_balance_btc !== undefined || resultObj.final_balance_eth !== undefined)) {
    const isEth = resultObj.chain === 'ethereum' || resultObj.final_balance_eth !== undefined;
    const unit = isEth ? 'ETH' : 'BTC';
    const balance = isEth ? resultObj.final_balance_eth : resultObj.final_balance_btc;
    const received = isEth ? resultObj.total_received_eth : resultObj.total_received_btc;
    const sent = isEth ? resultObj.total_sent_eth : resultObj.total_sent_btc;
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-lg bg-[#262626] border-2 border-[#383838]">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
            <span className="text-[13px] font-bold text-white">Wallet Summary ({isEth ? 'Ethereum' : 'Bitcoin'})</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div><span className="text-gray-400">Address:</span> <span className="text-gray-200 font-mono">{(resultObj.address as string).slice(0, 16)}...</span></div>
            <div><span className="text-gray-400">Balance:</span> <span className="text-emerald-400 font-bold">{balance as number} {unit}</span></div>
            {received !== undefined && <div><span className="text-gray-400">Total Received:</span> <span className="text-gray-200">{received as number} {unit}</span></div>}
            {sent !== undefined && <div><span className="text-gray-400">Total Sent:</span> <span className="text-gray-200">{sent as number} {unit}</span></div>}
            <div><span className="text-gray-400">Transactions:</span> <span className="text-gray-200">{resultObj.n_tx as number}</span></div>
          </div>
        </div>
      </div>
    );
  }

  // Handle transaction search results
  if (resultObj.transactions && Array.isArray(resultObj.transactions)) {
    const txs = resultObj.transactions as Array<Record<string, unknown>>;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300 font-semibold">
            Found <span className="text-emerald-500 font-bold">{resultObj.total as number}</span> transactions
          </span>
          <span className="text-gray-500 font-medium">
            showing {Math.min(txs.length, 3)}
          </span>
        </div>
        <div className="space-y-3">
          {txs.slice(0, 3).map((tx, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="p-4 rounded-lg bg-[#262626] border-2 border-[#383838] hover:border-[#4a4a4a] transition-colors"
            >
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <DirectionBadge direction={tx.direction as string} />
                <span className="text-[12px] font-bold text-emerald-400">{(tx.value_btc || tx.value_eth) as number} {tx.value_eth !== undefined ? 'ETH' : 'BTC'}</span>
                <span className="text-[12px] text-gray-400 font-semibold ml-auto flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {new Date(tx.time as string).toLocaleString()}
                </span>
              </div>
              <p className="text-[12px] text-gray-400 font-mono truncate">{tx.tx_hash as string}</p>
            </motion.div>
          ))}
        </div>
        {txs.length > 3 && (
          <p className="text-[12px] text-gray-400 text-center font-semibold">
            + {txs.length - 3} more transactions
          </p>
        )}
      </div>
    );
  }

  // Handle anomaly results
  if (resultObj.anomalies && Array.isArray(resultObj.anomalies)) {
    const anomalies = resultObj.anomalies as Array<Record<string, unknown>>;
    const totalAnomalies = resultObj.total_anomalies as number;
    return (
      <div className="space-y-4">
        <div className="text-sm text-gray-300 font-semibold">
          Detected <span className="text-amber-500 font-bold">{totalAnomalies}</span> anomalies
        </div>
        <div className="space-y-3">
          {anomalies.slice(0, 4).map((anomaly, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="p-4 rounded-lg bg-[#262626] border-2 border-[#383838]"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" strokeWidth={2.5} />
                <span className="text-[13px] font-bold text-amber-400">{anomaly.type as string}</span>
                <span className="text-[11px] text-gray-400 ml-auto">{(anomaly.details as Record<string, unknown>)?.count as number || 1} occurrence(s)</span>
              </div>
              <p className="text-[12px] text-gray-400">{anomaly.description as string}</p>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Handle fetch_wallet_data results
  if (resultObj.indexed_count !== undefined && resultObj.address) {
    return (
      <div className="p-4 rounded-lg bg-[#262626] border-2 border-[#383838]">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
          <span className="text-[13px] font-bold text-white">Data Fetched</span>
        </div>
        <div className="text-[13px] text-gray-300">
          Indexed <span className="text-emerald-400 font-bold">{resultObj.indexed_count as number}</span> transactions for <span className="font-mono text-gray-400">{(resultObj.address as string).slice(0, 16)}...</span>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <pre className="bg-black border-2 border-[#383838] rounded-lg p-4 overflow-x-auto max-h-48 text-sm text-gray-400 font-mono">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  const isIncoming = direction === 'incoming';
  const Icon = isIncoming ? ArrowDownLeft : ArrowUpRight;

  return (
    <span className={`${isIncoming ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} border text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5`}>
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      {isIncoming ? 'IN' : 'OUT'}
    </span>
  );
}
