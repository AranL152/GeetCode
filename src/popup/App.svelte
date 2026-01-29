<script lang="ts">
  import { onMount } from 'svelte';
  import AuthScreen from '../components/auth/AuthScreen.svelte';
  import RepoSection from '../components/repo/RepoSection.svelte';
  import LatestSubmission from '../components/submission/LatestSubmission.svelte';
  import {
    isAuthenticated,
    authLoading,
    githubUser,
    checkAuthStatus,
    disconnect
  } from '../stores/auth';
  import { loadRepos, selectedRepo } from '../stores/repos';
  import { loadLatestSubmission } from '../stores/submission';
  import logoSvg from '../../public/Dieppe1.svg';

  let statusMessage = $state<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  onMount(async () => {
    await checkAuthStatus();
    if ($isAuthenticated) {
      await loadRepos();
      await loadLatestSubmission();
    }
  });

  function showStatus(text: string, type: 'success' | 'error' | 'info') {
    statusMessage = { text, type };
    if (type !== 'error') {
      setTimeout(() => {
        statusMessage = null;
      }, 3000);
    }
  }

  function clearStatus() {
    statusMessage = null;
  }

  async function handleDisconnect() {
    await disconnect();
  }
</script>

<div class="app">
  {#if $authLoading}
    <div class="loading">
      <div class="spinner"></div>
      <span>Loading...</span>
    </div>
  {:else if !$isAuthenticated}
    <AuthScreen />
  {:else}
    <header class="header">
      <div class="header-top">
        <div class="logo">
          <img src={logoSvg} alt="GeetCode" class="logo-img" />
          <span class="logo-text">GeetCode</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick={handleDisconnect} aria-label="Disconnect" title="Disconnect">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>

      {#if $githubUser}
        <div class="user-info">
          <span class="badge badge-accent github-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            {$githubUser.login}
          </span>
          {#if $selectedRepo}
            <span class="badge">{$selectedRepo}</span>
          {/if}
        </div>
      {/if}
    </header>

    <main class="main">
      <LatestSubmission onStatusChange={showStatus} />
      <RepoSection onStatusChange={showStatus} />

      <!-- Status message area - placed below repo section -->
      {#if statusMessage}
        <div class="status-message status-{statusMessage.type}">
          <span class="status-text">{statusMessage.text}</span>
          <button class="status-close" onclick={clearStatus} aria-label="Dismiss">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      {/if}
    </main>
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-md);
    min-height: 200px;
    color: var(--text-muted);
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-color);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .header {
    margin-bottom: var(--space-lg);
  }

  .header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-sm);
  }

  .logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .logo-img {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-md);
    object-fit: cover;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  .logo-text {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .btn-sm {
    padding: var(--space-xs) var(--space-sm);
  }

  .user-info {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  .github-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    flex: 1;
  }

  /* Status message - inline below repo section */
  .status-message {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    animation: fadeIn 0.2s ease;
  }

  .status-text {
    flex: 1;
  }

  .status-close {
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity var(--transition-fast);
    color: inherit;
  }

  .status-close:hover {
    opacity: 1;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
