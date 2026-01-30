import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Search,
  Database,
  CheckCircle2,
  ChevronDown,
  Activity,
  Clock,
  Terminal,
  Cpu,
  Layers,
  Zap,
} from 'lucide-react';
import type { AgentResponse, ReasoningStep } from '../types/agent';
import { cn } from '../lib/utils';

interface GlassBoxProps {
  agentResponse: AgentResponse | null;
}

export default function GlassBox({ agentResponse }: GlassBoxProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([1]));

  const toggleStep = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <div className="h-full bg-cyber-dark relative overflow-hidden flex flex-col">
      {/* Background effects */}
      <div className="absolute inset-0 bg-cyber-grid bg-grid opacity-30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyber-purple/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyber-cyan/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-4 border-b border-cyber-border/50 glass-strong"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <motion.div
                className="w-10 h-10 rounded-xl bg-cyber-surface border border-cyber-cyan/30 flex items-center justify-center"
                animate={agentResponse ? {} : {
                  boxShadow: [
                    '0 0 10px rgba(0, 245, 255, 0.3)',
                    '0 0 20px rgba(0, 245, 255, 0.5)',
                    '0 0 10px rgba(0, 245, 255, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Brain className="w-5 h-5 text-cyber-cyan" />
              </motion.div>
              <motion.div
                className={cn(
                  "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-cyber-dark",
                  agentResponse ? "bg-cyber-green" : "bg-cyber-yellow"
                )}
                animate={agentResponse ? {} : { scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold tracking-widest text-zinc-200">
                GLASS BOX
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                <span className={agentResponse ? "text-cyber-green" : "text-cyber-yellow"}>
                  {agentResponse ? "● COMPLETE" : "● READY"}
                </span>
                <span className="text-zinc-600">|</span>
                <span>AGENT REASONING</span>
              </p>
            </div>
          </div>

          {agentResponse && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-4"
            >
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 font-mono">STEPS</p>
                <p className="text-sm font-mono text-cyber-cyan font-bold">
                  {agentResponse.reasoning_steps.length}
                </p>
              </div>
              <div className="w-px h-8 bg-cyber-border/50" />
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 font-mono">DURATION</p>
                <p className="text-sm font-mono text-cyber-purple font-bold">
                  {agentResponse.total_duration_ms}ms
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative z-10 p-4">
        <AnimatePresence mode="wait">
          {!agentResponse ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center"
            >
              <motion.div
                className="relative w-32 h-32 mb-8"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                {/* Orbital rings */}
                <div className="absolute inset-0 rounded-full border border-cyber-cyan/20" />
                <div className="absolute inset-2 rounded-full border border-cyber-purple/20" />
                <div className="absolute inset-4 rounded-full border border-cyber-cyan/10" />

                {/* Center brain */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 20px rgba(0, 245, 255, 0.2)',
                        '0 0 40px rgba(191, 90, 242, 0.3)',
                        '0 0 20px rgba(0, 245, 255, 0.2)'
                      ]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-16 h-16 rounded-2xl bg-cyber-surface border border-cyber-border flex items-center justify-center"
                  >
                    <Cpu className="w-8 h-8 text-cyber-cyan/50" />
                  </motion.div>
                </div>

                {/* Orbiting dots */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-cyber-cyan"
                    style={{
                      top: '50%',
                      left: '50%',
                    }}
                    animate={{
                      x: [
                        Math.cos((i * 120 * Math.PI) / 180) * 50,
                        Math.cos(((i * 120 + 360) * Math.PI) / 180) * 50
                      ],
                      y: [
                        Math.sin((i * 120 * Math.PI) / 180) * 50,
                        Math.sin(((i * 120 + 360) * Math.PI) / 180) * 50
                      ],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                      delay: i * 0.5
                    }}
                  />
                ))}
              </motion.div>

              <h3 className="font-display text-lg font-semibold text-zinc-400 mb-2">
                AWAITING INPUT
              </h3>
              <p className="text-sm text-zinc-600 text-center max-w-xs font-mono">
                Agent reasoning and Elasticsearch queries will appear here
              </p>

              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { icon: Search, label: 'Search', color: 'cyan' },
                  { icon: Database, label: 'Query', color: 'purple' },
                  { icon: Brain, label: 'Analyze', color: 'green' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-cyber-surface/50 border border-cyber-border/30"
                  >
                    <item.icon className={cn(
                      "w-5 h-5",
                      item.color === 'cyan' && "text-cyber-cyan/50",
                      item.color === 'purple' && "text-cyber-purple/50",
                      item.color === 'green' && "text-cyber-green/50",
                    )} />
                    <span className="text-[10px] font-mono text-zinc-500">{item.label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {agentResponse.reasoning_steps.map((step, idx) => (
                <ReasoningStepCard
                  key={step.step_number}
                  step={step}
                  isExpanded={expandedSteps.has(step.step_number)}
                  onToggle={() => toggleStep(step.step_number)}
                  index={idx}
                  isLast={idx === agentResponse.reasoning_steps.length - 1}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Status */}
      {agentResponse && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative z-10 p-4 border-t border-cyber-border/50 glass-strong"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                agentResponse.success
                  ? "bg-cyber-green/20 border border-cyber-green/30"
                  : "bg-cyber-pink/20 border border-cyber-pink/30"
              )}>
                {agentResponse.success
                  ? <CheckCircle2 className="w-4 h-4 text-cyber-green" />
                  : <Activity className="w-4 h-4 text-cyber-pink" />
                }
              </div>
              <div>
                <p className={cn(
                  "text-xs font-mono font-bold",
                  agentResponse.success ? "text-cyber-green" : "text-cyber-pink"
                )}>
                  {agentResponse.success ? "ANALYSIS COMPLETE" : "ANALYSIS FAILED"}
                </p>
                {agentResponse.error && (
                  <p className="text-[10px] text-cyber-pink/70">{agentResponse.error}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <Clock className="w-3 h-3" />
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

interface ReasoningStepCardProps {
  step: ReasoningStep;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
  isLast: boolean;
}

function ReasoningStepCard({ step, isExpanded, onToggle, index, isLast }: ReasoningStepCardProps) {
  const hasToolCall = !!step.tool_call;

  const getStepIcon = () => {
    if (step.tool_call?.tool_name === 'search_logs') return Search;
    if (step.tool_call?.tool_name === 'aggregate_errors') return Layers;
    if (isLast) return CheckCircle2;
    return Brain;
  };

  const StepIcon = getStepIcon();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {/* Connection line */}
      {!isLast && (
        <div className="absolute left-5 top-12 bottom-0 w-px bg-gradient-to-b from-cyber-cyan/30 to-transparent" />
      )}

      <div className={cn(
        "rounded-xl overflow-hidden transition-all duration-300",
        "bg-cyber-surface/50 border border-cyber-border/50",
        isExpanded && "border-cyber-cyan/30 shadow-[0_0_30px_rgba(0,245,255,0.1)]"
      )}>
        {/* Header */}
        <button
          onClick={onToggle}
          className="w-full text-left p-4 flex items-start gap-3 hover:bg-cyber-cyan/5 transition-colors"
        >
          {/* Step indicator */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            "bg-gradient-to-br",
            hasToolCall ? "from-cyber-cyan/20 to-cyber-purple/20 border border-cyber-cyan/30" : "from-cyber-green/20 to-cyber-cyan/20 border border-cyber-green/30"
          )}>
            <StepIcon className={cn(
              "w-5 h-5",
              hasToolCall ? "text-cyber-cyan" : "text-cyber-green"
            )} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold text-cyber-cyan bg-cyber-cyan/10 px-2 py-0.5 rounded">
                STEP {step.step_number}
              </span>
              {hasToolCall && (
                <span className="text-[10px] font-mono text-cyber-purple bg-cyber-purple/10 px-2 py-0.5 rounded">
                  {step.tool_call?.tool_name}
                </span>
              )}
              {step.tool_result?.execution_time_ms && (
                <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {step.tool_result.execution_time_ms}ms
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-300 line-clamp-2">{step.thought}</p>
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-zinc-500"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && hasToolCall && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-cyber-border/30"
            >
              <div className="p-4 space-y-4">
                {/* Tool Arguments */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Terminal className="w-3 h-3 text-cyber-green" />
                    <h4 className="text-[10px] font-mono font-bold text-cyber-green uppercase tracking-wider">
                      Tool Arguments
                    </h4>
                  </div>
                  <pre className="code-block p-3 overflow-x-auto">
                    <code className="text-cyber-green text-xs">
                      {JSON.stringify(step.tool_call?.arguments ?? {}, null, 2)}
                    </code>
                  </pre>
                </div>

                {/* Elasticsearch Query */}
                {step.tool_result?.elasticsearch_query && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="w-3 h-3 text-cyber-yellow" />
                      <h4 className="text-[10px] font-mono font-bold text-cyber-yellow uppercase tracking-wider">
                        Elasticsearch Query
                      </h4>
                    </div>
                    <pre className="code-block p-3 overflow-x-auto max-h-48">
                      <code className="text-cyber-yellow text-xs">
                        {JSON.stringify(step.tool_result.elasticsearch_query, null, 2)}
                      </code>
                    </pre>
                  </div>
                )}

                {/* Results */}
                {step.tool_result && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Layers className="w-3 h-3 text-cyber-purple" />
                      <h4 className="text-[10px] font-mono font-bold text-cyber-purple uppercase tracking-wider">
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
    return <pre className="code-block p-3 text-xs text-zinc-400">{JSON.stringify(result)}</pre>;
  }

  const resultObj = result as any;

  // Handle search results
  if (resultObj.results && Array.isArray(resultObj.results)) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 font-mono">
            Found <span className="text-cyber-cyan font-bold">{resultObj.total}</span> results
          </span>
          <span className="text-zinc-500 font-mono">
            showing {Math.min(resultObj.results.length, 3)}
          </span>
        </div>
        <div className="space-y-2">
          {resultObj.results.slice(0, 3).map((log: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 rounded-lg bg-black/30 border border-cyber-border/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[10px] font-mono font-bold",
                  log.level === 'ERROR' && "bg-cyber-pink/20 text-cyber-pink",
                  log.level === 'WARN' && "bg-cyber-yellow/20 text-cyber-yellow",
                  log.level === 'INFO' && "bg-cyber-cyan/20 text-cyber-cyan",
                )}>
                  {log.level}
                </span>
                <span className="text-[10px] font-mono text-cyber-purple">{log.service}</span>
                <span className="text-[10px] font-mono text-zinc-600 ml-auto">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono truncate">{log.message}</p>
            </motion.div>
          ))}
        </div>
        {resultObj.results.length > 3 && (
          <p className="text-[10px] text-zinc-500 font-mono text-center">
            + {resultObj.results.length - 3} more results
          </p>
        )}
      </div>
    );
  }

  // Handle aggregation results
  if (resultObj.aggregations && Array.isArray(resultObj.aggregations)) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-zinc-400 font-mono mb-3">
          Total errors: <span className="text-cyber-pink font-bold">{resultObj.total_errors}</span>
        </div>
        <div className="space-y-2">
          {resultObj.aggregations.map((agg: any, idx: number) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="relative"
              style={{ originX: 0 }}
            >
              <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-cyber-border/30">
                <span className="text-xs font-mono text-zinc-300">{agg.key}</span>
                <span className="text-xs font-mono text-cyber-pink font-bold">{agg.count}</span>
              </div>
              {/* Progress bar */}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyber-pink to-cyber-purple rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(agg.count / resultObj.total_errors) * 100}%` }}
                transition={{ delay: idx * 0.05 + 0.2, duration: 0.5 }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <pre className="code-block p-3 overflow-x-auto max-h-32">
      <code className="text-xs text-zinc-400">
        {JSON.stringify(result, null, 2)}
      </code>
    </pre>
  );
}
