import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types/agent';
import TransactionChart from './TransactionChart';
import WalletDashboardCard from './WalletDashboardCard';
import { useToast } from '../hooks/useToast';
import { validateWallet } from '../utils/walletValidation';
import LoadingSkeleton from './ui/LoadingSkeleton';

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

/** Extract wallet stats from message content and agent response */
function extractWalletStats(msg: ChatMessage) {
  const content = msg.content.toLowerCase();

  const balanceMatch = content.match(/\$[\d,]+\.?\d*/);
  const balance = balanceMatch ? parseFloat(balanceMatch[0].replace(/[$,]/g, '')) : undefined;

  const txMatch = content.match(/(\d+)\s*transactions?/i);
  const transactionCount = txMatch ? parseInt(txMatch[1].replace(/,/g, '')) : undefined;

  let riskScore: 'Low' | 'Medium' | 'High' | undefined;
  if (content.includes('low risk') || content.includes('risk: low')) riskScore = 'Low';
  else if (content.includes('medium risk') || content.includes('moderate risk')) riskScore = 'Medium';
  else if (content.includes('high risk') || content.includes('risk: high')) riskScore = 'High';

  const timeMatch = content.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/i);
  const lastActivity = timeMatch ? timeMatch[0] : undefined;

  return { balance, transactionCount, riskScore, lastActivity };
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
                    <div className="space-y-4">
                      {(() => {
                        const addr = extractWalletAddress(msg);
                        const stats = extractWalletStats(msg);
                        const chartMarker = '[CHART]';
                        const sanitize = (text: string) => text.replace(/~/g, '\\~');
                        const hasChart = addr && msg.content.includes(chartMarker);

                        if (hasChart) {
                          const [before, after] = msg.content.split(chartMarker);
                          return (
                            <>
                              {addr && <WalletDashboardCard address={addr} stats={stats} />}
                              <div className="prose-elsa">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {sanitize(before.trim())}
                                </ReactMarkdown>
                              </div>
                              <TransactionChart address={addr} />
                              <div className="prose-elsa">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {sanitize(after.trim())}
                                </ReactMarkdown>
                              </div>
                            </>
                          );
                        }

                        return (
                          <>
                            {addr && <WalletDashboardCard address={addr} stats={stats} />}
                            <div className="prose-elsa">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {sanitize(msg.content)}
                              </ReactMarkdown>
                            </div>
                            {addr && <TransactionChart address={addr} />}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#10b981', letterSpacing: '0.03em' }}>ELSA</span>
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <LoadingSkeleton lines={3} widths={['85%', '65%', '75%']} className="mb-4" />
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
