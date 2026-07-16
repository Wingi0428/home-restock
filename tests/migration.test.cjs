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

test("v1 item data remains unchanged while categories migrate per ID", () => {
  const source = readFileSync(resolve(__dirname, "../app.js"), "utf8");
  const legacyItems = [
    { id: "legacy-1", name: "牛奶", category: "食材", cycleDays: 7, nextDate: "2026-07-20", store: "全聯", url: "https://www.pxmart.com.tw/" },
  ];
  const itemKey = "home-restock-items-v1:gigi";
  const categoryKey = "home-restock-categories-v1:gigi";
  const storage = new Map([
    ["home-restock-active-id-v1", "gigi"],
    [itemKey, JSON.stringify(legacyItems)],
  ]);
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
    window: { scrollTo() {} },
    navigator: {},
    location: { protocol: "file:" },
    FormData: class {},
    setInterval() {},
    setTimeout() {},
    clearTimeout() {},
  };

  runInNewContext(source, context);

  assert.equal(storage.get(itemKey), JSON.stringify(legacyItems), "existing items must not be overwritten during migration");
  const migratedCategories = JSON.parse(storage.get(categoryKey));
  assert.deepEqual(
    migratedCategories.map((category) => category.name),
    ["貓咪用品", "消耗品", "食材"],
    "defaults and the category referenced by a legacy item should all remain available",
  );
});
