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
      className="bg-[#1a1a1a]/95 border-r-2 border-white/[0.1] flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden shadow-[4px_0_24px_-2px_rgba(0,0,0,0.8)]"
      style={{ width: isOpen ? 260 : 0 }}
    >
      <div className="w-[260px] flex flex-col h-full">
        {/* Header */}
        <div className="group/header px-4 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[13px] font-bold text-white/50 tracking-wider uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>ELSA</span>
          <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity duration-200">
            <button
              onClick={onNewChat}
              aria-label="Create new chat"
              className="p-1.5 text-white/20 hover:text-white/50 transition-colors duration-200 cursor-pointer rounded-md hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
            <button
              onClick={onToggle}
              aria-label="Close sidebar"
              className="p-1.5 text-white/20 hover:text-white/50 transition-colors duration-200 cursor-pointer rounded-md hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <PanelLeftClose className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto px-3 pt-2 pb-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
          {sessions.length === 0 ? (
            <p className="text-[12px] text-white/15 text-center py-16">No conversations</p>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => onSessionSelect(session.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSessionSelect(session.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select chat: ${session.title || 'New Chat'}`}
                  className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-[10px] cursor-pointer group transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                    currentSessionId === session.id
                      ? 'bg-white/[0.08] text-white/85'
                      : 'text-white/30 hover:text-white/55 hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-[13px] truncate flex-1 leading-snug">{session.title || 'New Chat'}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(e, session.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(e, session.id);
                      }
                    }}
                    aria-label={`Delete chat: ${session.title || 'New Chat'}`}
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400/60 cursor-pointer transition-all duration-200 flex-shrink-0 p-2 -m-2 rounded-md hover:bg-red-400/10 focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:opacity-100"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User - Pinned to Bottom */}
        <div className="mt-auto px-4 py-3 border-t-2 border-white/[0.08] bg-gradient-to-b from-transparent to-white/[0.02]">
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
