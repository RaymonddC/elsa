/**
 * Auth routes
 * POST /auth/google - Exchange Google credential for session JWT
 */

import { Router } from 'express';
import { verifyGoogleToken, findOrCreateUser, generateToken } from '../services/auth';

const router = Router();

router.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      res.status(400).json({ error: 'Missing credential' });
      return;
    }

    const profile = await verifyGoogleToken(credential);
    const { userId, user } = await findOrCreateUser(profile);
    const token = generateToken(userId, user.email);

    res.json({
      token,
      user: {
        id: userId,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router;
