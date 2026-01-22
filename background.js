importScripts('config.js')

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'authenticate') {
        handleOAuthFlow()
        .then(token => {
            sendResponse({success: true, token: token});

        })
        .catch(error => {
            sendResponse({success: false, error: error.message});
        });

        return true; 
    }


    if (request.action === 'getExtensionId') {
        sendResponse({ extensionId: chrome.runtime.id});
        return true;
    }

    if (request.action === 'submissionDetected') {
        chrome.storage.local.set({
            latestSubmission: request.data
        });

        sendResponse({success: true})
        return true; 
    }
});

async function handleOAuthFlow() {
    const extensionId = chrome.runtime.id;
    const redirectUri = `https://${extensionId}.chromiumapp.org/`;

    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.append('client_id', CONFIG.CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', CONFIG.SCOPES);
    authUrl.searchParams.append('state', generateRandomState());

    try {
        const responseUrl = await chrome.identity.launchWebAuthFlow({
            url: authUrl.toString(),
            interactive: true
        }); 

        const url = new URL(responseUrl);
        const code = url.searchParams.get('code');

        if (!code) {
            throw new Error('No authorization code recieved');
        }

        const token = await exchangeCodeForToken(code, redirectUri);

        await chrome.storage.local.set({githubToken: token});

        return token; 
    } catch (error) {
        console.error('OAuth error:', error);
        throw error; 
    }
}

async function exchangeCodeForToken(code, redirectUri) {
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id:CONFIG.CLIENT_ID,
            client_secret: CONFIG.CLIENT_SECRET,
            code: code,
            redirect_uri: redirectUri
        })
    });

    if (!response.ok) {
        throw new Error('Failed to exchange code for token');
    }

    const data = await response.json(); 

    if (data.error) {
        throw new Error(data.error_description || data.error);
    }

    return data.access_token;
}

function generateRandomState() {
    const array = new Uint32Array(4);
    crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substring(-2)).join('');
}