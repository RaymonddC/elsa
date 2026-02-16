import { useState, useEffect, useCallback } from 'react';
import { Plus, PanelLeftClose, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import UserMenu from './UserMenu';

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
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({ currentSessionId, onSessionSelect, onNewChat, refreshTrigger, isOpen, onToggle }: ChatSidebarProps) {
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
    <div
      className="bg-[#0c0c0c] flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden"
      style={{ width: isOpen ? 260 : 0 }}
    >
      <div className="w-[260px] flex flex-col h-full">
        {/* Header */}
        <div className="group/header px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-white/50 tracking-wide uppercase">ELSA</span>
          <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity duration-200">
            <button
              onClick={onNewChat}
              className="p-1 text-white/20 hover:text-white/50 transition-colors duration-200"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={onToggle}
              className="p-1 text-white/20 hover:text-white/50 transition-colors duration-200"
            >
              <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-3 pt-2">
          {sessions.length === 0 ? (
            <p className="text-[12px] text-white/15 text-center py-16">No conversations</p>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSessionSelect(session.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] cursor-pointer group transition-all duration-200 ${
                    currentSessionId === session.id
                      ? 'bg-white/[0.08] text-white/85'
                      : 'text-white/30 hover:text-white/55 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-[13px] truncate flex-1 leading-snug">{session.title || 'New Chat'}</span>
                  <span
                    onClick={(e) => handleDelete(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400/60 cursor-pointer transition-all duration-200 flex-shrink-0"
                  >
                    <X className="w-3 h-3" strokeWidth={1.5} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User */}
        <div className="px-4 py-3">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
