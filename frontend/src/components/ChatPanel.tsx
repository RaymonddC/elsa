import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Sparkles, AlertCircle, Clock, Database } from 'lucide-react';
import type { ChatMessage } from '../types/agent';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const suggestedQueries = [
  { icon: AlertCircle, text: "Show recent errors", color: "text-red-400" },
  { icon: Database, text: "Which service has the most failures?", color: "text-purple-400" },
  { icon: Clock, text: "What happened in the last 15 minutes?", color: "text-blue-400" },
];

export default function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState('');
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

  return (
    <div className="h-full flex flex-col bg-[#0f1117]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center px-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7 text-blue-400" />
              </div>

              <h2 className="text-lg font-semibold text-white mb-2">Ask about your logs</h2>
              <p className="text-sm text-gray-500 text-center mb-8 max-w-[280px]">
                I'll search and analyze your application logs to find patterns and issues.
              </p>

              <div className="w-full space-y-2">
                <p className="text-[10px] text-gray-600 font-medium uppercase tracking-wider mb-3">Try asking</p>
                {suggestedQueries.map((query, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => onSendMessage(query.text)}
                    className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-200 group flex items-center gap-3"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${query.color}`}>
                      <query.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                      {query.text}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${msg.role === 'user'
                      ? 'bg-blue-500/20 border border-blue-500/30'
                      : 'bg-white/5 border border-white/10'
                    }
                  `}>
                    {msg.role === 'user'
                      ? <User className="w-4 h-4 text-blue-400" />
                      : <Bot className="w-4 h-4 text-gray-400" />
                    }
                  </div>

                  {/* Message bubble */}
                  <div className={`
                    max-w-[85%] rounded-2xl px-4 py-3
                    ${msg.role === 'user'
                      ? 'bg-blue-500 text-white rounded-tr-md'
                      : 'bg-white/5 border border-white/10 rounded-tl-md'
                    }
                  `}>
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-gray-300'}`}>
                      {msg.content}
                    </p>
                    <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-600'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Loading indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 h-1.5 rounded-full bg-blue-400"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">Analyzing...</span>
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

      {/* Input area */}
      <div className="p-4 border-t border-white/10">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your logs..."
              disabled={isLoading}
              className="w-full px-4 py-3 pr-12 text-sm bg-[#1c1f28] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-30 disabled:hover:bg-blue-500 flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </form>
        <p className="text-[10px] text-gray-600 text-center mt-3">
          ELSA uses GPT-4 to analyze Elasticsearch logs
        </p>
      </div>
    </div>
  );
}
