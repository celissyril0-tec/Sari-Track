(function () {
function showMessage(id, text, isError = true) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? '#c0392b' : '#27ae60';
}

async function postPublic(path, body) {
    const res = await fetch('/api' + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}

const loginForm = document.getElementById('loginForm');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('loginMsg', '');

        const button = loginForm.querySelector('button[type="submit"]');
        button.disabled = true;

        try {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            const result = await postPublic('/auth/login', { email, password });

            if (!result.success) {
                showMessage('loginMsg', result.message);
                return;
            }

            saveSession(result);

            const profile = await apiFetch('/auth/profile');
            if (profile.success && profile.profile.store_name) {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        } catch (err) {
            showMessage('loginMsg', 'Cannot reach the server. Please try again.');
        } finally {
            button.disabled = false;
        }
    });
}

const registerForm = document.getElementById('registerForm');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('registerMsg', '');

        const email = document.getElementById('email').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const cpassword = document.getElementById('cpassword').value;

        if (!username) {
            showMessage('registerMsg', 'Please enter a username.');
            return;
        }
        if (password.length < 8) {
            showMessage('registerMsg', 'Password must be at least 8 characters.');
            return;
        }
        if (password !== cpassword) {
            showMessage('registerMsg', 'Passwords do not match.');
            return;
        }

        const button = registerForm.querySelector('button[type="submit"]');
        button.disabled = true;

        try {
            const signup = await postPublic('/auth/signup', {
                email,
                password,
                seller_name: username
            });

            if (!signup.success) {
                showMessage('registerMsg', signup.error || signup.message);
                return;
            }

            const login = await postPublic('/auth/login', { email, password });

            if (!login.success) {
                window.location.href = 'login.html';
                return;
            }

            saveSession(login);
            window.location.href = 'index.html';
        } catch (err) {
            showMessage('registerMsg', 'Cannot reach the server. Please try again.');
        } finally {
            button.disabled = false;
        }
    });
}

const storeForm = document.getElementById('store-form');

if (storeForm) {
    storeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('storeMsg', '');

        const store_name = document.getElementById('store-name').value.trim();
        const store_address = document.getElementById('store-address').value.trim();
        const typeInput = document.querySelector('input[name="storeType"]:checked');

        try {
            const result = await apiFetch('/auth/profile', {
                method: 'PATCH',
                body: {
                    store_name,
                    store_address,
                    store_type: typeInput ? typeInput.value : ''
                }
            });

            if (!result.success) {
                showMessage('storeMsg', result.message);
                return;
            }

            window.location.href = 'dashboard.html';
        } catch (err) {
            showMessage('storeMsg', 'Could not save your store. Please try again.');
        }
    });
}
}) ();