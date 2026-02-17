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
  const [liveSteps, setLiveSteps] = useState<Array<{ type: string; message: string; tool_name?: string }>>([]);
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
    setLiveSteps([]);

    const sessionId = await saveSession(updatedMessages, currentSessionId);

    try {
      const response = await fetch(`${API_URL}/analyze-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let agentResponse: AgentResponse | null = null;
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'result') {
                agentResponse = event as AgentResponse;
              } else if (event.type === 'error') {
                throw new Error(event.message);
              } else {
                setLiveSteps(prev => [...prev, { type: event.type, message: event.message, tool_name: event.tool_name, execution_time_ms: event.execution_time_ms }]);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
            }
          }
        }
      }

      if (!agentResponse) throw new Error('No response received from agent');

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: agentResponse.final_answer,
        agentResponse,
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      setLiveSteps([]);
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
        duration: undefined,
      });

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure the backend is running.`,
        timestamp: new Date().toISOString(),
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      setLiveSteps([]);
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
          <span
            onClick={() => setSidebarOpen(true)}
            className="absolute z-10 text-white/20 hover:text-white/50 hover:scale-110 cursor-pointer transition-all duration-200 md:hidden"
            style={{ top: '18px', left: '18px' }}
          >
            <PanelLeft style={{ width: '22px', height: '22px' }} strokeWidth={1.5} />
          </span>
        )}

        {/* Desktop toggle (always visible when closed) */}
        {!sidebarOpen && (
          <span
            onClick={() => setSidebarOpen(true)}
            className="hidden md:block absolute z-10 text-white/20 hover:text-white/50 hover:scale-110 cursor-pointer transition-all duration-200 opacity-0 hover:opacity-100"
            style={{ top: '18px', left: '18px' }}
          >
            <PanelLeft style={{ width: '20px', height: '20px' }} strokeWidth={1.5} />
          </span>
        )}

        <ChatPanel
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          liveSteps={liveSteps}
          sessionTitle={currentSessionTitle}
        />
      </div>
    </div>
  );
}

export default App;
