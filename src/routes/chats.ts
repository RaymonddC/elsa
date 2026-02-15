/**
 * Chat history routes
 * All routes require authentication
 */

import { Router } from 'express';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import * as chatService from '../services/chatHistory';

const router = Router();

router.use(requireAuth);

// List all chat sessions
router.get('/chats', async (req: AuthRequest, res) => {
  try {
    const sessions = await chatService.getSessions(req.user!.userId);
    res.json({ sessions });
  } catch (error) {
    console.error('Failed to fetch chats:', error);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get a specific chat session
router.get('/chats/:id', async (req: AuthRequest, res) => {
  try {
    const session = await chatService.getSession(req.params.id, req.user!.userId);
    if (!session) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    res.json(session);
  } catch (error) {
    console.error('Failed to fetch chat:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Create a new chat session
router.post('/chats', async (req: AuthRequest, res) => {
  try {
    const { title } = req.body;
    const session = await chatService.createSession(req.user!.userId, title);
    res.json(session);
  } catch (error) {
    console.error('Failed to create chat:', error);
    res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Update chat session messages
router.put('/chats/:id', async (req: AuthRequest, res) => {
  try {
    const { messages } = req.body;
    const success = await chatService.updateSession(req.params.id, req.user!.userId, messages);
    if (!success) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to update chat:', error);
    res.status(500).json({ error: 'Failed to update chat' });
  }
});

// Delete a chat session
router.delete('/chats/:id', async (req: AuthRequest, res) => {
  try {
    const success = await chatService.deleteSession(req.params.id, req.user!.userId);
    if (!success) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete chat:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

export default router;
