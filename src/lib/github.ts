import type { GitHubUser, GitHubRepo } from './types';

export async function fetchUser(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  return response.json();
}

export async function fetchRepos(token: string): Promise<GitHubRepo[]> {
  const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch repositories');
  }

  return response.json();
}

export async function createRepository(
  token: string,
  name: string,
  description?: string,
  isPrivate = false
): Promise<GitHubRepo> {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create repository');
  }

  return response.json();
}

export async function pushFile(
  token: string,
  repoFullName: string,
  filePath: string,
  content: string,
  commitMessage: string,
  branch = 'main'
): Promise<void> {
  // Check if file already exists to get its sha (required for updates)
  let sha: string | undefined;
  const existingResponse = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${branch}`, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  if (existingResponse.ok) {
    const existing = await existingResponse.json();
    sha = existing.sha;

    // Skip push if content is identical
    const existingContent = existing.content?.replace(/\n/g, '');
    if (existingContent === btoa(content)) {
      return;
    }
  }

  const response = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      message: commitMessage,
      content: btoa(content),
      branch,
      ...(sha && { sha })
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to push file');
  }
}
