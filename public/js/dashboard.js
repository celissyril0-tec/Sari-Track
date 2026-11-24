(async function () {
    function peso(n) {
        return '₱ ' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

    var nameEl = document.getElementById('dashStoreName');
    var addressEl = document.getElementById('dashStoreAddress');

    async function loadStore() {
        if (!nameEl) return;
        try { 
            var result = await apiFetch('/auth/profile');
            if (!result.success) return;

            nameEl.textContent = result.profile.store_name || 'My Store';
            addressEl.textContent = result.profile.store_address || 'No store address added';
            addressEl.style.opacity = result.profile.store_address ? '1' : '0.6';
        } catch (err) {
            nameEl.textContent = 'My Store';
        }
    }

    async function loadSales() {
        var lastStart = addDays(startOfWeek(new Date()), -7);
        var result = await apiFetch('/sales?limit=200&from=' + encodeURIComponent(lastStart.toISOString()));
        if (!result.success) return;

        var sales = result.data;
        var todayKey = new Date().toDateString();

        var todayTotal = 0;
        var todayCount = 0;
        sales.forEach(function (s) {
            if (new Date(s.created_at).toDateString() === todayKey) {
                todayTotal += Number(s.sale_total);
                todayCount++;
            }
        });

        var salesCard = document.querySelector('.store-overview .sales');
        if (salesCard) {
            salesCard.querySelector('h1').textContent = peso(todayTotal);
            salesCard.querySelector('p').textContent =
                todayCount > 0 ? 'From ' + todayCount + (todayCount === 1 ? ' sale' : ' sales') + ' today' : 'No sales yet';
        }

        if (window.updateSalesChart) {
            var thisStart = startOfWeek(new Date());
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
    }

    async function loadStock() {
        var result = await apiFetch('/products');
        if (!result.success) return;

        var out = result.data.filter(function (p) { return p.stock === 0; }).length;
        var low = result.data.filter(function (p) { return p.stock > 0 && p.stock <= p.reorder_level; }).length;

        var card = document.querySelector('.store-overview .stock-warning');
        if (!card) return;

        card.querySelector('h1').textContent = out;
        card.querySelector('p').textContent = out > 0
            ? out + (out === 1 ? ' item needs restocking' : ' items need restocking')
            : (low > 0 ? low + ' running low' : 'No stock alerts yet');
    }

    async function loadUtang() {
        var result = await apiFetch('/utang/summary');
        if (!result. success) return;

        var card = document.querySelector('.store-overview .utang');
        if (!card) return;

        var h1 = card.querySelector('h1');
        var p = card.querySelector('p');
        var count = result.data.customer_count;

        if (h1) h1.textContent = peso(result.data.total_utang);
        if (p) p.textContent = count > 0
            ? 'From ' + count + (count === 1 ? ' customer' : ' customers')
            : 'No list yet';
    }

    try {
        await Promise.all([loadStore(), loadSales(), loadStock(), loadUtang()]);
    } catch (err) {
        console.error('Dashboard problem:', err);
    }
})();
