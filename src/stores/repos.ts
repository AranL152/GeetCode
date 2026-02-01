import { writable, derived, get } from 'svelte/store';
import { githubToken, handleInvalidToken } from './auth';
import type { GitHubRepo } from '../lib/types';

export const repos = writable<GitHubRepo[]>([]);
export const selectedRepo = writable<string | null>(null);
export const reposLoading = writable<boolean>(false);
export const reposError = writable<string | null>(null);

export const hasRepos = derived(repos, $repos => $repos.length > 0);

export async function loadRepos(): Promise<void> {
  const token = get(githubToken);
  if (!token) return;

  reposLoading.set(true);
  reposError.set(null);

  try {
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 401) {
      await handleInvalidToken();
      return;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }

    const data = await response.json();
    repos.set(data);

    // Load saved selected repo
    const { selectedRepo: savedRepo } = await chrome.storage.local.get(['selectedRepo']);
    if (savedRepo) {
      selectedRepo.set(savedRepo);
    }
  } catch (error) {
    console.error('Error loading repos:', error);
    reposError.set('Failed to load repositories');
  } finally {
    reposLoading.set(false);
  }
}

export async function selectRepo(repoFullName: string): Promise<void> {
  await chrome.storage.local.set({ selectedRepo: repoFullName });
  selectedRepo.set(repoFullName);
}

export interface CreateRepoOptions {
  name: string;
  description?: string;
  isPrivate: boolean;
}

export async function createRepo(options: CreateRepoOptions): Promise<GitHubRepo> {
  const token = get(githubToken);
  if (!token) throw new Error('Not authenticated');

  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: options.name,
      description: options.description || undefined,
      private: options.isPrivate
    })
  });

  if (response.status === 401) {
    await handleInvalidToken();
    throw new Error('Session expired — please sign in again');
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create repository');
  }

  const newRepo = await response.json();

  // Reload repos and select the new one
  await loadRepos();
  await selectRepo(newRepo.full_name);

  return newRepo;
}
