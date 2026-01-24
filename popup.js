


let currentToken = null;
let userRepos = [];
let githubUserLogin = null; 
 


document.addEventListener('DOMContentLoaded', async () => {
  await displayExtensionInfo();
  await checkAuthStatus();
  setupEventListeners();
});


async function displayExtensionInfo() {
  chrome.runtime.sendMessage({ action: 'getExtensionId' }, (response) => {
    const extensionId = response.extensionId;
    const redirectUri = `https://${extensionId}.chromiumapp.org/`;

    document.getElementById('extensionId').textContent = extensionId;
    document.getElementById('redirectUri').textContent = redirectUri;
  });
}


async function checkAuthStatus() {
  const { githubToken, selectedRepo } = await chrome.storage.local.get(['githubToken', 'selectedRepo']); // 🟢 Added selectedRepo

  
  if (githubToken) {
    const isValid = await verifyToken(githubToken);

    if (isValid) {
      currentToken = githubToken; 
      await showMainScreen(githubToken);

     
      await loadUserRepos();
      if (selectedRepo) {
        displaySelectedRepo(selectedRepo);
      }

      await displayLatestSubmission();
    } else {
      await chrome.storage.local.remove(['githubToken', 'selectedRepo']); // 🟢 Also remove selectedRepo
      showAuthScreen();
    }
  } else {
    showAuthScreen();
  }
}


async function verifyToken(token) {
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


function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'block';
  document.getElementById('mainScreen').style.display = 'none';
}


async function showMainScreen(token) {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'block';

  
  const repoSection = document.querySelector('.repo-section');
  if (repoSection) repoSection.style.display = 'block';

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.ok) {
      const user = await response.json();
      githubUserLogin = user.login;
      document.getElementById('userInfo').textContent = `Logged in as @${user.login}`;
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
    document.getElementById('userInfo').textContent = 'Connected to GitHub';
  }
}





async function loadUserRepos() {
  if (!currentToken) return;

  showStatus('Loading repositories...', 'info');

  try {
    const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        'Authorization': `token ${currentToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }

    userRepos = await response.json();
    populateRepoDropdown(userRepos);
    hideStatus();

  } catch (error) {
    console.error('Error loading repos:', error);
    showStatus('Failed to load repositories', 'error');
  }
}

// Populate the repository dropdown
function populateRepoDropdown(repos) {
  const select = document.getElementById('repoSelect');
  const selectBtn = document.getElementById('selectRepoBtn');

  select.innerHTML = '';

  if (repos.length === 0) {
    select.innerHTML = '<option value="">No repositories found</option>';
    selectBtn.disabled = true;
    return;
  }

  select.innerHTML = '<option value="">-- Select a repository --</option>';

  repos.forEach(repo => {
    const option = document.createElement('option');
    option.value = repo.full_name;
    option.textContent = `${repo.full_name} ${repo.private ? '🔒' : ''}`;
    select.appendChild(option);
  });

  selectBtn.disabled = false;
}

// Display the currently selected repo
function displaySelectedRepo(repoFullName) {
  const repoDisplay = document.getElementById('currentRepo');

  if (repoFullName) { 
    repoDisplay.textContent = repoFullName;
    repoDisplay.classList.add('active');
  } else {
    repoDisplay.textContent = 'No repository selected';
    repoDisplay.classList.remove('active');
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
}

// Hide status message
function hideStatus() {
  const statusDiv = document.getElementById('statusMessage');
  statusDiv.style.display = 'none';
}


function setupEventListeners() {
 
  document.getElementById('connectBtn').addEventListener('click', async () => {
    const errorDiv = document.getElementById('authError');
    const btn = document.getElementById('connectBtn');

    btn.disabled = true;
    btn.textContent = 'Connecting...';
    errorDiv.classList.remove('show');

    chrome.runtime.sendMessage({ action: 'authenticate' }, async (response) => {
      btn.disabled = false;
      btn.textContent = 'Connect to GitHub';

      if (response.success) {
        currentToken = response.token; 
        await showMainScreen(response.token);
        await loadUserRepos(); 
      } else {
        errorDiv.textContent = `Authentication failed: ${response.error}`;
        errorDiv.classList.add('show');
      }
    });
  });

 
  document.getElementById('selectRepoBtn').addEventListener('click', async () => {
    const select = document.getElementById('repoSelect');
    const selectedRepo = select.value;

    if (!selectedRepo) {
      showStatus('Please select a repository', 'error');
      return;
    }

    await chrome.storage.local.set({ selectedRepo: selectedRepo });
    displaySelectedRepo(selectedRepo);
    showStatus(`Repository set to: ${selectedRepo}`, 'success');

    setTimeout(hideStatus, 3000);
  });

  
  document.getElementById('createRepoBtn').addEventListener('click', async () => {
    const repoName = document.getElementById('newRepoName').value.trim();
    const description = document.getElementById('newRepoDescription').value.trim();
    const isPrivate = document.getElementById('isPrivate').checked;

    if (!repoName) {
      showStatus('Please enter a repository name', 'error');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(repoName)) {
      showStatus('Repository name can only contain letters, numbers, hyphens, underscores, and periods', 'error');
      return;
    }

    const btn = document.getElementById('createRepoBtn');
    btn.disabled = true;
    btn.textContent = 'Creating...';
    showStatus('Creating repository...', 'info');

    try {
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `token ${currentToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: repoName,
          description: description || undefined,
          private: isPrivate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create repository');
      }

      const newRepo = await response.json();
      showStatus(`Repository created: ${newRepo.full_name}`, 'success');

      document.getElementById('newRepoName').value = '';
      document.getElementById('newRepoDescription').value = '';
      document.getElementById('isPrivate').checked = false;

      await loadUserRepos();
      await chrome.storage.local.set({ selectedRepo: newRepo.name });
      displaySelectedRepo(newRepo.full_name);

      setTimeout(hideStatus, 5000);

    } catch (error) {
      console.error('Error creating repo:', error);
      showStatus(`Error: ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Create Repository';
    }
  });

  
  document.getElementById('PushtoGithubBtn').addEventListener('click', async () => {
    let commitMessage = document.getElementById('newcommitMessage').value.trim();
    const {latestSubmission} = await chrome.storage.local.get(['latestSubmission']);
    const { selectedRepo } = await chrome.storage.local.get('selectedRepo');

    const safeTitle = latestSubmission.problemTitle.replace(/[\/\\?%*:|"<>]/g, '-');
    if (!commitMessage) {
      commitMessage = `${safeTitle} Solved`;
    }

    const btn = document.getElementById('PushtoGithubBtn');
    btn.disabled = true;
    btn.textContent = 'Pushing...';
    showStatus('Pushing to selected repository', 'info');

    //code here needs to get the problem title, code -> create file
    const language = latestSubmission.language.toLowerCase();

    const extensionMap = {
      python: 'py',
      python3: 'py',
      javascript: 'js',
      typescript: 'ts',
      'c++': 'cpp',
      java: 'java'
    };

    const ext = extensionMap[language] || 'txt';

    const filePath =`${safeTitle}.${ext}`;



    try {
      const response = await fetch(`https://api.github.com/repos/${(String(selectedRepo))}/contents/${String((filePath))}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${currentToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: commitMessage,
          content: btoa(latestSubmission.code),
          branch: "main"
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to push to Github');
      }

      document.getElementById('newcommitMessage').value = '';
      showStatus('Commit successful', 'success');
      setTimeout(hideStatus, 5000);

    } catch (error) {
      console.error('Error pushing to repo:', error);
    } finally {
      btn.disabled = false
      btn.textContent = 'Push'
    }
  });

  
  document.getElementById('disconnectBtn').addEventListener('click', async () => {
    await chrome.storage.local.remove(['githubToken', 'selectedRepo']); 
    currentToken = null; 
    userRepos = []; 
    showAuthScreen();
  });
}

async function displayLatestSubmission() {
  const {latestSubmission} = await chrome.storage.local.get(['latestSubmission']);
  const submissionText = document.getElementById('latestSubmission');
   

  if (!latestSubmission) {
    submissionText.innerHTML = '<p class="no-submission">No submissions detected yet. Solve a problem on LeetCode!</p>';
    submissionText.classList.remove('has-submission');
    return;
  }

  submissionText.classList.add('has-submission');
  submissionText.innerHTML = `
    <div class="submission-info">
      <span class="submission-label">Problem:</span>
      <span class="submission-value">${latestSubmission.problemTitle}</span>
    </div>
    <div class="submission-info">
      <span class="submission-label">Language:</span>
      <span class="submission-value">${latestSubmission.language}</span>
    </div>
    <div class="submission-info">
      <span class="submission-label">Status:</span>
      <span class="submission-value">✅ ${latestSubmission.status}</span>
    </div>
    <div class="submission-info">
      <span class="submission-label">Time:</span>
      <span class="submission-value">${new Date(latestSubmission.timestamp).toLocaleString()}</span>
    </div> 
  `;
}