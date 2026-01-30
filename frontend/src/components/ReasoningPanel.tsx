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
  Info,
  Zap,
} from 'lucide-react';
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
    <div className="h-full flex flex-col bg-[#161920]">
      {/* Header */}
      <div className="h-14 border-b border-white/10 flex items-center justify-between px-5 flex-shrink-0 bg-[#0f1117]/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Agent Reasoning</h2>
            <p className="text-[10px] text-gray-500">
              {agentResponse
                ? `${agentResponse.reasoning_steps.length} steps • ${agentResponse.total_duration_ms}ms`
                : 'Waiting for query...'}
            </p>
          </div>
        </div>

        {agentResponse && (
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-medium
            ${agentResponse.success
              ? 'bg-green-500/10 text-green-400'
              : 'bg-red-500/10 text-red-400'
            }
          `}>
            {agentResponse.success
              ? <><CheckCircle2 className="w-3 h-3" /> Complete</>
              : <><XCircle className="w-3 h-3" /> Failed</>
            }
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {!agentResponse && !isLoading ? (
            <EmptyState />
          ) : isLoading && !agentResponse ? (
            <LoadingState />
          ) : agentResponse ? (
            <motion.div
              key="steps"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
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
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full flex flex-col items-center justify-center"
    >
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
        <Terminal className="w-8 h-8 text-gray-600" />
      </div>
      <h3 className="text-base font-medium text-gray-400 mb-2">No analysis yet</h3>
      <p className="text-sm text-gray-600 text-center max-w-xs">
        Ask a question to see the agent's reasoning process and Elasticsearch queries
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { icon: Search, label: 'Search', color: 'text-blue-400' },
          { icon: Database, label: 'Query', color: 'text-amber-400' },
          { icon: Brain, label: 'Analyze', color: 'text-purple-400' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/5"
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <span className="text-[10px] text-gray-500">{item.label}</span>
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
      <div className="relative w-16 h-16 mb-6">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-blue-500/20"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-full border-2 border-transparent border-t-blue-500"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain className="w-5 h-5 text-blue-400" />
        </div>
      </div>
      <p className="text-sm text-gray-400">Processing query...</p>
      <p className="text-[10px] text-gray-600 mt-1">Searching logs and analyzing patterns</p>
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
    if (step.tool_call?.tool_name === 'search_logs') return Search;
    if (step.tool_call?.tool_name === 'aggregate_errors') return Layers;
    if (isLast) return CheckCircle2;
    return Brain;
  };

  const StepIcon = getStepIcon();
  const isSuccess = isLast;
  const isTool = hasToolCall;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-5 top-14 bottom-0 w-px bg-gradient-to-b from-white/10 to-transparent" />
      )}

      <div className={`
        bg-[#1c1f28] border rounded-xl overflow-hidden transition-all duration-200
        ${isExpanded ? 'border-white/20 shadow-lg' : 'border-white/10 hover:border-white/15'}
      `}>
        {/* Header */}
        <button
          onClick={onToggle}
          className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/5 transition-colors"
        >
          {/* Step indicator */}
          <div className={`
            w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border
            ${isSuccess ? 'bg-green-500/10 border-green-500/30' : ''}
            ${isTool && !isSuccess ? 'bg-blue-500/10 border-blue-500/30' : ''}
            ${!isTool && !isSuccess ? 'bg-white/5 border-white/10' : ''}
          `}>
            <StepIcon className={`w-5 h-5 ${
              isSuccess ? 'text-green-400' :
              isTool ? 'text-blue-400' : 'text-gray-400'
            }`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                Step {step.step_number}
              </span>
              {hasToolCall && (
                <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                  {step.tool_call?.tool_name}
                </span>
              )}
              {step.tool_result?.execution_time_ms && (
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {step.tool_result.execution_time_ms}ms
                </span>
              )}
            </div>
            <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">{step.thought}</p>
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            className="text-gray-500 mt-1"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && hasToolCall && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-white/10 overflow-hidden"
            >
              <div className="p-4 space-y-4 bg-black/20">
                {/* Tool Arguments */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-3.5 h-3.5 text-green-400" />
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Parameters
                    </h4>
                  </div>
                  <pre className="bg-black/40 border border-white/5 rounded-lg p-3 overflow-x-auto text-xs text-green-400 font-mono">
                    {JSON.stringify(step.tool_call?.arguments ?? {}, null, 2)}
                  </pre>
                </div>

                {/* Elasticsearch Query */}
                {step.tool_result?.elasticsearch_query && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-3.5 h-3.5 text-amber-400" />
                      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Elasticsearch Query
                      </h4>
                    </div>
                    <pre className="bg-black/40 border border-white/5 rounded-lg p-3 overflow-x-auto max-h-48 text-xs text-amber-400 font-mono">
                      {JSON.stringify(step.tool_result.elasticsearch_query, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Results */}
                {step.tool_result && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
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
      </div>
    </motion.div>
  );
}

function ResultPreview({ result }: { result: unknown }): React.ReactElement {
  if (!result || typeof result !== 'object') {
    return <pre className="bg-black/40 border border-white/5 rounded-lg p-3 text-xs text-gray-400 font-mono">{JSON.stringify(result)}</pre>;
  }

  const resultObj = result as Record<string, unknown>;

  // Handle search results
  if (resultObj.results && Array.isArray(resultObj.results)) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            Found <span className="text-white font-semibold">{resultObj.total as number}</span> results
          </span>
          <span className="text-gray-600">
            showing {Math.min(resultObj.results.length, 3)}
          </span>
        </div>
        <div className="space-y-2">
          {resultObj.results.slice(0, 3).map((log: Record<string, unknown>, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 rounded-lg bg-black/30 border border-white/5"
            >
              <div className="flex items-center gap-2 mb-2">
                <LogLevelBadge level={log.level as string} />
                <span className="text-[10px] font-medium text-purple-400">{log.service as string}</span>
                <span className="text-[10px] text-gray-600 ml-auto flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(log.timestamp as string).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono truncate">{log.message as string}</p>
            </motion.div>
          ))}
        </div>
        {resultObj.results.length > 3 && (
          <p className="text-[10px] text-gray-600 text-center">
            + {resultObj.results.length - 3} more results
          </p>
        )}
      </div>
    );
  }

  // Handle aggregation results
  if (resultObj.aggregations && Array.isArray(resultObj.aggregations)) {
    const totalErrors = resultObj.total_errors as number;
    return (
      <div className="space-y-3">
        <div className="text-xs text-gray-400">
          Total: <span className="text-red-400 font-semibold">{totalErrors}</span> errors
        </div>
        <div className="space-y-2">
          {(resultObj.aggregations as Array<{ key: string; count: number }>).map((agg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative"
            >
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/30 border border-white/5">
                <span className="text-sm font-mono text-gray-300">{agg.key}</span>
                <span className="text-sm font-semibold text-red-400">{agg.count}</span>
              </div>
              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(agg.count / totalErrors) * 100}%` }}
                transition={{ delay: idx * 0.05 + 0.2, duration: 0.4 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <pre className="bg-black/40 border border-white/5 rounded-lg p-3 overflow-x-auto max-h-32 text-xs text-gray-400 font-mono">
      {JSON.stringify(result, null, 2)}
    </pre>
  );
}

function LogLevelBadge({ level }: { level: string }) {
  const config: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
    ERROR: { icon: XCircle, bg: 'bg-red-500/15', text: 'text-red-400' },
    WARN: { icon: AlertTriangle, bg: 'bg-amber-500/15', text: 'text-amber-400' },
    INFO: { icon: Info, bg: 'bg-blue-500/15', text: 'text-blue-400' },
    DEBUG: { icon: Terminal, bg: 'bg-purple-500/15', text: 'text-purple-400' },
  };

  const { icon: Icon, bg, text } = config[level] || config.INFO;

  return (
    <span className={`${bg} ${text} text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {level}
    </span>
  );
}
