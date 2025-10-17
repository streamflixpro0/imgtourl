// Configuration - YAHAN APNA CLIENT ID DAALO
const CLIENT_ID = '583856842529-fqskfnfp60fp4fs3nefeie28ehu6b8pm.apps.googleusercontent.com';

// Global variables
let accessToken = '';
let currentFile = null;

// DOM Elements
const statusEl = document.getElementById('status');
const userInfoEl = document.getElementById('userInfo');
const uploadSectionEl = document.getElementById('uploadSection');
const signOutBtn = document.getElementById('signOutBtn');
const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const fileInfoEl = document.getElementById('fileInfo');
const uploadBtn = document.getElementById('uploadBtn');
const resultsEl = document.getElementById('results');

// Show status message
function showStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
}

// Google Sign-In Handler
function handleGoogleSignIn(response) {
    console.log('Google Sign-In Response:', response);
    
    if (response.credential) {
        accessToken = response.credential;
        
        // Decode user info from JWT token
        const userData = decodeJWT(accessToken);
        
        // Show user info
        userInfoEl.innerHTML = `
            <img src="${userData.picture}" alt="Profile">
            <h3>Welcome, ${userData.name}!</h3>
            <p>${userData.email}</p>
        `;
        
        // Update UI
        document.querySelector('.g_id_signin').style.display = 'none';
        signOutBtn.style.display = 'inline-block';
        uploadSectionEl.style.display = 'block';
        
        showStatus('✅ Google Sign-In Successful! You can now upload files.', 'success');
        
        console.log('Access Token:', accessToken);
    }
}

// Decode JWT token
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return { name: 'User', email: 'unknown', picture: '' };
    }
}

// Sign Out Handler
function handleSignOut() {
    accessToken = '';
    currentFile = null;
    
    // Reset UI
    userInfoEl.innerHTML = '';
    document.querySelector('.g_id_signin').style.display = 'block';
    signOutBtn.style.display = 'none';
    uploadSectionEl.style.display = 'none';
    fileInfoEl.innerHTML = '';
    resultsEl.innerHTML = '';
    
    showStatus('Signed out successfully!', 'info');
}

// File Upload Handlers
uploadBox.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (file) {
        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            showStatus('❌ File size should be less than 5MB', 'error');
            return;
        }
        
        currentFile = file;
        
        // Show file info
        fileInfoEl.innerHTML = `
            <strong>📄 Selected File:</strong> ${file.name}<br>
            <small>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB | Type: ${file.type || 'Unknown'}</small>
        `;
        
        uploadBtn.disabled = false;
        showStatus('✅ File selected. Click "Upload to Google Drive" to proceed.', 'success');
    }
});

// Upload to Google Drive
uploadBtn.addEventListener('click', async function() {
    if (!currentFile || !accessToken) {
        showStatus('❌ Please select a file and sign in with Google', 'error');
        return;
    }
    
    const button = this;
    const originalText = button.innerHTML;
    
    // Disable button and show loading
    button.disabled = true;
    button.innerHTML = '⏳ Uploading...';
    showStatus('Uploading file to Google Drive...', 'info');
    
    try {
        // Upload file to Google Drive
        const result = await uploadToDrive(currentFile);
        
        if (result) {
            showStatus('✅ File uploaded successfully to Google Drive!', 'success');
            showResult(result);
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showStatus(`❌ Upload failed: ${error.message}`, 'error');
    } finally {
        // Reset button
        button.disabled = false;
        button.innerHTML = originalText;
        currentFile = null;
        fileInfoEl.innerHTML = '';
    }
});

// Main upload function
async function uploadToDrive(file) {
    console.log('Starting upload for file:', file.name);
    
    // Create file metadata
    const metadata = {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        parents: ['root'] // Upload to root folder
    };

    // Create FormData
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { 
        type: 'application/json' 
    }));
    formData.append('file', file);

    // Upload to Google Drive
    const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', 
        {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken
            },
            body: formData
        }
    );

    console.log('Upload response status:', response.status);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        let errorMessage = 'Upload failed: ';
        
        if (response.status === 401) {
            errorMessage += 'Authentication failed. Please sign in again.';
        } else if (response.status === 403) {
            errorMessage += 'Permission denied. Check Google Drive API settings.';
        } else {
            errorMessage += `HTTP ${response.status}`;
        }
        
        throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('Upload successful:', result);
    
    return result;
}

// Show upload result
function showResult(fileData) {
    resultsEl.innerHTML = `
        <div class="uploaded-file">
            <h3>✅ Upload Successful!</h3>
            <p><strong>File:</strong> ${fileData.name}</p>
            <p><strong>File ID:</strong> ${fileData.id}</p>
            
            <div class="file-link">
                <input type="text" 
                       value="https://drive.google.com/file/d/${fileData.id}/view" 
                       readonly 
                       id="fileLink">
                <button class="copy-btn" onclick="copyToClipboard()">📋 Copy Link</button>
            </div>
            
            <p style="margin-top: 10px;">
                <a href="https://drive.google.com/file/d/${fileData.id}/view" 
                   target="_blank" 
                   style="color: #4285f4; text-decoration: none;">
                   👀 Open in Google Drive
                </a>
            </p>
        </div>
    `;
}

// Copy to clipboard
function copyToClipboard() {
    const fileLink = document.getElementById('fileLink');
    fileLink.select();
    document.execCommand('copy');
    
    const copyBtn = document.querySelector('.copy-btn');
    copyBtn.textContent = '✅ Copied!';
    copyBtn.style.background = '#34a853';
    
    setTimeout(() => {
        copyBtn.textContent = '📋 Copy Link';
        copyBtn.style.background = '#4285f4';
    }, 2000);
}

// Event listeners
signOutBtn.addEventListener('click', handleSignOut);

// Initialize
showStatus('🔧 Please sign in with Google to start uploading files.', 'info');
