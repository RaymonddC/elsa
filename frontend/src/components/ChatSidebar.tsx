import { useState, useEffect, useCallback } from 'react';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

interface ChatSidebarProps {
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  refreshTrigger: number;
}

export default function ChatSidebar({ currentSessionId, onSessionSelect, onNewChat, refreshTrigger }: ChatSidebarProps) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/chats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  }, [token]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/chats/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) onNewChat();
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <div className="w-64 bg-[#191919] border-r border-[#2a2a2a] flex flex-col flex-shrink-0">
      {/* New chat button */}
      <div className="p-4 border-b border-[#2a2a2a]">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {sessions.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-8">No chat history yet</p>
        )}
        {sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSessionSelect(session.id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${
              currentSessionId === session.id
                ? 'bg-[#262626] border border-emerald-500/30'
                : 'hover:bg-[#222] border border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-300 truncate flex-1">{session.title || 'New Chat'}</span>
            <button
              onClick={(e) => handleDelete(e, session.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
