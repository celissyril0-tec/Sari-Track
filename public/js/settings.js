(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function say(id, text, ok) {
    var el = $(id);
    el.textContent = text;
    el.style.color = ok ? '#1e8e5a' : '#c0392b';
  }

  async function loadProfile() {
    var result = await apiFetch('/auth/profile');
    if (!result.success) return;

    var p = result.profile;
    $('sellerName').value = p.seller_name || '';
    $('email').value = p.email || '';
    $('email').readOnly = true;
    $('storeName').value = p.store_name || '';
    $('address').value = p.store_address || '';
    $('lowStock').value = p.default_low_stock ?? 5;
    $('dueDays').value = p.default_due_days ?? 7;
    $('notifLowStock').checked = p.notify_low_stock !== false;
    $('notifOverdue').checked = p.notify_overdue !== false;
  }

  $('settingsForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    say('saveMsg', '');

    var lowStock = Number($('lowStock').value);
    var dueDays = Number($('dueDays').value);

    if (!Number.isInteger(lowStock) || lowStock < 0) {
      say('saveMsg', 'Default low stock alert must be a whole number of 0 or more.');
      return;
    }
    if (!Number.isInteger(dueDays) || dueDays < 1) {
      say('saveMsg', 'Default due period must be a whole number of 1 or more.');
      return;
    }

    var body = {
      seller_name: $('sellerName').value.trim(),
      store_name: $('storeName').value.trim(),
      store_address: $('address').value.trim(),
      default_low_stock: lowStock,
      default_due_days: dueDays,
      notify_low_stock: $('notifLowStock').checked,
      notify_overdue: $('notifOverdue').checked
    };

    try {
      var result = await apiFetch('/auth/profile', { method: 'PATCH', body: body });

      if (!result.success) {
        say('saveMsg', result.message || 'Could not save your settings.');
        return;
      }

      say('saveMsg', 'Saved!', true);
    } catch (err) {
      say('saveMsg', 'Could not reach the server. Please try again.');
    }
  });

  $('passwordForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    say('passMsg', '');

    var oldPass = $('oldPass').value;
    var newPass = $('newPass').value;

    if (newPass.length < 8) {
      say('passMsg', 'New password must be at least 8 characters.');
      return;
    }

    try {
      var result = await apiFetch('/auth/change-password', {
        method: 'POST',
        body: { current_password: oldPass, new_password: newPass }
      });

      if (!result.success) {
        say('passMsg', result.message || 'Could not update your password.');
        return;
      }

      say('passMsg', 'Password updated.', true);
      $('passwordForm').reset();
    } catch (err) {
      say('passMsg', 'Could not reach the server. Please try again.');
    }
  });

  loadProfile();
})();