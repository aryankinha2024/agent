// Container logs retrieval
import { execSafe } from './utils/exec.js';
import { validateContainerName } from './docker.js';

export async function getContainerLogs(containerName, lines = 100) {
  // Validate container name to prevent injection
  if (!validateContainerName(containerName)) {
    throw new Error('Invalid container name');
  }

  // Validate lines parameter
  const lineCount = parseInt(lines, 10);
  if (isNaN(lineCount) || lineCount < 1 || lineCount > 10000) {
    throw new Error('Invalid line count (1-10000)');
  }

  try {
    const result = await execSafe(`docker logs --tail=${lineCount} ${containerName}`, {
      timeout: 15000,
      maxBuffer: 5 * 1024 * 1024, // 5MB for logs
    });

    if (!result.success) {
      throw new Error(`Failed to fetch logs: ${result.error}`);
    }

    return {
      container: containerName,
      lines: lineCount,
      logs: result.stdout,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching logs for ${containerName}:`, error.message);
    throw error;
  }
}
