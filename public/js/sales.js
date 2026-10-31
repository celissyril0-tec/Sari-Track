// ===== Record New Sale popup (UI only) =====
const recordSaleBtn = document.querySelector('.add-sale-btn');
const saleModal = document.getElementById('saleModal');
const saleCancelBtn = document.getElementById('cancelBtn');

// click "Record New Sales" -> show the popup
recordSaleBtn.onclick = function () {
  saleModal.classList.add('show');
};

// click "Cancel" -> hide the popup
saleCancelBtn.onclick = function () {
  saleModal.classList.remove('show');
};

// click the dark area outside the white box -> hide the popup
saleModal.onclick = function (event) {
  if (event.target === saleModal) {
    saleModal.classList.remove('show');
  }
};