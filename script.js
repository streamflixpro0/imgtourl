// Google API Configuration
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
const API_KEY = 'YOUR_GOOGLE_API_KEY';
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

let selectedFiles = [];

// Initialize Google APIs
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        signInButton.style.visibility = 'visible';
    }
}

// Authentication
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw resp;
        }
        await listFiles();
        updateUI();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        selectedFiles = [];
        updateUI();
    }
}

async function listFiles() {
    let response;
    try {
        response = await gapi.client.drive.files.list({
            pageSize: 10,
            fields: 'files(id, name)',
        });
    } catch (err) {
        console.error('Error listing files:', err);
        return;
    }
    const files = response.result.files;
}

function updateUI() {
    const isSignedIn = gapi.client.getToken() !== null;
    
    if (isSignedIn) {
        const user = gapi.client.getToken();
        userInfo.innerHTML = `Signed in as: ${user.scope || 'User'}`;
        signInButton.style.display = 'none';
        signOutButton.style.display = 'inline-block';
        uploadSection.style.display = 'block';
        authSection.style.display = 'block';
    } else {
        userInfo.innerHTML = '';
        signInButton.style.display = 'block';
        signOutButton.style.display = 'none';
        uploadSection.style.display = 'none';
        resultsSection.style.display = 'none';
    }
}

// File Handling
uploadBox.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            alert(`File ${file.name} is too large. Maximum size is 10MB.`);
            return;
        }
        
        if (!selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
            selectedFiles.push(file);
        }
    });
    
    updateFileList();
    updateUploadButton();
}

function updateFileList() {
    fileList.innerHTML = '';
    
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
}

// Upload to Google Drive
uploadButton.addEventListener('click', uploadFiles);

async function uploadFiles() {
    if (selectedFiles.length === 0) return;
    
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
}

async function uploadSingleFile(file) {
    const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: ['root'] // Upload to root folder
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

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        // Make file publicly accessible
        await makeFilePublic(data.id);
        
        // Display result
        displayUploadedFile(data);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert(`Error uploading ${file.name}: ${error.message}`);
    }
}

async function makeFilePublic(fileId) {
    const permission = {
        type: 'anyone',
        role: 'reader'
    };

    await gapi.client.drive.permissions.create({
        fileId: fileId,
        resource: permission,
        fields: 'id'
    });
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
}

function copyToClipboard(button) {
    const input = button.previousElementSibling;
    input.select();
    document.execCommand('copy');
    
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

// Initialize
window.gapiLoaded = gapiLoaded;
window.gisLoaded = gisLoaded;
