
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