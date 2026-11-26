(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function peso(n) {
    return '₱ ' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function say(text) {
    $('errorMsg').textContent = text;
  }

  function sayForm(text) {
    var el = $('saleMsg');
    if (el) el.textContent = text;
  }

  function errorText(result) {
    if (result.errors && result.errors.length > 0) return result.errors[0];
    return result.message || 'Something went wrong.';
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

  function startOfWeek(date) {
    var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    var daysSinceMonday = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - daysSinceMonday);
    return d;
  }

  var products = [];
  var paymentMethods = [];
  var statuses = [];
  var saleItems = [];
  var chosen = null;
  var sales = [];
  var defaultDueDays = 7;

  function fillSelect(select, list, labelField) {
    select.innerHTML = '';
    list.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.id;
      option.textContent = item[labelField];
      select.appendChild(option);
    });
  }

  async function loadDefaults() {
    var result = await apiFetch('/auth/profile');
    if (result.success) {
      defaultDueDays = result.profile.default_due_days ?? 7;
    }
  }

  async function loadLookups() {
    var result = await apiFetch('/lookups');
    if (!result.success) return;

    paymentMethods = result.data.payment_methods;
    statuses = result.data.utang_status;

    fillSelect($('paymentInput'), paymentMethods, 'method_name');
    fillSelect($('statusInput'), statuses, 'status_name');
  }

  async function loadProducts() {
    var result = await apiFetch('/products');
    if (result.success) products = result.data;
  }

  async function loadSales() {
    var lastStart = addDays(startOfWeek(new Date()), -7);

    var result = await apiFetch('/sales?limit=200&from=' + encodeURIComponent(lastStart.toISOString()));

    if (!result.success) return;

    sales = result.data;
    renderCards();
    renderTable();
    renderChart();
  }

  var modal = $('saleModal');

  document.querySelector('.add-sale-btn').onclick = function () {
    resetSaleForm();
    modal.classList.add('show');
  };

  $('cancelBtn').onclick = function () {
    modal.classList.remove('show');
  };

  modal.onclick = function (event) {
    if (event.target === modal) modal.classList.remove('show');
  };

  document.querySelector('.transaction-btn').onclick = function () {
    $('transactionsSection').scrollIntoView({ behavior: 'smooth' });
  };

  $('priceInput').readOnly = true;

  function resetSaleForm() {
    saleItems = [];
    chosen = null;
    $('saleForm').reset();
    $('suggestions').innerHTML = '';
    say('');
    sayForm('');

    var paid = statuses.find(function (s) { return !s.requires_customer; });
    if (paid) $('statusInput').value = paid.id;

    $('customerInput').value = '';
    $('dueDateInput').value = '';
    $('paidNowInput').value = 0;

    updateCreditFields();
    renderSaleList();
  }

  function selectedStatus() {
    return statuses.find(function (s) { return String(s.id) === $('statusInput').value; });
  }

  function isPartial(status) {
    return !!status && status.requires_customer && status.status_name.toLowerCase().indexOf('partial') !== -1;
  }

  function updateCreditFields() {
    var status = selectedStatus();
    var needsCustomer = !!status && status.requires_customer;

    $('creditFields').style.display = needsCustomer ? 'block' : 'none';
    $('paidNowBox').style.display = isPartial(status) ? 'block' : 'none';

    if (needsCustomer) {
      if (!$('dueDateInput').value) {
        $('dueDateInput').value = dateInputValue(addDays(new Date(), defaultDueDays));
      }

      var utangOption = Array.from($('paymentInput').options).find(function (o) {
        return o.textContent.trim().toLowerCase() === 'utang';
      });
      if (utangOption) $('paymentInput').value = utangOption.value;
    }
  }

  $('statusInput').onchange = updateCreditFields;

  $('itemInput').oninput = function () {
    chosen = null;
    $('priceInput').value = '';

    var text = this.value.trim().toLowerCase();
    var list = $('suggestions');
    list.innerHTML = '';
    if (!text) return;

    products
      .filter(function (p) { return p.stock  > 0 && p.product_name.toLowerCase().indexOf(text) !== -1; })
      .slice(0, 6)
      .forEach(function (p) {
        var li = document.createElement('li');

        var name = document.createElement('span');
        name.textContent = p.product_name;

        var info = document.createElement('span');
        info.textContent = peso(p.price_per_unit) + ' · ' + p.stock + ' left';

        li.append(name, info);
        li.onclick = function () { choose(p); };
        list.appendChild(li);
      });
  };

  function choose(p) {
    chosen = p;
    $('itemInput').value = p.product_name;
    $('priceInput').value = p.price_per_unit;
    $('suggestions').innerHTML = '';
  }

  $('addItemBtn').onclick = function () {
    say('');

    if (!chosen) {
      say('Please choose an item from the list.');
      return;
    }

    var qty = Number($('qtyInput').value);
    if (!Number.isInteger(qty) || qty < 1) {
      say('Quantity must be a whole number of 1 or more.');
      return;
    }

    var existing = saleItems.find(function (i) { return i.product.id === chosen.id; });
    var alreadyAdded = existing ? existing.quantity : 0;

    if (alreadyAdded + qty > chosen.stock) {
      say('Only ' + chosen.stock + ' left in stock for ' + chosen.product_name + ".");
      return;
    }
    
    if (existing) {
      existing.quantity += qty;
    } else {
      saleItems.push({ product: chosen, quantity: qty });
    }

    chosen = null;
    $('itemInput').value = '';
    $('priceInput').value = '';
    $('qtyInput').value = 1;
    renderSaleList();
  };

  function saleTotal() {
    return saleItems.reduce(function (sum, i) {
      return sum + i.quantity * i.product.price_per_unit;
    }, 0);
  }

  function renderSaleList() {
    var list = $('saleList');
    list.innerHTML = '';

    saleItems.forEach(function (item, index) {
      var li = document.createElement('li');

      var left = document.createElement('span');
      left.textContent = item.quantity + ' x ' + item.product.product_name;

      var right = document.createElement('span');
      right.textContent = peso(item.quantity * item.product.price_per_unit) + ' ';

      var remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-item';
      remove.textContent = 'x';
      remove.onclick = function () {
        saleItems.splice(index, 1);
        renderSaleList();
      };

      right.appendChild(remove);
      li.append(left, right);
      list.appendChild(li);
    });

    $('totalText').textContent = peso(saleTotal());
  }

  $('saleForm').onsubmit = async function (event) {
    event.preventDefault();
    say('');
    sayForm('');

    if (saleItems.length === 0) {
      sayForm('Add at least one item to the sale.');
      return;
    }

    var status = selectedStatus();

    var body = {
      payment_method: Number($('paymentInput').value),
      payment_status: Number($('statusInput').value),
      items: saleItems.map(function (i) {
        return { product_id: i.product.id, quantity: i.quantity };
      })
    };

    if (status && status.requires_customer) {
      var customer = $('customerInput').value.trim();
      if (!customer) {
        sayForm('Please enter the customer name for an unpaid or partial sale.');
        return;
      }
      body.customer_name = customer;

      if ($('dueDateInput').value) body.due_date = $('dueDateInput').value;

      if (isPartial(status)) {
        var paidNow = Number($('paidNowInput').value);
        if (!(paidNow > 0) || paidNow >= saleTotal()) {
          sayForm('"Paid now" must be more than 0 and less than the total.');
          return;
        }
        body.amount_paid = paidNow;
      }
    }

    var button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      var result = await apiFetch('/sales', { method: 'POST', body: body });

      if (!result.success) {
        sayForm(errorText(result));
        return;
      }

      modal.classList.remove('show');
      await loadProducts();
      await loadSales();
    } catch (err) {
      sayForm('Could not reach the server. Please try again.')
    } finally {
      button.disabled = false;
    }
  };

  function renderCards() {
    var todayKey = new Date().toDateString();
    var count = 0;
    var total = 0;
    var itemsSold = 0;

    sales.forEach(function (s) {
      if (new Date(s.created_at).toDateString() !== todayKey) return;

      count++;
      total += Number(s.sale_total);
      (s.sale_items || []).forEach(function (i) { itemsSold += i.quantity; });
    });

    document.querySelector('.total-sales h1').textContent = peso(total);
    document.querySelector('.total-sales p').textContent = 
      count > 0 ? 'From ' + count + (count === 1 ? ' sale' : ' sales') + ' today' : 'No sales yet';
    
    document.querySelector('.transactions h1').textContent = count;
    document.querySelector('.transactions p').textContent = 
      count > 0 ? 'Recorded today' : 'No transactions yet';
    
    document.querySelector('.items-sold h1').textContent = itemsSold;
    document.querySelector('.items-sold p').textContent = 
      itemsSold > 0 ? 'Sold today' : 'No items sold yet';
  }

  function makeCell(text) {
    var td = document.createElement('td');
    td.textContent = text;
    return td;
  }

  function statusClass(name) {
    var lower = name.toLowerCase();
    if (lower.indexOf('partial') !== -1) return 'partial';
    if (lower === 'paid') return 'paid';
    return 'unpaid';
  }

  function itemsText(sale) {
    var parts = (sale.sale_items || []).map(function (i) {
      return i.products.product_name + ' x' + i.quantity;
    });
    if (parts.length <= 2) return parts.join(', ');
    return parts.slice(0, 2).join(', ') + ' +' + (parts.length - 2) + ' more';
  }

  function renderTable() {
    var thisStart = startOfWeek(new Date());
    var start = $('transactionRange').value === 'Last Week' ? addDays(thisStart, -7) : thisStart;
    var end = addDays(start, 7);

    var rows = sales.filter(function (s) {
      var d = new Date(s.created_at);
      return d >= start && d < end;
    });

    var body = $('transactionBody');
    body.innerHTML = '';

    if (rows.length === 0) {
      var emptyRow = document.createElement('tr');
      emptyRow.className = 'empty-row';
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 6;
      emptyCell.textContent = 'No transactions in this period.';
      emptyRow.appendChild(emptyCell);
      body.appendChild(emptyRow);
      return;
    }

    rows.forEach(function (s) {
      var tr = document.createElement('tr');

      var when = new Date(s.created_at).toLocaleString('en-PH', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      });

      var statusCell = document.createElement('td');
      var badge = document.createElement('span');
      var statusName = s.utang_status ? s.utang_status.status_name : '';
      badge.className = 'status ' + statusClass(statusName);
      badge.textContent = statusName;
      statusCell.appendChild(badge);

      tr.append(
        makeCell('#' + s.id),
        makeCell(when),
        makeCell(itemsText(s)),
        makeCell(peso(s.sale_total)),
        makeCell(s.payment_methods ? s.payment_methods.method_name : ''),
        statusCell
      );
      body.appendChild(tr);
    });
  }

  $('transactionRange').onchange = renderTable;

  function renderChart() {
    if (!window.updateSalesChart) return;

    var thisStart = startOfWeek(new Date());
    var lastStart = addDays(thisStart, -7);
    var thisWeek = [0, 0, 0, 0, 0, 0, 0];
    var lastWeek = [0, 0, 0, 0, 0, 0, 0];

    sales.forEach(function (s) {
      var d = new Date(s.created_at);
      var index = (d.getDay() + 6) % 7;

      if (d >= thisStart) {
        thisWeek[index] += Number(s.sale_total);
      } else if (d >= lastStart) {
        lastWeek[index] += Number(s.sale_total);
      }
    });

    window.updateSalesChart(thisWeek, lastWeek);
  }

  (async function start() {
    try {
      await loadDefaults();
      await loadLookups();
      await loadProducts();
      await loadSales();
    } catch (err) {
      console.error('Sales page problem:', err);
    }
  })();
})();
