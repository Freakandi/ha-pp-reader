import { JSDOM } from "jsdom";
import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { updateTotalWealth } from "../updateConfigsWS";

describe("updateConfigsWS: updateTotalWealth", () => {
  let dom: JSDOM;
  let document: Document;
  let headerMeta: HTMLElement;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><div id="headerMeta"></div>');
    document = dom.window.document;
    // @ts-expect-error - Stubbing global window/document for the module
    global.window = dom.window;
    global.document = document;

    const element = document.getElementById("headerMeta");
    if (!element) throw new Error("headerMeta not found");
    headerMeta = element;
  });

  afterEach(() => {
    // @ts-expect-error - cleanup
    delete global.window;
    // @ts-expect-error - cleanup
    delete global.document;
  });

  it("updates total wealth with correct sum of accounts and portfolios", () => {
    const accounts = [
      { balance: 100 },
      { current_value: 50.5 }, // FX account style often has current_value/balance
    ];
    const portfolios = [
      { current_value: 200 },
      { value: 99.5 }, // Some payload variants might have value
    ];

    updateTotalWealth(accounts, portfolios, document);

    // Sum: 100 + 50.5 + 200 + 99.5 = 450.0
    assert.strictEqual(headerMeta.dataset.totalWealthEur, "450");

    // Check text content - allow for locale differences (comma vs dot)
    const text = headerMeta.textContent || "";
    assert.match(text, /450[,.]00/);
    assert.match(text, /Gesamtvermögen/);
  });

  it("handles null/undefined inputs gracefully", () => {
    updateTotalWealth(null, undefined, document);
    assert.strictEqual(headerMeta.dataset.totalWealthEur, "0");
    assert.match(headerMeta.textContent || "", /0[,.]00/);
  });

  it("handles malformed numbers in inputs", () => {
    const accounts = [{ balance: null }, { balance: "invalid" }];
    updateTotalWealth(
      accounts as unknown as Parameters<typeof updateTotalWealth>[0],
      [],
      document,
    );
    assert.strictEqual(headerMeta.dataset.totalWealthEur, "0");
  });

  it("updates existing strong element if present", () => {
    headerMeta.innerHTML =
      '💰 Gesamtvermögen: <strong class="foo">OLD</strong>';
    const accounts = [{ balance: 10 }];

    updateTotalWealth(accounts, [], document);

    const strong = headerMeta.querySelector("strong");
    assert.ok(strong, "Strong element should exist");
    assert.match(strong.textContent || "", /10[,.]00/);
    assert.strictEqual(headerMeta.dataset.totalWealthEur, "10");
  });
});
