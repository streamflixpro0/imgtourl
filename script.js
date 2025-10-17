const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const previewArea = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const urlInput = document.getElementById('urlInput');
const loading = document.getElementById('loading');

// Upload box click handler
uploadBox.addEventListener('click', () => {
    fileInput.click();
});

// File input change handler
fileInput.addEventListener('change', handleFileUpload);

// Drag and drop functionality
uploadBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadBox.style.background = '#eef1ff';
    uploadBox.style.borderColor = '#764ba2';
});

uploadBox.addEventListener('dragleave', () => {
    uploadBox.style.background = '#f8f9ff';
    uploadBox.style.borderColor = '#667eea';
});

uploadBox.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadBox.style.background = '#f8f9ff';
    uploadBox.style.borderColor = '#667eea';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        handleFileSelect(file);
    }
}

function handleFileSelect(file) {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file!');
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
        previewArea.style.display = 'block';
        
        // Upload to ImgBB (free image hosting)
        uploadToImgBB(file);
    };
    reader.readAsDataURL(file);
}

async function uploadToImgBB(file) {
    loading.style.display = 'block';
    
    const formData = new FormData();
    formData.append('image', file);

    try {
        // Using ImgBB API (you need to get free API key from imgbb.com)
        const response = await fetch('https://api.imgbb.com/1/upload?key=YOUR_API_KEY_HERE', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.success) {
            urlInput.value = data.data.url;
            showNotification('Image uploaded successfully!', 'success');
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        // Fallback: Create object URL
        const objectURL = URL.createObjectURL(file);
        urlInput.value = objectURL;
        showNotification('Using temporary URL (expires when page closes)', 'warning');
    } finally {
        loading.style.display = 'none';
    }
}

function copyURL() {
    urlInput.select();
    document.execCommand('copy');
    showNotification('URL copied to clipboard!', 'success');
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : '#FF9800'};
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Add CSS for animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
`;
document.head.appendChild(style);
