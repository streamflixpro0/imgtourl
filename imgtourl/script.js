// YAHAN APNA CLIENT ID PASTE KARO
const CLIENT_ID = '583856842529-fqskfnfp60fp4fs3nefeie28ehu6b8pm.apps.googleusercontent.com';

let accessToken = '';
let selectedFiles = [];

function handleGoogleSignIn(response) {
    console.log('Sign in successful:', response);
    accessToken = response.credential;
    
    const userData = parseJwt(accessToken);
    document.getElementById('userInfo').innerHTML = `
        <div style="text-align: center;">
            <img src="${userData.picture}" width="40" style="border-radius: 50%;">
            <p>Welcome, <strong>${userData.name}</strong></p>
        </div>
    `;
    
    document.querySelector('.g_id_signin').style.display = 'none';
    document.getElementById('signOutButton').style.display = 'inline-block';
    document.getElementById('uploadSection').style.display = 'block';
    
    alert('Google Sign-In Successful!');
}

function handleSignOut() {
    accessToken = '';
    selectedFiles = [];
    document.getElementById('userInfo').innerHTML = '';
    document.querySelector('.g_id_signin').style.display = 'block';
    document.getElementById('signOutButton').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    alert('Signed out successfully!');
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// File upload handlers
document.getElementById('uploadBox').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File size should be less than 5MB');
            return;
        }
        selectedFiles = [file];
        document.getElementById('fileList').innerHTML = `
            <div style="text-align: center; margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                📄 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
        `;
        document.getElementById('uploadButton').disabled = false;
    }
});

document.getElementById('uploadButton').addEventListener('click', async function() {
    if (!selectedFiles.length || !accessToken) return;
    
    const file = selectedFiles[0];
    const button = this;
    button.disabled = true;
    button.textContent = 'Uploading...';
    
    try {
        const metadata = {
            name: file.name,
            mimeType: file.type,
            parents: ['root']
        };

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + accessToken
            },
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        
        document.getElementById('uploadedFiles').innerHTML = `
            <div class="uploaded-file">
                <strong>✅ ${data.name}</strong>
                <p>File ID: ${data.id}</p>
                <p>View: <a href="https://drive.google.com/file/d/${data.id}/view" target="_blank">https://drive.google.com/file/d/${data.id}/view</a></p>
            </div>
        `;
        
        document.getElementById('resultsSection').style.display = 'block';
        alert('File uploaded successfully!');
        
    } catch (error) {
        console.error('Error:', error);
        alert('Upload failed: ' + error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Upload to Google Drive';
        selectedFiles = [];
        document.getElementById('fileList').innerHTML = '';
    }
});