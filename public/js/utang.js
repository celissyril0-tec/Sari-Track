// ===== Add Utang and Record Payment popups (UI only) =====

// one small function that opens and closes a popup
function setupPopup(openBtnId, modalId) {
  var modal = document.getElementById(modalId);

  // click the button -> show the popup
  document.getElementById(openBtnId).onclick = function () {
    modal.classList.add('show');
  };

  // click Cancel -> hide the popup
  modal.querySelector('[data-close]').onclick = function () {
    modal.classList.remove('show');
  };

  // click the dark area outside the white box -> hide the popup
  modal.onclick = function (event) {
    if (event.target === modal) {
      modal.classList.remove('show');
    }
  };

  // click the save button -> close the popup (nothing is saved yet)
  modal.querySelector('form').onsubmit = function (event) {
    event.preventDefault();
    modal.classList.remove('show');
  };
}

setupPopup('addUtangBtn', 'addUtangModal');
setupPopup('paymentBtn', 'paymentModal');

// the Pay button on a customer card also opens Record Payment
document.getElementById('customerList').onclick = function (event) {
  if (event.target.classList.contains('utang-pay')) {
    document.getElementById('paymentModal').classList.add('show');
  }
};