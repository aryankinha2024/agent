// Main Express server application
import express from 'express';
import { authMiddleware } from './auth.js';
import { getSystemMetrics } from './system.js';
import { getDockerContainers } from './docker.js';
import { getLatestCommit } from './git.js';
import { getContainerLogs } from './logs.js';
import { triggerDeploy, getDeploymentStatus } from './deploy.js';

const app = express();
const PORT = process.env.PORT || 3000;
const START_TIME = Date.now();

// Middleware
app.use(express.json());

// Health check endpoint (no auth required for heartbeat)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// All protected routes require Bearer token
app.use('/system', authMiddleware);
app.use('/docker', authMiddleware);
app.use('/git', authMiddleware);
app.use('/logs', authMiddleware);
app.use('/deploy', authMiddleware);

// System metrics endpoint
app.get('/system', async (req, res) => {
  try {
    const metrics = await getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('[SYSTEM]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Docker containers endpoint
app.get('/docker', async (req, res) => {
  try {
    const containers = await getDockerContainers();
    res.json({
      containers,
      count: containers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DOCKER]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Latest git commit endpoint
app.get('/git/latest', async (req, res) => {
  try {
    const commit = await getLatestCommit();
    res.json(commit);
  } catch (error) {
    console.error('[GIT]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Container logs endpoint
app.get('/logs', async (req, res) => {
  try {
    const { container, lines } = req.query;

    if (!container) {
      return res.status(400).json({ error: 'container parameter required' });
    }

    const logs = await getContainerLogs(container, lines || 100);
    res.json(logs);
  } catch (error) {
    console.error('[LOGS]', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Deploy endpoint
app.post('/deploy', async (req, res) => {
  try {
    // Log deployment request
    console.log(`[DEPLOY] Deployment requested from ${req.ip}`);

    const result = await triggerDeploy();
    res.json({
      success: result.success,
      message: result.success ? 'Deployment completed' : 'Deployment failed',
      timestamp: result.timestamp,
      output: result.stdout,
      errors: result.stderr,
    });
  } catch (error) {
    console.error('[DEPLOY]', error.message);
    res.status(400).json({
      success: false,
      error: error.message,
      status: getDeploymentStatus(),
    });
  }
});

// Deployment status endpoint
app.get('/deploy/status', async (req, res) => {
  res.json(getDeploymentStatus());
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server Agent running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`  GET  /health              (no auth)`);
  console.log(`  GET  /system              (protected)`);
  console.log(`  GET  /docker              (protected)`);
  console.log(`  GET  /git/latest          (protected)`);
  console.log(`  GET  /logs?container=name (protected)`);
  console.log(`  POST /deploy              (protected)`);
  console.log(`  GET  /deploy/status       (protected)`);
  const tokenSet = !!process.env.AGENT_TOKEN;
  console.log(`\n🔐 Authentication: ${tokenSet ? '✅ Token is set' : '❌ AGENT_TOKEN NOT SET'}`);
  if (!tokenSet) {
    console.log(`⚠️  WARNING: AGENT_TOKEN not set in environment. Agent will reject all authenticated requests.`);
  }
  console.log(`\n✅ Agent ready for secure remote control via Cloudflare Tunnel\n`);
});

export default app;
