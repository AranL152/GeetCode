import { writable, derived, type Readable } from 'svelte/store';
import type { GitHubUser } from '../lib/types';
import { clearAuth } from '../lib/storage';

// Re-verify tokens older than 7 days
const TOKEN_REVALIDATION_MS = 7 * 24 * 60 * 60 * 1000;

export const githubToken = writable<string | null>(null);
export const githubUser = writable<GitHubUser | null>(null);
export const isAuthenticated: Readable<boolean> = derived(githubToken, $token => $token !== null);
export const authLoading = writable<boolean>(true);
export const authError = writable<string | null>(null);

export async function checkAuthStatus(): Promise<void> {
  authLoading.set(true);
  authError.set(null);

  try {
    const { githubToken: storedToken, tokenCreatedAt } = await chrome.storage.local.get(['githubToken', 'tokenCreatedAt']);

    if (storedToken) {
      const tokenAge = Date.now() - (tokenCreatedAt || 0);
      const needsRevalidation = !tokenCreatedAt || tokenAge > TOKEN_REVALIDATION_MS;

      if (needsRevalidation) {
        const isValid = await verifyToken(storedToken);

        if (isValid) {
          await chrome.storage.local.set({ tokenCreatedAt: Date.now() });
          githubToken.set(storedToken);
          await fetchUserInfo(storedToken);
        } else {
          await handleInvalidToken();
        }
      } else {
        githubToken.set(storedToken);
        await fetchUserInfo(storedToken);
      }
    }
  } catch (error) {
    console.error('Error checking auth status:', error);
    authError.set('Failed to check authentication status');
  } finally {
    authLoading.set(false);
  }
}


export async function handleInvalidToken(): Promise<void> {
  await clearAuth();
  githubToken.set(null);
  githubUser.set(null);
  authError.set('Session expired. Please sign in again.');
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.ok;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
}

async function fetchUserInfo(token: string): Promise<void> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.ok) {
      const user = await response.json();
      githubUser.set(user);
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
  }
}

export async function authenticate(): Promise<void> {
  authLoading.set(true);
  authError.set(null);

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'authenticate' }, async (response) => {
      authLoading.set(false);

      if (response.success) {
        githubToken.set(response.token);
        await fetchUserInfo(response.token);
        resolve();
      } else {
        authError.set(`Authentication failed: ${response.error}`);
        reject(new Error(response.error));
      }
    });
  });
}

export async function disconnect(): Promise<void> {
  await clearAuth();
  githubToken.set(null);
  githubUser.set(null);
}
