import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Wallet, TrendingUp, Shield } from 'lucide-react';
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
  { icon: Wallet, text: "Check this Bitcoin wallet 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", color: "text-emerald-600", bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50", border: "border-emerald-200" },
  { icon: TrendingUp, text: "Analyze Ethereum wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", color: "text-blue-600", bg: "bg-gradient-to-br from-blue-50 to-blue-100/50", border: "border-blue-200" },
  { icon: Shield, text: "Detect anomalies in wallet 1BzkoGfrLtL59ZGjhKfvBwy47DEb6oba5f", color: "text-red-600", bg: "bg-gradient-to-br from-red-50 to-red-100/50", border: "border-red-200" },
];

export default function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSuggestionClick = (text: string) => {
    setShowSuggestions(false);
    onSendMessage(text);
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      {/* Messages area - Modern centered style */}
      <div className="flex-1 overflow-y-auto" style={{ paddingLeft: '80px', paddingRight: '80px', paddingTop: '80px', paddingBottom: '80px' }}>
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ maxWidth: '768px', margin: '0 auto' }}
            >
              <div className="text-center pt-40">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-5xl font-bold text-white mb-6 tracking-tight"
                >
                  What can I help you with?
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-[16px] text-gray-400 leading-relaxed max-w-2xl mx-auto font-normal mb-12"
                >
                  Paste a Bitcoin or Ethereum wallet address and I'll fetch its transaction history,
                  analyze patterns, and detect anomalies on the blockchain.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    onClick={() => setShowSuggestions(true)}
                    variant="outline"
                    className="inline-flex items-center gap-2.5 px-6 py-3 h-auto rounded-xl bg-[#262626] hover:bg-[#383838] border-2 border-[#383838] hover:border-emerald-500 transition-all duration-300 group"
                  >
                    <span className="text-[14px] text-gray-300 font-semibold group-hover:text-white transition-colors">
                      View Example Queries
                    </span>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-10" style={{ maxWidth: '768px', margin: '0 auto' }}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex gap-6"
                >
                  {/* Avatar */}
                  <div className={`
                    w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg
                    ${msg.role === 'user'
                      ? 'bg-[#262626] border border-[#383838]'
                      : 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/20'
                    }
                  `}>
                    {msg.role === 'user'
                      ? <User className="w-5 h-5 text-gray-300" strokeWidth={2.5} />
                      : <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
                    }
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-[14px] font-bold text-white">
                        {msg.role === 'user' ? 'You' : 'ELSA'}
                      </span>
                      <span className="text-[12px] text-gray-500 font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`
                      text-[15px] leading-relaxed whitespace-pre-wrap font-normal
                      ${msg.role === 'user' ? 'text-gray-300' : 'text-gray-200'}
                    `}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-6"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mt-1 shadow-lg shadow-emerald-500/20">
                      <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <span className="text-[14px] font-bold text-white mb-3 block">ELSA</span>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-2.5 h-2.5 rounded-full bg-emerald-500"
                              animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1, 0.9] }}
                              transition={{
                                duration: 1.4,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[15px] text-gray-400 font-medium">Analyzing wallet...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area - Centered with right-aligned button */}
      <div className="border-t border-[#2a2a2a]" style={{ paddingLeft: '80px', paddingRight: '80px', paddingBottom: '48px', paddingTop: '32px', backgroundColor: '#151515' }}>
        <div style={{ maxWidth: '768px', margin: '0 auto' }}>
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter a Bitcoin or Ethereum wallet address..."
              disabled={isLoading}
              className="flex-1 px-5 py-4 h-auto text-[15px] bg-[#262626] border-2 border-[#383838] rounded-xl text-white placeholder-gray-500 focus-visible:border-emerald-500 focus-visible:ring-4 focus-visible:ring-emerald-500/10 transition-all disabled:opacity-50 disabled:bg-[#262626] font-medium"
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-4 h-auto rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-30 disabled:from-emerald-500 disabled:to-emerald-600 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 min-w-[120px]"
            >
              <Send className="w-5 h-5 text-white" strokeWidth={2.5} />
              <span className="text-[14px] text-white font-bold">Send</span>
            </Button>
          </form>
          <p className="text-[12px] text-gray-500 text-center mt-4 font-medium">
            Powered by AI • ELSA can make mistakes, please verify critical information
          </p>
        </div>
      </div>

      {/* Suggestions Popup - Shadcn UI Dialog */}
      <Dialog open={showSuggestions} onOpenChange={setShowSuggestions}>
        <DialogContent className="max-w-3xl p-0 gap-0 bg-[#111111] border-[#262626] [&>button]:hidden">
          {/* Popup Header */}
          <div className="border-b border-[#262626] bg-[#111111]" style={{ padding: '40px' }}>
            <DialogTitle className="text-[28px] font-bold text-white mb-3">Example Queries</DialogTitle>
            <DialogDescription className="text-[16px] text-gray-400 font-normal leading-relaxed">
              Get started with these common questions
            </DialogDescription>
          </div>

          {/* Popup Content */}
          <div style={{ padding: '40px' }}>
            <div className="grid grid-cols-1 gap-4">
              {suggestedQueries.map((query, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.4 }}
                >
                  <Button
                    onClick={() => handleSuggestionClick(query.text)}
                    variant="outline"
                    className="w-full h-auto text-left px-8 py-5 rounded-xl bg-[#262626] hover:bg-[#383838] border-2 border-[#383838] hover:border-emerald-500 transition-all duration-300 group cursor-pointer"
                  >
                    <span className="text-[16px] text-gray-300 group-hover:text-white transition-colors font-medium">
                      {query.text}
                    </span>
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
