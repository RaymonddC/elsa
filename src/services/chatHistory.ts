/**
 * Chat history service
 * CRUD operations for chat sessions in Elasticsearch
 */

import { esClient } from '../config/elasticsearch';
import { CHAT_HISTORY_INDEX } from '../types/auth';
import type { ChatMessage, ChatSession } from '../types/auth';

export async function createSession(userId: string, title: string = 'New Chat'): Promise<{ id: string } & ChatSession> {
  const now = new Date().toISOString();
  const session: ChatSession = {
    user_id: userId,
    title,
    messages: [],
    created_at: now,
    updated_at: now,
  };

  const result = await esClient.index({
    index: CHAT_HISTORY_INDEX,
    body: session,
    refresh: 'wait_for',
  });

  return { id: result._id, ...session };
}

export async function getSessions(userId: string, limit: number = 50) {
  const result = await esClient.search({
    index: CHAT_HISTORY_INDEX,
    body: {
      query: { term: { user_id: userId } },
      sort: [{ updated_at: 'desc' }],
      size: limit,
      _source: ['title', 'created_at', 'updated_at', 'user_id'],
    },
  });

  return result.hits.hits.map((hit) => ({
    id: hit._id,
    ...(hit._source as Omit<ChatSession, 'messages'>),
  }));
}

export async function getSession(sessionId: string, userId: string): Promise<({ id: string } & ChatSession) | null> {
  try {
    const result = await esClient.get({
      index: CHAT_HISTORY_INDEX,
      id: sessionId,
    });

    const session = result._source as ChatSession;
    if (session.user_id !== userId) return null;

    return { id: result._id, ...session };
  } catch {
    return null;
  }
}

export async function updateSession(sessionId: string, userId: string, messages: ChatMessage[]): Promise<boolean> {
  const session = await getSession(sessionId, userId);
  if (!session) return false;

  // Sanitize messages to prevent ES mapper conflicts:
  // Agent responses contain deeply nested objects with varying types,
  // which causes "mapper cannot be changed" errors. Stringify complex data.
  const sanitizedMessages = messages.map(msg => {
    if (msg.agent_response) {
      return {
        ...msg,
        // Store as stringified JSON to avoid dynamic mapping conflicts
        agent_response: typeof msg.agent_response === 'string'
          ? msg.agent_response
          : JSON.stringify(msg.agent_response),
      };
    }
    return msg;
  });

  try {
    await esClient.update({
      index: CHAT_HISTORY_INDEX,
      id: sessionId,
      body: {
        doc: {
          messages: sanitizedMessages,
          updated_at: new Date().toISOString(),
        },
      },
      refresh: 'wait_for',
    });
  } catch (error: any) {
    // If mapper conflict persists, try deleting and re-indexing the whole doc
    if (error?.meta?.statusCode === 400 && error?.message?.includes('mapper')) {
      console.warn('Mapper conflict detected, re-indexing chat document...');
      const fullSession = { ...session, messages: sanitizedMessages, updated_at: new Date().toISOString() };
      delete (fullSession as any).id;
      await esClient.index({
        index: CHAT_HISTORY_INDEX,
        id: sessionId,
        body: fullSession,
        refresh: 'wait_for',
      });
    } else {
      throw error;
    }
  }

  return true;
}

export async function updateSessionTitle(sessionId: string, userId: string, title: string): Promise<boolean> {
  const session = await getSession(sessionId, userId);
  if (!session) return false;

  await esClient.update({
    index: CHAT_HISTORY_INDEX,
    id: sessionId,
    body: { doc: { title } },
  });

  return true;
}

export async function deleteSession(sessionId: string, userId: string): Promise<boolean> {
  const session = await getSession(sessionId, userId);
  if (!session) return false;

  await esClient.delete({
    index: CHAT_HISTORY_INDEX,
    id: sessionId,
    refresh: 'wait_for',
  });

  return true;
}
