import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, PanelLeftClose, Trash2 } from 'lucide-react';
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

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'Last 7 Days';
  return 'Older';
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  const groupedSessions = useMemo(() => {
    const groups: { label: string; sessions: ChatSession[] }[] = [];
    const groupMap = new Map<string, ChatSession[]>();
    const order = ['Today', 'Yesterday', 'Last 7 Days', 'Older'];

    for (const session of sessions) {
      const group = getDateGroup(session.updated_at);
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(session);
    }

    for (const label of order) {
      const items = groupMap.get(label);
      if (items && items.length > 0) {
        groups.push({ label, sessions: items });
      }
    }

    return groups;
  }, [sessions]);

  return (
    <div
      className="bg-[#1a1a1a]/95 border-r-2 border-white/[0.1] flex flex-col flex-shrink-0 h-full transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden shadow-[4px_0_24px_-2px_rgba(0,0,0,0.8)]"
      style={{ width: isOpen ? 280 : 0 }}
    >
      <div className="w-[280px] flex flex-col h-full">
        {/* Header */}
        <div className="group/header flex items-center justify-between" style={{ padding: '16px 16px 10px 16px' }}>
          <div className="flex items-center" style={{ gap: '8px' }}>
            <img src="/elsa-logo.PNG" alt="ELSA" style={{ width: '20px', height: '20px' }} className="object-contain" />
            <span className="font-bold text-white/50 tracking-wider uppercase" style={{ fontFamily: 'Orbitron, sans-serif', fontSize: '15px' }}>ELSA</span>
          </div>
          <div className="flex items-center opacity-0 group-hover/header:opacity-100 transition-opacity duration-200" style={{ gap: '6px' }}>
            <span
              onClick={onNewChat}
              className="text-white/15 hover:text-white/40 cursor-pointer transition-all duration-200"
            >
              <Plus style={{ width: '14px', height: '14px' }} strokeWidth={1.5} />
            </span>
            <span
              onClick={onToggle}
              className="text-white/15 hover:text-white/40 cursor-pointer transition-all duration-200"
            >
              <PanelLeftClose style={{ width: '14px', height: '14px' }} strokeWidth={1.5} />
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06]" style={{ margin: '0 16px' }} />

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ padding: '10px 16px 12px', scrollbarWidth: 'none' }}>
          <p className="text-white/30 uppercase font-semibold" style={{ fontSize: '12px', marginBottom: '10px', letterSpacing: '0.1em' }}>Chat History</p>
          {sessions.length === 0 ? (
            <p className="text-white/15 text-center" style={{ fontSize: '11px', paddingTop: '48px' }}>No conversations yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {groupedSessions.map((group) => (
                <div key={group.label}>
                  <p className="text-white/20 uppercase font-medium" style={{ fontSize: '9px', letterSpacing: '0.08em', padding: '0 8px 6px' }}>{group.label}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {group.sessions.map((session) => (
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
                        className={`relative flex items-center gap-2 rounded-[8px] cursor-pointer group transition-all duration-200 focus:outline-none ${
                          currentSessionId === session.id
                            ? 'text-white/85'
                            : 'text-white/30 hover:text-white/55'
                        }`}
                        style={{ padding: '7px 10px' }}
                      >
                        <div className="flex-1 min-w-0 flex items-center justify-between" style={{ gap: '8px' }}>
                          <span className="truncate leading-snug" style={{ fontSize: '11px', maxWidth: '170px' }}>{session.title || 'New Chat'}</span>
                          <span className="text-white/15 flex-shrink-0" style={{ fontSize: '9px' }}>{getRelativeTime(session.updated_at)}</span>
                        </div>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(e, session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-white/15 hover:text-white/40 cursor-pointer transition-all duration-200" style={{ marginLeft: '6px' }}
                        >
                          <Trash2 style={{ width: '13px', height: '13px' }} strokeWidth={1.5} />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User - Pinned to Bottom */}
        <div className="mt-auto border-t border-white/[0.06]" style={{ padding: '10px 16px 14px 16px' }}>
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
