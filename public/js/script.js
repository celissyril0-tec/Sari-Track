// =====================================================
// SIDEBAR: close it after tapping a menu link (phone and tablet)
// =====================================================
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

// =====================================================
// ADD STORE PAGE (only exists on index.html)
// =====================================================
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

// =====================================================
// SETTINGS
// =====================================================
const USE_BACKEND = false;   // change to true when your backend routes work

const API = {
  notifications: "/api/notifications",
  markRead: "/api/notifications/read",
  account: "/api/account",
  logout: "/api/logout"
};

// =====================================================
// SAMPLE DATA (only used while USE_BACKEND is false)
// =====================================================
const sampleAccount = {
  username: "Juan Dela Cruz",
  storeName: "My Sari-Sari Store"
};

const sampleNotifications = [
  { id: 1, type: "low", title: "Low stock", message: "Pancit Canton has only 5 left.", time: "Just now", link: "inventory.html", read: false },
  { id: 2, type: "out", title: "Out of stock", message: "Lucky Me Beef is out of stock.", time: "1 hour ago", link: "inventory.html", read: false },
  { id: 3, type: "utang", title: "Utang reminder", message: "Maria still has an unpaid balance.", time: "Yesterday", link: "utang.html", read: false }
];

// =====================================================
// GET THE DATA (the only part that changes with backend)
// =====================================================
async function getNotifications() {
  if (USE_BACKEND) {
    try {
      const res = await fetch(API.notifications);
      if (!res.ok) return [];
      return await res.json();
    } catch (error) {
      return [];
    }
  }
  const saved = localStorage.getItem("notifications");
  return saved ? JSON.parse(saved) : sampleNotifications;
}

async function getAccount() {
  try {
    const result = await apiFetch("/auth/profile");
    if (!result.success) return { username: "Guest", storeName: "" };
    return { username: result.profile.seller_name, storeName: result.profile.store_name || "" };
  } catch (error) {
    return { username: "Guest", storeName: "" };
  }
}

// =====================================================
// TIME TEXT (backend sends createdAt, this makes "5 min ago")
// =====================================================
function timeAgo(dateString) {
  const minutes = Math.floor((Date.now() - new Date(dateString)) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + " min ago";

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " hr ago";

  return Math.floor(hours / 24) + " day(s) ago";
}

// =====================================================
// DRAW THE NOTIFICATIONS
// =====================================================
function renderNotifications(list) {
  const box = document.getElementById("notifList");
  if (!box) return; // this page has no bell

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

// =====================================================
// MARK ALL AS READ
// =====================================================
async function markAllAsRead() {
  if (USE_BACKEND) {
    await fetch(API.markRead, { method: "POST" });
  } else {
    const list = await getNotifications();
    list.forEach(function (n) { n.read = true; });
    localStorage.setItem("notifications", JSON.stringify(list));
  }
  loadNotifications();
}

// =====================================================
// ADD A NOTIFICATION (front end only, for testing)
// The backend will create these by itself later.
// Example: addNotification("low", "Low stock", "Pancit Canton has only 5 left.", "inventory.html");
// =====================================================
async function addNotification(type, title, message, link) {
  const list = await getNotifications();
  list.unshift({ id: Date.now(), type: type, title: title, message: message, time: "Just now", link: link, read: false });
  localStorage.setItem("notifications", JSON.stringify(list));
  loadNotifications();
}

// =====================================================
// MY ACCOUNT
// =====================================================
async function loadAccount() {
  const name = document.getElementById("accountName");
  if (!name) return; // this page has no account menu

  const user = await getAccount();
  name.textContent = user.username;
  document.getElementById("accountStore").textContent = user.storeName;
}

// =====================================================
// LOAD THE SHARED HEADER INTO EVERY PAGE
// =====================================================
function loadHeader() {
  const placeholder = document.getElementById("header-placeholder");
  if (!placeholder) return;

  fetch("header.html")
    .then(function (res) {
      if (!res.ok) throw new Error("header.html not found (" + res.status + ")");
      return res.text();
    })
    .then(function (html) {
      placeholder.innerHTML = html;

      // These run AFTER the header exists
      loadNotifications();
      loadAccount();

      // Menu button (opens and closes the sidebar on tablet and phone)
      const menuBtn = document.getElementById("menuBtn");
      const sideBar = document.querySelector(".side-bar");

      if (menuBtn && sideBar) {
        menuBtn.addEventListener("click", function () {
          sideBar.classList.toggle("open");
        });
      }
    })
    .catch(function (error) {
      console.error("Header problem:", error);
    });
}

loadHeader();   // <- keep this as the last line