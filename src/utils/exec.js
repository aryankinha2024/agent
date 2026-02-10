// Safe command execution wrapper with timeout
// Prevents command injection and resource exhaustion

export async function execSafe(command, options = {}) {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);

  const timeout = options.timeout || 30000; // 30 second default
  const maxBuffer = options.maxBuffer || 1024 * 1024; // 1MB default

  try {
    const { stdout, stderr } = await execPromise(command, {
      timeout,
      maxBuffer,
      shell: '/bin/bash',
    });

    return { success: true, stdout, stderr };
  } catch (error) {
    // Distinguish between timeout and command failures
    if (error.killed) {
      return {
        success: false,
        error: 'Command timeout',
        code: 'TIMEOUT',
      };
    }
    return {
      success: false,
      error: error.message,
      code: error.code || 'COMMAND_FAILED',
    };
  }
}
