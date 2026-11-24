(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function peso(n) {
    return '₱ ' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function errorText(result) {
    if (result.errors && result.errors.length > 0) return result.errors[0];
    return result.message || 'Something went wrong.';
  }

  function sayUtang(text) {
    var el = $('utangMsg');
    if (el) el.textContent = text;
  }

  function sayPay(text) {
    $('payError').textContent = text;
  }

  function dateInputValue(date) {
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return date.getFullYear() + '-' + m + '-' + d;
  }

  function addDays(date, days) {
    var copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  var products = [];
  var paymentMethods = [];
  var statuses = [];
  var allCustomers = [];
  var owingCustomers = [];
  var utangItems = [];
  var chosenProduct = null;
  var selectedOwing = null;

  function fillSelect(select, list, labelField) {
    select.innerHTML = '';
    list.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.id;
      option.textContent = item[labelField];
      select.appendChild(option);
    });
  }

  function fillDatalist(id, list, field) {
    var dl = $(id);
    dl.innerHTML = '';
    list.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item[field];
      dl.appendChild(option);
    });
  }

  async function loadLookups() {
    var result = await apiFetch('/lookups');
    if (!result.success) return;

    paymentMethods = result.data.payment_methods;
    statuses = result.data.utang_status;

    fillSelect($('payMethod'), paymentMethods, 'method_name');
  }

  async function loadProducts() {
    var result = await apiFetch('/products');
    if (result.success) products = result.data;
  }

  async function loadAllCustomers() {
    var result = await apiFetch('/customers');
    if (result.success) {
      allCustomers = result.data;
      fillDatalist('allCustomers', allCustomers, 'customer_name');
    }
  }

  async function loadOwingCustomers() {
    var result = await apiFetch('/utang/customers');
    if (!result.success) return;

    owingCustomers = result.data;
    fillDatalist('owingCustomers', owingCustomers, 'customer_name');
    renderCustomerList();
  }

  async function loadSummary() {
    var result = await apiFetch('/utang/summary');
    if (!result.success) return;

    var d = result.data;
    document.querySelector('.total-utang h1').textContent = peso(d.total_utang);
    document.querySelector('.total-utang p').textContent =
      d.total_utang > 0 ? 'Across ' + d.customer_count + (d.customer_count === 1 ? ' customer' : ' customers') : 'No unpaid balances';

    document.querySelector('.customers h1').textContent = d.customer_count;
    document.querySelector('.customers p').textContent =
      d.customer_count > 0 ? 'With unpaid balances' : 'No customers with utang';

    document.querySelector('.paid-this-week h1').textContent = peso(d.paid_this_week);
    document.querySelector('.paid-this-week p').textContent =
      d.paid_this_week > 0 ? 'Collected this week' : 'No payments recorded this week';
  }

  async function refreshAll() {
    await Promise.all([loadOwingCustomers(), loadSummary(), loadAllCustomers()]);
  }

  function openModal(id) { $(id).classList.add('show'); }
  function closeModal(id) { $(id).classList.remove('show'); }

  $('addUtangBtn').onclick = function () {
    resetUtangForm();
    openModal('addUtangModal');
  };

  $('paymentBtn').onclick = function () {
    resetPaymentForm();
    openModal('paymentModal');
  };

  document.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.onclick = function () {
      btn.closest('.modal').classList.remove('show');
    };
  });

  ['addUtangModal', 'paymentModal'].forEach(function (id) {
    $(id).onclick = function (event) {
      if (event.target === $(id)) closeModal(id);
    };
  });

  $('customerList').onclick = function (event) {
    var btn = event.target.closest('.utang-pay');
    if (!btn) return;

    resetPaymentForm();
    var customer = owingCustomers.find(function (c) { return String(c.customer_id) === btn.dataset.id; });
    if (customer) chooseOwing(customer);
    openModal('paymentModal');
  };

  $('utangPrice').readOnly = true;

  function resetUtangForm() {
    utangItems = [];
    chosenProduct = null;
    $('addUtangForm').reset();
    $('utangSuggestions').innerHTML = '';
    sayUtang('');
    $('utangDate').value = dateInputValue(addDays(new Date(), 7)); // default due date: a week out
    renderUtangList();
  }

  $('utangItem').oninput = function () {
    chosenProduct = null;
    $('utangPrice').value = '';

    var text = this.value.trim().toLowerCase();
    var list = $('utangSuggestions');
    list.innerHTML = '';
    if (!text) return;

    products
      .filter(function (p) { return p.stock > 0 && p.product_name.toLowerCase().indexOf(text) !== -1; })
      .slice(0, 6)
      .forEach(function (p) {
        var li = document.createElement('li');

        var name = document.createElement('span');
        name.textContent = p.product_name;

        var info = document.createElement('span');
        info.textContent = peso(p.price_per_unit) + ' · ' + p.stock + ' left';

        li.append(name, info);
        li.onclick = function () { chooseProduct(p); };
        list.appendChild(li);
      });
  };

  function chooseProduct(p) {
    chosenProduct = p;
    $('utangItem').value = p.product_name;
    $('utangPrice').value = p.price_per_unit;
    $('utangSuggestions').innerHTML = '';
  }

  var addUtangItemBtn = document.createElement('button');
  addUtangItemBtn.type = 'button';
  addUtangItemBtn.className = 'add-item-btn';
  addUtangItemBtn.textContent = 'Add item';
  $('utangItem').closest('.search-wrap').insertAdjacentElement('afterend', addUtangItemBtn);

  addUtangItemBtn.onclick = function () {
    sayUtang('');

    if (!chosenProduct) {
      sayUtang('Please choose an item from the list.');
      return;
    }

    var qty = Number($('utangQty').value);
    if (!Number.isInteger(qty) || qty < 1) {
      sayUtang('Quantity must be a whole number of 1 or more.');
      return;
    }

    var existing = utangItems.find(function (i) { return i.product.id === chosenProduct.id; });
    var already = existing ? existing.quantity : 0;

    if (already + qty > chosenProduct.stock) {
      sayUtang('Only ' + chosenProduct.stock + ' left in stock for ' + chosenProduct.product_name + '.');
      return;
    }

    if (existing) {
      existing.quantity += qty;
    } else {
      utangItems.push({ product: chosenProduct, quantity: qty });
    }

    chosenProduct = null;
    $('utangItem').value = '';
    $('utangPrice').value = '';
    $('utangQty').value = 1;
    renderUtangList();
  };

  function utangTotal() {
    return utangItems.reduce(function (sum, i) { return sum + i.quantity * i.product.price_per_unit; }, 0);
  }

  function renderUtangList() {
    var list = $('utangList');
    list.innerHTML = '';

    utangItems.forEach(function (item, index) {
      var li = document.createElement('li');

      var left = document.createElement('span');
      left.textContent = item.quantity + ' x ' + item.product.product_name;

      var right = document.createElement('span');
      right.textContent = peso(item.quantity * item.product.price_per_unit) + ' ';

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-item';
      remove.textContent = 'x';
      remove.onclick = function () { utangItems.splice(index, 1); renderUtangList(); };

      right.appendChild(remove);
      li.append(left, right);
      list.appendChild(li);
    });

    $('utangTotal').textContent = peso(utangTotal());
  }

  $('addUtangForm').onsubmit = async function (event) {
    event.preventDefault();
    sayUtang('');

    var name = $('utangName').value.trim();
    if (!name) {
      sayUtang('Please enter the customer name.');
      return;
    }
    if (utangItems.length === 0) {
      sayUtang('Add at least one item.');
      return;
    }

    var unpaidStatus = statuses.find(function (s) {
      return s.requires_customer && s.status_name.toLowerCase().indexOf('partial') === -1;
    });
    var utangMethod = paymentMethods.find(function (m) { return m.method_name.toLowerCase() === 'utang'; })
      || paymentMethods[0];

    if (!unpaidStatus || !utangMethod) {
      sayUtang('Your payment method or status lists are not set up yet.');
      return;
    }

    var body = {
      payment_method: utangMethod.id,
      payment_status: unpaidStatus.id,
      customer_name: name,
      due_date: $('utangDate').value || undefined,
      items: utangItems.map(function (i) { return { product_id: i.product.id, quantity: i.quantity }; })
    };

    var button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      var result = await apiFetch('/sales', { method: 'POST', body: body });

      if (!result.success) {
        sayUtang(errorText(result));
        return;
      }

      closeModal('addUtangModal');
      await loadProducts();
      await refreshAll();
    } catch (err) {
      sayUtang('Could not reach the server. Please try again.');
    } finally {
      button.disabled = false;
    }
  };

  function resetPaymentForm() {
    selectedOwing = null;
    $('paymentForm').reset();
    $('payBalance').value = peso(0);
    $('newBalance').textContent = peso(0);
    sayPay('');
  }

  function chooseOwing(customer) {
    selectedOwing = customer;
    $('payName').value = customer.customer_name;
    $('payBalance').value = peso(customer.balance);
    updateNewBalance();
  }

  $('payName').oninput = function () {
    var typed = this.value.trim().toLowerCase();
    var match = owingCustomers.find(function (c) { return c.customer_name.toLowerCase() === typed; });

    if (match) {
      chooseOwing(match);
    } else {
      selectedOwing = null;
      $('payBalance').value = peso(0);
      updateNewBalance();
    }
  };

  function updateNewBalance() {
    var balance = selectedOwing ? selectedOwing.balance : 0;
    var amount = Number($('payAmount').value) || 0;
    $('newBalance').textContent = peso(Math.max(balance - amount, 0));
  }

  $('payAmount').oninput = updateNewBalance;

  $('paymentForm').onsubmit = async function (event) {
    event.preventDefault();
    sayPay('');

    if (!selectedOwing) {
      sayPay('Please choose a customer who has a balance.');
      return;
    }

    var amount = Number($('payAmount').value);
    if (!(amount > 0)) {
      sayPay('Payment must be more than 0.');
      return;
    }
    if (amount > selectedOwing.balance) {
      sayPay('That is more than ' + selectedOwing.customer_name + "'s balance of " + peso(selectedOwing.balance) + '.');
      return;
    }

    var body = {
      customer_id: selectedOwing.customer_id,
      amount: amount,
      payment_method: Number($('payMethod').value)
    };

    var button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      var result = await apiFetch('/utang/payments', { method: 'POST', body: body });

      if (!result.success) {
        sayPay(errorText(result));
        return;
      }

      closeModal('paymentModal');
      await refreshAll();
    } catch (err) {
      sayPay('Could not reach the server. Please try again.');
    } finally {
      button.disabled = false;
    }
  };

  function statusClass(name) {
    return name.toLowerCase().indexOf('partial') !== -1 ? 'partial' : 'unpaid';
  }

  function sortedCustomers() {
    var list = owingCustomers.slice();
    var search = $('searchBox').value.trim().toLowerCase();
    if (search) {
      list = list.filter(function (c) { return c.customer_name.toLowerCase().indexOf(search) !== -1; });
    }

    var mode = $('sortBox').value;
    if (mode === 'name') {
      list.sort(function (a, b) { return a.customer_name.localeCompare(b.customer_name); });
    } else if (mode === 'balance') {
      list.sort(function (a, b) { return b.balance - a.balance; });
    } else if (mode === 'status') {
      list.sort(function (a, b) { return statusClass(a.status_name).localeCompare(statusClass(b.status_name)); });
    } else {
      list.sort(function (a, b) { return new Date(b.latest) - new Date(a.latest); });
    }
    return list;
  }

  function renderCustomerList() {
    var box = $('customerList');
    box.innerHTML = '';

    var list = sortedCustomers();

    if (list.length === 0) {
      var p = document.createElement('p');
      p.className = 'empty';
      p.textContent = owingCustomers.length === 0
        ? 'No utang records yet. Click "Add Utang" to record your first one.'
        : 'No customers match your search.';
      box.appendChild(p);
      return;
    }

    list.forEach(function (c) {
      var row = document.createElement('div');
      row.className = 'utang-row';

      var info = document.createElement('div');

      var name = document.createElement('h4');
      name.textContent = c.customer_name;

      var meta = document.createElement('p');
      var dueText = c.due_date ? 'Due ' + new Date(c.due_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '';
      meta.textContent = [peso(c.balance), dueText].filter(Boolean).join(' · ');

      info.append(name, meta);

      var right = document.createElement('div');
      right.className = 'utang-row-right';

      var badge = document.createElement('span');
      badge.className = 'status ' + statusClass(c.status_name);
      badge.textContent = c.status_name;

      var payBtn = document.createElement('button');
      payBtn.type = 'button';
      payBtn.className = 'utang-pay';
      payBtn.dataset.id = c.customer_id;
      payBtn.textContent = 'Pay';

      right.append(badge, payBtn);
      row.append(info, right);
      box.appendChild(row);
    });
  }

  $('searchBox').oninput = renderCustomerList;
  $('sortBox').onchange = renderCustomerList;

  (async function start() {
    try {
      await loadLookups();
      await loadProducts();
      await refreshAll();
    } catch (err) {
      console.error('Utang page problem:', err);
    }
  })();
})();
