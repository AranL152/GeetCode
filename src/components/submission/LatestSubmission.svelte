<script lang="ts">
  import {
    latestSubmission,
    pushLoading,
    pushToGitHub
  } from '../../stores/submission';
  import { selectedRepo } from '../../stores/repos';
  import AcceptedBadge from '../AcceptedBadge.svelte';

  interface Props {
    onStatusChange: (text: string, type: 'success' | 'error' | 'info') => void;
  }

  let { onStatusChange }: Props = $props();

  let commitMessage = $state('');
  let showPushForm = $state(false);

  async function handlePush() {
    if (!$selectedRepo) {
      onStatusChange('Please select a repository first', 'error');
      return;
    }

    onStatusChange('Pushing to repository...', 'info');

    try {
      await pushToGitHub(commitMessage || undefined);
      onStatusChange('Successfully pushed to GitHub!', 'success');
      commitMessage = '';
      showPushForm = false;
    } catch (error) {
      onStatusChange(`Error: ${error instanceof Error ? error.message : 'Failed to push'}`, 'error');
    }
  }

  function formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getLanguageColor(lang: string): string {
    const colors: Record<string, string> = {
      python: '#f9e2af',
      python3: '#f9e2af',
      javascript: '#f9e2af',
      typescript: '#89b4fa',
      'c++': '#f38ba8',
      'c#': '#a6e3a1',
      csharp: '#a6e3a1',
      java: '#fab387',
      c: '#a6adc8',
      go: '#89dceb',
      rust: '#fab387',
      ruby: '#f38ba8'
    };
    return colors[lang.toLowerCase()] || '#cba6f7';
  }

  function formatLanguageName(lang: string): string {
    const names: Record<string, string> = {
      cpp: 'C++',
      python3: 'Python',
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      csharp: 'C#',
      golang: 'Go'
    };
    return names[lang.toLowerCase()] || lang;
  }
</script>

<section class="submission-section">
  {#if !$latestSubmission}
    <div class="empty-state card">
      <div class="empty-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="12" y1="18" x2="12" y2="12"></line>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
      </div>
      <p>No submissions yet</p>
      <span class="empty-hint">Solve a problem on LeetCode to get started</span>
    </div>
  {:else}
    <div class="submission-card card">
      <div class="submission-header">
        <AcceptedBadge size="sm" />
        <span class="submission-date">{formatDate($latestSubmission.timestamp)}</span>
      </div>

      <h3 class="problem-title">{$latestSubmission.problemTitle}</h3>

      <div class="tags">
        <span class="tag" style="--tag-color: {getLanguageColor($latestSubmission.language)}">
          {formatLanguageName($latestSubmission.language)}
        </span>
      </div>

      {#if !showPushForm}
        <button
          class="btn btn-primary push-btn"
          onclick={() => showPushForm = true}
          disabled={!$selectedRepo}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          Push to GitHub
        </button>
        {#if !$selectedRepo}
          <p class="hint">Select a repository below first</p>
        {/if}
      {:else}
        <div class="push-form">
          <input
            type="text"
            class="input"
            placeholder="Commit message (optional)"
            bind:value={commitMessage}
          />
          <div class="push-actions">
            <button class="btn btn-ghost" onclick={() => showPushForm = false}>
              Cancel
            </button>
            <button
              class="btn btn-primary"
              onclick={handlePush}
              disabled={$pushLoading}
            >
              {#if $pushLoading}
                <span class="btn-spinner"></span>
              {:else}
                Push
              {/if}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .submission-section {
    width: 100%;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-xl);
  }

  .empty-icon {
    color: var(--text-muted);
    margin-bottom: var(--space-md);
  }

  .empty-state p {
    color: var(--text-secondary);
    margin-bottom: var(--space-xs);
  }

  .empty-hint {
    color: var(--text-muted);
    font-size: var(--text-xs);
  }

  .submission-card {
    padding: var(--space-lg);
  }

  .submission-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-sm);
  }

  .submission-date {
    color: var(--text-muted);
    font-size: var(--text-xs);
    font-family: var(--font-mono);
  }

  .problem-title {
    font-size: var(--text-base);
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-md);
    line-height: 1.4;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-bottom: var(--space-lg);
  }

  .tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    font-size: var(--text-xs);
    font-weight: 500;
    font-family: var(--font-mono);
    border-radius: var(--radius-sm);
    background: color-mix(in srgb, var(--tag-color) 15%, transparent);
    color: var(--tag-color);
  }

  .push-btn {
    width: 100%;
  }

  .hint {
    text-align: center;
    color: var(--text-muted);
    font-size: var(--text-xs);
    margin-top: var(--space-sm);
  }

  .push-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .push-actions {
    display: flex;
    gap: var(--space-sm);
    justify-content: flex-end;
  }

  .btn-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
