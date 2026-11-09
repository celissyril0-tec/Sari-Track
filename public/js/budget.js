// ===== Budget Overview (the same file runs on the Dashboard and the Calculator page) =====
// It works with your own budget card: canvas#budgetChart, .percent, .amount and .note.
// The budget is saved once, so both pages always show the same numbers.
// A card that has the editing controls (Calculator page) can change it.
// A card without them (Dashboard) only shows it.
//
// On the Dashboard, load this file AFTER the file that draws your Chart.js charts (graph.js).
// If a Chart.js chart already exists on #budgetChart, this file updates it instead of drawing a new one.

(function () {
  var COLORS = {
    'Stocks':         '#ffb800',
    'Groceries':      '#ffb800',
    'Electricity':    '#ff7a45',
    'Water':          '#2ec4b6',
    'Rent':           '#8e5bd9',
    'Transportation': '#e0457b',
    'Others':         '#7a8aa0'
  };
  var OTHER_COLORS = ['#34c38f', '#a855f7', '#f97316', '#06b6d4', '#84cc16', '#ef4444'];

  var LEFT_COLOR = '#1a56db';                         

  function peso(n) {
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  var memory = { amount: 0, expenses: [] };

  function loadBudget() {
    try {
      var text = localStorage.getItem('budget');
      if (text) { memory = JSON.parse(text); }
    } catch (e) { }
    return memory;
  }

  function saveBudget(data) {
    memory = data;
    try { localStorage.setItem('budget', JSON.stringify(data)); } catch (e) { }
  }

  function totalSpent(data) {
    var t = 0;
    data.expenses.forEach(function (x) { t += x.amount; });
    return t;
  }

  // ----- the donut -----
  function drawDonut(canvas, pieces) {

    if (window.Chart && typeof Chart.getChart === 'function') {
      var chart = Chart.getChart(canvas);
       if (chart) {
         chart.data.labels = pieces.map(function (p) { return p.name; });
         chart.data.datasets[0].data = pieces.map(function (p) { return p.value; });
         chart.data.datasets[0].backgroundColor = pieces.map(function (p) { return p.color; });
         chart.options.plugins.legend.display = false;

         chart.update();
         return;
      }
    }

   
    if (!canvas.dataset.w) {                          
      canvas.dataset.w = canvas.clientWidth || 150;
      canvas.dataset.h = canvas.clientHeight || 150;
    }
    var w = Number(canvas.dataset.w);
    var h = Number(canvas.dataset.h);
    var ratio = window.devicePixelRatio || 1;           

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = w * ratio;
    canvas.height = h * ratio;

    var ctx = canvas.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var outer = Math.min(w, h) / 2 - 2;                 
    var thickness = outer * 0.5;                        
    var radius = outer - thickness / 2;

    var whole = 0;
    pieces.forEach(function (p) { whole += p.value; });

    var start = -Math.PI / 2;                           
    pieces.forEach(function (p) {
      var angle = p.value / whole * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, start, start + angle);
      ctx.lineWidth = thickness;
      ctx.strokeStyle = p.color;
      ctx.stroke();
      start += angle;
    });
  }

  
  function drawCard(card) {
    var data = loadBudget();
    var spent = totalSpent(data);
    var budget = data.amount;
    var left = Math.max(budget - spent, 0);
    var over = budget > 0 && spent > budget;

   
    var pieces = [];
    var extra = 0;
    data.expenses.forEach(function (x) {
      var found = null;
      pieces.forEach(function (p) { if (p.name === x.category) { found = p; } });
      if (found) {
        found.value += x.amount;
      } else {
        var color = COLORS[x.category] || OTHER_COLORS[extra++ % OTHER_COLORS.length];
        pieces.push({ name: x.category, color: color, value: x.amount });
      }
    });
      if (left > 0 && budget > 0) {
       pieces.push({ name: 'Left', color: LEFT_COLOR, value: left });
    }

      if (budget <= 0 && pieces.length === 0) {
       pieces.push({ name: '', color: LEFT_COLOR, value: 1 });
    }

    var canvas = card.querySelector('canvas');
    if (canvas) { drawDonut(canvas, pieces); }

    var percent = budget > 0 ? Math.round(spent / budget * 100) : 0;
    var percentBox = card.querySelector('.percent');
    percentBox.textContent = percent + '%';
    percentBox.classList.toggle('over', over);

    card.querySelector('.amount').textContent = '₱ ' + spent.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    var note = card.querySelector('.note');
    note.classList.toggle('over', over);
    if (budget <= 0) {
      note.textContent = 'No budget set yet';
    } else if (over) {
      note.textContent = 'Over budget by ' + peso(spent - budget);
    } else {
      note.textContent = 'spent of ' + peso(budget) + ' · ' + peso(left) + ' left';
    }

   
    var legend = card.querySelector('.bd-legend');

    if (legend) {
      legend.innerHTML = '';

      pieces.forEach(function (p) {

        
        if (p.name === 'Left' || p.name === '') {
            return;
        }

        var li = document.createElement('li');

        li.innerHTML = '<span class="bd-dot" style="background:' 
            + p.color + '"></span>' 
            + p.name 
            + '<b>' + peso(p.value) + '</b>';

        legend.appendChild(li);
    });
   }
  }

  function drawAll() {
    document.querySelectorAll('.budget-card').forEach(drawCard);
  }
  
  function setupControls(card) {
    var setBtn = card.querySelector('.bd-set-btn');
    if (!setBtn) { return; }                            

    var msg = card.querySelector('.bd-msg');
    var resetBtn = card.querySelector('.bd-reset');

    function say(text, good) {
      msg.textContent = text;
      msg.classList.toggle('ok', good === true);
    }

    // Set Budget
    setBtn.onclick = function () {
      var amount = Number(card.querySelector('.bd-budget-input').value);
      if (amount <= 0) { say('Enter a budget greater than 0.'); return; }

      var data = loadBudget();
      data.amount = amount;
      saveBudget(data);
      card.querySelector('.bd-budget-input').value = '';
      say('Budget saved.', true);
      drawAll();
    };

    card.querySelector('.bd-add-btn').onclick = function () {
      var data = loadBudget();
      var amount = Number(card.querySelector('.bd-amount').value);

      if (data.amount <= 0) { say('Set your budget first.'); return; }
      if (amount <= 0) { say('Enter an amount greater than 0.'); return; }

      data.expenses.push({ category: card.querySelector('.bd-cat').value, amount: amount });
      saveBudget(data);
      card.querySelector('.bd-amount').value = '';
      say(totalSpent(data) > data.amount ? 'Careful: you are over your budget.' : 'Expense added.', totalSpent(data) <= data.amount);
      drawAll();
    };

    card.querySelector('.bd-undo').onclick = function () {
      var data = loadBudget();
      if (data.expenses.length === 0) { say('There is no expense to undo.'); return; }
      data.expenses.pop();
      saveBudget(data);
      say('Last expense removed.', true);
      drawAll();
    };

    resetBtn.onclick = function () {
      if (resetBtn.textContent !== 'Start over') {
        saveBudget({ amount: 0, expenses: [] });
        resetBtn.textContent = 'Start over';
        say('Budget cleared.', true);
        drawAll();
      } else {
        resetBtn.textContent = 'Click again to clear everything';
      }
    };
  }

  document.querySelectorAll('.budget-card').forEach(setupControls);
  window.addEventListener('storage', drawAll);          
  drawAll();
})();