import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ChatPanel from './components/ChatPanel';
import ChatSidebar from './components/ChatSidebar';
import UserMenu from './components/UserMenu';
import ReasoningPanel from './components/ReasoningPanel';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Lightbulb } from 'lucide-react';
import type { ChatMessage, AgentResponse } from './types/agent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentAgentResponse, setCurrentAgentResponse] = useState<AgentResponse | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#111] flex items-center justify-center">
        <div className="text-sm text-gray-400">Loading...</div>
      </div>
    );
  }

  // Not logged in
  if (!user || !token) {
    return <LoginPage />;
  }

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setCurrentAgentResponse(null);
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      const response = await fetch(`${API_URL}/chats/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const session = await response.json();
      setMessages(session.messages || []);
      setCurrentSessionId(sessionId);
      setCurrentAgentResponse(null);

      // Find the last assistant message with agentResponse
      const lastAssistant = [...(session.messages || [])].reverse().find(
        (m: ChatMessage) => m.role === 'assistant' && m.agentResponse
      );
      if (lastAssistant?.agentResponse) {
        setCurrentAgentResponse(lastAssistant.agentResponse);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const saveSession = async (updatedMessages: ChatMessage[], sessionId: string | null) => {
    try {
      if (!sessionId) {
        // Create new session
        const title = updatedMessages[0]?.content.substring(0, 60) || 'New Chat';
        const createRes = await fetch(`${API_URL}/chats`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title }),
        });
        if (!createRes.ok) return null;
        const session = await createRes.json();
        setCurrentSessionId(session.id);

        await fetch(`${API_URL}/chats/${session.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: updatedMessages }),
        });

        setSidebarRefresh((n) => n + 1);
        return session.id;
      } else {
        await fetch(`${API_URL}/chats/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ messages: updatedMessages }),
        });
        return sessionId;
      }
    } catch (error) {
      console.error('Failed to save session:', error);
      return sessionId;
    }
  };

  const handleSendMessage = async (question: string) => {
    const userMessage: ChatMessage = { role: 'user', content: question, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setCurrentAgentResponse(null);

    // Save with user message immediately (creates session if needed)
    const sessionId = await saveSession(updatedMessages, currentSessionId);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);

      const agentResponse: AgentResponse = await response.json();
      setCurrentAgentResponse(agentResponse);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: agentResponse.final_answer,
        agentResponse,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await saveSession(finalMessages, sessionId);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the backend is running.`,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      await saveSession(finalMessages, sessionId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#111] flex overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        refreshTrigger={sidebarRefresh}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-[#2a2a2a] bg-[#191919] flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
              <svg width="20" height="20" className="text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-white">ELSA</h1>
          </div>

          <div className="flex items-center gap-4">
            {currentAgentResponse && (
              <Button
                onClick={() => setShowReasoning(true)}
                variant="outline"
                className="flex items-center gap-2 px-4 py-2 h-auto rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/20 transition-colors"
              >
                <Lightbulb className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400 font-semibold">Reasoning</span>
                <span className="text-xs text-emerald-500/60 font-medium">{currentAgentResponse.reasoning_steps.length} steps</span>
              </Button>
            )}
            <UserMenu />
          </div>
        </header>

        {/* Chat */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      </div>

      {/* Floating reasoning button */}
      {currentAgentResponse && !showReasoning && (
        <div className="fixed bottom-28 right-10 z-20">
          <Button
            onClick={() => setShowReasoning(true)}
            className="flex items-center gap-2 px-4 py-2.5 h-auto rounded-xl bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25 transition-colors"
          >
            <Lightbulb className="w-4 h-4 text-white" />
            <span className="text-sm text-white font-semibold">Reasoning</span>
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded">{currentAgentResponse.reasoning_steps.length}</span>
          </Button>
        </div>
      )}

      {/* Reasoning dialog */}
      <Dialog open={showReasoning} onOpenChange={setShowReasoning}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 bg-[#111] border-[#262626]">
          <div className="h-14 border-b border-[#262626] flex items-center gap-3 px-6">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-white">Agent Reasoning</h2>
          </div>
          <div className="h-[calc(100%-3.5rem)] overflow-hidden">
            <ReasoningPanel agentResponse={currentAgentResponse} isLoading={isLoading} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
