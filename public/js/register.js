const passwordInput = document.getElementById("password");
const checklist = document.getElementById("passwordChecklist");
const registerForm = document.getElementById("registerForm");

const passwordRules = {
  length: function (text) { return text.length >= 8; },
  upper:  function (text) { return /[A-Z]/.test(text); },
  lower:  function (text) { return /[a-z]/.test(text); },
  number: function (text) { return /[0-9]/.test(text); },
  symbol: function (text) { return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(text); }
};

function checkPassword() {
  const text = passwordInput.value;
  let allPassed = true;

  checklist.querySelectorAll("li").forEach(function (item) {
    const passed = passwordRules[item.dataset.rule](text);
    item.classList.toggle("valid", passed);
    if (!passed) allPassed = false;
  });

  return allPassed;
}


passwordInput.addEventListener("focus", function () {
  checklist.hidden = false;
});


passwordInput.addEventListener("input", checkPassword);


registerForm.addEventListener("submit", function (event) {
  if (!checkPassword()) {
    event.preventDefault();
    event.stopImmediatePropagation();   
    checklist.hidden = false;
    passwordInput.focus();
  }
});