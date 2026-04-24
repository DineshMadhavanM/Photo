// API Base URL (handle relative paths for production)
const API_BASE = ''; 

async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'API Error');
        }
        return await response.json();
    } catch (err) {
        console.error('Fetch Error:', err);
        alert(err.message);
        return null;
    }
}

// Authentication Logic
let isSignup = false;

function showAuth(mode) {
    isSignup = mode === 'signup';
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const nameGroup = document.getElementById('nameGroup');
    const toggleText = document.getElementById('authToggleText');
    const toggleLink = document.getElementById('authToggleLink');

    title.innerText = isSignup ? 'Create Account' : 'Welcome Back';
    nameGroup.style.display = isSignup ? 'block' : 'none';
    toggleText.innerText = isSignup ? 'Already have an account?' : "Don't have an account?";
    toggleLink.innerText = isSignup ? 'Login' : 'Sign Up';
    
    modal.classList.add('active');
}

function toggleAuthMode() {
    showAuth(isSignup ? 'login' : 'signup');
}

if (document.getElementById('authForm')) {
    document.getElementById('authForm').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const name = document.getElementById('name')?.value;

        const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
        const body = isSignup ? { name, email, password } : { email, password };

        const res = await fetchAPI(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        if (res) {
            window.location.href = '/dashboard';
        }
    };
}

async function checkSession() {
    return await fetchAPI('/api/auth/me');
}

async function logout() {
    await fetchAPI('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
}

// Dashboard Logic
async function loadEvents() {
    const events = await fetchAPI('/api/events');
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;

    grid.innerHTML = '';
    events.forEach(event => {
        const div = document.createElement('div');
        div.className = 'md-card';
        div.innerHTML = `
            <h3>${event.eventName}</h3>
            <p style="color: var(--text-dim); font-size: 0.8rem; margin: 1rem 0;">ID: ${event.eventId}</p>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="window.location.hash = 'upload/${event.eventId}'" style="padding: 0.5rem 1rem; font-size: 0.7rem;">Upload</button>
                <button class="btn btn-primary" onclick="window.open('/event/${event.eventId}', '_blank')" style="padding: 0.5rem 1rem; font-size: 0.7rem; background: var(--glass);">View Client Link</button>
                <button class="btn btn-primary" onclick="copyLink('${event.eventId}')" style="padding: 0.5rem 1rem; font-size: 0.7rem; background: var(--glass);"><i class="fas fa-copy"></i></button>
                <button class="btn btn-primary" onclick="deleteEvent('${event.eventId}')" style="padding: 0.5rem 1rem; font-size: 0.7rem; background: rgba(255, 71, 87, 0.2); color: #ff4757;"><i class="fas fa-trash"></i></button>
            </div>
        `;
        grid.appendChild(div);
    });
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event and all its photos? This cannot be undone.')) return;
    
    const res = await fetchAPI(`/api/events/${eventId}`, {
        method: 'DELETE'
    });

    if (res) {
        alert('Event deleted successfully');
        loadEvents();
    }
}

function copyLink(eventId) {
    const link = `${window.location.origin}/event/${eventId}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
}

if (document.getElementById('createEventForm')) {
    document.getElementById('createEventForm').onsubmit = async (e) => {
        e.preventDefault();
        const eventName = document.getElementById('eventName').value;
        const res = await fetchAPI('/api/events', {
            method: 'POST',
            body: JSON.stringify({ eventName })
        });
        if (res) {
            window.location.hash = '';
            loadEvents();
        }
    };
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1600;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', 0.8);
            };
        };
    });
}

function accessEvent() {
    const code = document.getElementById('clientEventId').value.trim().toUpperCase();
    if (code) {
        window.location.href = `/event/${code}`;
    } else {
        alert('Please enter a valid event code.');
    }
}

if (document.getElementById('uploadForm')) {
    document.getElementById('uploadForm').onsubmit = async (e) => {
        e.preventDefault();
        const eventId = document.getElementById('uploadEventId').value;
        const files = document.getElementById('photoFiles').files;
        const status = document.getElementById('uploadStatus');
        const btn = document.getElementById('uploadBtn');

        if (files.length === 0) return;

        status.innerText = "Processing & Compressing... 0%";
        status.style.display = 'block';
        btn.disabled = true;

        const formData = new FormData();
        formData.append('eventId', eventId);
        
        try {
            for (let i = 0; i < files.length; i++) {
                status.innerText = `Compressing image ${i + 1} of ${files.length}...`;
                const compressed = await compressImage(files[i]);
                formData.append('photos', compressed);
            }

            status.innerText = "Uploading to Cloudinary... Please wait.";
            const response = await fetch('/api/photos/upload', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                alert('Upload successful!');
                window.location.hash = '';
                loadEvents();
            } else {
                alert('Upload failed.');
            }
        } catch (err) {
            console.error(err);
            alert('Error during upload.');
        } finally {
            status.style.display = 'none';
            btn.disabled = false;
        }
    };
}
