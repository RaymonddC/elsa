import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Bitcoin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types/agent';
import TransactionChart from './TransactionChart';
import WalletDashboardCard from './WalletDashboardCard';
import { useToast } from '../hooks/useToast';
import { validateWallet, detectChain, type ChainType } from '../utils/walletValidation';
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
  // Try agentResponse (camelCase from fresh query, or snake_case from saved session)
  const agent = msg.agentResponse || (msg as any).agent_response;
  if (agent?.reasoning_steps) {
    for (const step of agent.reasoning_steps) {
      if (step.tool_call?.tool_name === 'fetch_wallet_data') {
        const addr = step.tool_call.arguments?.address;
        if (typeof addr === 'string') return addr;
      }
    }
  }
  // Fallback: regex from the markdown content
  const btcMatch = msg.content.match(/\b(1[a-km-zA-HJ-NP-Z1-9]{25,34}|3[a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{25,62})\b/);
  if (btcMatch) return btcMatch[1];
  const ethMatch = msg.content.match(/\b(0x[a-fA-F0-9]{40})\b/);
  if (ethMatch) return ethMatch[1];
  return null;
}

/** Extract wallet stats from message content and agent response */
function extractWalletStats(msg: ChatMessage) {
  const content = msg.content.toLowerCase();

  // Extract balance (look for patterns like "$123,456.78" or "balance: 1.5 BTC")
  const balanceMatch = content.match(/\$[\d,]+\.?\d*/);
  const balance = balanceMatch ? parseFloat(balanceMatch[0].replace(/[$,]/g, '')) : undefined;

  // Extract transaction count
  const txMatch = content.match(/(\d+)\s*transactions?/i);
  const transactionCount = txMatch ? parseInt(txMatch[1].replace(/,/g, '')) : undefined;

  // Extract risk score
  let riskScore: 'Low' | 'Medium' | 'High' | undefined;
  if (content.includes('low risk') || content.includes('risk: low')) riskScore = 'Low';
  else if (content.includes('medium risk') || content.includes('moderate risk')) riskScore = 'Medium';
  else if (content.includes('high risk') || content.includes('risk: high')) riskScore = 'High';

  // Extract last activity (look for time patterns like "2 hours ago", "3 days ago")
  const timeMatch = content.match(/(\d+)\s*(hour|day|week|month)s?\s*ago/i);
  const lastActivity = timeMatch ? timeMatch[0] : undefined;

  return {
    balance,
    transactionCount,
    riskScore,
    lastActivity,
  };
}

export default function ChatPanel({ messages, onSendMessage, isLoading, sessionTitle }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [detectedChain, setDetectedChain] = useState<ChainType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      const scrollH = textareaRef.current.scrollHeight;
      if (scrollH > 48) {
        textareaRef.current.style.height = Math.min(scrollH, 200) + 'px';
      }
    }

    // Detect chain as user types
    setDetectedChain(detectChain(input));
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Validate wallet if it looks like an address
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
    setDetectedChain(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const inputBox = (placeholder: string) => (
    <div className="flex items-end rounded-[20px] bg-[#141414] transition-all duration-300 focus-within:bg-[#181818] focus-within:ring-1 focus-within:ring-white/[0.06]">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        className="flex-1 resize-none bg-transparent text-[14px] text-white/90 placeholder-white/20 pl-5 pr-2 py-3.5 focus:outline-none disabled:opacity-40 min-h-[48px] max-h-[200px]"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="m-1.5 p-2.5 rounded-[14px] bg-white/90 hover:bg-white disabled:opacity-10 transition-all duration-200 flex-shrink-0"
      >
        <ArrowUp className="w-4 h-4 text-[#090909]" />
      </button>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header - Only show when there are messages */}
      {messages.length > 0 && sessionTitle && (
        <div className="flex-shrink-0 border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl">
          <div className="max-w-[700px] mx-auto px-6 py-4">
            <h1 className="text-[15px] font-semibold text-white/90 truncate tracking-tight">
              {sessionTitle}
            </h1>
            <p className="text-[12px] text-white/30 mt-0.5">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 pb-20">
            {/* Logo */}
            <div className="mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-pulse blur-2xl opacity-20"></div>
              <img src="/elsa-logo.PNG" alt="ELSA" style={{ width: '64px', height: '64px' }} className="relative object-contain" />
            </div>
            <h1 className="text-[36px] md:text-[42px] font-display font-semibold text-white/90 mb-3 tracking-tight text-center">
              Analyze Crypto Wallets
              <br />
              <span className="text-primary">with AI Intelligence</span>
            </h1>
            <p className="text-[15px] text-white/40 mb-10 text-center max-w-md">
              Get instant insights into any Bitcoin or Ethereum wallet in seconds
            </p>

            {/* Smart Input */}
            <div className="w-full max-w-[580px] mb-10">
              <form onSubmit={handleSubmit}>
                <div className={`
                  flex items-end rounded-[20px] bg-white/[0.04] border border-white/[0.08] transition-all duration-300
                  focus-within:bg-white/[0.06] focus-within:border-white/[0.12] focus-within:ring-2
                  ${detectedChain === 'bitcoin' ? 'focus-within:ring-primary/30 focus-within:border-primary/30' : ''}
                  ${detectedChain === 'ethereum' ? 'focus-within:ring-info/30 focus-within:border-info/30' : ''}
                  ${!detectedChain ? 'focus-within:ring-white/[0.06]' : ''}
                `}>
                  {detectedChain && (
                    <div className="pl-4 py-3.5 flex items-center">
                      {detectedChain === 'bitcoin' ? (
                        <Bitcoin className="w-5 h-5 text-primary" strokeWidth={2} />
                      ) : (
                        <span className="text-info font-mono text-sm font-semibold">ETH</span>
                      )}
                    </div>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Paste a wallet address..."
                    disabled={isLoading}
                    rows={1}
                    className={`
                      flex-1 resize-none bg-transparent text-[15px] text-white/95 placeholder-white/40
                      ${detectedChain ? 'pl-2' : 'pl-5'} pr-2 py-3.5
                      focus:outline-none disabled:opacity-40 min-h-[52px] max-h-[200px]
                    `}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="m-1.5 p-3 rounded-[16px] bg-gradient-to-r from-primary to-primary-light hover:shadow-glow-green disabled:opacity-10 disabled:from-white/10 disabled:to-white/10 transition-all duration-200 flex-shrink-0"
                  >
                    <ArrowUp className="w-5 h-5 text-[#090909]" strokeWidth={2.5} />
                  </button>
                </div>
              </form>
            </div>

            {/* Example Wallets */}
            <div className="text-center">
              <p className="text-xs text-white/30 mb-3 uppercase tracking-wider font-medium">Try these examples</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(item.query)}
                    className="px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.1] text-[13px] text-white/50 hover:text-white/80 transition-all duration-200"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-[700px] mx-auto px-6 pt-6 pb-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={idx > 0 ? 'mt-6 pt-6 border-t border-white/[0.04]' : ''}>
                {msg.role === 'user' ? (
                  // User message - bubble on the right
                  <div className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="flex items-center justify-end gap-2 mb-1.5">
                        <span className="text-[11px] font-semibold text-white/40 tracking-wide">You</span>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-[18px] rounded-tr-sm px-4 py-3">
                        <div className="text-[14px] leading-[1.75] whitespace-pre-wrap text-white/90">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // ELSA message - full width on the left
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">ELSA</span>
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
              <div className={messages.length > 0 ? 'mt-6 pt-6 border-t border-white/[0.04]' : ''}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-emerald-400 tracking-wide">ELSA</span>
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div>
                  <LoadingSkeleton
                    lines={3}
                    widths={['85%', '65%', '75%']}
                    className="mb-4"
                  />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="px-6 pb-5 pt-2">
          <div className="max-w-[640px] mx-auto">
            <form onSubmit={handleSubmit}>
              {inputBox("Ask a follow-up...")}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
