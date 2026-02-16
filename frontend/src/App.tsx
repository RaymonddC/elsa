import { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ChatPanel from './components/ChatPanel';
import ChatSidebar from './components/ChatSidebar';
import type { ChatMessage, AgentResponse } from './types/agent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const { user, token, isLoading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-[#090909] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-gray-500">Loading</span>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <LoginPage />;
  }

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
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
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const saveSession = async (updatedMessages: ChatMessage[], sessionId: string | null) => {
    try {
      if (!sessionId) {
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

    const sessionId = await saveSession(updatedMessages, currentSessionId);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);

      const agentResponse: AgentResponse = await response.json();

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
    <div className="h-screen w-screen bg-[#090909] flex overflow-hidden">
      <ChatSidebar
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        refreshTrigger={sidebarRefresh}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-1 text-white/20 hover:text-white/50 transition-all duration-200 opacity-0 hover:opacity-100"
          >
            <PanelLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
        <ChatPanel messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}

export default App;
