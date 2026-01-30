import { useState } from 'react';
import { motion } from 'framer-motion';
import ChatPanel from './components/ChatPanel';
import ReasoningPanel from './components/ReasoningPanel';
import type { ChatMessage, AgentResponse } from './types/agent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgentResponse, setCurrentAgentResponse] = useState<AgentResponse | null>(null);

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
    <div className="h-screen w-screen bg-[#0f1117] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-white/10 bg-[#0f1117] flex items-center justify-between px-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">ELSA</h1>
            <p className="text-[10px] text-gray-500">Elastic Log Search Agent</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            <div className="status-online" />
            <span className="text-[10px] text-gray-400 font-medium">Connected</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-[420px] border-r border-white/10 flex-shrink-0"
        >
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </motion.div>

        {/* Reasoning Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex-1 overflow-hidden"
        >
          <ReasoningPanel
            agentResponse={currentAgentResponse}
            isLoading={isLoading}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default App;
