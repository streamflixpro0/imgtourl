// Google API Configuration
// TODO: Replace with your actual credentials from Google Cloud Console
const CLIENT_ID = '306306213575-5rmoacua8fvj0okv7l1c8p0qmmau9863.apps.googleusercontent.com';
const API_KEY = 'AIzaSyCA4kIfqX0pOgJ3jjYM-lE0Ynmiub80VWU';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let gapiInited = false;
let gisInited = false;
let tokenClient;

// DOM Elements
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');
const uploadSection = document.getElementById('uploadSection');
const authSection = document.getElementById('authSection');
const userInfo = document.getElementById('userInfo');
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const uploadButton = document.getElementById('uploadButton');
const resultsSection = document.getElementById('resultsSection');
const uploadedFiles = document.getElementById('uploadedFiles');
const loading = document.getElementById('loading');
const debugInfo = document.getElementById('debugInfo');
const debugContent = document.getElementById('debugContent');

let selectedFiles = [];

// Debug function
function debugLog(message) {
    console.log(message);
    debugContent.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
    debugInfo.style.display = 'block';
}

// Initialize Google APIs
function gapiLoaded() {
    debugLog('gapi loaded');
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    debugLog('Initializing GAPI client...');
    try {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
        });
        gapiInited = true;
        debugLog('GAPI client initialized successfully');
        maybeEnableButtons();
    } catch (error) {
        debugLog('GAPI client initialization failed: ' + error.message);
    }
}

function gisLoaded() {
    debugLog('GIS loaded');
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // defined later
        });
        gisInited = true;
        debugLog('GIS initialized successfully');
        maybeEnableButtons();
    } catch (error) {
        debugLog('GIS initialization failed: ' + error.message);
    }
}

function maybeEnableButtons() {
    debugLog(`GAPI initialized: ${gapiInited}, GIS initialized: ${gisInited}`);
    if (gapiInited && gisInited) {
        signInButton.style.visibility = 'visible';
        debugLog('Sign-in button enabled');
    }
}

// Authentication
function handleAuthClick() {
    debugLog('Sign-in button clicked');
    
    tokenClient.callback = async (resp) => {
        debugLog('OAuth callback received');
        if (resp.error !== undefined) {
            debugLog('OAuth error: ' + JSON.stringify(resp));
            alert('Sign-in failed: ' + resp.error);
            return;
        }
        
        debugLog('Sign-in successful');
        await listFiles();
        updateUI();
    };

    if (gapi.client.getToken() === null) {
        debugLog('Requesting consent...');
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        debugLog('Requesting token without prompt...');
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    debugLog('Sign-out clicked');
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        selectedFiles = [];
        debugLog('User signed out');
        updateUI();
    }
}

async function listFiles() {
    debugLog('Listing files...');
    let response;
    try {
        response = await gapi.client.drive.files.list({
            pageSize: 5,
            fields: 'files(id, name)',
        });
        debugLog('Files listed successfully');
    } catch (err) {
        debugLog('Error listing files: ' + err.message);
        return;
    }
}

function updateUI() {
    const isSignedIn = gapi.client.getToken() !== null;
    debugLog(`Updating UI - Signed in: ${isSignedIn}`);
    
    if (isSignedIn) {
        const token = gapi.client.getToken();
        userInfo.innerHTML = `✅ Signed in successfully!`;
        signInButton.style.display = 'none';
        signOutButton.style.display = 'inline-block';
        uploadSection.style.display = 'block';
        authSection.style.display = 'block';
        debugLog('UI updated for signed-in state');
    } else {
        userInfo.innerHTML = 'Please sign in to continue';
        signInButton.style.display = 'block';
        signOutButton.style.display = 'none';
        uploadSection.style.display = 'none';
        resultsSection.style.display = 'none';
        debugLog('UI updated for signed-out state');
    }
}

// File Handling
uploadBox.addEventListener('click', () => {
    debugLog('Upload box clicked');
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
    debugLog('File selected');
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Maximum size is 10MB.`);
            return;
        }
        
        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
            debugLog(`File added: ${file.name} (${file.size} bytes)`);
        }
    });
    
    updateFileList();
    updateUploadButton();
}

function updateFileList() {
    fileList.innerHTML = '';
    debugLog(`Updating file list with ${selectedFiles.length} files`);
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
            <button class="remove-file" onclick="removeFile(${index})">×</button>
        `;
        fileList.appendChild(fileItem);
    });
}

function removeFile(index) {
    debugLog(`Removing file at index ${index}`);
    selectedFiles.splice(index, 1);
    updateFileList();
    updateUploadButton();
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateUploadButton() {
    uploadButton.disabled = selectedFiles.length === 0;
    debugLog(`Upload button disabled: ${uploadButton.disabled}`);
}

// Upload to Google Drive
uploadButton.addEventListener('click', uploadFiles);

async function uploadFiles() {
    if (selectedFiles.length === 0) return;
    
    debugLog(`Starting upload of ${selectedFiles.length} files`);
    loading.style.display = 'block';
    uploadedFiles.innerHTML = '';
    
    for (const file of selectedFiles) {
        await uploadSingleFile(file);
    }
    
    loading.style.display = 'none';
    resultsSection.style.display = 'block';
    selectedFiles = [];
    updateFileList();
    updateUploadButton();
    debugLog('All files uploaded successfully');
}

async function uploadSingleFile(file) {
    debugLog(`Uploading file: ${file.name}`);
    
    const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: ['root']
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
            method: 'POST',
            headers: new Headers({
                'Authorization': 'Bearer ' + gapi.client.getToken().access_token
            }),
            body: form
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        debugLog(`File uploaded: ${data.name} (ID: ${data.id})`);
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        // Make file publicly accessible
        await makeFilePublic(data.id);
        
        // Display result
        displayUploadedFile(data);
        
    } catch (error) {
        console.error('Upload error:', error);
        debugLog(`Upload error for ${file.name}: ${error.message}`);
        alert(`Error uploading ${file.name}: ${error.message}`);
    }
}

async function makeFilePublic(fileId) {
    debugLog(`Making file public: ${fileId}`);
    try {
        await gapi.client.drive.permissions.create({
            fileId: fileId,
            resource: {
                type: 'anyone',
                role: 'reader'
            },
            fields: 'id'
        });
        debugLog(`File made public: ${fileId}`);
    } catch (error) {
        debugLog(`Error making file public: ${error.message}`);
    }
}

function displayUploadedFile(fileData) {
    const fileElement = document.createElement('div');
    fileElement.className = 'uploaded-file';
    fileElement.innerHTML = `
        <strong>✅ ${fileData.name}</strong>
        <div class="file-link">
            <input type="text" value="https://drive.google.com/file/d/${fileData.id}/view" readonly>
            <button class="copy-btn" onclick="copyToClipboard(this)">Copy Link</button>
        </div>
    `;
    uploadedFiles.appendChild(fileElement);
    debugLog(`Displaying uploaded file: ${fileData.name}`);
}

function copyToClipboard(button) {
    const input = button.previousElementSibling;
    input.select();
    document.execCommand('copy');
    debugLog('Link copied to clipboard');
    
    // Visual feedback
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.style.background = '#34a853';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#4285f4';
    }, 2000);
}

// Event Listeners
signInButton.addEventListener('click', handleAuthClick);
signOutButton.addEventListener('click', handleSignoutClick);

// Drag and Drop
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.style.background = '#e8f0fe';
    uploadBox.style.borderColor = '#34a853';
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.style.background = '#f8f9ff';
    uploadBox.style.borderColor = '#4285f4';
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.style.background = '#f8f9ff';
    uploadBox.style.borderColor = '#4285f4';
    
    const files = Array.from(e.dataTransfer.files);
    debugLog(`Files dropped: ${files.length}`);
    
    files.forEach(file => {
        if (file.size <= 10 * 1024 * 1024) {
            if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
                selectedFiles.push(file);
            }
        }
    });
    
    updateFileList();
    updateUploadButton();
});

// Initialize on load
window.addEventListener('load', function() {
    debugLog('Page loaded, initializing...');
    gapiLoaded();
});

// Make functions global for HTML onclick
window.removeFile = removeFile;
window.copyToClipboard = copyToClipboard;
