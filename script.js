// Google API Configuration
const CLIENT_ID = '306306213575-5rmoacua8fvj0okv7l1c8p0qmmau9863.apps.googleusercontent.com'; // Google Cloud Console se leko
const API_KEY = 'AIzaSyCA4kIfqX0pOgJ3jjYM-lE0Ynmiub80VWU'; // Google Cloud Console se leko

let accessToken = '';
let selectedFiles = [];

// DOM Elements
const authSection = document.getElementById('authSection');
const uploadSection = document.getElementById('uploadSection');
const resultsSection = document.getElementById('resultsSection');
const userInfo = document.getElementById('userInfo');
const signOutButton = document.getElementById('signOutButton');
const uploadBox = document.getElementById('uploadBox');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const uploadButton = document.getElementById('uploadButton');
const uploadedFiles = document.getElementById('uploadedFiles');
const loading = document.getElementById('loading');

// Google Sign-In Handler
function handleGoogleSignIn(response) {
    console.log('Google Sign-In Response:', response);
    
    accessToken = response.credential;
    
    // User info show karo
    const userObject = parseJwt(accessToken);
    userInfo.innerHTML = `
        <div style="text-align: center;">
            <img src="${userObject.picture}" alt="Profile" style="width: 50px; height: 50px; border-radius: 50%;">
            <p>Welcome, <strong>${userObject.name}</strong>!</p>
            <p style="font-size: 12px; color: #666;">${userObject.email}</p>
        </div>
    `;
    
    // Hide Google sign-in button, show sign-out
    document.querySelector('.g_id_signin').style.display = 'none';
    signOutButton.style.display = 'block';
    
    // Show upload section
    uploadSection.style.display = 'block';
    
    alert('✅ Google Sign-In Successful! Ab aap files upload kar sakte hain.');
}

// JWT token decode karne ke liye
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing JWT:', e);
        return {};
    }
}

// Sign Out Handler
function handleSignOut() {
    accessToken = '';
    selectedFiles = [];
    
    // Reset UI
    userInfo.innerHTML = '';
    document.querySelector('.g_id_signin').style.display = 'block';
    signOutButton.style.display = 'none';
    uploadSection.style.display = 'none';
    resultsSection.style.display = 'none';
    fileList.innerHTML = '';
    
    // Google Sign-Out
    google.accounts.id.disableAutoSelect();
    alert('Signed out successfully!');
}

// File Handling
uploadBox.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            alert(`❌ File "${file.name}" is too large. Maximum size is 10MB.`);
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
            <div class="file-name">📄 ${file.name}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
            <button class="remove-file" onclick="removeFile(${index})">🗑️</button>
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
uploadButton.addEventListener('click', uploadFilesToDrive);

async function uploadFilesToDrive() {
    if (selectedFiles.length === 0) return;
    
    if (!accessToken) {
        alert('❌ Please sign in with Google first!');
        return;
    }
    
    loading.style.display = 'block';
    uploadButton.disabled = true;
    
    try {
        for (const file of selectedFiles) {
            await uploadSingleFile(file);
        }
        
        alert('✅ All files uploaded successfully!');
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Upload failed: ' + error.message);
    } finally {
        loading.style.display = 'none';
        uploadButton.disabled = false;
        selectedFiles = [];
        updateFileList();
        updateUploadButton();
    }
}

async function uploadSingleFile(file) {
    console.log('Uploading file:', file.name);
    
    const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: ['root'] // Root folder mein upload hoga
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken
            },
            body: form
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('File uploaded:', data);
        
        // File publicly accessible banao
        await makeFilePublic(data.id);
        
        // Result show karo
        displayUploadedFile(data);
        
        return data;
        
    } catch (error) {
        console.error('Upload error for file:', file.name, error);
        throw error;
    }
}

async function makeFilePublic(fileId) {
    try {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'anyone',
                role: 'reader'
            })
        });

        if (!response.ok) {
            console.warn('Failed to make file public, but upload was successful');
        }
    } catch (error) {
        console.warn('Error making file public:', error);
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
    resultsSection.style.display = 'block';
}

function copyToClipboard(button) {
    const input = button.previousElementSibling;
    input.select();
    document.execCommand('copy');
    
    // Visual feedback
    const originalText = button.textContent;
    button.textContent = 'Copied! ✅';
    button.style.background = '#34a853';
    
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#4285f4';
    }, 2000);
}

// Drag and Drop Support
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
        } else {
            alert(`❌ File "${file.name}" is too large. Maximum size is 10MB.`);
        }
    });
    
    updateFileList();
    updateUploadButton();
});

// Global functions for HTML
window.removeFile = removeFile;
window.copyToClipboard = copyToClipboard;
window.handleGoogleSignIn = handleGoogleSignIn;
window.handleSignOut = handleSignOut;
