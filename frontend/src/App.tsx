import { useState } from 'react';
import { motion } from 'framer-motion';
import ChatInterface from './components/ChatInterface';
import GlassBox from './components/GlassBox';
import type { ChatMessage, AgentResponse } from './types/agent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgentResponse, setCurrentAgentResponse] = useState<AgentResponse | null>(null);

  const handleSendMessage = async (question: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentAgentResponse(null); // Clear previous response

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const agentResponse: AgentResponse = await response.json();

      // Update Glass Box with the full response
      setCurrentAgentResponse(agentResponse);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: agentResponse.final_answer,
        agentResponse,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error calling API:', error);

      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the backend server is running.`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-cyber-darker overflow-hidden relative">
      {/* Global background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/5 via-transparent to-cyber-purple/5 pointer-events-none" />

      {/* Scan line effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-50 opacity-[0.02]"
        style={{
          background: 'linear-gradient(transparent 50%, rgba(0, 0, 0, 0.5) 50%)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Main layout */}
      <div className="h-full w-full flex relative z-10">
        {/* Chat Panel - 40% */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-[40%] h-full border-r border-cyber-border/30"
        >
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </motion.div>

        {/* Glass Box Panel - 60% */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-[60%] h-full"
        >
          <GlassBox agentResponse={currentAgentResponse} />
        </motion.div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-cyber-cyan/20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-cyber-purple/20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-cyber-purple/20 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-cyber-cyan/20 pointer-events-none" />

      {/* Status bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-0 left-0 right-0 h-6 bg-cyber-darker/80 border-t border-cyber-border/30 flex items-center justify-between px-4 text-[10px] font-mono text-zinc-600 z-20"
      >
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyber-green animate-pulse" />
            SYSTEM ONLINE
          </span>
          <span className="text-zinc-700">|</span>
          <span>ELASTICSEARCH: CONNECTED</span>
          <span className="text-zinc-700">|</span>
          <span>GPT-4 TURBO: READY</span>
        </div>
        <div className="flex items-center gap-4">
          <span>ELSA v1.0.0</span>
          <span className="text-zinc-700">|</span>
          <span className="text-cyber-cyan">HACKATHON EDITION</span>
        </div>
      </motion.div>
    </div>
  );
}

export default App;
