import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { ChatMessage } from '../types/agent';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const suggestedQueries = [
  "Check this Bitcoin wallet 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
  "Analyze Ethereum wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "Detect anomalies in wallet 1BzkoGfrLtL59ZGjhKfvBwy47DEb6oba5f",
];

export default function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-10 py-12">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center pt-32">
              <h2 className="text-4xl font-bold text-white mb-4">What can I help you with?</h2>
              <p className="text-base text-gray-400 max-w-xl mx-auto mb-10">
                Paste a Bitcoin or Ethereum wallet address and I'll fetch its transaction history,
                analyze patterns, and detect anomalies on the blockchain.
              </p>
              <Button
                onClick={() => setShowSuggestions(true)}
                variant="outline"
                className="px-5 py-2.5 h-auto rounded-lg bg-[#262626] hover:bg-[#333] border border-[#383838] hover:border-emerald-500 text-sm text-gray-300 font-medium transition-colors"
              >
                View Example Queries
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((msg, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    msg.role === 'user' ? 'bg-[#262626] border border-[#383838]' : 'bg-emerald-500'
                  }`}>
                    {msg.role === 'user'
                      ? <User className="w-4 h-4 text-gray-400" />
                      : <Bot className="w-4 h-4 text-white" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-white">{msg.role === 'user' ? 'You' : 'ELSA'}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-gray-300' : 'text-gray-200'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading */}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block mb-2">ELSA</span>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                        ))}
                      </div>
                      <span className="text-sm text-gray-400">Analyzing wallet...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-[#2a2a2a] bg-[#151515] px-10 py-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a Bitcoin or Ethereum wallet address..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 h-auto text-sm bg-[#262626] border border-[#383838] rounded-lg text-white placeholder-gray-500 focus-visible:border-emerald-500 focus-visible:ring-1 focus-visible:ring-emerald-500/20 disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-5 py-3 h-auto rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 flex items-center gap-2 transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-semibold">Send</span>
            </Button>
          </form>
          <p className="text-xs text-gray-500 text-center mt-3">
            Powered by AI — ELSA can make mistakes, please verify critical information
          </p>
        </div>
      </div>

      {/* Suggestions dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-2xl p-0 gap-0 bg-[#111] border-[#262626] [&>button]:hidden">
          <div className="border-b border-[#262626] px-8 py-6">
            <DialogTitle className="text-2xl font-bold text-white mb-2">Example Queries</DialogTitle>
            <DialogDescription className="text-sm text-gray-400">Get started with these common questions</DialogDescription>
          </div>
          <div className="px-8 py-6 space-y-3">
            {suggestedQueries.map((query, idx) => (
              <Button
                key={idx}
                onClick={() => { setShowSuggestions(false); onSendMessage(query); }}
                variant="outline"
                className="w-full h-auto text-left px-5 py-4 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-[#2a2a2a] hover:border-emerald-500 text-sm text-gray-300 hover:text-white transition-colors"
              >
                {query}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
