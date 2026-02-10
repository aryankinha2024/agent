// Docker container metrics collection
import { execSafe } from './utils/exec.js';

export async function getDockerContainers() {
  try {
    const result = await execSafe(
      "docker ps --format '{{.Names}}|{{.Status}}|{{.ID}}'",
      { timeout: 10000 }
    );

    if (!result.success) {
      console.error('Docker command failed:', result.error);
      return [];
    }

    if (!result.stdout.trim()) {
      return []; // No containers running
    }

    const containers = result.stdout.trim().split('\n');
    const details = [];

    for (const container of containers) {
      const [name, status, id] = container.split('|');
      const stats = await getContainerStats(id, name);
      details.push({
        name,
        id: id.substring(0, 12),
        status,
        ...stats,
      });
    }

    return details;
  } catch (error) {
    console.error('Error collecting Docker metrics:', error.message);
    return [];
  }
}

async function getContainerStats(containerId, containerName) {
  const result = await execSafe(`docker stats --no-stream ${containerId}`, {
    timeout: 10000,
  });

  if (!result.success) {
    console.error(`Failed to get stats for ${containerName}`);
    return {
      cpu: 'N/A',
      memory: 'N/A',
      uptime: 'N/A',
    };
  }

  const lines = result.stdout.trim().split('\n');
  if (lines.length < 2) {
    return { cpu: 'N/A', memory: 'N/A', uptime: 'N/A' };
  }

  const stats = lines[1].split(/\s+/);
  const cpuUsage = stats[2] || 'N/A';
  const memoryUsage = stats[5] || 'N/A';

  // Get container uptime from inspect
  const uptime = await getContainerUptime(containerId);

  return {
    cpu: cpuUsage,
    memory: memoryUsage,
    uptime,
  };
}

async function getContainerUptime(containerId) {
  const result = await execSafe(
    `docker inspect -f '{{.State.StartedAt}}' ${containerId}`,
    { timeout: 5000 }
  );

  if (!result.success) {
    return 'N/A';
  }

  try {
    const startTime = new Date(result.stdout.trim());
    const now = new Date();
    const diff = now - startTime;

    return formatUptime(diff);
  } catch (e) {
    return 'N/A';
  }
}

function formatUptime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Validate container name to prevent injection
export function validateContainerName(name) {
  // Allow only alphanumeric, hyphens, underscores
  return /^[a-zA-Z0-9_-]+$/.test(name);
}
