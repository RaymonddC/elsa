import { useState, useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types/agent';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const suggestions = [
  { label: "Check Bitcoin genesis wallet", query: "Check this Bitcoin wallet 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" },
  { label: "Analyze Vitalik's ETH wallet", query: "Analyze Ethereum wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" },
  { label: "Detect wallet anomalies", query: "Detect anomalies in wallet 1BzkoGfrLtL59ZGjhKfvBwy47DEb6oba5f" },
];

export default function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
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
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 pb-20">
            <p className="text-white/30 text-[13px] font-medium tracking-widest uppercase mb-6">ELSA</p>
            <h2 className="text-[32px] font-normal text-white/90 mb-12 tracking-tight">What would you like to analyze?</h2>

            <div className="w-full max-w-[560px] mb-8">
              <form onSubmit={handleSubmit}>
                {inputBox("Paste a wallet address...")}
              </form>
            </div>

            <div className="flex gap-2 flex-wrap justify-center">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(item.query)}
                  className="px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[13px] text-white/40 hover:text-white/70 transition-all duration-200"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-[700px] mx-auto px-6 pt-6 pb-4 space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 ${
                  msg.role === 'user'
                    ? 'bg-white/[0.06]'
                    : 'bg-emerald-500/[0.08]'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-white/60' : 'bg-emerald-400'
                  }`} />
                  <span className={`text-[13px] font-bold tracking-wide ${
                    msg.role === 'user' ? 'text-white/80' : 'text-emerald-400'
                  }`}>
                    {msg.role === 'user' ? 'You' : 'ELSA'}
                  </span>
                </div>
                {msg.role === 'user' ? (
                  <div className="text-[14px] leading-[1.75] whitespace-pre-wrap pl-1 pb-2 text-white/55">
                    {msg.content}
                  </div>
                ) : (
                  <div className="pl-1 pb-2 prose-elsa">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 bg-emerald-500/[0.08]">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-400" />
                  <span className="text-[13px] font-bold tracking-wide text-emerald-400">ELSA</span>
                </div>
                <div className="flex items-center gap-1.5 pl-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full bg-white/25 animate-pulse"
                      style={{ animationDelay: `${i * 200}ms` }}
                    />
                  ))}
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
