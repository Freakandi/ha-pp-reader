import { describe, it, after, before } from "node:test";
import assert from "node:assert";
import { installDomEnvironment } from "../../__tests__/dom";

describe("updateConfigsWS XSS Vulnerability", () => {
  let domEnv: ReturnType<typeof installDomEnvironment>;
  let updateConfigsWS: typeof import("../updateConfigsWS");

  before(async () => {
    domEnv = installDomEnvironment(
      '<!doctype html><html><body><div id="root"><div class="fx-account-table"></div></div></body></html>',
    );
    // Dynamic import to ensure JSDOM globals are present when module initializes
    updateConfigsWS = await import("../updateConfigsWS");
  });

  after(() => {
    domEnv.restore();
  });

  it("should fix XSS vulnerability in currency_code", () => {
    const root = domEnv.document.getElementById("root");
    if (!root) {
      throw new Error("Root element not found");
    }
    const maliciousCode = "<b>EUR</b>"; // Formatting injection as proof of concept

    const update = [
      {
        uuid: "acc1",
        name: "Test Account",
        currency_code: maliciousCode,
        orig_balance: 100,
        balance: 100,
        badges: [],
      },
    ];

    updateConfigsWS.handleAccountUpdate(update, root);

    const fxTable = root.querySelector(".fx-account-table");
    assert.ok(fxTable, "FX table should be present");

    // Check if the malicious code is present raw in the output
    const html = fxTable.innerHTML;

    // If fixed/escaped, it should contain &lt;b&gt;EUR&lt;/b&gt;

    const isEscaped = html.includes("&lt;b&gt;EUR&lt;/b&gt;");
    const isRaw = html.includes("<b>EUR</b>") && !isEscaped;

    // We expect it to be escaped now.
    assert.ok(isEscaped, "Malicious input should be escaped");
    assert.strictEqual(isRaw, false, "HTML should NOT contain raw tags");

    // console.log('Current HTML output segment:', html.substring(html.indexOf('100,00')));
  });
});
