// System metrics collection
import { execSafe } from './utils/exec.js';

export async function getSystemMetrics() {
  try {
    const [uptime, loadAvg, cpuUsage, memory, disk] = await Promise.all([
      getUptime(),
      getLoadAverage(),
      getCpuUsage(),
      getMemoryUsage(),
      getDiskUsage(),
    ]);

    return {
      uptime,
      loadAverage: loadAvg,
      cpuUsage,
      memory,
      disk,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error collecting system metrics:', error.message);
    throw new Error('Failed to collect system metrics');
  }
}

async function getUptime() {
  const result = await execSafe('uptime -p', { timeout: 5000 });
  if (!result.success) throw new Error('Failed to get uptime');

  return result.stdout.trim();
}

async function getLoadAverage() {
  const result = await execSafe('cat /proc/loadavg', { timeout: 5000 });
  if (!result.success) throw new Error('Failed to get load average');

  const parts = result.stdout.trim().split(' ');
  return {
    oneMinute: parseFloat(parts[0]),
    fiveMinutes: parseFloat(parts[1]),
    fifteenMinutes: parseFloat(parts[2]),
  };
}

async function getCpuUsage() {
  // Get CPU usage over 1 second interval
  const result = await execSafe(
    "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'",
    { timeout: 5000 }
  );

  if (!result.success) {
    // Fallback on systems where top output differs
    return 'N/A';
  }

  const usage = parseFloat(result.stdout.trim());
  return isNaN(usage) ? 'N/A' : `${usage.toFixed(2)}%`;
}

async function getMemoryUsage() {
  const result = await execSafe('free -h', { timeout: 5000 });
  if (!result.success) throw new Error('Failed to get memory');

  const lines = result.stdout.trim().split('\n');
  const memLine = lines[1].split(/\s+/);

  return {
    total: memLine[1],
    used: memLine[2],
    free: memLine[3],
    percentage: calculatePercentage(memLine[2], memLine[1]),
  };
}

async function getDiskUsage() {
  const result = await execSafe('df -h /', { timeout: 5000 });
  if (!result.success) throw new Error('Failed to get disk usage');

  const lines = result.stdout.trim().split('\n');
  const diskLine = lines[1].split(/\s+/);

  return {
    total: diskLine[1],
    used: diskLine[2],
    available: diskLine[3],
    percentage: diskLine[4],
  };
}

function calculatePercentage(used, total) {
  // Extract numeric value from strings like "15.2G"
  const extractNumber = (str) => {
    const num = parseFloat(str.replace(/[A-Za-z]/g, ''));
    const unit = str.replace(/[0-9.]/g, '');
    const multipliers = { K: 1, M: 1024, G: 1024 ** 2, T: 1024 ** 3 };
    return num * (multipliers[unit] || 1);
  };

  const usedBytes = extractNumber(used);
  const totalBytes = extractNumber(total);

  if (usedBytes && totalBytes) {
    return `${((usedBytes / totalBytes) * 100).toFixed(2)}%`;
  }
  return 'N/A';
}
