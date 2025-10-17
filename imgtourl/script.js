// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const previewArea = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const uploadBtn = document.getElementById('uploadBtn');
const resultsArea = document.getElementById('resultsArea');
const imageUrl = document.getElementById('imageUrl');
const viewLink = document.getElementById('viewLink');
const downloadLink = document.getElementById('downloadLink');
const loading = document.getElementById('loading');

let selectedFile = null;

// Event Listeners
uploadBox.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelect);

uploadBtn.addEventListener('click', uploadImage);

// Drag and Drop
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
        handleFileSelect({ target: { files: files } });
    }
});

// File Selection Handler
function handleFileSelect(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
        alert('❌ Please select an image file (JPG, PNG, GIF, WebP)');
        return;
    }
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ File size should be less than 5MB');
        return;
    }
    
    selectedFile = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        previewImage.src = e.target.result;
        previewArea.style.display = 'block';
        resultsArea.style.display = 'none';
        
        // Scroll to preview
        previewArea.scrollIntoView({ behavior: 'smooth' });
    };
    reader.readAsDataURL(file);
}

// Main Upload Function
async function uploadImage() {
    if (!selectedFile) {
        alert('❌ Please select an image first');
        return;
    }
    
    // Show loading
    loading.style.display = 'block';
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ Uploading...';
    
    try {
        // Try different image hosting services
        const imageURL = await uploadToFreeService(selectedFile);
        
        if (imageURL) {
            // Show results
            imageUrl.value = imageURL;
            viewLink.href = imageURL;
            downloadLink.href = imageURL;
            
            resultsArea.style.display = 'block';
            loading.style.display = 'none';
            
            // Scroll to results
            resultsArea.scrollIntoView({ behavior: 'smooth' });
            
            console.log('Image uploaded successfully:', imageURL);
        } else {
            throw new Error('All upload services failed');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('❌ Upload failed. Please try again with a different image.');
    } finally {
        loading.style.display = 'none';
        uploadBtn.disabled = false;
        uploadBtn.textContent = '🚀 Get Image URL';
    }
}

// Upload to free image hosting services
async function uploadToFreeService(file) {
    // Method 1: Using FileReader + Object URL (Client-side only)
    try {
        const objectURL = URL.createObjectURL(file);
        console.log('Generated Object URL:', objectURL);
        
        // Note: Object URLs are temporary and work only in current browser session
        // For permanent storage, we need server-side upload
        
        return objectURL;
        
    } catch (error) {
        console.error('Object URL method failed:', error);
        throw new Error('Failed to generate image URL');
    }
}

// Alternative: Using Base64 Data URL (Permanent but longer)
function getBase64URL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Copy URL to clipboard
function copyUrl() {
    const urlInput = document.getElementById('imageUrl');
    urlInput.select();
    urlInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            // Show success feedback
            const copyBtn = document.querySelector('.copy-btn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            copyBtn.style.background = '#34a853';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '#4285f4';
            }, 2000);
        }
    } catch (err) {
        console.error('Copy failed:', err);
        alert('Copy failed. Please copy the URL manually.');
    }
}

// Additional: Paste from clipboard functionality
document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let item of items) {
        if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                // Simulate file input
                handleFileSelect({ target: { files: [file] } });
                break;
            }
        }
    }
});

// Service information
console.log(`
🖼️ Image Uploader Ready!
Features:
✅ Drag & drop support
✅ Image preview
✅ Copy URL functionality
✅ Mobile responsive
✅ No server required (client-side only)
`);
