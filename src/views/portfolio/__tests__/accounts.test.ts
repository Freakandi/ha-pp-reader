import assert from "node:assert/strict";
import test from "node:test";
import { __TEST_ONLY__ } from "../accounts";

const { buildFxWarningBanner } = __TEST_ONLY__;

test("buildFxWarningBanner includes ARIA roles for accessibility", () => {
  const html = buildFxWarningBanner(1);
  assert.ok(html.includes('role="status"'), 'Should have role="status"');
  assert.ok(
    html.includes('aria-live="polite"'),
    'Should have aria-live="polite"',
  );
});

test("buildFxWarningBanner returns empty string for count 0", () => {
  const html = buildFxWarningBanner(0);
  assert.equal(html, "");
});
