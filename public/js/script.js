
const addStoreBtn = document.getElementById("add-store-btn");
const addStorePage = document.getElementById("add-store-form");
const cancelStoreBtn = document.getElementById("cancelBtn");
const storeForm = document.getElementById("store-form");

const welcomePage = document.querySelector("main > .welcome");
const newUserSection = document.querySelector(".new-user");
const infoSection = document.querySelector(".info");
const featuresSection = document.querySelector(".main-features");

addStorePage.hidden = true;


addStoreBtn.addEventListener("click", function () {
    welcomePage.hidden = true;
    newUserSection.hidden = true;
    infoSection.hidden = true;
    featuresSection.hidden = true;

    addStorePage.hidden = false;
});


cancelStoreBtn.addEventListener("click", function () {
    addStorePage.hidden = true;

    welcomePage.hidden = false;
    newUserSection.hidden = false;
    infoSection.hidden = false;
    featuresSection.hidden = false;
});
