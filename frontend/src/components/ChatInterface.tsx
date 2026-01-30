import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Zap } from 'lucide-react';
import type { ChatMessage } from '../types/agent';
import { cn } from '../lib/utils';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

const suggestedQuestions = [
  { icon: Zap, text: "What errors happened in the last 15 minutes?" },
  { icon: Sparkles, text: "Which service has the most errors?" },
  { icon: Bot, text: "Show me all database timeout errors" },
];

export default function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
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
    <div className="flex flex-col h-full bg-cyber-darker relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-cyber-cyan/5 via-transparent to-cyber-purple/5 pointer-events-none" />
      <div className="absolute inset-0 hex-pattern pointer-events-none" />

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-6 border-b border-cyber-border/50"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyber-cyan to-cyber-purple flex items-center justify-center">
              <Bot className="w-5 h-5 text-cyber-dark" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-cyber-green rounded-full pulse-dot border-2 border-cyber-darker" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold tracking-wider gradient-text">
              ELSA
            </h1>
            <p className="text-xs text-zinc-500 font-mono">
              Elastic Log Search Agent • <span className="text-cyber-green">ONLINE</span>
            </p>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <motion.div
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyber-cyan/20 to-cyber-purple/20 flex items-center justify-center mb-6 cyber-border"
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 245, 255, 0.2)',
                    '0 0 40px rgba(191, 90, 242, 0.3)',
                    '0 0 20px rgba(0, 245, 255, 0.2)'
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Sparkles className="w-10 h-10 text-cyber-cyan" />
              </motion.div>

              <h2 className="text-lg font-display font-semibold text-zinc-300 mb-2">
                Initialize Query
              </h2>
              <p className="text-sm text-zinc-500 mb-8 max-w-xs">
                Ask me about your application logs. I'll analyze patterns and find anomalies.
              </p>

              <div className="space-y-3 w-full max-w-sm">
                {suggestedQuestions.map((q, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => onSendMessage(q.text)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl",
                      "glass hover:bg-cyber-cyan/10 transition-all duration-300",
                      "border border-cyber-border/30 hover:border-cyber-cyan/50",
                      "group flex items-center gap-3"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyber-surface flex items-center justify-center group-hover:bg-cyber-cyan/20 transition-colors">
                      <q.icon className="w-4 h-4 text-cyber-cyan" />
                    </div>
                    <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      {q.text}
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={cn(
                  "flex gap-3",
                  msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  msg.role === 'user'
                    ? "bg-cyber-purple/20 border border-cyber-purple/30"
                    : "bg-cyber-cyan/20 border border-cyber-cyan/30"
                )}>
                  {msg.role === 'user'
                    ? <User className="w-4 h-4 text-cyber-purple" />
                    : <Bot className="w-4 h-4 text-cyber-cyan" />
                  }
                </div>

                {/* Message bubble */}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  msg.role === 'user'
                    ? "bg-gradient-to-br from-cyber-purple/20 to-cyber-pink/10 border border-cyber-purple/30 rounded-tr-md"
                    : "glass border-cyber-cyan/20 rounded-tl-md"
                )}>
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                  <p className={cn(
                    "text-[10px] mt-2 font-mono",
                    msg.role === 'user' ? "text-cyber-purple/50 text-right" : "text-cyber-cyan/50"
                  )}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* Loading indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-cyber-cyan/20 border border-cyber-cyan/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-cyber-cyan" />
              </div>
              <div className="glass rounded-2xl rounded-tl-md px-4 py-3 border-cyber-cyan/20">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="flex gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-cyber-cyan"
                        animate={{
                          y: [0, -8, 0],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </motion.div>
                  <span className="text-xs text-cyber-cyan font-mono">ANALYZING</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-4 border-t border-cyber-border/50"
      >
        <form onSubmit={handleSubmit} className="relative">
          <div className={cn(
            "relative rounded-2xl overflow-hidden transition-all duration-300",
            "bg-cyber-surface border border-cyber-border/50",
            "focus-within:border-cyber-cyan/50 focus-within:shadow-[0_0_30px_rgba(0,245,255,0.15)]"
          )}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query the logs..."
              disabled={isLoading}
              className={cn(
                "w-full bg-transparent px-5 py-4 pr-14",
                "text-sm text-zinc-200 placeholder-zinc-600",
                "font-mono focus:outline-none",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2",
                "w-10 h-10 rounded-xl",
                "flex items-center justify-center",
                "bg-gradient-to-br from-cyber-cyan to-cyber-purple",
                "text-cyber-dark font-bold",
                "disabled:opacity-30 disabled:cursor-not-allowed",
                "hover:shadow-[0_0_20px_rgba(0,245,255,0.5)] transition-all duration-300",
                "active:scale-95"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        <p className="text-[10px] text-zinc-600 text-center mt-2 font-mono">
          ELSA v1.0 • Powered by GPT-4 + Elasticsearch
        </p>
      </motion.div>
    </div>
  );
}
