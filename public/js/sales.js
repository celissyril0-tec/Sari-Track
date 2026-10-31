
const recordSaleBtn = document.querySelector('.add-sale-btn');
const saleModal = document.getElementById('saleModal');
const saleCancelBtn = document.getElementById('cancelBtn');


recordSaleBtn.onclick = function () {
  saleModal.classList.add('show');
};

saleCancelBtn.onclick = function () {
  saleModal.classList.remove('show');
};

saleModal.onclick = function (event) {
  if (event.target === saleModal) {
    saleModal.classList.remove('show');
  }
};

const viewTransactionsBtn = document.querySelector('.transaction-btn');
const transactionsSection = document.getElementById('transactionsSection');

viewTransactionsBtn.onclick = function () {
  transactionsSection.scrollIntoView({ behavior: 'smooth' });
};