"use strict";

const STORAGE_PREFIX = "home-restock-items-v1:";
const ACTIVE_ID_KEY = "home-restock-active-id-v1";
const NOTIFIED_PREFIX = "home-restock-notified-v1:";
const CATEGORIES = ["貓咪用品", "消耗品"];

const $ = (selector) => document.querySelector(selector);
const loginView = $("#login-view");
const appView = $("#app-view");
const itemDialog = $("#item-dialog");
const confirmDialog = $("#confirm-dialog");
const itemForm = $("#item-form");
let activeId = "";
let items = [];
let confirmAction = null;
let toastTimer = null;

function localDate(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function starterItems() {
  return [
    { id: crypto.randomUUID(), name: "貓砂", category: "貓咪用品", cycleDays: 30, nextDate: localDate(2), store: "蝦皮", url: "https://shopee.tw/" },
    { id: crypto.randomUUID(), name: "罐頭", category: "貓咪用品", cycleDays: 14, nextDate: localDate(0), store: "Costco", url: "https://www.costco.com.tw/" },
    { id: crypto.randomUUID(), name: "衛生紙", category: "消耗品", cycleDays: 21, nextDate: localDate(6), store: "全聯", url: "https://www.pxmart.com.tw/" },
    { id: crypto.randomUUID(), name: "廚房紙巾", category: "消耗品", cycleDays: 30, nextDate: localDate(-1), store: "Coupang", url: "https://www.tw.coupang.com/" },
  ];
}

function storageKey(id = activeId) { return `${STORAGE_PREFIX}${encodeURIComponent(id)}`; }
function loadItems(id) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(id)) || "null");
    if (Array.isArray(saved)) return saved;
  } catch (_) { /* Keep the app usable if saved data is malformed. */ }
  const initial = starterItems();
  localStorage.setItem(storageKey(id), JSON.stringify(initial));
  return initial;
}
function saveItems() { localStorage.setItem(storageKey(), JSON.stringify(items)); }

function daysUntil(dateString) {
  const target = new Date(`${dateString}T12:00:00`);
  const today = new Date(`${localDate()}T12:00:00`);
  return Math.round((target - today) / 86400000);
}

function statusFor(days) {
  if (days < 0) return { label: `已逾期 ${Math.abs(days)} 天`, tone: "overdue" };
  if (days === 0) return { label: "今天補貨", tone: "today" };
  if (days <= 3) return { label: `剩 ${days} 天`, tone: "urgent" };
  if (days <= 7) return { label: `剩 ${days} 天`, tone: "soon" };
  return { label: `剩 ${days} 天`, tone: "later" };
}

function categoryIcon(category) { return category === "貓咪用品" ? "🐾" : "🧻"; }
function escapeHTML(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}
function safeUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch (_) { return ""; }
}

function render() {
  $("#account-id").textContent = activeId;
  $("#welcome-id").textContent = activeId;
  const sorted = [...items].sort((a, b) => daysUntil(a.nextDate) - daysUntil(b.nextDate));
  const dueSoon = sorted.filter((item) => daysUntil(item.nextDate) <= 3).length;
  const thisWeek = sorted.filter((item) => daysUntil(item.nextDate) <= 7).length;
  $("#due-soon-count").textContent = dueSoon;
  $("#due-soon-copy").textContent = dueSoon;
  $("#week-count").textContent = thisWeek;
  $("#week-copy").textContent = thisWeek;

  $("#categories-grid").innerHTML = CATEGORIES.map((category) => {
    const categoryItems = sorted.filter((item) => item.category === category);
    const isCat = category === "貓咪用品";
    const rows = categoryItems.length ? categoryItems.map((item) => {
      const days = daysUntil(item.nextDate);
      const status = statusFor(days);
      const link = safeUrl(item.url);
      const storeControl = link
        ? `<a class="store-link" href="${escapeHTML(link)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.store || "購買連結")} <span aria-hidden="true">↗</span></a>`
        : `<span class="no-link">尚未設定連結</span>`;
      return `<article class="item-row" data-item-id="${escapeHTML(item.id)}">
        <div class="item-icon ${isCat ? "cat-icon" : "home-icon"}" aria-hidden="true">${categoryIcon(category)}</div>
        <div class="item-copy"><h3>${escapeHTML(item.name)}</h3><p>下次 ${escapeHTML(item.nextDate)} · 每 ${item.cycleDays} 天</p></div>
        <span class="status-chip ${status.tone}">${status.label}</span>
        ${storeControl}
        <div class="row-actions" aria-label="${escapeHTML(item.name)}操作">
          <button class="icon-button" type="button" data-action="edit" aria-label="編輯${escapeHTML(item.name)}" title="編輯">✎</button>
          <button class="icon-button" type="button" data-action="reset" aria-label="重設${escapeHTML(item.name)}倒數" title="重設倒數">↻</button>
          <button class="icon-button delete" type="button" data-action="delete" aria-label="刪除${escapeHTML(item.name)}" title="刪除">⌫</button>
        </div>
      </article>`;
    }).join("") : `<div class="empty-state"><div><span>${isCat ? "🐈" : "🏠"}</span><p>這個分類還沒有項目<br>點「新增清單」開始記錄吧！</p></div></div>`;

    return `<section class="category-card ${isCat ? "cat-card" : "home-card"}">
      <div class="category-heading">
        <span class="category-sticker" aria-hidden="true">${isCat ? "🐱" : "🧻"}</span>
        <div><p>${isCat ? "FOR OUR CAT" : "FOR OUR HOME"}</p><h2>${category}</h2></div>
        <span class="category-count" aria-label="${categoryItems.length} 個項目">${categoryItems.length}</span>
      </div>
      <div class="items-list">${rows}</div>
    </section>`;
  }).join("");

  const urgentNames = sorted.filter((item) => daysUntil(item.nextDate) <= 3).map((item) => item.name);
  if (urgentNames.length) {
    $("#due-banner-text").textContent = `近期需要補貨：${urgentNames.join("、")}。完成購買後，記得按 ↻ 重設倒數。`;
    $("#due-banner").hidden = false;
  } else {
    $("#due-banner").hidden = true;
  }
  updateNotificationButton();
}

function showApp(id) {
  activeId = id.trim();
  localStorage.setItem(ACTIVE_ID_KEY, activeId);
  items = loadItems(activeId);
  loginView.hidden = true;
  appView.hidden = false;
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
  checkNotifications();
}

function showLogin() {
  activeId = "";
  localStorage.removeItem(ACTIVE_ID_KEY);
  appView.hidden = true;
  loginView.hidden = false;
  $("#login-id").focus();
}

function openItemDialog(item = null) {
  itemForm.reset();
  $("#item-dialog-title").textContent = item ? "修改補貨項目" : "新增補貨項目";
  $("#item-id").value = item?.id || "";
  $("#item-name").value = item?.name || "";
  $("#item-category").value = item?.category || "貓咪用品";
  $("#item-cycle").value = item?.cycleDays || 30;
  $("#item-next-date").value = item?.nextDate || localDate(30);
  $("#item-store").value = item?.store || "";
  $("#item-url").value = item?.url || "";
  itemDialog.showModal();
  setTimeout(() => $("#item-name").focus(), 0);
}

function askConfirm({ title, message, icon = "🗑️", confirmText = "確認刪除", onConfirm }) {
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-icon").textContent = icon;
  $("#confirm-submit").textContent = confirmText;
  confirmAction = onConfirm;
  confirmDialog.showModal();
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
}

function resetItem(item) {
  item.nextDate = localDate(Number(item.cycleDays));
  saveItems();
  render();
  showToast(`已重設「${item.name}」倒數 ${item.cycleDays} 天`);
}

function updateNotificationButton() {
  const button = $("#notification-button");
  if (!("Notification" in window)) {
    button.disabled = true;
    button.title = "此瀏覽器不支援通知";
    $(".notification-label").textContent = "不支援提醒";
    return;
  }
  const enabled = Notification.permission === "granted";
  button.classList.toggle("enabled", enabled);
  $(".notification-label").textContent = enabled ? "提醒已開啟" : "開啟提醒";
}

async function requestNotifications() {
  if (!("Notification" in window)) return showToast("此瀏覽器不支援通知");
  const permission = await Notification.requestPermission();
  updateNotificationButton();
  if (permission === "granted") {
    showToast("已開啟到期通知");
    checkNotifications(true);
  } else {
    showToast("未允許通知，仍會保留網站內提醒");
  }
}

function checkNotifications(force = false) {
  if (!activeId || !("Notification" in window) || Notification.permission !== "granted") return;
  const due = items.filter((item) => daysUntil(item.nextDate) <= 3);
  if (!due.length) return;
  const notifiedKey = `${NOTIFIED_PREFIX}${encodeURIComponent(activeId)}`;
  if (!force && localStorage.getItem(notifiedKey) === localDate()) return;
  const message = due.length === 1 ? `${due[0].name}：${statusFor(daysUntil(due[0].nextDate)).label}` : `${due.map((item) => item.name).join("、")}，共 ${due.length} 項需要留意。`;
  try { new Notification("家用補貨提醒", { body: message, icon: "./assets/playful-sticker-assets.png", tag: `restock-${activeId}` }); } catch (_) { /* The in-app banner remains available. */ }
  localStorage.setItem(notifiedKey, localDate());
}

$("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const id = $("#login-id").value.trim();
  if (id) showApp(id);
});
$("#add-item-button").addEventListener("click", () => openItemDialog());
$("#notification-button").addEventListener("click", requestNotifications);
$("#dismiss-banner").addEventListener("click", () => { $("#due-banner").hidden = true; });

$("#account-button").addEventListener("click", () => {
  const menu = $("#account-menu");
  menu.hidden = !menu.hidden;
  $("#account-button").setAttribute("aria-expanded", String(!menu.hidden));
});
$("#switch-id-button").addEventListener("click", () => {
  $("#account-menu").hidden = true;
  $("#login-id").value = activeId;
  showLogin();
});
$("#clear-user-data-button").addEventListener("click", () => {
  $("#account-menu").hidden = true;
  askConfirm({
    title: `清除「${activeId}」的全部資料？`,
    message: "此 ID 的補貨清單將永久刪除，重新登入時會恢復預設範例。",
    icon: "⚠️",
    confirmText: "確認清除",
    onConfirm: () => { localStorage.removeItem(storageKey()); showLogin(); showToast("此 ID 的資料已清除"); },
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".header-actions")) {
    $("#account-menu").hidden = true;
    $("#account-button").setAttribute("aria-expanded", "false");
  }
});

$("#categories-grid").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("[data-item-id]");
  const item = items.find((entry) => entry.id === row?.dataset.itemId);
  if (!item) return;
  if (button.dataset.action === "edit") openItemDialog(item);
  if (button.dataset.action === "reset") {
    askConfirm({
      title: `重設「${item.name}」倒數？`,
      message: `下次購買日將從今天起重新計算 ${item.cycleDays} 天。`,
      icon: "↻",
      confirmText: "重設倒數",
      onConfirm: () => resetItem(item),
    });
  }
  if (button.dataset.action === "delete") {
    askConfirm({
      title: `刪除「${item.name}」？`,
      message: "刪除後將無法復原。",
      onConfirm: () => { items = items.filter((entry) => entry.id !== item.id); saveItems(); render(); showToast(`已刪除「${item.name}」`); },
    });
  }
});

itemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(itemForm);
  const id = String(data.get("id") || "");
  const url = String(data.get("url") || "").trim();
  if (url && !safeUrl(url)) return showToast("購買連結需以 http:// 或 https:// 開頭");
  const nextItem = {
    id: id || crypto.randomUUID(),
    name: String(data.get("name") || "").trim(),
    category: String(data.get("category") || "貓咪用品"),
    cycleDays: Math.max(1, Number(data.get("cycleDays") || 30)),
    nextDate: String(data.get("nextDate") || localDate(30)),
    store: String(data.get("store") || "").trim(),
    url,
  };
  if (id) items = items.map((item) => item.id === id ? nextItem : item);
  else items.push(nextItem);
  saveItems();
  render();
  itemDialog.close();
  showToast(id ? "項目已更新" : "已新增補貨項目");
});

document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => itemDialog.close()));
$("#confirm-cancel").addEventListener("click", () => { confirmAction = null; confirmDialog.close(); });
$("#confirm-submit").addEventListener("click", () => {
  const action = confirmAction;
  confirmAction = null;
  confirmDialog.close();
  action?.();
});

const rememberedId = localStorage.getItem(ACTIVE_ID_KEY);
if (rememberedId) showApp(rememberedId);
else { loginView.hidden = false; appView.hidden = true; }

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
setInterval(() => { if (activeId) { render(); checkNotifications(); } }, 60000);
