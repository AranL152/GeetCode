import { writable, get } from 'svelte/store';
import { githubToken, handleInvalidToken } from './auth';
import { selectedRepo } from './repos';
import type { SubmissionData } from '../lib/types';

export const latestSubmission = writable<SubmissionData | null>(null);
export const pushLoading = writable<boolean>(false);
export const pushError = writable<string | null>(null);
export const pushSuccess = writable<boolean>(false);

const extensionMap: Record<string, string> = {
  python: 'py',
  python3: 'py',
  javascript: 'js',
  typescript: 'ts',
  'cpp': 'c++',
  'c#': 'cs',
  csharp: 'cs',
  java: 'java',
  c: 'c',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  swift: 'swift',
  kotlin: 'kt',
  scala: 'scala',
  php: 'php'
};

export async function loadLatestSubmission(): Promise<void> {
  const { latestSubmission: stored } = await chrome.storage.local.get(['latestSubmission']);
  if (stored) {
    latestSubmission.set(stored);
  }
}

export async function pushToGitHub(commitMessage?: string): Promise<boolean> {
  const token = get(githubToken);
  const repo = get(selectedRepo);
  const submission = get(latestSubmission);

  if (!token) throw new Error('Not authenticated');
  if (!repo) throw new Error('No repository selected');
  if (!submission) throw new Error('No submission to push');

  pushLoading.set(true);
  pushError.set(null);
  pushSuccess.set(false);

  try {
    const safeTitle = submission.problemTitle.replace(/[\/\\?%*:|"<>]/g, '-');
    const language = submission.language.toLowerCase();
    const ext = extensionMap[language] || 'txt';
    const filePath = `${safeTitle}.${ext}`;
    const message = commitMessage || `${safeTitle} Solved`;

    // Check if file already exists to get its sha (required for updates)
    let sha: string | undefined;
    const existingResponse = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}?ref=main`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (existingResponse.status === 401) {
      await handleInvalidToken();
      throw new Error('Session expired — please sign in again');
    }

    if (existingResponse.ok) {
      const existing = await existingResponse.json();
      sha = existing.sha;

      // Skip push if content is identical
      const existingContent = existing.content?.replace(/\n/g, '');
      if (existingContent === btoa(submission.code)) {
        pushSuccess.set(true);
        return false;
      }
    }

    const response = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message,
        content: btoa(submission.code),
        branch: 'main',
        ...(sha && { sha })
      })
    });

    if (response.status === 401) {
      await handleInvalidToken();
      throw new Error('Session expired — please sign in again');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to push to GitHub');
    }

    pushSuccess.set(true);
    return true;
  } catch (error) {
    console.error('Error pushing to repo:', error);
    pushError.set(error instanceof Error ? error.message : 'Failed to push');
    throw error;
  } finally {
    pushLoading.set(false);
  }
}
