(async function () {
    const nameEl = document.getElementById('dashStoreName');
    const addressEl = document.getElementById('dashStoreAddress');
    if (!nameEl) return;

    try {
        const result = await apiFetch('/auth/profile');
        if (!result.success) return;

        nameEl.textContent = result.profile.store_name || 'My Store';

        addressEl.textContent = result.profile.store_address || '';
        addressEl.hidden = !result.profile.store_address;
    } catch (err) {
        nameEl.textContent = 'My Store';
    }
})();