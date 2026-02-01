import type { StorageData, SubmissionData } from './types';

export async function getStorageData(): Promise<StorageData> {
  return chrome.storage.local.get(['githubToken', 'tokenCreatedAt', 'selectedRepo', 'latestSubmission']) as Promise<StorageData>;
}

export async function setGithubToken(token: string): Promise<void> {
  await chrome.storage.local.set({ githubToken: token, tokenCreatedAt: Date.now() });
}

export async function setSelectedRepo(repo: string): Promise<void> {
  await chrome.storage.local.set({ selectedRepo: repo });
}

export async function setLatestSubmission(submission: SubmissionData): Promise<void> {
  await chrome.storage.local.set({ latestSubmission: submission });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove(['githubToken', 'tokenCreatedAt', 'selectedRepo']);
}

export async function getExtensionId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getExtensionId' }, (response) => {
      resolve(response.extensionId);
    });
  });
}
