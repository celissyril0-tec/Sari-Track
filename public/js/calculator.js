
var first = "";      
var operator = "";   
var second = "";     

var display = document.getElementById("display");


function updateDisplay() {
  var text = first || "0";
  if (operator !== "") {
    text = text + " " + operator + " " + second;
  }
  display.textContent = text;
}


function pressNumber(num) {
  if (operator === "") {
    first = first + num;     
  } else {
    second = second + num;   
  }
  updateDisplay();
}


function pressOperator(op) {
  if (first === "") {
    first = "0";
  }
  operator = op;
  updateDisplay();
}


function calculate() {
  if (operator === "") {
    return;
  }

  var a = Number(first);
  var b = Number(second || 0);
  var result = 0;

  if (operator === "+") { result = a + b; }
  if (operator === "−") { result = a - b; }
  if (operator === "×") { result = a * b; }
  if (operator === "÷") {
    if (b === 0) {
      clearAll(false);
      display.textContent = "Error";
      return;
    }
    result = a / b;
  }


  result = Math.round(result * 100) / 100;

  first = String(result);
  operator = "";
  second = "";
  updateDisplay();
}

function clearAll(show) {
  first = "";
  operator = "";
  second = "";
  if (show !== false) {
    updateDisplay();
  }
}

function toggleSign() {
  if (operator === "") {
    if (first === "") { return; }
    if (first.startsWith("-")) {
      first = first.slice(1);     
    } else {
      first = "-" + first;      
    }
  } else {
    if (second === "") { return; }
    if (second.startsWith("-")) {
      second = second.slice(1);
    } else {
      second = "-" + second;
    }
  }
  updateDisplay();
}

function percent() {
  if (operator === "") {
    first = String(Number(first || 0) / 100);
  } else {
    second = String(Number(second || 0) / 100);
  }
  updateDisplay();
}

// ===== Calculator page: the two tabs and the Profit Calculator =====
// Your own calculator.js (the basic calculator) is not touched.

(function () {
  function $(id) { return document.getElementById(id); }

  function peso(n) {
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ----- the two switch buttons -----
  function showTab(which) {
    var basic = which === 'basic';

    $('panelBasic').hidden = !basic;
    $('panelProfit').hidden = basic;

    $('tabBasic').classList.toggle('active', basic);
    $('tabProfit').classList.toggle('active', !basic);
    $('tabBasic').setAttribute('aria-selected', basic);
    $('tabProfit').setAttribute('aria-selected', !basic);
  }

  $('tabBasic').onclick = function () { showTab('basic'); };
  $('tabProfit').onclick = function () { showTab('profit'); };

  // ----- Profit Calculator -----
  var sellHint = $('pSell').placeholder;             // your own wording, for example "e.g. 20"

  function profitUpdate() {
    var pack = Number($('pPack').value);
    var pieces = Number($('pPieces').value);
    var sellText = $('pSell').value;

    // cost of each piece
    var ready = pack > 0 && pieces >= 1;
    var costEach = ready ? pack / pieces : 0;
    $('pCostEach').textContent = peso(costEach);

    // the selling price box turns on only after the pack price and pieces are filled in
    $('pSell').disabled = !ready;
    $('pSellBox').classList.toggle('p-off', !ready);
    $('pSell').placeholder = ready ? sellHint : 'Fill in the pack price and pieces first';

    // profit
    if (!ready || sellText === '') {
      showProfit(0, 0);
      return;
    }

    var sell = Number(sellText);
    var profitEach = sell - costEach;
    var profitTotal = sell * pieces - pack;       // exact, so the total never has a rounding error
    showProfit(profitEach, profitTotal);
  }

  function showProfit(each, total) {
    var loss = total < 0;
    $('pEachLabel').textContent = loss ? 'Loss of each piece:' : 'Profit of each piece:';
    $('pTotalLabel').textContent = loss ? 'Total loss:' : 'Total profit:';
    $('pEach').textContent = peso(Math.abs(each));
    $('pTotal').textContent = peso(Math.abs(total));
    $('pEachBox').classList.toggle('p-loss', loss);
    $('pTotalBox').classList.toggle('p-loss', loss);
  }

  ['pPack', 'pPieces', 'pSell'].forEach(function (id) { $(id).oninput = profitUpdate; });

  profitUpdate();
})();