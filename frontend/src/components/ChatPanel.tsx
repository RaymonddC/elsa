import { useState, useRef, useEffect } from 'react';
import { ArrowUp, AlertCircle, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types/agent';
import TransactionChart from './TransactionChart';
import WalletDashboardCard from './WalletDashboardCard';
import type { WalletSummaryData } from './WalletDashboardCard';
import { useToast } from '../hooks/useToast';
import { validateWallet } from '../utils/walletValidation';


interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
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
  if (c.includes('low risk') || c.includes('risk: low') || c.includes('no significant anomalies') || c.includes('no anomalies') || c.includes('no suspicious')) return 'Low';
  if (c.includes('medium risk') || c.includes('moderate risk') || c.includes('some anomalies') || c.includes('minor anomalies')) return 'Medium';
  if (c.includes('high risk') || c.includes('risk: high') || c.includes('suspicious') || c.includes('significant anomalies') || c.includes('flagged')) return 'High';
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

const placeholderHints = [
  'Paste a wallet address...',
  'Try a Bitcoin wallet...',
  'Analyze an Ethereum wallet...',
  'Detect anomalies in any wallet...',
  'Check transaction history...',
];

export default function ChatPanel({ messages, onSendMessage, isLoading, sessionTitle }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (messages.length > 0) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % placeholderHints.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

      <div className="flex-1 overflow-y-auto">
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
          <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px 24px 16px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ marginTop: idx > 0 ? '20px' : '0' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', letterSpacing: '0.03em' }}>ELSA</span>
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

                        // Collect all full hashes from tool results to resolve truncated ones
                        const fullHashes: string[] = [];
                        const agent = msg.agentResponse || (msg as any).agent_response;
                        if (agent?.reasoning_steps) {
                          for (const step of agent.reasoning_steps) {
                            const raw = JSON.stringify(step.tool_result?.result || '');
                            const matches = raw.match(/0x[a-fA-F0-9]{40,66}/g);
                            if (matches) fullHashes.push(...matches);
                            // Also BTC tx hashes (64 hex chars)
                            const btcMatches = raw.match(/\b[a-fA-F0-9]{64}\b/g);
                            if (btcMatches) fullHashes.push(...btcMatches);
                          }
                        }
                        const uniqueHashes = [...new Set(fullHashes)];

                        // Expand truncated hashes (e.g. 0x4b20fcce…) to full hash
                        const expandHashes = (text: string): string => {
                          return text.replace(/\b(0x[a-fA-F0-9]{6,})[…\.]{1,3}\b/g, (match, prefix) => {
                            const full = uniqueHashes.find(h => h.toLowerCase().startsWith(prefix.toLowerCase()));
                            return full ? `\`${full}\`` : match;
                          }).replace(/\b([a-fA-F0-9]{8,})[…\.]{1,3}\b/g, (match, prefix) => {
                            const full = uniqueHashes.find(h => h.toLowerCase().startsWith(prefix.toLowerCase()));
                            return full ? `\`${full}\`` : match;
                          });
                        };

                        const renderMarkdown = (text: string) => (
                          <div className="prose-elsa">
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
                                  const isHash = /^(0x)?[a-fA-F0-9]{40,66}$/.test(text);
                                  if (isHash && !className) {
                                    return (
                                      <code
                                        style={{ cursor: 'pointer', userSelect: 'all' }}
                                        title="Click to copy"
                                        onClick={() => { navigator.clipboard.writeText(text); }}
                                      >
                                        {text.length > 16 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text}
                                      </code>
                                    );
                                  }
                                  return <code className={className}>{children}</code>;
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

                          if (hasChart) {
                            const [before, after] = msg.content.split(chartMarker);
                            const cleanBefore = stripRedundantSections(before);
                            const cleanAfter = after.trim() ? stripRedundantSections(after) : '';
                            return (
                              <WalletDashboardCard address={addr} stats={stats} summary={summary} chart={chartNode}>
                                <>
                                  {cleanBefore && renderMarkdown(cleanBefore)}
                                  {cleanAfter && renderMarkdown(cleanAfter)}
                                </>
                              </WalletDashboardCard>
                            );
                          }

                          const cleanContent = stripRedundantSections(msg.content);
                          return (
                            <WalletDashboardCard address={addr} stats={stats} summary={summary} chart={chartNode}>
                              {cleanContent && renderMarkdown(cleanContent)}
                            </WalletDashboardCard>
                          );
                        }

                        return renderMarkdown(msg.content);
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{ marginTop: '20px', animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', letterSpacing: '0.03em' }}>ELSA</span>
                </div>
                <div style={{
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '16px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  {/* Animated dots */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          animation: `elsa-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>Analyzing wallet...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom input area */}
      {messages.length > 0 && (
        <div style={{ padding: '8px 24px 20px', background: 'linear-gradient(0deg, #090909 60%, transparent)', position: 'relative' }}>
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
