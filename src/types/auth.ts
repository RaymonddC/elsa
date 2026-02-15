/**
 * Auth types and Elasticsearch index mappings
 * User profiles and chat history storage
 */

import { z } from 'zod';

// Index names
export const USER_INDEX = 'elsa-users';
export const CHAT_HISTORY_INDEX = 'elsa-chat-history';

// User schema
export const UserSchema = z.object({
  google_id: z.string(),
  email: z.string(),
  name: z.string(),
  picture: z.string(),
  created_at: z.string(),
  last_login: z.string(),
});

export type User = z.infer<typeof UserSchema>;

// Chat message schema
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
  agent_response: z.any().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Chat session schema
export const ChatSessionSchema = z.object({
  user_id: z.string(),
  title: z.string(),
  messages: z.array(ChatMessageSchema),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;

// Elasticsearch index mappings
export const USER_INDEX_MAPPING = {
  mappings: {
    properties: {
      google_id: { type: 'keyword' as const },
      email: { type: 'keyword' as const },
      name: { type: 'text' as const },
      picture: { type: 'keyword' as const },
      created_at: { type: 'date' as const },
      last_login: { type: 'date' as const },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
};

export const CHAT_HISTORY_INDEX_MAPPING = {
  mappings: {
    properties: {
      user_id: { type: 'keyword' as const },
      title: { type: 'text' as const },
      messages: { type: 'object' as const, enabled: false },
      created_at: { type: 'date' as const },
      updated_at: { type: 'date' as const },
    },
  },
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
};
