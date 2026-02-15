/**
 * Authentication service
 * Google OAuth token verification and JWT session management
 */

import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { esClient } from '../config/elasticsearch';
import { USER_INDEX } from '../types/auth';
import type { User } from '../types/auth';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set in .env');
  return secret;
}

export async function verifyGoogleToken(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload?.email) {
    throw new Error('Invalid Google token payload');
  }
  return {
    google_id: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    picture: payload.picture || '',
  };
}

export async function findOrCreateUser(profile: {
  google_id: string;
  email: string;
  name: string;
  picture: string;
}): Promise<{ userId: string; user: User }> {
  const now = new Date().toISOString();

  // Search for existing user
  const result = await esClient.search({
    index: USER_INDEX,
    body: {
      query: { term: { google_id: profile.google_id } },
    },
  });

  if (result.hits.hits.length > 0) {
    const hit = result.hits.hits[0];
    // Update last_login
    await esClient.update({
      index: USER_INDEX,
      id: hit._id!,
      body: { doc: { last_login: now, name: profile.name, picture: profile.picture } },
    });
    return { userId: hit._id!, user: { ...(hit._source as User), last_login: now } };
  }

  // Create new user
  const newUser: User = {
    google_id: profile.google_id,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    created_at: now,
    last_login: now,
  };

  const createResult = await esClient.index({
    index: USER_INDEX,
    body: newUser,
    refresh: 'wait_for',
  });

  return { userId: createResult._id, user: newUser };
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, getJwtSecret(), { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; email: string } {
  return jwt.verify(token, getJwtSecret()) as { userId: string; email: string };
}
