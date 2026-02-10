// Deployment logic with safety constraints
import { execSafe } from './utils/exec.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEPLOY_SCRIPT_PATH = path.join(__dirname, '../scripts/deploy.sh');

// Prevent concurrent deployments
let isDeploying = false;
let lastDeployTime = 0;

// Rate limiting: max 1 deploy every 60 seconds
const DEPLOY_COOLDOWN_MS = 60000;

export async function triggerDeploy() {
  const now = Date.now();

  // Check rate limit
  if (now - lastDeployTime < DEPLOY_COOLDOWN_MS && lastDeployTime !== 0) {
    const cooldownRemaining = Math.ceil(
      (DEPLOY_COOLDOWN_MS - (now - lastDeployTime)) / 1000
    );
    throw new Error(
      `Deploy already triggered recently. Please wait ${cooldownRemaining}s before trying again.`
    );
  }

  // Prevent concurrent deployments
  if (isDeploying) {
    throw new Error('Deploy already in progress');
  }

  isDeploying = true;
  lastDeployTime = now;

  try {
    console.log('[DEPLOY] Starting deployment...');

    // Execute the deploy script with timeout
    const result = await execSafe(`bash ${DEPLOY_SCRIPT_PATH}`, {
      timeout: 300000, // 5 minute timeout
      maxBuffer: 2 * 1024 * 1024, // 2MB buffer for output
    });

    const deployLog = {
      timestamp: new Date().toISOString(),
      success: result.success,
      stdout: result.stdout,
      stderr: result.stderr || '',
    };

    if (result.success) {
      console.log('[DEPLOY] Deployment completed successfully');
    } else {
      console.error('[DEPLOY] Deployment failed:', result.error);
    }

    return deployLog;
  } catch (error) {
    console.error('[DEPLOY] Exception during deployment:', error.message);
    throw error;
  } finally {
    isDeploying = false;
  }
}

export function getDeploymentStatus() {
  return {
    isDeploying,
    lastDeployTime: lastDeployTime ? new Date(lastDeployTime).toISOString() : null,
    canDeploy: !isDeploying && Date.now() - lastDeployTime >= DEPLOY_COOLDOWN_MS,
  };
}
