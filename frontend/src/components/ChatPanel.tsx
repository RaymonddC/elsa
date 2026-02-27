import { useState, useRef, useEffect } from 'react';
import { ArrowUp, AlertCircle, RotateCcw, ChevronDown, ChevronUp, Database, Search, Shield, Brain, CheckCircle2, ExternalLink, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types/agent';
import TransactionChart from './TransactionChart';
import WalletDashboardCard from './WalletDashboardCard';
import type { WalletSummaryData } from './WalletDashboardCard';
import { useToast } from '../hooks/useToast';
import { validateWallet } from '../utils/walletValidation';


interface LiveStep {
  type: string;
  message: string;
  tool_name?: string;
  execution_time_ms?: number;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  liveSteps?: LiveStep[];
  sessionTitle?: string;
}

const suggestions = [
  { label: "Check Bitcoin genesis wallet", query: "Check this Bitcoin wallet 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" },
  { label: "Analyze Vitalik's ETH wallet", query: "Analyze Ethereum wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  { label: "Detect wallet anomalies", query: "Detect anomalies in wallet 1BzkoGfrLtL59ZGjhKfvBwy47DEb6oba5f" },
];

/** Extract wallet address from message (agentResponse or content fallback) */
function extractWalletAddress(msg: ChatMessage): string | null {
  const agent = msg.agentResponse || (msg as any).agent_response;
  if (agent?.reasoning_steps) {
    for (const step of agent.reasoning_steps) {
      if (step.tool_call?.tool_name === 'fetch_wallet_data') {
        const addr = step.tool_call.arguments?.address;
        if (typeof addr === 'string') return addr;
      }
    }
  }
  const btcMatch = msg.content.match(/\b(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,62})\b/);
  if (btcMatch) return btcMatch[1];
  const ethMatch = msg.content.match(/\b(0x[a-fA-F0-9]{40})\b/);
  if (ethMatch) return ethMatch[1];
  return null;
}

/** Detect risk level from markdown content text */
function detectRiskFromContent(text: string): 'Low' | 'Medium' | 'High' | undefined {
  const c = text.toLowerCase();

  // Table-based severity (from Anomaly Report table: | High | or | Critical |)
  const hasHighSeverityRow = /\|\s*(high|critical)\s*\|/i.test(text);
  const hasMediumSeverityRow = /\|\s*medium\s*\|/i.test(text);
  const hasLowSeverityRow = /\|\s*low\s*\|/i.test(text);
  const hasNoneDetected = /none detected|no anomal/i.test(text);

  if (hasHighSeverityRow) return 'High';
  if (hasMediumSeverityRow && !hasHighSeverityRow) return 'Medium';
  if (hasNoneDetected || hasLowSeverityRow) return 'Low';

  // Keyword fallback
  if (c.includes('high risk') || c.includes('risk: high') || c.includes('suspicious') || c.includes('significant anomalies') || c.includes('flagged')) return 'High';
  if (c.includes('medium risk') || c.includes('moderate risk') || c.includes('some anomalies') || c.includes('minor anomalies')) return 'Medium';
  if (c.includes('low risk') || c.includes('risk: low') || c.includes('no significant anomalies') || c.includes('no anomalies') || c.includes('no suspicious')) return 'Low';
  return undefined;
}

/** Extract wallet stats from agent tool results, falling back to regex on content */
function extractWalletStats(msg: ChatMessage) {
  const agent = msg.agentResponse || (msg as any).agent_response;

  // Try to extract from structured tool results first
  if (agent?.reasoning_steps) {
    for (const step of agent.reasoning_steps) {
      const result = step.tool_result?.result as any;
      if (!result?.summary) continue;
      const s = result.summary;

      const chain = s.chain || result.chain;
      const balance = chain === 'ethereum'
        ? (s.balance_usd ?? s.final_balance_eth)
        : s.final_balance_btc;
      const currency = chain === 'ethereum' && s.balance_usd != null ? 'USD' : (chain === 'ethereum' ? 'ETH' : 'BTC');

      // Calculate last activity from last_seen
      let lastActivity: string | undefined;
      if (s.last_seen) {
        const lastDate = new Date(s.last_seen);
        const now = new Date();
        const diffMs = now.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays < 1) lastActivity = 'Today';
        else if (diffDays === 1) lastActivity = '1 day ago';
        else if (diffDays < 30) lastActivity = `${diffDays} days ago`;
        else if (diffDays < 365) lastActivity = `${Math.floor(diffDays / 30)} months ago`;
        else lastActivity = `${Math.floor(diffDays / 365)} years ago`;
      }

      // Try to detect risk from anomaly detection results
      let riskScore: 'Low' | 'Medium' | 'High' | undefined;
      for (const s2 of agent.reasoning_steps) {
        if (s2.tool_call?.tool_name === 'detect_anomalies') {
          const anomalyResult = s2.tool_result?.result as any;
          // Use anomaly_count directly, or fall back to anomalies array length
          const count = anomalyResult?.anomaly_count ?? anomalyResult?.anomalies?.length;
          if (count != null) {
            if (count === 0) riskScore = 'Low';
            else if (count <= 3) riskScore = 'Medium';
            else riskScore = 'High';
          }
        }
      }

      // Fall back to content text for risk
      if (!riskScore) {
        riskScore = detectRiskFromContent(msg.content);
      }

      return {
        balance: balance != null ? Number(balance) : undefined,
        transactionCount: s.n_tx != null ? Number(s.n_tx) : undefined,
        riskScore,
        lastActivity,
        currency,
      };
    }
  }

  // Fallback: regex on content
  const content = msg.content.toLowerCase();

  const balanceMatch = content.match(/\$[\d,]+\.?\d*/);
  const balance = balanceMatch ? parseFloat(balanceMatch[0].replace(/[$,]/g, '')) : undefined;

  const txMatch = content.match(/(\d[\d,]*)\s*transactions?/i);
  const transactionCount = txMatch ? parseInt(txMatch[1].replace(/,/g, '')) : undefined;

  const riskScore = detectRiskFromContent(msg.content);

  const timeMatch = content.match(/(\d+)\s*(hour|day|week|month|year)s?\s*ago/i);
  const lastActivity = timeMatch ? timeMatch[0] : undefined;

  return { balance, transactionCount, riskScore, lastActivity };
}

/** Extract structured wallet summary from agent tool results */
function extractWalletSummary(msg: ChatMessage): WalletSummaryData | undefined {
  const agent = msg.agentResponse || (msg as any).agent_response;
  if (!agent?.reasoning_steps) return undefined;

  for (const step of agent.reasoning_steps) {
    const result = step.tool_result?.result as any;
    if (!result?.summary) continue;
    const s = result.summary;
    const chain = s.chain || result.chain;
    const isEth = chain === 'ethereum';

    return {
      chain,
      totalReceived: isEth ? s.total_received_eth : s.total_received_btc,
      totalSent: isEth ? s.total_sent_eth : s.total_sent_btc,
      totalReceivedUsd: s.total_received_usd,
      totalSentUsd: s.total_sent_usd,
      balanceUsd: s.balance_usd,
      firstSeen: s.first_seen,
      lastSeen: s.last_seen,
      tokenSummary: s.token_summary,
    };
  }

  return undefined;
}

/** Extract how many transactions were actually fetched from the fetch_wallet_data tool result */
function extractTransactionsFetched(msg: ChatMessage): { fetched: number; total: number } | undefined {
  const agent = msg.agentResponse || (msg as any).agent_response;
  if (!agent?.reasoning_steps) return undefined;
  for (const step of agent.reasoning_steps) {
    if (step.tool_call?.tool_name === 'fetch_wallet_data') {
      const result = step.tool_result?.result as any;
      if (result?.transactions_fetched != null) {
        return {
          fetched: Number(result.transactions_fetched),
          total: Number(result.total_transactions ?? result.transactions_fetched),
        };
      }
    }
  }
  return undefined;
}

const placeholderHints = [
  'Paste a wallet address...',
  'Try a Bitcoin wallet...',
  'Analyze an Ethereum wallet...',
  'Detect anomalies in any wallet...',
  'Check transaction history...',
];

const TOOL_ICONS: Record<string, typeof Database> = {
  fetch_wallet_data: Database,
  get_wallet_summary: Search,
  search_transactions: Search,
  detect_anomalies: Shield,
  elastic_agent: Brain,
};

interface ConsolidatedStep {
  label: string;
  tool_name?: string;
  done: boolean;
  time_ms?: number;
}

/** Merge raw liveSteps into simple consolidated lines */
function consolidateSteps(steps: LiveStep[]): ConsolidatedStep[] {
  const result: ConsolidatedStep[] = [];
  const seenTools = new Map<string, number>(); // tool_name -> index in result

  for (const s of steps) {
    if (s.type === 'thinking') {
      // Skip — shown in header only, not in the list
    } else if (s.type === 'tool_start' && s.tool_name) {
      const existingIdx = seenTools.get(s.tool_name);
      if (existingIdx != null) {
        // Progress update — just update the label in place, no new entry
        result[existingIdx].label = s.message;
      } else {
        const idx = result.length;
        seenTools.set(s.tool_name, idx);
        result.push({ label: s.message, tool_name: s.tool_name, done: false });
      }
    } else if (s.type === 'tool_done' && s.tool_name) {
      const idx = seenTools.get(s.tool_name);
      if (idx != null && result[idx]) {
        result[idx].done = true;
        result[idx].label = s.message; // use the done label (e.g. "Wallet data cached")
        result[idx].time_ms = s.execution_time_ms;
      }
    }
  }
  return result;
}

export default function ChatPanel({ messages, onSendMessage, isLoading, liveSteps = [], sessionTitle }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [completedSteps, setCompletedSteps] = useState<ConsolidatedStep[]>([]);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastMsgRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();
  // Set to true when the user manually scrolls away — suppresses auto-scroll until next send
  const userScrolledAwayRef = useRef(false);
  // Prevents the scroll event listener from treating programmatic scrolls as manual
  const isProgrammaticScrollRef = useRef(false);

  useEffect(() => {
    if (messages.length > 0) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % placeholderHints.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Detect manual scrolling — if user scrolls up more than 80px from bottom, stop auto-scrolling
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      userScrolledAwayRef.current = distanceFromBottom > 80;
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    const container = scrollContainerRef.current;
    if (!container) return;

    // Always scroll for user messages (they just sent it); respect manual scroll for assistant
    if (lastMsg.role !== 'user' && userScrolledAwayRef.current) return;

    isProgrammaticScrollRef.current = true;
    requestAnimationFrame(() => {
      if (lastMsg.role === 'user') {
        const target = container.scrollHeight - container.clientHeight * 1.4;
        container.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
      } else {
        if (lastMsgRef.current) {
          const msgTop = lastMsgRef.current.offsetTop;
          container.scrollTo({ top: Math.max(0, msgTop - container.clientHeight * 0.25), behavior: 'smooth' });
        }
      }
      // Release the programmatic flag after the smooth scroll settles
      setTimeout(() => { isProgrammaticScrollRef.current = false; }, 600);
    });
  }, [messages]);

  // Track latest non-empty steps so we don't lose them when App clears liveSteps before isLoading goes false
  const lastStepsRef = useRef<LiveStep[]>([]);
  useEffect(() => {
    if (liveSteps.length > 0) {
      lastStepsRef.current = liveSteps;
    }
  }, [liveSteps]);

  // Save consolidated steps when loading finishes
  const prevLoading = useRef(false);
  useEffect(() => {
    if (prevLoading.current && !isLoading) {
      if (lastStepsRef.current.length > 0) {
        setCompletedSteps(consolidateSteps(lastStepsRef.current));
        lastStepsRef.current = [];
      }
    }
    if (isLoading && !prevLoading.current) {
      setCompletedSteps([]);
      setStepsExpanded(false);
    }
    prevLoading.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollH, 200) + 'px';
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const validation = validateWallet(input);
    if (!validation.valid && (input.includes('0x') || /^[13bc1]/.test(input))) {
      showToast({
        type: 'warning',
        message: validation.error || 'Invalid wallet address format',
        duration: 5000,
      });
      return;
    }

    userScrolledAwayRef.current = false;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const inputBox = (placeholder: string) => (
    <div
      className="flex items-center transition-all duration-300"
      style={{
        borderRadius: '16px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '4px 4px 4px 0',
        minHeight: '44px',
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
      }}
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        className="flex-1 resize-none bg-transparent placeholder-white/25 disabled:opacity-40"
        style={{ fontSize: '14px', padding: '0px 8px 0px 16px', lineHeight: '36px', maxHeight: '200px', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.95)' }}
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="flex-shrink-0 flex items-center justify-center border-none transition-all duration-200 disabled:opacity-10"
        style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#10b981', cursor: isLoading || !input.trim() ? 'default' : 'pointer' }}
      >
        <ArrowUp style={{ width: '16px', height: '16px' }} className="text-[#090909]" />
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col" style={{ background: 'linear-gradient(180deg, #090909 0%, #0a0a0a 100%)' }}>
      {/* Chat Header */}
      {messages.length > 0 && sessionTitle && (
        <div className="flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(9,9,9,0.9)', backdropFilter: 'blur(12px)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '14px 24px' }}>
            <h1 style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {sessionTitle}
            </h1>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: '2px 0 0 0' }}>
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
        </div>
      )}

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 pb-20 animate-[fadeIn_0.5s_ease-out]">
            {/* Logo */}
            <div className="relative" style={{ marginBottom: '4px', animation: 'scaleIn 0.5s ease-out, float 4s ease-in-out 1s infinite' }}>
              <div className="absolute inset-0" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', filter: 'blur(16px)', transform: 'scale(2)' }} />
              <img src="/elsa-logo.PNG" alt="ELSA" className="relative object-contain" style={{ width: '56px', height: '56px' }} />
            </div>
            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '20px', fontWeight: 600, marginTop: '0px', marginBottom: '6px', color: 'rgba(255,255,255,0.92)', letterSpacing: '0.04em', animation: 'slideUp 0.5s ease-out 0.1s both' }}>ELSA</h1>
            <p style={{ fontSize: '13px', marginBottom: '16px', color: 'rgba(16,185,129,0.4)', animation: 'slideUp 0.5s ease-out 0.2s both', textAlign: 'center' }}>
              Analyze any crypto wallet with AI-powered insights
            </p>

            {/* Example Wallets */}
            <div className="text-center" style={{ marginBottom: '24px', animation: 'slideUp 0.5s ease-out 0.3s both' }}>
              <div className="flex flex-wrap justify-center" style={{ gap: '8px' }}>
                {suggestions.map((item, idx) => (
                  <span
                    key={idx}
                    onClick={() => onSendMessage(item.query)}
                    className="cursor-pointer transition-all duration-200"
                    style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', fontSize: '13px', color: 'rgba(255,255,255,0.4)', animation: `slideUp 0.4s ease-out ${0.35 + idx * 0.08}s both` }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Smart Input */}
            <div className="w-full max-w-[580px]" style={{ animation: 'slideUp 0.6s ease-out 0.5s both' }}>
              <form onSubmit={handleSubmit}>
                {inputBox(placeholderHints[placeholderIdx])}
              </form>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px 24px 80px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} ref={idx === messages.length - 1 ? lastMsgRef : null} style={{ marginTop: idx > 0 ? '20px' : '0' }}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div style={{ maxWidth: '80%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.03em' }}>You</span>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.08) 100%)',
                        border: '1px solid rgba(16,185,129,0.15)',
                        borderRadius: '16px 4px 16px 16px',
                        padding: '12px 16px',
                      }}>
                        <div style={{ fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.88)' }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* ELSA label + completed steps always-visible */}
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', letterSpacing: '0.03em' }}>ELSA</span>
                      {!isLoading && completedSteps.filter(s => s.tool_name).length > 0 && idx === messages.length - 1 && msg.role === 'assistant' && completedSteps.some(s => s.tool_name === 'fetch_wallet_data') && (
                        <div style={{ marginTop: '6px' }}>
                          {/* Toggle header */}
                          <button
                            onClick={() => setStepsExpanded(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', color: 'rgba(255,255,255,0.2)' }}
                          >
                            <CheckCircle2 style={{ width: '11px', height: '11px', color: 'rgba(16,185,129,0.4)' }} strokeWidth={1.5} />
                            <span style={{ fontSize: '11px' }}>{completedSteps.filter(s => s.tool_name).length} steps</span>
                            {stepsExpanded
                              ? <ChevronUp style={{ width: '11px', height: '11px' }} strokeWidth={1.5} />
                              : <ChevronDown style={{ width: '11px', height: '11px' }} strokeWidth={1.5} />
                            }
                          </button>
                          {/* Dropdown content */}
                          {stepsExpanded && (
                            <div style={{ marginTop: '4px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {completedSteps.filter(s => s.tool_name).map((step, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <CheckCircle2 style={{ width: '11px', height: '11px', color: 'rgba(16,185,129,0.45)', flexShrink: 0 }} strokeWidth={1.5} />
                                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.22)' }}>{step.label}</span>
                                  {step.time_ms != null && (
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.1)', marginLeft: 'auto' }}>
                                      {step.time_ms > 1000 ? `${(step.time_ms / 1000).toFixed(1)}s` : `${step.time_ms}ms`}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {(() => {
                        // Check if this is an error message
                        const isError = msg.content.startsWith('Error:') || msg.content.startsWith('error:') ||
                          (msg.agentResponse && !msg.agentResponse.success);
                        if (isError) {
                          const errorText = msg.agentResponse?.error || msg.content.replace(/^Error:\s*/i, '');
                          // Find the user message to enable retry
                          const prevUserMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user');
                          return (
                            <div style={{
                              borderRadius: '14px',
                              backgroundColor: 'rgba(239,68,68,0.04)',
                              border: '1px solid rgba(239,68,68,0.1)',
                              padding: '16px 18px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <AlertCircle style={{ width: '16px', height: '16px', color: 'rgba(239,68,68,0.6)', flexShrink: 0, marginTop: '1px' }} strokeWidth={2} />
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(239,68,68,0.7)', margin: '0 0 4px 0' }}>Analysis Failed</p>
                                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: '1.5' }}>{errorText}</p>
                                </div>
                              </div>
                              {prevUserMsg && (
                                <div style={{ display: 'flex', gap: '8px', marginLeft: '26px' }}>
                                  <span
                                    onClick={() => onSendMessage(prevUserMsg.content)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      padding: '5px 12px',
                                      borderRadius: '8px',
                                      fontSize: '11px',
                                      fontWeight: 500,
                                      color: 'rgba(255,255,255,0.5)',
                                      backgroundColor: 'rgba(255,255,255,0.04)',
                                      border: '1px solid rgba(255,255,255,0.06)',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                                  >
                                    <RotateCcw style={{ width: '11px', height: '11px' }} strokeWidth={2} />
                                    Retry
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        const addr = extractWalletAddress(msg);
                        const stats = extractWalletStats(msg);
                        const summary = extractWalletSummary(msg);
                        const chartMarker = '[CHART]';
                        const sanitize = (text: string) => text.replace(/~/g, '\\~');
                        const hasChart = addr && msg.content.includes(chartMarker);

                        // Collect all full hashes/addresses from tool results to resolve truncated ones
                        const fullHashes: string[] = [];
                        const agent = msg.agentResponse || (msg as any).agent_response;
                        if (agent?.reasoning_steps) {
                          for (const step of agent.reasoning_steps) {
                            const raw = JSON.stringify(step.tool_result?.result || '');
                            // ETH addresses and tx hashes
                            const ethMatches = raw.match(/0x[a-fA-F0-9]{40,66}/g);
                            if (ethMatches) fullHashes.push(...ethMatches);
                            // BTC tx hashes (64 hex chars)
                            const btcTxMatches = raw.match(/\b[a-fA-F0-9]{64}\b/g);
                            if (btcTxMatches) fullHashes.push(...btcTxMatches);
                            // BTC bech32 addresses (bc1...)
                            const bech32Matches = raw.match(/\bbc1[a-zA-Z0-9]{25,62}\b/g);
                            if (bech32Matches) fullHashes.push(...bech32Matches);
                            // BTC legacy addresses (1... or 3...)
                            const legacyBtcMatches = raw.match(/\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g);
                            if (legacyBtcMatches) fullHashes.push(...legacyBtcMatches);
                          }
                        }
                        const uniqueHashes = [...new Set(fullHashes)];
                        // Determine chain from wallet address so we route tx hashes to the right explorer
                        const walletIsEth = addr?.startsWith('0x') ?? false;

                        const txExplorerUrl = (hash: string): string => {
                          // Explicit 0x prefix → always ETH
                          if (hash.startsWith('0x')) return `https://etherscan.io/tx/${hash}`;
                          // 64 hex chars without prefix — use wallet chain context
                          if (walletIsEth) return `https://etherscan.io/tx/0x${hash}`;
                          return `https://mempool.space/tx/${hash}`;
                        };

                        // Expand truncated hashes/addresses (e.g. 0x4b20fcce… or bc1qx5ku…) to full value
                        const expandHashes = (text: string): string => {
                          return text
                            .replace(/\b(0x[a-fA-F0-9]{6,})[…\.]{1,3}\b/g, (match, prefix) => {
                              const full = uniqueHashes.find(h => h.toLowerCase().startsWith(prefix.toLowerCase()));
                              return full ? `\`${full}\`` : match;
                            })
                            .replace(/\b(bc1[a-zA-Z0-9]{4,})[…\.]{1,3}\b/g, (match, prefix) => {
                              const full = uniqueHashes.find(h => h.toLowerCase().startsWith(prefix.toLowerCase()));
                              return full ? `\`${full}\`` : match;
                            })
                            .replace(/\b([a-fA-F0-9]{8,})[…\.]{1,3}\b/g, (match, prefix) => {
                              const full = uniqueHashes.find(h => h.toLowerCase().startsWith(prefix.toLowerCase()));
                              return full ? `\`${full}\`` : match;
                            });
                        };

                        const renderMarkdown = (text: string, chatMode = false) => (
                          <div className={chatMode ? 'prose-elsa prose-chat' : 'prose-elsa'}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                a: ({ href, children }) => {
                                  const h = href || '';
                                  const isLocalHash = h.startsWith('/') || h.startsWith('http://localhost') || /^0x[a-fA-F0-9]{40,}/.test(h) || /^[a-fA-F0-9]{64}$/.test(h);
                                  if (isLocalHash) {
                                    const fullHash = h.replace(/^https?:\/\/localhost[^/]*\//, '').replace(/^\//, '');
                                    return (
                                      <code
                                        style={{ cursor: 'pointer', userSelect: 'all' }}
                                        title="Click to copy"
                                        onClick={() => { navigator.clipboard.writeText(fullHash); }}
                                      >
                                        {children}
                                      </code>
                                    );
                                  }
                                  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                                },
                                code: ({ children, className }) => {
                                  const text = String(children).trim();
                                  const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(text);
                                  const isBtcTx = /^[a-fA-F0-9]{64}$/.test(text);
                                  const isAddress = /^(0x)?[a-fA-F0-9]{40,42}$/.test(text) || /^[13bc1][a-zA-Z0-9]{25,62}$/.test(text);
                                  const isHash = isEthTx || isBtcTx || isAddress;

                                  if (isHash && !className) {
                                    const short = text.length > 16 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text;

                                    if (isEthTx || isBtcTx) {
                                      const explorerUrl = txExplorerUrl(text);
                                      const explorerName = explorerUrl.includes('etherscan') ? 'Etherscan' : 'Mempool.space';
                                      return (
                                        <code
                                          style={{ cursor: 'pointer', userSelect: 'all', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                          title={`View on ${explorerName}`}
                                          onClick={() => window.open(explorerUrl, '_blank', 'noopener,noreferrer')}
                                        >
                                          {short}
                                          <ExternalLink style={{ width: '9px', height: '9px', opacity: 0.5, flexShrink: 0 }} />
                                        </code>
                                      );
                                    }

                                    // Wallet address — copy full address on click
                                    return (
                                      <code
                                        style={{ cursor: 'pointer' }}
                                        title={`Click to copy: ${text}`}
                                        onClick={() => {
                                          navigator.clipboard.writeText(text);
                                          showToast({ type: 'success', message: 'Address copied', duration: 2000 });
                                        }}
                                      >
                                        {short}
                                      </code>
                                    );
                                  }
                                  return <code className={className}>{children}</code>;
                                },
                                td: ({ children, ...props }) => {
                                  // Only inspect plain-text cells — React element children are already handled by the code component
                                  if (typeof children === 'string') {
                                    const raw = children.trim();
                                    const lower = raw.toLowerCase();

                                    const severityStyle: Record<string, React.CSSProperties> = {
                                      high:     { color: '#f87171', fontWeight: 600 },
                                      critical: { color: '#f87171', fontWeight: 600 },
                                      medium:   { color: '#fbbf24', fontWeight: 600 },
                                      low:      { color: '#34d399', fontWeight: 600 },
                                      in:       { color: '#34d399', fontWeight: 600 },
                                      out:      { color: '#f87171', fontWeight: 600 },
                                    };

                                    // Full ETH tx hash (0x + 64 hex)
                                    const isEthTx = /^0x[a-fA-F0-9]{64}$/.test(raw);
                                    // Full BTC tx hash (64 hex, no 0x prefix)
                                    const isBtcTx = /^[a-fA-F0-9]{64}$/.test(raw);
                                    // Truncated hash like "0x4b20fcce4e..." or "4b20fcce..."
                                    const truncMatch = raw.match(/^(0x[a-fA-F0-9]{6,}|[a-fA-F0-9]{8,})[…\.]{1,3}$/);

                                    if (isEthTx || isBtcTx || truncMatch) {
                                      let fullHash = raw;
                                      if (truncMatch) {
                                        const prefix = truncMatch[1];
                                        const found = uniqueHashes.find(h => h.toLowerCase().startsWith(prefix.toLowerCase()));
                                        if (found) fullHash = found;
                                      }
                                      const url = txExplorerUrl(fullHash);
                                      const explorerName = url.includes('etherscan') ? 'Etherscan' : 'Mempool.space';
                                      return (
                                        <td {...props}>
                                          <span
                                            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
                                            title={`View on ${explorerName}`}
                                            style={{ cursor: 'pointer', color: '#34d399', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                          >
                                            {`${fullHash.slice(0, 10)}…`}
                                            <ExternalLink style={{ width: '9px', height: '9px', opacity: 0.5, flexShrink: 0 }} />
                                          </span>
                                        </td>
                                      );
                                    }

                                    return <td {...props} style={severityStyle[lower]}>{children}</td>;
                                  }

                                  // React element children (e.g. <code> from expandHashes) — render as-is
                                  return <td {...props}>{children}</td>;
                                },
                              }}
                            >
                              {sanitize(expandHashes(text.trim()))}
                            </ReactMarkdown>
                          </div>
                        );

                        // Strip sections from markdown that are already shown in the card UI
                        const stripRedundantSections = (text: string) => {
                          return text
                            // Strip "Overview" and "Transaction Breakdown" — shown in card
                            .replace(/#{1,4}\s*Overview[\s\S]*?(?=\n#{1,4}\s|\n\[CHART\]|$)/i, '')
                            .replace(/#{1,4}\s*Transaction\s*Breakdown[\s\S]*?(?=\n#{1,4}\s|\n\[CHART\]|$)/i, '')
                            // Strip "Wallet Summary" — address, balance, received/sent, dates already in card
                            .replace(/#{1,4}\s*Wallet\s*Summary[\s\S]*?(?=\n#{1,4}\s|\n\[CHART\]|$)/i, '')
                            // Strip "Token Activity" — shown in TokenActivity component
                            .replace(/#{1,4}\s*Token\s*Activity[\s\S]*?(?=\n#{1,4}\s|\n\[CHART\]|$)/i, '')
                            .replace(/\*{0,2}Token\s*Activity\s*\(?\d*\)?\*{0,2}\s*\n([-•*]\s+.+\n?)*/gi, '')
                            // Clean up leftover empty lines
                            .replace(/\n{3,}/g, '\n\n')
                            .trim();
                        };

                        if (addr) {
                          const chartNode = <TransactionChart address={addr} />;
                          const txInfo = extractTransactionsFetched(msg);

                          const loadMoreFooter = txInfo && txInfo.fetched < txInfo.total && (
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                                {txInfo.fetched.toLocaleString()} of {txInfo.total.toLocaleString()} transactions analyzed
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)' }}>·</span>
                                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Load more?</span>
                                  {([500, 1000, 2000] as const).filter(n => n > txInfo.fetched).slice(0, 2).map(n => (
                                    <span
                                      key={n}
                                      onClick={() => onSendMessage(`Analyze ${addr} with ${n} transactions`)}
                                      title="Will take longer to fetch"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.15s ease' }}
                                      onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                                    >
                                      <Clock style={{ width: '9px', height: '9px', opacity: 0.5 }} strokeWidth={2} />
                                      {n >= 1000 ? `${n / 1000}k` : n} txns
                                    </span>
                                  ))}
                                </div>
                            </div>
                          );

                          if (hasChart) {
                            const [before, after] = msg.content.split(chartMarker);
                            const cleanBefore = stripRedundantSections(before);
                            const cleanAfter = after.trim() ? stripRedundantSections(after) : '';
                            return (
                              <>
                                <WalletDashboardCard address={addr} stats={stats} summary={summary} chart={chartNode}>
                                  <>
                                    {cleanBefore && renderMarkdown(cleanBefore)}
                                    {cleanAfter && renderMarkdown(cleanAfter)}
                                  </>
                                </WalletDashboardCard>
                                {loadMoreFooter}
                              </>
                            );
                          }

                          const cleanContent = stripRedundantSections(msg.content);
                          return (
                            <>
                              <WalletDashboardCard address={addr} stats={stats} summary={summary} chart={chartNode}>
                                {cleanContent && renderMarkdown(cleanContent)}
                              </WalletDashboardCard>
                              {loadMoreFooter}
                            </>
                          );
                        }

                        return (
                          <div style={{ borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '14px 16px' }}>
                            {renderMarkdown(msg.content, true)}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (() => {
              // Fall back to lastStepsRef when liveSteps is momentarily cleared during the loading→done transition
              const stepsToRender = liveSteps.length > 0 ? liveSteps : lastStepsRef.current;
              const consolidated = consolidateSteps(stepsToRender);
              const lastRaw = stepsToRender.length > 0 ? stepsToRender[stepsToRender.length - 1] : null;

              return (
                <div style={{ marginTop: '20px', animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', letterSpacing: '0.03em' }}>ELSA</span>
                  </div>
                  <div style={{ borderRadius: '14px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {consolidated.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', gap: '3px' }}>
                            {[0, 1, 2].map(i => (
                              <div key={i} style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#10b981', animation: `elsa-dot 1.4s ease-in-out ${i * 0.2}s infinite` }} />
                            ))}
                          </div>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Analyzing wallet...</span>
                        </div>
                      ) : consolidated.map((step, i) => {
                        const Icon = step.tool_name ? (TOOL_ICONS[step.tool_name] || Brain) : Brain;
                        const isActive = !step.done;
                        const displayLabel = isActive && lastRaw ? lastRaw.message : step.label;
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {step.done
                              ? <CheckCircle2 style={{ width: '12px', height: '12px', color: 'rgba(16,185,129,0.5)', flexShrink: 0 }} strokeWidth={1.5} />
                              : <Icon style={{ width: '12px', height: '12px', color: '#10b981', flexShrink: 0, animation: 'elsa-dot 1.4s ease-in-out infinite' }} strokeWidth={1.5} />
                            }
                            <span style={{ fontSize: '12px', color: step.done ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)', fontWeight: step.done ? 400 : 500, transition: 'color 0.2s' }}>
                              {displayLabel}
                            </span>
                            {step.time_ms != null && (
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.12)', marginLeft: 'auto' }}>
                                {step.time_ms > 1000 ? `${(step.time_ms / 1000).toFixed(1)}s` : `${step.time_ms}ms`}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom input area */}
      {messages.length > 0 && (
        <div style={{ padding: '8px 24px 28px', background: 'linear-gradient(0deg, #090909 60%, transparent)', position: 'relative' }}>
          {/* Fade edge */}
          <div style={{ position: 'absolute', top: '-24px', left: 0, right: 0, height: '24px', background: 'linear-gradient(0deg, #090909, transparent)', pointerEvents: 'none' }} />
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <form onSubmit={handleSubmit}>
              {inputBox("Ask a follow-up...")}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
