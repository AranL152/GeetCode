<script lang="ts">
  import {
    repos,
    selectedRepo,
    reposLoading,
    selectRepo,
    createRepo
  } from '../../stores/repos';

  interface Props {
    onStatusChange: (text: string, type: 'success' | 'error' | 'info') => void;
  }

  let { onStatusChange }: Props = $props();

  let selectedValue = $state('');
  let showCreateForm = $state(false);
  let newRepoName = $state('');
  let newRepoDescription = $state('');
  let isPrivate = $state(false);
  let creating = $state(false);

  async function handleSelectRepo() {
    if (!selectedValue) return;
    await selectRepo(selectedValue);
    onStatusChange(`Repository set to ${selectedValue}`, 'success');
  }

  function validateRepoName(name: string): string | null {
    if (!name.trim()) return 'Please enter a repository name';
    if (name.length > 100) return 'Name must be 100 characters or fewer';
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return 'Only letters, numbers, hyphens, dots, and underscores allowed';
    if (name.startsWith('.')) return 'Name cannot start with a dot';
    if (name === '.' || name === '..') return 'Name cannot be "." or ".."';
    if (name.endsWith('.git') || name.endsWith('.atom')) return `Name cannot end with "${name.slice(name.lastIndexOf('.'))}"`;
    if (name.includes('..')) return 'Name cannot contain consecutive dots';
    return null;
  }

  async function handleCreateRepo() {
    const validationError = validateRepoName(newRepoName);
    if (validationError) {
      onStatusChange(validationError, 'error');
      return;
    }

    creating = true;
    onStatusChange('Creating repository...', 'info');

    try {
      const newRepo = await createRepo({
        name: newRepoName,
        description: newRepoDescription || undefined,
        isPrivate
      });

      onStatusChange(`Created ${newRepo.full_name}`, 'success');
      newRepoName = '';
      newRepoDescription = '';
      isPrivate = false;
      showCreateForm = false;
    } catch (error) {
      onStatusChange(`Error: ${error instanceof Error ? error.message : 'Failed'}`, 'error');
    } finally {
      creating = false;
    }
  }
</script>

<section class="repo-section">
  <div class="section-header">
    <h3>Destination</h3>
    {#if !showCreateForm}
      <button class="btn btn-ghost btn-icon" onclick={() => showCreateForm = true} title="Create new repo">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    {/if}
  </div>

  {#if showCreateForm}
    <div class="create-form card">
      <div class="form-header">
        <span>New Repository</span>
        <button class="btn btn-ghost btn-icon" onclick={() => showCreateForm = false} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <input
        type="text"
        class="input"
        placeholder="Repository name"
        bind:value={newRepoName}
      />

      <input
        type="text"
        class="input"
        placeholder="Description (optional)"
        bind:value={newRepoDescription}
      />

      <label class="checkbox-row">
        <input type="checkbox" bind:checked={isPrivate} />
        <span>Private repository</span>
      </label>

      <button
        class="btn btn-primary"
        onclick={handleCreateRepo}
        disabled={creating || !newRepoName.trim()}
      >
        {#if creating}
          <span class="btn-spinner"></span>
          Creating...
        {:else}
          Create Repository
        {/if}
      </button>
    </div>
  {:else}
    <div class="select-wrapper">
      <select
        class="select"
        bind:value={selectedValue}
        onchange={handleSelectRepo}
        disabled={$reposLoading}
      >
        {#if $reposLoading}
          <option value="">Loading...</option>
        {:else if $repos.length === 0}
          <option value="">No repositories</option>
        {:else}
          <option value="">Select Repository</option>
          {#each $repos as repo}
            <option value={repo.full_name} selected={repo.full_name === $selectedRepo}>
              {repo.name} {repo.private ? '(private)' : ''}
            </option>
          {/each}
        {/if}
      </select>
      <div class="select-icon">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </div>
  {/if}
</section>

<style>
  .repo-section {
    width: 100%;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-md);
  }

  .section-header h3 {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .btn-icon {
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
  }

  .create-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-lg);
  }

  .form-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-primary);
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-size: var(--text-sm);
    color: var(--text-secondary);
    cursor: pointer;
  }

  .checkbox-row input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .select-wrapper {
    position: relative;
  }

  .select {
    appearance: none;
    padding-right: 32px;
  }

  .select-icon {
    position: absolute;
    right: var(--space-md);
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-muted);
    pointer-events: none;
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
