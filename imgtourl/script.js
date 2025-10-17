// YAHAN APNA CLIENT ID PASTE KARO
const CLIENT_ID = '583856842529-fqskfnfp60fp4fs3nefeie28ehu6b8pm.apps.googleusercontent.com';

let accessToken = '';
let selectedFiles = [];

// Google Sign-In Handler
function handleGoogleSignIn(response) {
    console.log('Google Sign-In Response:', response);
    
    if (response.credential) {
        accessToken = response.credential;
        
        // User info show karo
        const userData = parseJwt(accessToken);
        document.getElementById('userInfo').innerHTML = `
            <div style="text-align: center;">
                <img src="${userData.picture}" width="50" style="border-radius: 50%; border: 2px solid #4285f4;">
                <p>Welcome, <strong>${userData.name}</strong></p>
                <small>${userData.email}</small>
            </div>
        `;
        
        // UI update karo
        document.querySelector('.g_id_signin').style.display = 'none';
        document.getElementById('signOutButton').style.display = 'inline-block';
        document.getElementById('uploadSection').style.display = 'block';
        
        showMessage('✅ Google Sign-In Successful! Ab aap files upload kar sakte hain.', 'success');
    }
}

// Sign Out Handler
function handleSignOut() {
    accessToken = '';
    selectedFiles = [];
    
    // UI reset karo
    document.getElementById('userInfo').innerHTML = '';
    document.querySelector('.g_id_signin').style.display = 'block';
    document.getElementById('signOutButton').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('fileList').innerHTML = '';
    
    showMessage('🔓 Signed out successfully!', 'info');
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
        return { name: 'User', email: 'unknown', picture: '' };
    }
}

// Message show karne ke liye
function showMessage(message, type) {
    // Temporary alert use karte hain
    alert(message);
}

// File Upload Handlers
document.getElementById('uploadBox').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    selectedFiles = [];
    
    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            alert(`❌ "${file.name}" file bahut badi hai. Maximum size 5MB hai.`);
            return;
        }
        selectedFiles.push(file);
    });
    
    updateFileList();
    updateUploadButton();
});

function updateFileList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        fileList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">Koi file selected nahi hai</div>';
        return;
    }
    
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.style.cssText = `
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 10px; 
            margin: 5px 0; 
            background: #f8f9fa; 
            border-radius: 5px;
            border: 1px solid #e9ecef;
        `;
        fileItem.innerHTML = `
            <div>
                <strong>📄 ${file.name}</strong>
                <div style="font-size: 12px; color: #666;">${formatFileSize(file.size)}</div>
            </div>
            <button onclick="removeFile(${index})" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">🗑️</button>
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
    const uploadButton = document.getElementById('uploadButton');
    uploadButton.disabled = selectedFiles.length === 0;
    
    if (selectedFiles.length > 0) {
        uploadButton.innerHTML = `📤 Upload ${selectedFiles.length} File(s) to Drive`;
    } else {
        uploadButton.innerHTML = `📤 Upload to Google Drive`;
    }
}

// MAIN UPLOAD FUNCTION - YAHAN FIX KIYA HAI
document.getElementById('uploadButton').addEventListener('click', async function() {
    if (selectedFiles.length === 0 || !accessToken) {
        alert('❌ Pehle Google sign in karo aur file select karo!');
        return;
    }
    
    const button = this;
    const originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '⏳ Uploading...';
    
    try {
        let successCount = 0;
        
        for (const file of selectedFiles) {
            const result = await uploadFileToDrive(file);
            if (result) successCount++;
        }
        
        if (successCount > 0) {
            showMessage(`✅ ${successCount} file(s) successfully uploaded to Google Drive!`, 'success');
            document.getElementById('resultsSection').style.display = 'block';
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showMessage(`❌ Upload failed: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
        selectedFiles = [];
        updateFileList();
        updateUploadButton();
    }
});

// ACTUAL FILE UPLOAD FUNCTION
async function uploadFileToDrive(file) {
    console.log('Uploading file:', file.name, 'Size:', file.size);
    
    try {
        // Step 1: Pehle file metadata create karo
        const metadata = {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            parents: ['root'] // Root folder mein upload hoga
        };

        // Step 2: FormData prepare karo
        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { 
            type: 'application/json' 
        }));
        formData.append('file', file);

        // Step 3: Google Drive API call karo
        const response = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', 
            {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + accessToken
                    // Content-Type automatically set hoti hai FormData ke saath
                },
                body: formData
            }
        );

        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            
            let errorMessage = `HTTP ${response.status}: `;
            
            try {
                const errorData = JSON.parse(errorText);
                errorMessage += errorData.error?.message || errorText;
            } catch {
                errorMessage += errorText;
            }
            
            throw new Error(errorMessage);
        }

        // Step 4: Response handle karo
        const result = await response.json();
        console.log('Upload successful:', result);
        
        // Step 5: File publicly accessible banao (optional)
        try {
            await makeFilePublic(result.id);
        } catch (publicError) {
            console.warn('File public nahi kar paye, lekin upload successful:', publicError);
        }
        
        // Step 6: Result show karo
        displayUploadResult(result);
        
        return result;
        
    } catch (error) {
        console.error('Upload failed for file:', file.name, error);
        
        // Specific error messages
        if (error.message.includes('403')) {
            throw new Error('Permission denied. Google Drive API enable hai?');
        } else if (error.message.includes('401')) {
            throw new Error('Authentication failed. Phir se sign in karo.');
        } else if (error.message.includes('400')) {
            throw new Error('Invalid request. File format supported nahi hai.');
        } else {
            throw new Error(`Upload failed: ${error.message}`);
        }
    }
}

// File publicly accessible banane ke liye
async function makeFilePublic(fileId) {
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
        {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'anyone',
                role: 'reader'
            })
        }
    );
    
    if (!response.ok) {
        throw new Error('File public nahi kar paye');
    }
    
    return await response.json();
}

// Upload result show karne ke liye
function displayUploadResult(fileData) {
    const uploadedFiles = document.getElementById('uploadedFiles');
    
    const fileElement = document.createElement('div');
    fileElement.style.cssText = `
        background: #e8f5e8;
        border: 1px solid #34a853;
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
    `;
    
    fileElement.innerHTML = `
        <div style="margin-bottom: 10px;">
            <strong>✅ ${fileData.name}</strong>
            <div style="font-size: 12px; color: #666;">File ID: ${fileData.id}</div>
        </div>
        
        <div style="display: flex; gap: 10px; align-items: center;">
            <input type="text" 
                   value="https://drive.google.com/file/d/${fileData.id}/view" 
                   readonly 
                   style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
            <button onclick="copyLink(this)" 
                    style="background: #4285f4; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                📋 Copy
            </button>
        </div>
        
        <div style="margin-top: 10px;">
            <a href="https://drive.google.com/file/d/${fileData.id}/view" 
               target="_blank" 
               style="color: #4285f4; text-decoration: none; font-size: 14px;">
               👀 View in Google Drive
            </a>
        </div>
    `;
    
    uploadedFiles.appendChild(fileElement);
}

// Link copy karne ke liye
function copyLink(button) {
    const input = button.parentElement.querySelector('input');
    input.select();
    document.execCommand('copy');
    
    // Visual feedback
    button.innerHTML = '✅ Copied!';
    button.style.background = '#34a853';
    
    setTimeout(() => {
        button.innerHTML = '📋 Copy';
        button.style.background = '#4285f4';
    }, 2000);
}

// Debug info
console.log('Script loaded successfully');
