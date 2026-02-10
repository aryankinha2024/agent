// Bearer token authentication middleware

export function authMiddleware(req, res, next) {
  const token = process.env.AGENT_TOKEN;

  if (!token) {
    console.error('WARNING: AGENT_TOKEN not set in environment');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format' });
  }

  const providedToken = parts[1];

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeEqual(providedToken, token)) {
    console.warn(`[AUTH] Unauthorized access attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

// Constant-time string comparison
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
