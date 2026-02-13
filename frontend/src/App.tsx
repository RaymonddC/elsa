import { useState } from 'react';
import { motion } from 'framer-motion';
import ChatPanel from './components/ChatPanel';
import ReasoningPanel from './components/ReasoningPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ChatMessage, AgentResponse } from './types/agent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgentResponse, setCurrentAgentResponse] = useState<AgentResponse | null>(null);
  const [showReasoningPanel, setShowReasoningPanel] = useState(false);

  const handleSendMessage = async (question: string) => {
    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentAgentResponse(null);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const agentResponse: AgentResponse = await response.json();
      setCurrentAgentResponse(agentResponse);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: agentResponse.final_answer,
        agentResponse,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling API:', error);

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the backend is running.`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#111111] flex flex-col overflow-hidden">
      {/* Header - Simple design */}
      <header className="h-[72px] border-b border-[#2a2a2a] bg-[#191919] flex items-center justify-between flex-shrink-0 sticky top-0 z-10" style={{ paddingLeft: '80px', paddingRight: '80px' }}>
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/20"
          >
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <h1 className="text-[20px] font-bold text-white tracking-tight">ELSA</h1>
        </div>

        <div className="flex items-center gap-4">
          {currentAgentResponse && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={() => setShowReasoningPanel(true)}
                variant="outline"
                className="flex items-center gap-2.5 px-5 py-2.5 h-auto rounded-xl bg-[#262626] hover:bg-[#383838] border-2 border-[#383838] hover:border-emerald-500 transition-all duration-300 group"
              >
                <svg className="w-4.5 h-4.5 text-emerald-500 group-hover:text-emerald-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                </svg>
                <span className="text-[13px] text-gray-300 font-bold group-hover:text-white transition-colors">View Reasoning</span>
              </Button>
            </motion.div>
          )}
        </div>
      </header>

      {/* Main content - Clean centered layout */}
      <div className="flex-1 flex items-start justify-center overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full h-full"
        >
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </motion.div>
      </div>

      {/* Reasoning Panel Popup - Shadcn UI Dialog */}
      <Dialog open={showReasoningPanel} onOpenChange={setShowReasoningPanel}>
        <DialogContent className="max-w-5xl h-[88vh] p-0 gap-0 bg-[#111111] border-[#262626]">
          {/* Popup Header */}
          <div className="h-16 border-b border-[#262626] flex items-center justify-between bg-[#111111]" style={{ paddingLeft: '40px', paddingRight: '40px' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-[16px] font-bold text-white">Agent Reasoning</h2>
            </div>
          </div>

          {/* Popup Content */}
          <div className="h-[calc(100%-4rem)] overflow-hidden">
            <ReasoningPanel
              agentResponse={currentAgentResponse}
              isLoading={isLoading}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
