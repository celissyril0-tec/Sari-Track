function getToken() {
    return localStorage.getItem('access_token');
}

function saveSession(data) {
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
}

function clearSession() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
}

function requireLogin() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

function logout() {
    clearSession();
    window.location.href = 'login.html';
}

async function refreshToken() {
    const refresh_token = localStorage.getItem('refresh_token');
    if (!refresh_token) return false;
    
    try {
        const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token })
        });
        if (!res.ok) return false;

        saveSession(await res.json());
        return true;
    } catch (err) {
        return false;
    }
}

async function apiFetch(path, options = {}) {
    const send = () =>
        fetch('/api' + path, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + getToken()
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });
    
    let res = await send();

    if (res.status === 401) {
        const refreshed = await refreshToken();
        if (!refreshed) {
            logout();
            throw new Error('Please log in again.');
        }
        res = await send();
    }

    return res.json();
}

async function requireStore() {
    document.body.style.visibility = 'hidden';

    try {
        const result = await apiFetch('/auth/profile');

        if (!result.success || !result.profile.store_name) {
            window.location.href = 'index.html';
            return;
        }

    } catch (err) {

    }

    document.body.style.visibility = 'visible';
}

async function redirectIfHasStore() {
    try {
        var result = await apiFetch('/auth/profile');
        if (result.success && result.profile.store_name) {
            window.location.href = 'dashboard.html';
        }
    } catch (err) {
        
    }
}