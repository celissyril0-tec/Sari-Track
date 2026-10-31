// ===== Add Product and Restock popups (UI only) =====

// one small function that opens and closes a popup
function setupPopup(openId, modalId, cancelId, formId) {
  const modal = document.getElementById(modalId);

  // click the button -> show the popup
  document.getElementById(openId).onclick = function () {
    modal.classList.add('show');
  };

  // click Cancel -> hide the popup
  document.getElementById(cancelId).onclick = function () {
    modal.classList.remove('show');
  };

  // click the dark area outside the white box -> hide the popup
  modal.onclick = function (event) {
    if (event.target === modal) {
      modal.classList.remove('show');
    }
  };

  // click Save -> close the popup (nothing is saved yet)
  document.getElementById(formId).onsubmit = function (event) {
    event.preventDefault();   // stops the page from reloading
    modal.classList.remove('show');
  };
}

// connect each button to its popup
setupPopup('addProductBtn', 'addProductModal', 'cancelAddBtn', 'addProductForm');
setupPopup('restockBtn', 'restockModal', 'cancelRestockBtn', 'restockForm');