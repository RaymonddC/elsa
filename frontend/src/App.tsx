import { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './hooks/useToast';
import LoginPage from './components/LoginPage';
import ChatPanel from './components/ChatPanel';
import ChatSidebar from './components/ChatSidebar';
import ToastContainer from './components/ui/Toast';
import type { ChatMessage, AgentResponse } from './types/agent';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const { user, token, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string>('');
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
    setCurrentSessionTitle('');
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
      setCurrentSessionTitle(session.title || '');
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
        setCurrentSessionTitle(title);

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

      showToast({
        type: 'success',
        message: 'Wallet analyzed successfully!',
        duration: 2000,
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to analyze wallet. Please try again.',
        duration: undefined, // Requires manual dismiss
      });

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
    <div className="h-screen w-screen bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#0f0f0f] flex overflow-hidden">
      <ToastContainer />

      {/* Sidebar - hidden on mobile by default */}
      <div className={`
        ${sidebarOpen ? 'block' : 'hidden'} md:block
        fixed md:relative inset-0 md:inset-auto z-40 md:z-auto h-full
      `}>
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="relative h-full">
          <ChatSidebar
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionSelect}
            onNewChat={handleNewChat}
            refreshTrigger={sidebarRefresh}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((v) => !v)}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Hamburger Menu (mobile only) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-white/60 hover:text-white/90 transition-all duration-200 md:hidden"
          >
            <PanelLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
        )}

        {/* Desktop toggle (always visible when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="hidden md:block absolute top-4 left-4 z-10 p-1 text-white/20 hover:text-white/50 transition-all duration-200 opacity-0 hover:opacity-100"
          >
            <PanelLeft className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}

        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          sessionTitle={currentSessionTitle}
        />
      </div>
    </div>
  );
}

export default App;
