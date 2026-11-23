// Inventory page shows products, adds new ones, and restocks existing ones.

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function peso(n) {
    return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function openModal(id) {
    $(id).classList.add('show');
  }

  function closeModal(id) {
    $(id).classList.remove('show');
  }

  function showMsg(id, text) {
    $(id).textContent = text;
  }

  function errorText(result) {
    if (result.errors && result.errors.length > 0) return result.errors[0];
    return result.message || 'Something went wrong.';
  }

  // data kept in memory while the page is open
  var products = [];
  var categories = [];
  var units = [];
  var selectedProduct = null;

  function nameOf(list, id, field) {
    var found = list.find(function (item) { return item.id === id; });
    return found ? found[field] : '';
  }

  function statusOf(p) {
    if (p.stock === 0) return 'out';
    if (p.stock <= p.reorder_level) return 'low';
    return 'ok';
  }

  // load data from backend
  function fillSelect(select, list, labelField) {
    select.innerHTML = '';
    list.forEach(function (item) {
      var option = document.createElement('option');
      option.value = item.id;
      option.textContent = item[labelField];
      select.appendChild(option);
    });
  }

  async function loadLookups() {
    var result = await apiFetch('/lookups');
    if (!result.success) return;

    categories = result.data.categories;
    units = result.data.units;

    fillSelect($('productCategory'), categories, 'category_name');
    fillSelect($('productUnit'), units, 'unit_name');
  }

  async function loadProducts() {
    var result = await apiFetch('/products');

    if (!result.success) {
      $('stockList').textContent = 'Could not load your products.';
      return;
    }

    products = result.data;
    render();
  }

  function sortedProducts() {
    var list = products.slice();
    var mode = $('stockSort').value;
    var order = { out: 0, low: 1, ok: 2 };

    if (mode === 'Stock Level') {
      list.sort(function (a, b) { return a.stock - b.stock; });
    } else if (mode === 'Status') {
      list.sort(function (a, b) {
        return order[statusOf(a)] - order[statusOf(b)] || a.product_name.localeCompare(b.product_name);
      });
    } else {
      list.sort(function (a, b) { return a.product_name.localeCompare(b.product_name); });
    }
    return list;
  }

  function render() {
    var low = 0;
    var out = 0;
    products.forEach(function (p) {
      var s = statusOf(p);
      if (s === 'low') low++;
      if (s === 'out') out++;
    });

    document.querySelector('.total-products h1').textContent = products.length;
    document.querySelector('.low-stock h1').textContent = low;
    document.querySelector('.out-of-stock h1').textContent = out;

    var box = $('stockList');
    box.innerHTML = '';

    if (products.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'stock-empty';
      empty.textContent = 'No products yet. Add your first product to see your stock here.';
      box.appendChild(empty);
      return;
    }

    sortedProducts().forEach(function (p) {
      var status = statusOf(p);

      var item = document.createElement('div');
      item.className = 'stock-item';

      var thumb = document.createElement('div');
      thumb.className = 'stock-thumb';

      var info = document.createElement('div');
      info.className = 'stock-info';

      var name = document.createElement('h4');
      name.textContent = p.product_name;

      var meta = document.createElement('p');
      meta.textContent = [
        nameOf(categories, p.category_id, 'category_name'),
        nameOf(units, p.product_unit, 'unit_name'),
        peso(p.price_per_unit),
        p.stock + ' left'
      ].filter(Boolean).join(' . ');

      info.append(name, meta);

      var badge = document.createElement('span');
      badge.className = 'stock-status ' + (status === 'ok' ? 'in' : status);
      badge.textContent = status === 'out' ? ' Out of stock' : status === 'low' ? ' Low stock' : ' In stock';

      item.append(thumb, info, badge);
      box.appendChild(item);
    });
  }

  $('addProductBtn').onclick = function () {
    showMsg('addProductMsg', '');
    openModal('addProductModal');
  };
  $('cancelAddBtn').onclick = function () {
    closeModal('addProductModal');
  };

  $('restockBtn').onclick = function () {
    selectedProduct = null;
    $('restockForm').reset();
    $('currentStock').value = 0;
    $('newStockText').textContent = 0;
    $('restockSuggestions').innerHTML = '';
    showMsg('restockMsg', '');
    openModal('restockModal');
  };
  $('cancelRestockBtn').onclick = function () {
    closeModal('restockModal');
  };

  ['addProductModal', 'restockModal'].forEach(function (id) {
    $(id).onclick = function (event) {
      if (event.target === $(id)) closeModal(id);
    };
  });

  $('addProductForm').onsubmit = async function (event) {
    event.preventDefault();
    showMsg('addProductMsg', '');

    var body = {
      product_name: $('productName').value.trim(),
      category_id: Number($('productCategory').value),
      product_unit: Number($('productUnit').value),
      cost_price: Number($('productCost').value || 0),
      price_per_unit: Number($('productPrice').value),
      stock: Number($('productStock').value || 0),
      reorder_level: Number($('productLow').value || 0)
    };

    if (!body.product_name) {
      showMsg('addProductMsg', 'Please enter a product name.');
      return;
    }
    if (!body.category_id) {
      showMsg('addProductMsg', 'Please choose a category.');
      return;
    }
    if (!body.product_unit) {
      showMsg('addProductMsg', 'Please choose a unit.');
      return;
    }
    if(!(body.price_per_unit > 0)) {
      showMsg('AddProductMsg', 'Please enter a selling price above 0.');
      return;
    }

    var button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      var result = await apiFetch('/products', { method: 'POST', body: body });

      if (!result.success) {
        showMsg('addProductMsg', errorText(result));
        return;
      }

      event.target.reset();
      closeModal('addProductModal');
      await loadProducts();
    } catch (err) {
      showMsg('addProductMsg', 'Could not reach the server. Please try again.');
    } finally {
      button.diabled = false;
    }
  };

  function updateNewTotal() {
    var add = Number($('addStock').value) || 0;
    var current = selectedProduct ? selectedProduct.stock : 0;
    $('newStockText').textContent = current + add;
  }

  function chooseProduct(p) {
    selectedProduct = p;
    $('restockItem').value = p.product_name;
    $('currentStock').value = p.stock;
    $('restockSuggestions').innerHTML = '';
    updateNewTotal();
  }

  // show matching products when typing in the search box
  $('restockItem').oninput = function () {
    selectedProduct = null;
    $('currentStock').value = 0;
    updateNewTotal();

    var text = this.value.trim().toLowerCase();
    var list = $('restockSuggestions');
    list.innerHTML = '';
    if (!text) return;

    products
      .filter(function (p) { return p.product_name.toLowerCase().includes(text); })
      .slice(0, 6)
      .forEach(function (p) {
        var li = document.createElement('li');
        li.textContent = p.product_name;
        li.onclick = function () { chooseProduct(p); };
        list.appendChild(li);
      });
  };

  $('addStock').oninput = updateNewTotal;

  $('restockForm').onsubmit = async function (event) {
    event.preventDefault();
    showMsg('restockMsg', '');

    if (!selectedProduct) {
      showMsg('restockMsg', 'Please choose a product from the list.');
      return;
    }

    var add = Number($('addStock').value);
    if (!Number.isInteger(add) || add < 1) {
      showMsg('restockMsg', 'Quantity must be a whole number of 1 or more.');
      return;
    }

    var button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      var fresh = await apiFetch('/products/' + selectedProduct.id);
      if (!fresh.success) {
        showMsg('restockMsg', errorText(fresh));
        return;
      }

      var result = await apiFetch('/products/' + selectedProduct.id, {
        method: 'PATCH',
        body: { stock: fresh.data.stock + add }
      });

      if (!result.success) {
        showMsg('restockMsg', errorText(result));
        return;
      }

      closeModal('restockModal');
      await loadProducts();
    } catch (err) {
      showMsg('restockMsg', 'Could not reach the server. Please try again.');
    } finally {
      button.diabled = false;
    }
  };

  $('stockSort').onchange = render;

  (async function start() {
    try {
      await loadLookups();
      await loadProducts();
    } catch (err) {
      $('stockList').textContent = 'Could not load your products.';
    }
  })();
})();
