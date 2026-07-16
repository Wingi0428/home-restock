const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { runInNewContext } = require("node:vm");
const test = require("node:test");

function mockElement() {
  return {
    value: "",
    textContent: "",
    innerHTML: "",
    hidden: false,
    disabled: false,
    title: "",
    style: {},
    dataset: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    setAttribute() {},
    focus() {},
    reset() {},
    showModal() {},
    close() {},
    closest() { return null; },
  };
}

function createContext({ storageEntries, cloudReply }) {
  const source = readFileSync(resolve(__dirname, "../app.js"), "utf8");
  const storage = new Map(storageEntries);
  const calls = [];
  const elements = new Map();
  const getElement = (selector) => {
    if (!elements.has(selector)) elements.set(selector, mockElement());
    return elements.get(selector);
  };

  const context = {
    URL,
    console,
    crypto: { randomUUID: () => "generated-id" },
    document: {
      querySelector: getElement,
      querySelectorAll: () => [],
      addEventListener() {},
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    window: {
      RESTOCK_CLOUD_CONFIG: {
        url: "https://test-project.supabase.co",
        publishableKey: "sb_publishable_test",
      },
      scrollTo() {},
      addEventListener() {},
    },
    navigator: { onLine: true },
    location: { protocol: "file:" },
    FormData: class {},
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push({ url, body });
      const result = url.endsWith("/get_restock_data") ? cloudReply : "2026-07-16T12:00:00Z";
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(result),
      };
    },
    setInterval() {},
    setTimeout() {},
    clearTimeout() {},
  };

  runInNewContext(source, context);
  return { storage, calls };
}

async function settleAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test("uploads existing local data when the cloud ID is new", async () => {
  const legacyItems = [
    { id: "legacy-1", name: "牛奶", category: "食材", cycleDays: 7, nextDate: "2026-07-20", store: "全聯", url: "" },
  ];
  const legacyCategories = [{ name: "食材", icon: "🥬", color: "#bdebc9" }];
  const { calls } = createContext({
    storageEntries: [
      ["home-restock-active-id-v1", "gigi"],
      ["home-restock-items-v1:gigi", JSON.stringify(legacyItems)],
      ["home-restock-categories-v1:gigi", JSON.stringify(legacyCategories)],
    ],
    cloudReply: null,
  });

  await settleAsyncWork();

  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /get_restock_data$/);
  assert.match(calls[1].url, /save_restock_data$/);
  assert.equal(calls[1].body.p_account_id, "gigi");
  assert.equal(calls[1].body.p_payload.items[0].name, "牛奶");
  assert.equal(calls[1].body.p_payload.categories[0].name, "食材");
});

test("downloads cloud data and writes it into the local recovery cache", async () => {
  const cloudItems = [
    { id: "cloud-1", name: "防曬乳", category: "美妝保養", cycleDays: 45, nextDate: "2026-08-20", store: "蝦皮", url: "" },
  ];
  const cloudCategories = [{ name: "美妝保養", icon: "🧴", color: "#ffd4a8" }];
  const { storage, calls } = createContext({
    storageEntries: [["home-restock-active-id-v1", "520"]],
    cloudReply: { schemaVersion: 1, items: cloudItems, categories: cloudCategories },
  });

  await settleAsyncWork();

  assert.equal(calls.length, 1, "existing cloud data should not be overwritten during login");
  assert.equal(JSON.parse(storage.get("home-restock-items-v1:520"))[0].name, "防曬乳");
  assert.equal(JSON.parse(storage.get("home-restock-categories-v1:520"))[0].name, "美妝保養");
});
