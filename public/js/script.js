// Sidebar
var sideBarLinks = document.querySelectorAll(".side-bar a");
var logoutLinks = document.querySelectorAll('.bottom-links a[href="login.html"], .bottom-links a[href="log-out.html"]');

for (var i = 0; i < sideBarLinks.length; i++) {
  sideBarLinks[i].addEventListener("click", function () {
    document.querySelector(".side-bar").classList.remove("open");
  });
}

logoutLinks.forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    logout();
  });
});

// Add store (index.html)
const addStoreBtn = document.getElementById("add-store-btn");
const addStorePage = document.getElementById("add-store-form");
const cancelStoreBtn = document.getElementById("cancelBtn");
const storeForm = document.getElementById("store-form");

const welcomePage = document.querySelector("main > .welcome");
const newUserSection = document.querySelector(".new-user");
const infoSection = document.querySelector(".info");
const featuresSection = document.querySelector(".main-features");

if (addStoreBtn && addStorePage && cancelStoreBtn) {

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
}

// Settings
const USE_BACKEND = true;
const API = {
  notifications: "/api/notifications",
  markRead: "/api/notifications/read",
  account: "/api/account",
  logout: "/api/logout"
};

// Notifications
async function buildNotifications() {
  const list = [];
  let prefs = { notify_low_stock: true, notify_overdue: true };

  try {
    const profileResult = await apiFetch("/auth/profile");
    if (profileResult.success) {
      prefs.notify_low_stock = profileResult.profile.notify_low_stock !== false;
      prefs.notify_overdue = profileResult.profile.notify_overdue !== false;
    }
  } catch (err) {}

  try {
    const products = await apiFetch("/products");
    if (products.success) {
      products.data.forEach(function (p) {
        if (p.stock === 0) {
          list.push({
            id: "out-" + p.id + "-" + p.updated_at,
            type: "out", title: "Out of Stock",
            message: p.product_name + " is out of stock.",
            link: "inventory.html",
            time: "Inventory"
          });
        } else if (prefs.notify_low_stock && p.stock <= p.reorder_level) {
          list.push({
            id: "low-" + p.id + "-" + p.updated_at,
            type: "low",
            title: "Low Stock",
            message: p.product_name + " has only " + p.stock + " left.",
            link: "inventory.html",
            time: "Inventory"
          });
        }
      });
    }
  } catch (err) {}

  if (prefs.notify_overdue) {
    try {
      const utang = await apiFetch("/utang/customers");
      if (utang.success) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        utang.data.forEach(function (c) {
          if (c.due_date && new Date(c.due_date) < today) {
            list.push({
              id: "utang-" + c.customer_id,
              type: "utang",
              title: "Utang reminder",
              message: c.customer_name + " has an overdue balance of ₱" + Number(c.balance).toFixed(2) + ".",
              link: "utang.html",
              time: "Overdue"
            });
          }
        });
      }
    } catch (err) {}
  }

  return list;
}

function getReadIds() {
  try { return JSON.parse(localStorage.getItem("readNotificationIds") || "[]"); }
  catch (e) { return []; }
}

function saveReadIds(ids) {
  try { localStorage.setItem("readNotificationIds", JSON.stringify(ids)); }
  catch (e) {}
}

function markAsRead(id) {
  const read = getReadIds();
  if (read.indexOf(id) === -1) {
    read.push(id);
    saveReadIds(read);
  }
}

async function getNotifications() {
  const list = await buildNotifications();
  const read = getReadIds();
  list.forEach(function (n) { n.read = read.indexOf(n.id) !== -1; });

  const current = list.map(function (n) { return n.id; });
  const kept = read.filter(function (id) { return current.indexOf(id) !== -1; });
  if (kept.length !== read.length) saveReadIds(kept);

  return list;
}

async function markAllAsRead() {
  const list = await buildNotifications();
  saveReadIds(list.map(function (n) { return n.id; }));
  loadNotifications();
}

// Time Ago
function timeAgo(dateString) {
  const minutes = Math.floor((Date.now() - new Date(dateString)) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + " min ago";

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " hr ago";

  return Math.floor(hours / 24) + " day(s) ago";
}

function renderNotifications(list) {
  const box = document.getElementById("notifList");
  if (!box) return;

  const badge = document.getElementById("notifBadge");
  const markBtn = document.getElementById("markReadBtn");
  const unread = list.filter(function (n) { return !n.read; });

  box.innerHTML = "";

  if (list.length === 0) {
    box.innerHTML = '<p class="notif-empty">No notifications yet</p>';
  }

  list.forEach(function (n) {
    const item = document.createElement("a");
    item.className = "notif-item " + n.type + (n.read ? "" : " unread");
    item.href = n.link;
    item.addEventListener("click", function () {
      markAsRead(n.id);
    });

    const title = document.createElement("strong");
    title.textContent = n.title;
    const message = document.createElement("p");
    message.textContent = n.message;
    const time = document.createElement("small");
    time.textContent = n.createdAt ? timeAgo(n.createdAt) : n.time;

    item.append(title, message, time);
    box.appendChild(item);
  });

  badge.textContent = unread.length;
  badge.hidden = unread.length === 0;
  markBtn.hidden = unread.length === 0;
}

async function loadNotifications() {
  const list = await getNotifications();
  renderNotifications(list);
}

// My Account
async function getAccount() {
  try {
    const result = await apiFetch("/auth/profile");
    if (!result.success) return { username: "Guest", storeName: "" };
    return { username: result.profile.seller_name, storeName: result.profile.storeName || "" };
  } catch (error) {
    return { username: "Guest", storeName: "" };
  }
}

async function loadAccount() {
  const name = document.getElementById("accountName");
  if (!name) return;

  const user = await getAccount();
  name.textContent = user.username;
  document.getElementById("accountStore").textContent = user.storeName;
}

// Header
const HEADER_VERSION = "1";

function setupHeader(html) {
  const placeholder = document.getElementById("header-placeholder");
  placeholder.innerHTML = html;

  loadNotifications();
  loadAccount();

  setInterval(loadNotifications, 60000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) loadNotifications();
  });
  window.addEventListener("focus", loadNotifications);

  const menuBtn = document.getElementById("menuBtn");
  const sideBar = document.querySelector(".side-bar");
  
  if (menuBtn && sideBar) {
    menuBtn.addEventListener("click", function () {
      sideBar.classList.toggle("open");
    });
  }
}

function loadHeader() {
  const placeholder = document.getElementById("header-placeholder");
  if (!placeholder) return;

  const saved = sessionStorage.getItem("headerHtml");
  if (saved && sessionStorage.getItem("headerVersion") === HEADER_VERSION) {
    setupHeader(saved);
    return;
  }

  fetch("header.html")
    .then(function (res) {
      if (!res.ok) throw new Error("header.html not found (" + res.status + ")");
      return res.text();
    })
    .then(function (html) {
      sessionStorage.setItem("headerHtml", html);
      sessionStorage.setItem("headerVersion", HEADER_VERSION);
      setupHeader(html);
    })
    .catch(function (error) {
      console.error("Header problem:", error);
    });
}

loadHeader();