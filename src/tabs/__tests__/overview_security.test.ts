import { describe, it, before } from "node:test";
import assert from "node:assert";
import { installDomEnvironment } from "../../__tests__/dom";

describe("src/tabs/overview.ts security", () => {
  before(async () => {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await installDomEnvironment();
    // Mock customElements
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (global as any).customElements = {
      define: () => {},
      get: () => undefined,
      whenDefined: () => Promise.resolve(),
      upgrade: () => {},
    };
  });

  it("should escape currency code in purchase price display", async () => {
    const { __TEST_ONLY__ } = await import("../overview");
    const { buildPurchasePriceDisplayForTest } = __TEST_ONLY__;

    const maliciousCurrency = "<img src=x onerror=alert(1)>";
    const position = {
      name: "Test Security",
      currency_code: maliciousCurrency,
      average_cost: {
        native: 100,
      },
      security_currency_code: null,
      security_currency: null,
      native_currency_code: null,
      native_currency: null,
      account_currency_code: null,
      account_currency: null,
      purchase_currency_code: null,
    };

    // @ts-ignore
    const result = buildPurchasePriceDisplayForTest(position);

    // Assert that we have caught the vulnerability (so this test fails currently)
    assert.strictEqual(
      result.markup.includes("<img"),
      false,
      "Markup should not contain unescaped image tag",
    );
    assert.strictEqual(
      result.markup.includes("&lt;img"),
      true,
      "Markup should contain escaped image tag",
    );
  });
});
