// Git commit information
import { execSafe } from './utils/exec.js';

export async function getLatestCommit() {
  try {
    const result = await execSafe(
      'git log -1 --pretty=format:"%H|%an|%s|%ci"',
      { timeout: 5000 }
    );

    if (!result.success) {
      console.error('Git command failed:', result.error);
      return {
        hash: 'N/A',
        author: 'N/A',
        message: 'N/A',
        time: 'N/A',
        error: 'Failed to fetch git information',
      };
    }

    const output = result.stdout.trim();
    if (!output) {
      return {
        hash: 'N/A',
        author: 'N/A',
        message: 'N/A',
        time: 'N/A',
        error: 'No commits found',
      };
    }

    const [hash, author, message, time] = output.split('|');

    return {
      hash: hash.substring(0, 12), // Short hash
      fullHash: hash,
      author,
      message,
      time,
    };
  } catch (error) {
    console.error('Error fetching git commit:', error.message);
    return {
      hash: 'N/A',
      author: 'N/A',
      message: 'N/A',
      time: 'N/A',
      error: 'Exception while fetching git info',
    };
  }
}
